/** Formats a EUR amount with thousands separators, e.g. 12229 -> "12,229". */
export function formatCabinPrice(price: number): string {
  return new Intl.NumberFormat('en-US').format(price);
}
