/**
 * Auto-filled field styling utilities
 * Used to highlight form fields that were automatically populated (e.g., from account autocomplete)
 */

/**
 * CSS classes for auto-filled field ring styling
 * Creates a blue ring around the field to indicate it was auto-populated
 */
export const AUTO_FILLED_RING_CLASSES = 'gba:ring-2 gba:ring-blue-400 gba:rounded-md'

/**
 * Generate className for auto-filled fields with optional base classes
 *
 * @param fieldName - Name of the field to check (e.g., 'companyWebsite', 'addressLine.lines')
 * @param autoFilledFields - Set of field names that were auto-filled
 * @param baseClassName - Optional base CSS classes to include
 * @returns Combined className string with auto-filled styling if applicable
 *
 * @example
 * ```typescript
 * // Without base class
 * className={getAutoFilledClassName('companyWebsite', autoFilledFields)}
 *
 * // With base class
 * className={getAutoFilledClassName('companyWebsite', autoFilledFields, 'gba:w-full')}
 * ```
 */
export const getAutoFilledClassName = (
  fieldName: string,
  autoFilledFields: Set<string>,
  baseClassName?: string
): string => {
  const classes = [baseClassName]

  if (autoFilledFields.has(fieldName)) {
    classes.push(AUTO_FILLED_RING_CLASSES)
  }

  return classes.filter(Boolean).join(' ')
}
