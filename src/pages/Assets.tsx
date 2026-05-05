import { useEffect, useState, useMemo } from "react";
import { getAssets, getAccounts, createAsset, deleteAsset, confirmDelete, getExchangeRates, AssetWithAccount, Account, ExchangeRates } from "@/lib/tauri";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssetForm } from "@/components/assets/asset-form";

export default function Assets() {
  const [assets, setAssets] = useState<AssetWithAccount[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);

  const loadData = async () => {
    try {
      const [assetsData, accountsData, rates] = await Promise.all([
        getAssets(),
        getAccounts(),
        getExchangeRates().catch(() => null),
      ]);
      setAssets(assetsData);
      setAccounts(accountsData.filter(a => a.isActive));
      setExchangeRates(rates);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 计算人民币总资产
  const totalCNY = useMemo(() => {
    if (!exchangeRates) return null;

    const cnyRate = exchangeRates.rates["CNY"] || 7.24;

    return assets.reduce((total, asset) => {
      const assetRate = exchangeRates.rates[asset.currency] || cnyRate;
      // Convert to USD first, then to CNY
      const usdAmount = asset.amount / assetRate;
      const cnyAmount = usdAmount * cnyRate;
      return total + cnyAmount;
    }, 0);
  }, [assets, exchangeRates]);

  // 按账户汇总资产（转换为人民币）
  const assetsByAccount = useMemo(() => {
    if (!exchangeRates) return [];

    const cnyRate = exchangeRates.rates["CNY"] || 7.24;
    const accountMap = new Map<string, { name: string; platform: string; totalCNY: number; details: { currency: string; amount: number; cnyAmount: number }[] }>();

    // 按账户和币种汇总最新资产
    const latestAssets = new Map<string, AssetWithAccount>();
    assets.forEach(asset => {
      const key = `${asset.accountId}`;
      const existing = latestAssets.get(key);
      if (!existing || asset.date > existing.date) {
        latestAssets.set(key, asset);
      }
    });

    latestAssets.forEach((asset) => {
      const assetRate = exchangeRates.rates[asset.currency] || cnyRate;
      const usdAmount = asset.amount / assetRate;
      const cnyAmount = usdAmount * cnyRate;

      const existing = accountMap.get(asset.accountId);
      if (existing) {
        existing.totalCNY += cnyAmount;
        existing.details.push({ currency: asset.currency, amount: asset.amount, cnyAmount });
      } else {
        accountMap.set(asset.accountId, {
          name: asset.accountName,
          platform: asset.accountPlatform,
          totalCNY: cnyAmount,
          details: [{ currency: asset.currency, amount: asset.amount, cnyAmount }],
        });
      }
    });

    return Array.from(accountMap.values()).sort((a, b) => b.totalCNY - a.totalCNY);
  }, [assets, exchangeRates]);

  const handleCreate = async (data: {
    accountId: string;
    date: string;
    amount: number;
    currency: string;
    note?: string;
  }) => {
    await createAsset(data);
    setShowForm(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDelete("确定要删除此资产记录吗？");
    if (confirmed) {
      await deleteAsset(id);
      loadData();
    }
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">资产记录</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "取消" : "新建记录"}
        </Button>
      </div>

      {/* 资产汇总卡片 */}
      {totalCNY !== null && (
        <Card>
          <CardHeader>
            <CardTitle>资产总览（人民币计价）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 mb-4">
              ¥ {totalCNY.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assetsByAccount.map((account, idx) => (
                <div key={idx} className="border rounded-lg p-3">
                  <div className="font-medium">{account.name}</div>
                  <div className="text-sm text-gray-500">{account.platform}</div>
                  <div className="text-lg font-semibold text-green-600 mt-2">
                    ¥ {account.totalCNY.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {account.details.map(d => `${d.currency} ${d.amount.toLocaleString()}`).join(" + ")}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>新建资产记录</CardTitle>
          </CardHeader>
          <CardContent>
            <AssetForm accounts={accounts} onSubmit={handleCreate} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>资产明细</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">账户</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">日期</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">金额</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">币种</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">人民币</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">备注</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {assets.map((asset) => {
                const cnyAmount = exchangeRates ? (() => {
                  const cnyRate = exchangeRates.rates["CNY"] || 7.24;
                  const assetRate = exchangeRates.rates[asset.currency] || cnyRate;
                  return (asset.amount / assetRate) * cnyRate;
                })() : null;

                return (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <div>{asset.accountName}</div>
                      <div className="text-gray-500 text-xs">{asset.accountPlatform}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{asset.date}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {asset.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">{asset.currency}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500">
                      {cnyAmount !== null ? `¥ ${cnyAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{asset.note || "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(asset.id)}>
                        删除
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {assets.length === 0 && (
            <div className="text-center py-8 text-gray-500">暂无资产记录</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}