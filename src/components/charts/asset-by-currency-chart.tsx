import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface AssetByCurrencyProps {
  data: {
    currency: string;
    amount: number;
    originalAmount?: number;
  }[];
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function AssetByCurrencyChart({ data }: AssetByCurrencyProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const currencyNames: Record<string, string> = {
    CNY: "人民币",
    USD: "美元",
    HKD: "港币",
    EUR: "欧元",
    JPY: "日元",
    GBP: "英镑",
  };

  const total = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="currency"
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.currency}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => {
                const currencyName = String(name);
                const item = data.find(d => d.currency === currencyName);
                if (item?.originalAmount !== undefined) {
                  return [
                    `${item.originalAmount.toLocaleString()} ${currencyName} ≈ ${formatCurrency(Number(value))}`,
                    currencyNames[currencyName] || currencyName
                  ];
                }
                return [formatCurrency(Number(value)), currencyNames[currencyName] || currencyName];
              }}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div key={item.currency} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-sm">
                {currencyNames[item.currency] || item.currency}
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium">
                {item.originalAmount !== undefined ? item.originalAmount : item.amount} {item.currency}
              </span>
              {item.originalAmount !== undefined && (
                <span className="text-xs text-gray-500 ml-2">
                  ≈ ¥{item.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {data.length > 0 && (
        <div className="mt-4 pt-4 border-t flex justify-between items-center">
          <span className="font-medium">总计（人民币）</span>
          <span className="font-bold">{formatCurrency(total)}</span>
        </div>
      )}
    </div>
  );
}