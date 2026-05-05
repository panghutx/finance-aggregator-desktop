import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { assetSchema, AssetInput } from "@/lib/validations/asset";
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
}

interface AssetFormProps {
  initialData?: {
    id: string;
    accountId: string;
    date: string;
    amount: number;
    currency: string;
    note?: string;
  };
  accounts: Account[];
  onSubmit: (data: AssetInput) => Promise<void>;
}

const currencies = [
  { code: "CNY", name: "人民币", symbol: "¥" },
  { code: "USD", name: "美元", symbol: "$" },
  { code: "EUR", name: "欧元", symbol: "€" },
  { code: "HKD", name: "港币", symbol: "HK$" },
];

export function AssetForm({ initialData, accounts, onSubmit }: AssetFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AssetInput>({
    resolver: zodResolver(assetSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          date: initialData.date.split("T")[0],
        }
      : {
          date: new Date().toISOString().split("T")[0],
          currency: "CNY",
          accountId: accounts[0]?.id || "",
        },
  });

  const accountId = watch("accountId");
  const currency = watch("currency");

  const handleFormSubmit = async (data: AssetInput) => {
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
    return (
      <p className="text-gray-500">
        请先创建账户后再添加资产记录
      </p>
    );
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
                {account.name} ({account.platform})
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">金额</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            {...register("amount", { valueAsNumber: true })}
            placeholder="资产总额"
          />
          {errors.amount && (
            <p className="text-sm text-red-500">{errors.amount.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">币种</Label>
          <Select
            value={currency}
            onValueChange={(value) => setValue("currency", value as string)}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择币种" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.symbol} {c.name} ({c.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.currency && (
            <p className="text-sm text-red-500">{errors.currency.message}</p>
          )}
        </div>
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