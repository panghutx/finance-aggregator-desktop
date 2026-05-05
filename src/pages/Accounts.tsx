import { useEffect, useState } from "react";
import { getAccounts, createAccount, deleteAccount, confirmDelete, Account } from "@/lib/tauri";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountForm } from "@/components/accounts/account-form";

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadAccounts = async () => {
    try {
      const data = await getAccounts();
      setAccounts(data);
    } catch (error) {
      console.error("Failed to load accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleCreate = async (data: {
    name: string;
    type: Account["type"];
    platform: string;
    credentials?: string;
    currency: string;
  }) => {
    await createAccount(data);
    setShowForm(false);
    loadAccounts();
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDelete("确定要删除此账户吗？");
    if (confirmed) {
      await deleteAccount(id);
      loadAccounts();
    }
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">账户管理</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "取消" : "新建账户"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>新建账户</CardTitle>
          </CardHeader>
          <CardContent>
            <AccountForm onSubmit={handleCreate} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>{account.name}</span>
                <span className={`text-sm px-2 py-1 rounded ${account.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                  {account.isActive ? "活跃" : "停用"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">类型</span>
                  <span>{account.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">平台</span>
                  <span>{account.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">币种</span>
                  <span>{account.currency}</span>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="destructive" size="sm" onClick={() => handleDelete(account.id)}>
                  删除
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {accounts.length === 0 && (
        <Card>
          <CardContent className="text-center py-8 text-gray-500">
            暂无账户，点击"新建账户"开始
          </CardContent>
        </Card>
      )}
    </div>
  );
}