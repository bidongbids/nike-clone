export const CURRENCY_SYMBOL = '₱'

export function formatPrice(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatPriceShort(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
}
