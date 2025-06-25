/**
 * Formats a data-testid attribute by combining prefix and base IDs
 * @param prefix Optional prefix to add to the data-testid
 * @param baseId Base data-testid value
 * @returns Formatted data-testid string
 */
export const formatDataTestId = (prefix?: string, baseId?: string): string => {
  if (!prefix && !baseId) return '';
  if (!prefix) return baseId || '';
  if (!baseId) return prefix;
  
  return `${prefix}-${baseId}`;
};
