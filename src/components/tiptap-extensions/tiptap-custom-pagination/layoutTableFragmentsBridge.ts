export interface PaginationLayoutTableFragment {
  tablePos: number
  pageNumbers: number[]
  rowCount: number
  paginationChainKey: string
  paginationSplitId: string | null
  fragmentIndex: number
  fragmentCount: number
}

export type PaginationLayoutTableFragmentsStatus = 'missing' | 'stale-doc' | 'stale-layout' | 'ready'

export interface PaginationLayoutTableFragmentsState {
  fragments: PaginationLayoutTableFragment[]
  status: PaginationLayoutTableFragmentsStatus
  documentVersion: number | null
  layoutVersion: number | null
}

interface StoredPaginationLayoutTableFragmentsState {
  fragments: PaginationLayoutTableFragment[]
  doc: object | null
  documentVersion: number | null
  layoutVersion: number | null
}

interface PaginationLayoutViewportElement extends HTMLDivElement {
  __rmLayoutTableFragmentsState?: StoredPaginationLayoutTableFragmentsState
}

export interface WritePaginationLayoutTableFragmentsParams {
  fragments: readonly PaginationLayoutTableFragment[]
  doc: object | null
  documentVersion: number | null
  layoutVersion: number | null
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

function resolveVersionValue(value: string | undefined): number | null {
  const parsedValue = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

export function createMissingPaginationLayoutTableFragmentsState(): PaginationLayoutTableFragmentsState {
  return {
    fragments: [],
    status: 'missing',
    documentVersion: null,
    layoutVersion: null
  }
}

export function writePaginationLayoutTableFragments(
  target: Element | null,
  params: WritePaginationLayoutTableFragmentsParams
): void {
  const viewport = resolvePaginationLayoutViewport(target)
  if (!viewport) {
    return
  }

  viewport.__rmLayoutTableFragmentsState = {
    fragments: normalizePaginationLayoutTableFragments(params.fragments),
    doc: params.doc,
    documentVersion: params.documentVersion,
    layoutVersion: params.layoutVersion
  }
}

export function readPaginationLayoutTableFragmentsState(
  target: Element | null,
  currentDoc: object | null = null
): PaginationLayoutTableFragmentsState {
  const viewport = resolvePaginationLayoutViewport(target)
  if (!viewport) {
    return createMissingPaginationLayoutTableFragmentsState()
  }

  const storedState = viewport.__rmLayoutTableFragmentsState
  if (!storedState) {
    return createMissingPaginationLayoutTableFragmentsState()
  }

  if (currentDoc !== null && storedState.doc !== currentDoc) {
    return {
      fragments: [],
      status: 'stale-doc',
      documentVersion: storedState.documentVersion,
      layoutVersion: storedState.layoutVersion
    }
  }

  const viewportLayoutVersion = resolveVersionValue(viewport.dataset.layoutVersion)
  const viewportDocumentVersion = resolveVersionValue(viewport.dataset.layoutDocumentVersion)
  const hasLayoutMismatch =
    (viewportLayoutVersion !== null &&
      storedState.layoutVersion !== null &&
      viewportLayoutVersion !== storedState.layoutVersion) ||
    (viewportDocumentVersion !== null &&
      storedState.documentVersion !== null &&
      viewportDocumentVersion !== storedState.documentVersion)

  if (hasLayoutMismatch) {
    return {
      fragments: [],
      status: 'stale-layout',
      documentVersion: storedState.documentVersion,
      layoutVersion: storedState.layoutVersion
    }
  }

  return {
    fragments: normalizePaginationLayoutTableFragments(storedState.fragments),
    status: 'ready',
    documentVersion: storedState.documentVersion,
    layoutVersion: storedState.layoutVersion
  }
}

export function readPaginationLayoutTableFragments(
  target: Element | null,
  currentDoc: object | null = null
): PaginationLayoutTableFragment[] {
  return readPaginationLayoutTableFragmentsState(target, currentDoc).fragments
}
