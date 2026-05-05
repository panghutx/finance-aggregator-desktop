const CACHE_KEY = 'exchange_rates_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

export interface CachedExchangeRates {
  base: string;
  rates: Record<string, number>;
  cachedAt: number;
}

export function getCachedExchangeRates(): CachedExchangeRates | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CachedExchangeRates = JSON.parse(cached);
    const now = Date.now();

    // 检查是否过期
    if (now - data.cachedAt > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export function setCachedExchangeRates(rates: { base: string; rates: Record<string, number> }): void {
  try {
    const data: CachedExchangeRates = {
      ...rates,
      cachedAt: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage 可能已满或不可用
  }
}

export function clearExchangeRatesCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}