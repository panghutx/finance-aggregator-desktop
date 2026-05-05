import { useEffect, useState } from "react";
import { getAccounts, createAsset, Account } from "@/lib/tauri";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BatchAssets() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [entries, setEntries] = useState<{ accountId: string; amount: string; currency: string }[]>([]);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const data = await getAccounts();
        setAccounts(data.filter(a => a.isActive));
        // Initialize entries for each account
        setEntries(data.filter(a => a.isActive).map(a => ({
          accountId: a.id,
          amount: "",
          currency: a.currency,
        })));
      } catch (error) {
        console.error("Failed to load accounts:", error);
      } finally {
        setLoading(false);
      }
    }
    loadAccounts();
  }, []);

  const handleAmountChange = (accountId: string, amount: string) => {
    setEntries(prev => prev.map(e =>
      e.accountId === accountId ? { ...e, amount } : e
    ));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const validEntries = entries.filter(e => e.amount && parseFloat(e.amount) > 0);
      for (const entry of validEntries) {
        await createAsset({
          accountId: entry.accountId,
          date,
          amount: parseFloat(entry.amount),
          currency: entry.currency,
        });
      }
      // Clear amounts after saving
      setEntries(prev => prev.map(e => ({ ...e, amount: "" })));
      alert("保存成功！");
    } catch (error) {
      console.error("Failed to save:", error);
      alert("保存失败：" + error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">快速记账</h1>

      <Card>
        <CardHeader>
          <CardTitle>批量录入资产</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="date">日期</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            {accounts.map((account) => {
              const entry = entries.find(e => e.accountId === account.id);
              return (
                <div key={account.id} className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">{account.name}</Label>
                    <div className="text-xs text-gray-500">{account.platform}</div>
                  </div>
                  <Input
                    type="number"
                    placeholder="金额"
                    value={entry?.amount || ""}
                    onChange={(e) => handleAmountChange(account.id, e.target.value)}
                    className="w-32"
                  />
                  <Select
                    value={entry?.currency || account.currency}
                    onValueChange={(v: string | null) => v && setEntries(prev => prev.map(e =>
                      e.accountId === account.id ? { ...e, currency: v } : e
                    ))}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CNY">CNY</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="HKD">HKD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>

          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving ? "保存中..." : "保存"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}