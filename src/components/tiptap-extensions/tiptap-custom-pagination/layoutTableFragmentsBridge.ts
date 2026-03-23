export interface PaginationLayoutTableFragment {
  tablePos: number
  pageNumbers: number[]
  rowCount: number
  paginationChainKey: string
  paginationSplitId: string | null
  fragmentIndex: number
  fragmentCount: number
}

interface PaginationLayoutViewportElement extends HTMLDivElement {
  __rmLayoutTableFragments?: PaginationLayoutTableFragment[]
  __rmLayoutTableFragmentsDoc?: object | null
}

function normalizePageNumbers(pageNumbers: number[]): number[] {
  return Array.from(new Set(pageNumbers.filter(pageNumber => Number.isInteger(pageNumber) && pageNumber > 0))).sort(
    (left, right) => left - right
  )
}

function normalizePaginationLayoutTableFragments(
  fragments: readonly PaginationLayoutTableFragment[]
): PaginationLayoutTableFragment[] {
  return [...fragments]
    .map(fragment => ({
      tablePos: fragment.tablePos,
      pageNumbers: normalizePageNumbers(fragment.pageNumbers),
      rowCount: fragment.rowCount,
      paginationChainKey: fragment.paginationChainKey,
      paginationSplitId: fragment.paginationSplitId,
      fragmentIndex: fragment.fragmentIndex,
      fragmentCount: fragment.fragmentCount
    }))
    .sort((left, right) => {
      if (left.paginationChainKey !== right.paginationChainKey) {
        return left.paginationChainKey.localeCompare(right.paginationChainKey)
      }

      if (left.fragmentIndex !== right.fragmentIndex) {
        return left.fragmentIndex - right.fragmentIndex
      }

      return left.tablePos - right.tablePos
    })
}

function resolvePaginationLayoutViewport(target: Element | null): PaginationLayoutViewportElement | null {
  const viewport = target?.closest('.document-editor-viewport')
  return viewport instanceof HTMLDivElement ? (viewport as PaginationLayoutViewportElement) : null
}

export function writePaginationLayoutTableFragments(
  target: Element | null,
  fragments: readonly PaginationLayoutTableFragment[],
  doc: object | null
): void {
  const viewport = resolvePaginationLayoutViewport(target)
  if (!viewport) {
    return
  }

  viewport.__rmLayoutTableFragments = normalizePaginationLayoutTableFragments(fragments)
  viewport.__rmLayoutTableFragmentsDoc = doc
}

export function readPaginationLayoutTableFragments(
  target: Element | null,
  currentDoc: object | null = null
): PaginationLayoutTableFragment[] {
  const viewport = resolvePaginationLayoutViewport(target)
  if (!viewport) {
    return []
  }

  if (currentDoc !== null && viewport.__rmLayoutTableFragmentsDoc !== currentDoc) {
    return []
  }

  return normalizePaginationLayoutTableFragments(viewport.__rmLayoutTableFragments ?? [])
}
