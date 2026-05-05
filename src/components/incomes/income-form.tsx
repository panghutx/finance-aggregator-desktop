import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { incomeSchema, IncomeInput } from "@/lib/validations/income";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Account {
  id: string;
  name: string;
  platform: string;
  currency: string;
}

interface IncomeFormProps {
  initialData?: {
    id: string;
    accountId: string;
    date: string;
    amount: number;
    type: "PROFIT" | "DIVIDEND" | "INTEREST" | "FEE";
    note?: string;
  };
  accounts: Account[];
  onSubmit: (data: IncomeInput) => Promise<void>;
}

const incomeTypes = [
  { value: "PROFIT", label: "收益" },
  { value: "DIVIDEND", label: "分红" },
  { value: "INTEREST", label: "利息" },
  { value: "FEE", label: "手续费" },
];

export function IncomeForm({ initialData, accounts, onSubmit }: IncomeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<IncomeInput>({
    resolver: zodResolver(incomeSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          date: initialData.date.split("T")[0],
        }
      : {
          date: new Date().toISOString().split("T")[0],
          type: "PROFIT",
          accountId: accounts[0]?.id || "",
        },
  });

  const accountId = watch("accountId");
  const type = watch("type");
  const selectedAccount = accounts.find((a) => a.id === accountId);

  const handleFormSubmit = async (data: IncomeInput) => {
    setIsLoading(true);
    setError(null);

    try {
      await onSubmit(data);
    } catch (err) {
      setError(String(err) || "操作失败");
    } finally {
      setIsLoading(false);
    }
  };

  if (accounts.length === 0) {
    return <p className="text-gray-500">请先创建账户后再添加收益记录</p>;
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="accountId">账户</Label>
        <Select
          value={accountId}
          onValueChange={(value) => setValue("accountId", value as string)}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择账户">
              {accounts.find(a => a.id === accountId)?.name || "选择账户"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name} ({account.platform}) - {account.currency}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.accountId && (
          <p className="text-sm text-red-500">{errors.accountId.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">日期</Label>
        <Input id="date" type="date" {...register("date")} />
        {errors.date && (
          <p className="text-sm text-red-500">{errors.date.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">金额 ({selectedAccount?.currency || "CNY"})</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          {...register("amount", { valueAsNumber: true })}
          placeholder="正数为收入，负数为支出"
        />
        {errors.amount && (
          <p className="text-sm text-red-500">{errors.amount.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">类型</Label>
        <Select
          value={type}
          onValueChange={(value) =>
            setValue("type", value as IncomeInput["type"])
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="选择类型" />
          </SelectTrigger>
          <SelectContent>
            {incomeTypes.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type && (
          <p className="text-sm text-red-500">{errors.type.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">备注</Label>
        <Input id="note" {...register("note")} placeholder="可选备注" />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "保存中..." : "保存"}
      </Button>
    </form>
  );
}