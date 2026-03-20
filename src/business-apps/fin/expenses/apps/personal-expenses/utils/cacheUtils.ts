/**
 * Normalizes a value by recursively sorting object keys.
 * This ensures consistent cache key generation regardless of property order.
 *
 * @param val - The value to normalize (can be any type)
 * @returns The normalized value with sorted object keys
 */
export const normalize = (val: any): any => {
  if (Array.isArray(val)) {
    return val.map(normalize)
  }
  if (val && typeof val === 'object') {
    const sorted: any = {}
    Object.keys(val)
      .sort((a, b) => a.localeCompare(b))
      .forEach(k => {
        sorted[k] = normalize(val[k])
      })
    return sorted
  }
  return val
}

/**
 * Helper function to handle cached data retrieval.
 * Checks if data exists in cache and updates state if found.
 *
 * @template T - The type of items in the cache
 * @param cacheKey - The cache key to look up
 * @param cache - The cache map containing the data
 * @param options - Optional configuration with force flag
 * @param setItems - Function to set items state
 * @param setTotalCount - Function to set total count state
 * @param setIsLoading - Function to set loading state
 * @param setError - Function to set error state
 * @returns True if cached data was found and used, false otherwise
 */
export const handleCachedData = <T>(
  cacheKey: string,
  cache: Map<string, { items: T[]; totalCount: number }>,
  options: { force?: boolean } | undefined,
  setItems: (items: T[]) => void,
  setTotalCount: (count: number) => void,
  setIsLoading: (loading: boolean) => void,
  setError: (error: null) => void
): boolean => {
  const cachedData = cache.get(cacheKey)
  if (cachedData && !options?.force) {
    setItems(cachedData.items)
    setTotalCount(cachedData.totalCount)
    setIsLoading(false)
    setError(null)
    return true
  }
  return false
}
