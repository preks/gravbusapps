import type { Descriptor } from '@/common/network/graphql/queryHelpers'

/**
 * Transform UI number range filters to GraphQL format
 * Input:  { fieldName: { min: X, max: Y } }
 * Output: { fieldName: { _gte: X, _lte: Y } }
 */
export function transformNumberRangeFilters(
  filters: Record<string, any>,
  descriptors: Descriptor[]
): Record<string, any> {
  const transformed: Record<string, any> = {}
  const numberDescriptorKeys = new Set(descriptors.filter(d => d.type === 'number').map(d => d.key))

  Object.entries(filters).forEach(([key, value]) => {
    // Skip if not a number field or not a range object
    if (!numberDescriptorKeys.has(key) || !value || typeof value !== 'object' || !('min' in value || 'max' in value)) {
      transformed[key] = value
      return
    }

    // Transform to GraphQL format
    const condition: Record<string, number> = {}
    if (value.min !== undefined && value.min !== null && value.min !== '') {
      condition._gte = Number(value.min)
    }
    if (value.max !== undefined && value.max !== null && value.max !== '') {
      condition._lte = Number(value.max)
    }

    // Only add if we have at least one condition
    if (Object.keys(condition).length > 0) {
      transformed[key] = condition
    }
  })

  return transformed
}
