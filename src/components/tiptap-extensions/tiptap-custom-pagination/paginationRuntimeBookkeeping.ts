const hydrationOwnedDocChanges = new WeakMap<object, number>()
const paginationOwnedGrowthSuppressionPageCounts = new WeakMap<object, number>()

export function getPaginationOwnedGrowthSuppressionPageCount(editor: object) {
  return paginationOwnedGrowthSuppressionPageCounts.get(editor) ?? null
}

export function clearPaginationOwnedGrowthSuppression(editor: object) {
  paginationOwnedGrowthSuppressionPageCounts.delete(editor)
}

export function setPaginationOwnedGrowthSuppression(editor: object, pageCount: number) {
  paginationOwnedGrowthSuppressionPageCounts.set(editor, pageCount)
}

export function markNextPaginationHydrationDocChange(editor: object) {
  const currentCount = hydrationOwnedDocChanges.get(editor) ?? 0
  hydrationOwnedDocChanges.set(editor, currentCount + 1)
}

export function consumePaginationHydrationDocChange(editor: object) {
  const currentCount = hydrationOwnedDocChanges.get(editor) ?? 0
  if (currentCount <= 0) {
    return false
  }

  if (currentCount === 1) {
    hydrationOwnedDocChanges.delete(editor)
  } else {
    hydrationOwnedDocChanges.set(editor, currentCount - 1)
  }

  return true
}
