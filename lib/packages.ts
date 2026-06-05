/** Formats a package price with its currency symbol, e.g. (9174, 'EUR') -> "€9,174". */
export function formatPackagePrice(price: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}
