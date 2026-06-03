export const NOTIFICATIONS_PAGE_SIZE = 10

export function computeHasMore(
  nextPage: number,
  pageItemCount: number,
  total: number,
  unreadTotal: number,
  unreadOnly: boolean,
  pageSize: number = NOTIFICATIONS_PAGE_SIZE
): boolean {
  if (pageItemCount < pageSize) {
    return false
  }

  const effectiveTotal = unreadOnly && unreadTotal > 0 ? unreadTotal : total
  if (effectiveTotal <= 0) {
    return true
  }

  return (nextPage + 1) * pageSize < effectiveTotal
}
