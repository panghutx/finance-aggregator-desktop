import { useEffect, useState } from "react";
import { getTransactions, getAccounts, createTransaction, deleteTransaction, confirmDelete, Transaction, Account } from "@/lib/tauri";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TransactionForm } from "@/components/transactions/transaction-form";

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadData = async () => {
    try {
      const [transactionsData, accountsData] = await Promise.all([
        getTransactions(),
        getAccounts(),
      ]);
      setTransactions(transactionsData);
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
    type: Transaction["type"];
    category?: string;
    note?: string;
  }) => {
    await createTransaction(data);
    setShowForm(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDelete("确定要删除此记录吗？");
    if (confirmed) {
      await deleteTransaction(id);
      loadData();
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      INCOME: "收入",
      DEPOSIT: "存入",
      WITHDRAW: "取出",
      TRANSFER_IN: "转入",
      TRANSFER_OUT: "转出",
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      INCOME: "text-green-600",
      DEPOSIT: "text-blue-600",
      WITHDRAW: "text-orange-600",
      TRANSFER_IN: "text-purple-600",
      TRANSFER_OUT: "text-purple-600",
    };
    return colors[type] || "";
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a.name]));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">流水记录</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "取消" : "新建记录"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <TransactionForm accounts={accounts} onSubmit={handleCreate} />
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
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{accountMap[tx.accountId] || tx.accountId}</td>
                  <td className="px-4 py-3 text-sm">{tx.date}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={getTypeColor(tx.type)}>{getTypeLabel(tx.type)}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    {tx.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{tx.note || "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(tx.id)}>
                      删除
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">暂无流水记录</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}