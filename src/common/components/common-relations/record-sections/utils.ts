/**
 * Utility function to create a getPages function for sections with carousel support.
 * Handles both array and single item props, returning an array of pages.
 *
 * @template T - The type of the page items
 * @template P - The type of the props object
 */
export const createGetPages = <T, P>(
  getArray: (props: P) => T[] | undefined,
  getSingle: (props: P) => T | undefined
) => {
  return (props: P): T[] => {
    const list = Array.isArray(getArray(props)) ? getArray(props).filter(Boolean) : []
    const single = getSingle(props)
    if (list.length > 0) {
      return list
    }
    if (single) {
      return [single]
    }
    return []
  }
}
