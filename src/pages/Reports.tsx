import { useEffect, useState, useMemo } from "react";
import { getAssets, getTransactions, getExchangeRates, AssetWithAccount, Transaction, ExchangeRates } from "@/lib/tauri";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProfitTable } from "@/components/profits/profit-table";

export default function Reports() {
  const [period, setPeriod] = useState("all");
  const [assets, setAssets] = useState<AssetWithAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [assetsData, transactionsData, rates] = await Promise.all([
          getAssets(),
          getTransactions(),
          getExchangeRates().catch(() => null),
        ]);
        setAssets(assetsData);
        setTransactions(transactionsData);
        setExchangeRates(rates);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // 汇率转换函数
  const convertToCNY = useMemo(() => {
    if (!exchangeRates) return (amount: number, _currency: string) => amount;
    const cnyRate = exchangeRates.rates["CNY"] || 7.24;
    return (amount: number, currency: string) => {
      const assetRate = exchangeRates.rates[currency] || cnyRate;
      return (amount / assetRate) * cnyRate;
    };
  }, [exchangeRates]);

  // 计算日期范围
  const dateRange = useMemo(() => {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start: string;

    switch (period) {
      case "today":
        start = end;
        break;
      case "week":
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case "month":
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case "year":
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      default:
        start = "2000-01-01";
    }
    return { start, end };
  }, [period]);

  // 计算总资产（人民币）
  const totalAssets = useMemo(() => {
    // 取每个账户最新资产
    const latestByAccount = new Map<string, AssetWithAccount>();
    assets.forEach(asset => {
      const existing = latestByAccount.get(asset.accountId);
      if (!existing || asset.date > existing.date) {
        latestByAccount.set(asset.accountId, asset);
      }
    });

    let total = 0;
    latestByAccount.forEach(asset => {
      total += convertToCNY(asset.amount, asset.currency);
    });
    return total;
  }, [assets, convertToCNY]);

  // 计算期初资产（人民币）
  const startAssets = useMemo(() => {
    const latestByAccountAtStart = new Map<string, AssetWithAccount>();
    assets.filter(a => a.date <= dateRange.start).forEach(asset => {
      const existing = latestByAccountAtStart.get(asset.accountId);
      if (!existing || asset.date > existing.date) {
        latestByAccountAtStart.set(asset.accountId, asset);
      }
    });

    let total = 0;
    latestByAccountAtStart.forEach(asset => {
      total += convertToCNY(asset.amount, asset.currency);
    });
    return total;
  }, [assets, dateRange, convertToCNY]);

  // 计算净流入（人民币）
  const netInflow = useMemo(() => {
    let inflow = 0;
    let outflow = 0;

    transactions
      .filter(t => t.date >= dateRange.start && t.date <= dateRange.end)
      .forEach(t => {
        const cnyAmount = convertToCNY(t.amount, "CNY"); // 交易记录默认为人民币
        if (t.type === "DEPOSIT" || t.type === "TRANSFER_IN") {
          inflow += cnyAmount;
        } else if (t.type === "WITHDRAW" || t.type === "TRANSFER_OUT") {
          outflow += cnyAmount;
        }
      });

    return inflow - outflow;
  }, [transactions, dateRange, convertToCNY]);

  // 计算收益
  const summary = useMemo(() => {
    const assetChange = totalAssets - startAssets;
    const totalProfit = assetChange - netInflow;
    const profitRate = startAssets > 0 ? (totalProfit / startAssets) * 100 : 0;

    return {
      totalAssets,
      totalProfit,
      profitRate,
      netInflow,
      assetChange,
    };
  }, [totalAssets, startAssets, netInflow]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">收益报表</h1>
        <Select value={period} onValueChange={(v: string | null) => v && setPeriod(v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">今天</SelectItem>
            <SelectItem value="week">近7天</SelectItem>
            <SelectItem value="month">近30天</SelectItem>
            <SelectItem value="year">近一年</SelectItem>
            <SelectItem value="all">全部</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">总资产（人民币）</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ¥{summary.totalAssets.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">资产变动</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.assetChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                  ¥{summary.assetChange.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">净流入</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.netInflow >= 0 ? "text-green-600" : "text-red-600"}`}>
                  ¥{summary.netInflow.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">真实收益</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  ¥{summary.totalProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-gray-500">
                  收益率: {summary.profitRate.toFixed(2)}%
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>收益说明</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>真实收益</strong> = 资产变动 - 净流入</p>
                <p><strong>资产变动</strong> = 期末资产 - 期初资产</p>
                <p><strong>净流入</strong> = 存入 + 转入 - 取出 - 转出</p>
                <p className="text-gray-500 mt-4">
                  这个计算方式可以排除资金进出对收益的影响，反映真实的投资收益。所有金额已转换为人民币。
                </p>
              </div>
            </CardContent>
          </Card>

          <ProfitTable period={period} />
        </>
      )}
    </div>
  );
}