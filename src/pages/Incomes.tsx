import { useEffect, useState } from "react";
import { getIncomes, getAccounts, createIncome, deleteIncome, confirmDelete, Income, Account } from "@/lib/tauri";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IncomeForm } from "@/components/incomes/income-form";

export default function Incomes() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadData = async () => {
    try {
      const [incomesData, accountsData] = await Promise.all([
        getIncomes(),
        getAccounts(),
      ]);
      setIncomes(incomesData);
      setAccounts(accountsData.filter(a => a.isActive));
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (data: {
    accountId: string;
    date: string;
    amount: number;
    type: Income["type"];
    note?: string;
  }) => {
    await createIncome(data);
    setShowForm(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDelete("确定要删除此记录吗？");
    if (confirmed) {
      await deleteIncome(id);
      loadData();
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PROFIT: "收益",
      DIVIDEND: "分红",
      INTEREST: "利息",
      FEE: "费用",
    };
    return labels[type] || type;
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a.name]));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">收益记录</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "取消" : "新建记录"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <IncomeForm accounts={accounts} onSubmit={handleCreate} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">账户</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">日期</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">类型</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">金额</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">备注</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {incomes.map((income) => (
                <tr key={income.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{accountMap[income.accountId] || income.accountId}</td>
                  <td className="px-4 py-3 text-sm">{income.date}</td>
                  <td className="px-4 py-3 text-sm">{getTypeLabel(income.type)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    {income.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{income.note || "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(income.id)}>
                      删除
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {incomes.length === 0 && (
            <div className="text-center py-8 text-gray-500">暂无收益记录</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}