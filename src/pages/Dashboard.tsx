import { useEffect, useState, useMemo } from "react";
import { getAccounts, getAssets, getProfitSummary, getExchangeRates, Account, AssetWithAccount, ProfitSummary, ExchangeRates } from "@/lib/tauri";
import { AssetByCurrencyChart } from "@/components/charts/asset-by-currency-chart";
import { AssetTrendChart } from "@/components/charts/asset-trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [assets, setAssets] = useState<AssetWithAccount[]>([]);
  const [profitSummary, setProfitSummary] = useState<ProfitSummary | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [accountsData, assetsData, profitData, rates] = await Promise.all([
          getAccounts(),
          getAssets(),
          getProfitSummary({ period: "all" }),
          getExchangeRates().catch(() => null),
        ]);
        setAccounts(accountsData.filter(a => a.isActive));
        setAssets(assetsData);
        setProfitSummary(profitData);
        setExchangeRates(rates);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // 计算人民币总资产
  const totalCNY = useMemo(() => {
    if (!exchangeRates) return null;

    const cnyRate = exchangeRates.rates["CNY"] || 7.24;

    return assets.reduce((total, asset) => {
      const assetRate = exchangeRates.rates[asset.currency] || cnyRate;
      const usdAmount = asset.amount / assetRate;
      const cnyAmount = usdAmount * cnyRate;
      return total + cnyAmount;
    }, 0);
  }, [assets, exchangeRates]);

  // 按币种汇总资产（用于图表 - 使用人民币金额）
  const assetsByCurrency = useMemo(() => {
    const currencyMap = new Map<string, { amount: number; cnyAmount: number }>();

    assets.forEach((asset) => {
      const existing = currencyMap.get(asset.currency);
      const cnyAmount = exchangeRates ? (() => {
        const cnyRate = exchangeRates.rates["CNY"] || 7.24;
        const assetRate = exchangeRates.rates[asset.currency] || cnyRate;
        return (asset.amount / assetRate) * cnyRate;
      })() : 0;

      if (existing) {
        existing.amount += asset.amount;
        existing.cnyAmount += cnyAmount;
      } else {
        currencyMap.set(asset.currency, { amount: asset.amount, cnyAmount });
      }
    });

    return Array.from(currencyMap.entries())
      .map(([currency, data]) => ({ currency, ...data }))
      .sort((a, b) => b.cnyAmount - a.cnyAmount);
  }, [assets, exchangeRates]);

  // 按日期汇总资产趋势（人民币）- 取每个账户每天的最新资产值
  const assetTrendData = useMemo(() => {
    // 先按账户和日期分组，取每天每个账户的最后一条记录
    const accountDateMap = new Map<string, { amount: number; currency: string }>();

    // 按日期排序后，每个账户取每天最新的记录
    const sortedAssets = [...assets].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.id.localeCompare(b.id);
    });

    // 计算每个日期的总资产（人民币）
    const dateMap = new Map<string, number>();

    sortedAssets.forEach((asset) => {
      // 更新该账户在该日期的资产
      accountDateMap.set(`${asset.accountId}`, { amount: asset.amount, currency: asset.currency });

      // 计算当前所有账户的总资产（人民币）
      let totalCNY = 0;
      accountDateMap.forEach((data) => {
        if (exchangeRates) {
          const cnyRate = exchangeRates.rates["CNY"] || 7.24;
          const assetRate = exchangeRates.rates[data.currency] || cnyRate;
          totalCNY += (data.amount / assetRate) * cnyRate;
        }
      });

      dateMap.set(asset.date, totalCNY);
    });

    return Array.from(dateMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [assets, exchangeRates]);

  // 计算总收益（基于资产变化，排除入金出金）
  const calculatedProfit = useMemo(() => {
    if (assetTrendData.length === 0) return null;

    const firstValue = assetTrendData[0].amount;
    const lastValue = assetTrendData[assetTrendData.length - 1].amount;

    return {
      totalProfit: lastValue - firstValue,
      profitRate: firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0,
    };
  }, [assetTrendData]);

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">仪表盘</h1>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总资产（人民币）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ¥{totalCNY?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || profitSummary?.totalAssets.toLocaleString() || "0"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总收益</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${((calculatedProfit?.totalProfit || profitSummary?.totalProfit || 0) >= 0) ? "text-green-600" : "text-red-600"}`}>
              ¥{(calculatedProfit?.totalProfit ?? profitSummary?.totalProfit ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">收益率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${((calculatedProfit?.profitRate || profitSummary?.profitRate || 0) >= 0) ? "text-green-600" : "text-red-600"}`}>
              {(calculatedProfit?.profitRate ?? profitSummary?.profitRate ?? 0).toFixed(2)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">账户数量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>资产分布（人民币）</CardTitle>
          </CardHeader>
          <CardContent>
            <AssetByCurrencyChart data={assetsByCurrency.map(({ currency, amount, cnyAmount }) => ({
              currency,
              amount: cnyAmount,
              originalAmount: amount,
            }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>资产趋势（人民币）</CardTitle>
          </CardHeader>
          <CardContent>
            <AssetTrendChart data={assetTrendData} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Assets */}
      <Card>
        <CardHeader>
          <CardTitle>最近资产记录</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {assets.slice(0, 5).map((asset) => {
              const cnyAmount = exchangeRates ? (() => {
                const cnyRate = exchangeRates.rates["CNY"] || 7.24;
                const assetRate = exchangeRates.rates[asset.currency] || cnyRate;
                return (asset.amount / assetRate) * cnyRate;
              })() : null;

              return (
                <div key={asset.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">{asset.accountName}</span>
                    <span className="text-gray-500 ml-2">{asset.date}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {asset.currency} {asset.amount.toLocaleString()}
                    </div>
                    {cnyAmount !== null && (
                      <div className="text-sm text-gray-400">≈ ¥{cnyAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    )}
                  </div>
                </div>
              );
            })}
            {assets.length === 0 && (
              <p className="text-gray-500 text-center py-4">暂无资产记录</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}