import type { LocationData } from './types'

function normalizeLocationText(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Whether two trip points represent the same place for "start vs first destination" validation.
 * Consumed by expense-request-wizard `TripScreen` and expense-plan-wizard `PlanTripScreen`.
 * Copy: `trip-start-equals-first-destination` in `forms/_i18n`.
 *
 * - Both domestic: same location text (case-insensitive).
 * - Both abroad: same travel region AND same location text (same city in different regions → not equal).
 * - Mixed domestic/abroad: not equal.
 */
export function tripLocationPointsEqual(a: LocationData, b: LocationData): boolean {
  const locA = normalizeLocationText(a.location || '')
  const locB = normalizeLocationText(b.location || '')
  if (!locA || !locB) {
    return false
  }

  if (!a.isAbroad && !b.isAbroad) {
    return locA === locB
  }

  if (a.isAbroad && b.isAbroad) {
    const regionA = a.travelRegionRef?.trim()
    const regionB = b.travelRegionRef?.trim()
    if (!regionA || !regionB || regionA !== regionB) {
      return false
    }
    return locA === locB
  }

  return false
}
