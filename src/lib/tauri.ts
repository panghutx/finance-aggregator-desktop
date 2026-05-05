import { invoke } from "@tauri-apps/api/core";
import { ask } from "@tauri-apps/plugin-dialog";
import { getCachedExchangeRates, setCachedExchangeRates } from "./exchange-cache";

// Confirm dialog helper
export async function confirmDelete(message: string): Promise<boolean> {
  return ask(message, {
    title: "确认删除",
    kind: "warning",
    okLabel: "删除",
    cancelLabel: "取消"
  });
}

// Types
export interface Account {
  id: string;
  name: string;
  type: "DOMESTIC" | "BANK" | "BROKERAGE" | "OVERSEAS";
  platform: string;
  credentials?: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  accountId: string;
  date: string;
  amount: number;
  currency: string;
  note?: string;
  createdAt: string;
}

export interface AssetWithAccount extends Asset {
  accountName: string;
  accountPlatform: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string;
  amount: number;
  type: "INCOME" | "DEPOSIT" | "WITHDRAW" | "TRANSFER_IN" | "TRANSFER_OUT";
  category?: string;
  note?: string;
  relatedAccountId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Income {
  id: string;
  accountId: string;
  date: string;
  amount: number;
  type: "PROFIT" | "DIVIDEND" | "INTEREST" | "FEE";
  note?: string;
  createdAt: string;
}

export interface ProfitSummary {
  totalAssets: number;
  totalProfit: number;
  profitRate: number;
  netInflow: number;
  assetChange: number;
}

// Account API
export async function getAccounts(): Promise<Account[]> {
  return invoke("get_accounts");
}

export async function getAccount(id: string): Promise<Account> {
  return invoke("get_account", { id });
}

export async function createAccount(data: {
  name: string;
  type: Account["type"];
  platform: string;
  credentials?: string;
  currency: string;
}): Promise<Account> {
  return invoke("create_account", { input: data });
}

export async function updateAccount(data: {
  id: string;
  name?: string;
  type?: Account["type"];
  platform?: string;
  credentials?: string;
  currency?: string;
  isActive?: boolean;
}): Promise<Account> {
  return invoke("update_account", { input: data });
}

export async function deleteAccount(id: string): Promise<void> {
  return invoke("delete_account", { id });
}

// Asset API
export async function getAssets(accountId?: string): Promise<AssetWithAccount[]> {
  return invoke("get_assets", { accountId });
}

export async function getAsset(id: string): Promise<Asset> {
  return invoke("get_asset", { id });
}

export async function createAsset(data: {
  accountId: string;
  date: string;
  amount: number;
  currency: string;
  note?: string;
}): Promise<Asset> {
  return invoke("create_asset", { input: data });
}

export async function updateAsset(data: {
  id: string;
  accountId?: string;
  date?: string;
  amount?: number;
  currency?: string;
  note?: string;
}): Promise<Asset> {
  return invoke("update_asset", { input: data });
}

export async function deleteAsset(id: string): Promise<void> {
  return invoke("delete_asset", { id });
}

// Transaction API
export async function getTransactions(params?: {
  accountId?: string;
  transactionType?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Transaction[]> {
  return invoke("get_transactions", params || {});
}

export async function getTransaction(id: string): Promise<Transaction> {
  return invoke("get_transaction", { id });
}

export async function createTransaction(data: {
  accountId: string;
  date: string;
  amount: number;
  type: Transaction["type"];
  category?: string;
  note?: string;
  relatedAccountId?: string;
}): Promise<Transaction> {
  return invoke("create_transaction", { input: data });
}

export async function updateTransaction(data: {
  id: string;
  accountId?: string;
  date?: string;
  amount?: number;
  type?: Transaction["type"];
  category?: string;
  note?: string;
  relatedAccountId?: string;
}): Promise<Transaction> {
  return invoke("update_transaction", { input: data });
}

export async function deleteTransaction(id: string): Promise<void> {
  return invoke("delete_transaction", { id });
}

export async function createTransfer(data: {
  fromAccountId: string;
  toAccountId: string;
  fromAmount: number;
  toAmount: number;
  date: string;
  note?: string;
}): Promise<Transaction[]> {
  return invoke("create_transfer", { input: data });
}

// Income API
export async function getIncomes(accountId?: string): Promise<Income[]> {
  return invoke("get_incomes", { accountId });
}

export async function getIncome(id: string): Promise<Income> {
  return invoke("get_income", { id });
}

export async function createIncome(data: {
  accountId: string;
  date: string;
  amount: number;
  type: Income["type"];
  note?: string;
}): Promise<Income> {
  return invoke("create_income", { input: data });
}

export async function updateIncome(data: {
  id: string;
  accountId?: string;
  date?: string;
  amount?: number;
  type?: Income["type"];
  note?: string;
}): Promise<Income> {
  return invoke("update_income", { input: data });
}

export async function deleteIncome(id: string): Promise<void> {
  return invoke("delete_income", { id });
}

// Profit API
export async function getProfitSummary(params?: {
  period?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ProfitSummary> {
  return invoke("get_profit_summary", params || {});
}

// Exchange API
export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
}

export async function getExchangeRates(): Promise<ExchangeRates> {
  // 先检查缓存
  const cached = getCachedExchangeRates();
  if (cached) {
    return { base: cached.base, rates: cached.rates };
  }

  // 缓存不存在或已过期，从API获取
  const rates = await invoke<ExchangeRates>("get_exchange_rates");

  // 保存到缓存
  setCachedExchangeRates(rates);

  return rates;
}

export async function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
  return invoke("convert_currency", { amount, fromCurrency, toCurrency });
}