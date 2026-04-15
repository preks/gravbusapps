/**
 * Sort CRM/IRM activities by when they occurred (occurredAt), falling back to createdAt.
 * Newest first; missing or invalid datetimes last (aligned with DESC_NULLS_LAST UX).
 */
export function activityOccurredAtSortMs(occurredAt?: string | null, createdAt?: string | null): number {
  const iso = occurredAt || createdAt || undefined
  if (!iso) return Number.NEGATIVE_INFINITY
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return Number.NEGATIVE_INFINITY
  return t
}

export function compareActivitiesByOccurredAtDesc(
  a: { occurredAt?: string | null; createdAt?: string | null },
  b: { occurredAt?: string | null; createdAt?: string | null }
): number {
  return activityOccurredAtSortMs(b.occurredAt, b.createdAt) - activityOccurredAtSortMs(a.occurredAt, a.createdAt)
}

export function sortActivitiesByOccurredAtDesc<T extends { occurredAt?: string | null; createdAt?: string | null }>(
  activities: T[]
): T[] {
  return [...activities].sort(compareActivitiesByOccurredAtDesc)
}
