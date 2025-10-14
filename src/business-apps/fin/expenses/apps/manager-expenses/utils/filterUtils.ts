/**
 * Builds a deduplicated filter array by separating currency and status filters
 * to prevent duplicate currency filters from appearing in the filter list.
 *
 * @param statusFilter - Array of status filters that may contain currency filters
 * @param currencyFilter - The selected currency code (e.g., 'EUR', 'USD')
 * @returns Deduplicated array with status filters and a single currency filter
 */
export const buildDeduplicatedFilters = (
  statusFilter: string[] | null | undefined,
  currencyFilter: string | null | undefined
): string[] => {
  const statusFilters = (statusFilter || []).filter(f => !f.startsWith('currency:'))
  return currencyFilter ? [...statusFilters, `currency:${currencyFilter}`] : statusFilters
}
