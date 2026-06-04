/**
 * Whether an entity already has outbound shares (for showing "Manage sharing").
 */
export function hasExistingShares(sharedUserCount?: number, sharedWithCount?: number): boolean {
  return (sharedUserCount ?? 0) > 0 || (sharedWithCount ?? 0) > 0
}

/**
 * Prefer a loaded share count when present; otherwise fall back to list summary.
 */
export function resolveHasExistingShares(loadedShareCount: number | undefined, sharedWithCount?: number): boolean {
  if (loadedShareCount !== undefined) {
    return loadedShareCount > 0
  }
  return (sharedWithCount ?? 0) > 0
}
