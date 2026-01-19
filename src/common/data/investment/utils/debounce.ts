/**
 * Debounce utility function for Investment Relations Management
 *
 * Creates a debounced version of a function that delays invoking func until
 * after wait milliseconds have elapsed since the last time the debounced
 * function was invoked.
 *
 * @param func The function to debounce
 * @param wait The number of milliseconds to delay
 * @returns A debounced version of the function
 *
 * @example
 * ```typescript
 * const debouncedSearch = debounce((searchTerm: string) => {
 *   performSearch(searchTerm);
 * }, 300);
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Default debounce delay for search operations in Investment forms
 */
export const DEFAULT_SEARCH_DEBOUNCE_DELAY = 300

/**
 * Default debounce delay for data loading operations
 */
export const DEFAULT_LOAD_DEBOUNCE_DELAY = 500
