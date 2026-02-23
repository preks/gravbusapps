/**
 * Builds a stable cache key from values by sorting and joining.
 * Single implementation to avoid duplicated sort+join logic (reduces Sonar duplicated lines).
 */
export function toSortedCacheKey(values: (string | undefined)[], separator: string = ','): string {
  return [...values]
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b)))
    .join(separator)
}
