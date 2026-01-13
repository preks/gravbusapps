import { TravelLocation, TravelLocationLabels } from '../../../types/ExpenseEnums'

/**
 * Helper to create field mappings for common patterns
 * Used with useTableSorting for client-side sorting
 */
export const createFieldMappings = {
  /**
   * Simple string field
   */
  string:
    <T>(getter: (item: T) => string | undefined) =>
    (item: T) =>
      getter(item) || '',

  /**
   * Simple number field
   */
  number:
    <T>(getter: (item: T) => number | undefined) =>
    (item: T) =>
      getter(item) || 0,

  /**
   * Boolean field (converts to 1/0 for sorting)
   */
  boolean:
    <T>(getter: (item: T) => boolean | undefined) =>
    (item: T) =>
      getter(item) ? 1 : 0,

  /**
   * Date field (for validity dates)
   */
  date:
    <T>(getter: (item: T) => string | undefined, defaultValue?: string) =>
    (item: T) =>
      getter(item) || defaultValue || '',

  /**
   * Nested object field (e.g., expenseGroup.code)
   */
  nested:
    <T>(getter: (item: T) => { code?: string; name?: string; value?: string } | undefined, fallback?: string) =>
    (item: T) => {
      const obj = getter(item)
      return obj?.code || obj?.name || obj?.value || fallback || ''
    },

  /**
   * Travel location (uses display labels)
   */
  travelLocation:
    <T>(getter: (item: T) => string | undefined) =>
    (item: T) => {
      const location = getter(item)
      return TravelLocationLabels[location as TravelLocation] || location || ''
    },

  /**
   * Calculation field (uses display value from options)
   */
  calculation:
    <T>(getter: (item: T) => string | undefined, calculationOptions: Array<{ id: string; value: string }>) =>
    (item: T) => {
      const calcId = getter(item)
      const calc = calculationOptions.find(opt => opt.id === calcId)
      return calc?.value || calcId || ''
    }
}
