/**
 * Formats a data-testid attribute by combining prefix and base IDs
 * @param prefix Optional prefix to add to the data-testid
 * @param baseId Base data-testid value
 * @param suffix Optional suffix to add to the data-testid
 * @returns Formatted data-testid string
 */
export function formatDataTestId(prefix?: string, baseId?: string): string
export function formatDataTestId(prefix?: string, baseId?: string, suffix?: string): string
export function formatDataTestId(prefix?: string, baseId?: string, suffix?: string): string {
  const parts = [prefix, baseId, suffix].filter(Boolean)
  return parts.join('-')
}
