export const DEFAULT_WORKSPACE_CURRENCY = 'PKR';

export function normalizeCurrencyCode(currency?: string | null): string {
  const normalized = String(currency || '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : DEFAULT_WORKSPACE_CURRENCY;
}

export function formatMoney(
  amount: number | string | null | undefined,
  currency?: string | null,
  locale = 'en-US',
): string {
  const parsedAmount = typeof amount === 'number' ? amount : Number(amount || 0);
  const safeAmount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
  const safeCurrency = normalizeCurrencyCode(currency);

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: safeCurrency,
      maximumFractionDigits: 2,
    }).format(safeAmount);
  } catch {
    return `${safeCurrency} ${safeAmount.toFixed(2)}`;
  }
}
