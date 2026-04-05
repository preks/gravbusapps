import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorView } from '@tiptap/pm/view'
import type { PaginationLayoutTableFragment } from '../tiptap-custom-pagination/layoutTableFragmentsBridge'
import { logPaginationDebug } from '../tiptap-custom-pagination/utils'
import { getTablePaginationSplitId, getTableRuntimeChainKey } from './tablePaginationIdentity'
import {
  findSafeSplitRow,
  getTableRowCount,
  getTableRowEntries,
  getTableRows,
  isHeaderRow,
  resolveMergedSplitIndex
} from './tablePaginationUtils'

export interface TablePaginationBodyBand {
  pageNumber: number
  top: number
  bottom: number
}

export interface TableOverflowSplitCandidate {
  mode: 'split' | 'rebalance'
  tablePos: number
  splitRowIndex: number
  paginationChainKey: string
  paginationSplitId: string | null
}

export interface MergeableTableFragmentsCandidate {
  firstTablePos: number
  secondTablePos: number
  paginationChainKey: string
  paginationSplitId: string
}

type TableRowEntry = {
  rowPos: number
  rowIndex: number
}

type TableSplitCandidateScanOptions = {
  allowedTablePositions?: ReadonlySet<number> | null
}

type TableMergeCandidateScanOptions = {
  allowedChainKeys?: ReadonlySet<string> | null
}

type EditorMeasurementResolver = {
  getElementTopInEditor: (element: HTMLElement) => number
  getElementBottomInEditor: (element: HTMLElement) => number
  getMeasuredElementBottomInEditor: (element: HTMLElement) => number
}

function summarizeSplitCandidate(candidate: TableOverflowSplitCandidate) {
  return {
    key: `${candidate.paginationChainKey}:${candidate.mode}:${candidate.tablePos}:${candidate.splitRowIndex}`,
    paginationChainKey: candidate.paginationChainKey,
    mode: candidate.mode,
    tablePos: candidate.tablePos,
    splitRowIndex: candidate.splitRowIndex,
    paginationSplitId: candidate.paginationSplitId
  }
}

function summarizeMergeCandidate(candidate: MergeableTableFragmentsCandidate) {
  return {
    key: `${candidate.paginationChainKey}:${candidate.firstTablePos}:${candidate.secondTablePos}`,
    paginationChainKey: candidate.paginationChainKey,
    firstTablePos: candidate.firstTablePos,
    secondTablePos: candidate.secondTablePos,
    paginationSplitId: candidate.paginationSplitId
  }
}

function groupPaginationLayoutTableFragments(
  layoutTableFragments: readonly PaginationLayoutTableFragment[]
): Map<string, PaginationLayoutTableFragment[]> {
  const fragmentsByChainKey = new Map<string, PaginationLayoutTableFragment[]>()

  layoutTableFragments.forEach(fragment => {
    const existingChainFragments = fragmentsByChainKey.get(fragment.paginationChainKey) ?? []
    existingChainFragments.push(fragment)
    fragmentsByChainKey.set(fragment.paginationChainKey, existingChainFragments)
  })

  fragmentsByChainKey.forEach(fragments => {
    fragments.sort((left, right) => {
      if (left.fragmentIndex !== right.fragmentIndex) {
        return left.fragmentIndex - right.fragmentIndex
      }

      return left.tablePos - right.tablePos
    })
  })

  return fragmentsByChainKey
}

function resolveLayoutFragmentSplitTablePositions(
  layoutTableFragments: readonly PaginationLayoutTableFragment[]
): Set<number> {
  const tablePositions = new Set<number>()

  groupPaginationLayoutTableFragments(layoutTableFragments).forEach(chainFragments => {
    const hasCrossPagePressure = chainFragments.some(fragment => fragment.pageNumbers.length > 1)
    if (!hasCrossPagePressure) {
      return
    }

    if (chainFragments.length === 1) {
      const onlyFragment = chainFragments[0]
      if (onlyFragment) {
        tablePositions.add(onlyFragment.tablePos)
      }
      return
    }

    chainFragments.forEach(fragment => {
      tablePositions.add(fragment.tablePos)
    })
  })

  return tablePositions
}

function resolveLayoutFragmentMergeChainKeys(
  layoutTableFragments: readonly PaginationLayoutTableFragment[]
): Set<string> {
  const chainKeys = new Set<string>()

  groupPaginationLayoutTableFragments(layoutTableFragments).forEach((chainFragments, chainKey) => {
    if (chainFragments.length > 1) {
      chainKeys.add(chainKey)
    }
  })

  return chainKeys
}

const TABLE_SPLIT_OVERFLOW_HYSTERESIS_PX = 2
const TABLE_SPLIT_RETURN_HYSTERESIS_PX = 10
const TABLE_MERGE_SAFETY_MARGIN_PX = 12

function readMeasuredElementHeight(element: HTMLElement | null): number {
  if (!element) return 0

  let contentRectHeight = 0
  if (typeof document !== 'undefined' && typeof document.createRange === 'function') {
    const range = document.createRange()
    range.selectNodeContents(element)
    if (typeof range.getBoundingClientRect === 'function') {
      contentRectHeight = range.getBoundingClientRect().height
    }
  }

  const firstChild = element.firstElementChild instanceof HTMLElement ? element.firstElementChild : null
  const lastChild = element.lastElementChild instanceof HTMLElement ? element.lastElementChild : null
  const childrenRectHeight =
    firstChild && lastChild
      ? Math.max(0, lastChild.getBoundingClientRect().bottom - firstChild.getBoundingClientRect().top)
      : 0

  if (contentRectHeight > 0 || childrenRectHeight > 0) {
    return Math.max(contentRectHeight, childrenRectHeight)
  }

  return Math.max(element.scrollHeight, element.clientHeight, element.offsetHeight, 0)
}

function getElementLayoutHeight(element: HTMLElement): number {
  const rectHeight = typeof element.getBoundingClientRect === 'function' ? element.getBoundingClientRect().height : 0
  const measuredContentHeight = readMeasuredElementHeight(element)
  let trailingEmptyLineHeight = 0

  if (measuredContentHeight <= 0 && element.matches('p') && element.querySelector('br.ProseMirror-trailingBreak')) {
    const computedStyle = globalThis.window !== undefined ? globalThis.window.getComputedStyle(element) : null
    const parsedLineHeight = Number.parseFloat(computedStyle?.lineHeight ?? '')
    const parsedFontSize = Number.parseFloat(computedStyle?.fontSize ?? '')

    if (Number.isFinite(parsedLineHeight)) {
      trailingEmptyLineHeight = parsedLineHeight
    } else if (Number.isFinite(parsedFontSize)) {
      trailingEmptyLineHeight = parsedFontSize * 1.2
    }
  }

  return Math.max(
    element.offsetHeight,
    element.clientHeight,
    element.scrollHeight,
    rectHeight,
    measuredContentHeight,
    trailingEmptyLineHeight
  )
}

function getElementTopInEditor(editorDom: HTMLElement, element: HTMLElement): number {
  const editorRect = editorDom.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  return elementRect.top - editorRect.top + editorDom.scrollTop
}

function getElementBottomInEditor(editorDom: HTMLElement, element: HTMLElement): number {
  const editorRect = editorDom.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  return elementRect.bottom - editorRect.top + editorDom.scrollTop
}

function getMeasuredElementBottomInEditor(editorDom: HTMLElement, element: HTMLElement): number {
  const layoutHeight = getElementLayoutHeight(element)
  return Math.max(
    getElementBottomInEditor(editorDom, element),
    getElementTopInEditor(editorDom, element) + layoutHeight
  )
}

function createEditorMeasurementResolver(editorDom: HTMLElement): EditorMeasurementResolver {
  const editorRectTop = editorDom.getBoundingClientRect().top
  const editorScrollTop = editorDom.scrollTop

  const getTopInEditor = (element: HTMLElement) => {
    const elementRect = element.getBoundingClientRect()
    return elementRect.top - editorRectTop + editorScrollTop
  }

  const getBottomInEditor = (element: HTMLElement) => {
    const elementRect = element.getBoundingClientRect()
    return elementRect.bottom - editorRectTop + editorScrollTop
  }

  return {
    getElementTopInEditor: getTopInEditor,
    getElementBottomInEditor: getBottomInEditor,
    getMeasuredElementBottomInEditor: (element: HTMLElement) => getMeasuredElementBottomInEditor(editorDom, element)
  }
}

function isPaginationMeasurementHelper(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false
  if (element.dataset.rmPagination !== undefined) return true

  return (
    element.classList.contains('ProseMirror-widget') ||
    element.classList.contains('rm-page-body-layer') ||
    element.classList.contains('rm-first-page-header') ||
    element.classList.contains('rm-page-break') ||
    element.classList.contains('rm-page-spacer') ||
    element.classList.contains('breaker')
  )
}

function getPreviousContentElement(element: HTMLElement): HTMLElement | null {
  let previous = element.previousElementSibling

  while (previous) {
    if (!isPaginationMeasurementHelper(previous) && previous instanceof HTMLElement) {
      return previous
    }
    previous = previous.previousElementSibling
  }

  return null
}

function getTableMeasurementElement(element: HTMLElement): HTMLElement {
  if (!element.classList.contains('tableWrapper')) {
    return element
  }

  // Prefer a child <table> for measurement; wrapper heights can be inflated by CSS.
  const directTable = Array.from(element.children).find(child => child instanceof HTMLTableElement)
  if (directTable instanceof HTMLTableElement) {
    return directTable
  }

  const nestedTable = element.querySelector('table')
  if (nestedTable instanceof HTMLTableElement) {
    return nestedTable
  }

  return element
}

function getMeasuredTableRows(tableMeasurementElement: HTMLElement): HTMLTableRowElement[] {
  if (tableMeasurementElement instanceof HTMLTableElement) {
    return Array.from(tableMeasurementElement.rows)
  }

  return Array.from(tableMeasurementElement.getElementsByTagName('tr'))
}

function createTableRowElementResolver(view: EditorView, tableMeasurementElement: HTMLElement | null) {
  let didResolveMeasuredRows = false
  let measuredRows: HTMLTableRowElement[] | null = null

  return (rowEntry: TableRowEntry): HTMLTableRowElement | null => {
    const directRowDom = view.nodeDOM(rowEntry.rowPos)
    if (directRowDom instanceof HTMLTableRowElement) {
      return directRowDom
    }

    if (!tableMeasurementElement) {
      return null
    }

    if (!didResolveMeasuredRows) {
      measuredRows = getMeasuredTableRows(tableMeasurementElement)
      didResolveMeasuredRows = true
    }

    return measuredRows?.[rowEntry.rowIndex] ?? null
  }
}

export function hasPendingTableMeasurements(view: EditorView): boolean {
  let pending = false
  const seenTableIds = new Set<string>()
  let duplicateLogged = false

  view.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'table') return true

    const rowEntries = getTableRowEntries(node, pos)
    const columnCount = getTableColumnCount(node)
    if (rowEntries.length < 2 || columnCount < 1) {
      return true
    }

    const tableDom = view.nodeDOM(pos)
    if (!(tableDom instanceof HTMLElement)) {
      pending = true
      return false
    }

    const wrapper = tableDom.classList.contains('tableWrapper') ? tableDom : tableDom.closest('.tableWrapper')
    const tableId =
      (tableDom as HTMLElement).dataset.tableId ??
      (tableDom as HTMLElement).dataset.id ??
      (wrapper as HTMLElement | null)?.dataset?.tableId ??
      (wrapper as HTMLElement | null)?.dataset?.id
    if (tableId) {
      if (seenTableIds.has(tableId)) {
        if (!duplicateLogged) {
          console.warn('[tablePagination] Duplicate table wrapper detected for tableId', tableId)
          duplicateLogged = true
        }
        // Skip measuring duplicates to avoid runaway height
        return true
      }
      seenTableIds.add(tableId)
    }

    const tableMeasurementElement = getTableMeasurementElement(tableDom)
    if (getElementLayoutHeight(tableMeasurementElement) <= 0) {
      pending = true
      return false
    }

    const resolveRowElement = createTableRowElementResolver(view, tableMeasurementElement)
    for (const rowEntry of rowEntries) {
      if (!(resolveRowElement(rowEntry) instanceof HTMLTableRowElement)) {
        pending = true
        return false
      }
    }

    return true
  })

  return pending
}

function getRepeatedHeaderHeight(
  firstTableNode: ProseMirrorNode,
  secondTableNode: ProseMirrorNode,
  secondTableEl: HTMLElement
) {
  const firstRows = getTableRows(firstTableNode)
  const secondRows = getTableRows(secondTableNode)
  if (!isHeaderRow(firstRows[0]) || !isHeaderRow(secondRows[0])) {
    return 0
  }

  const secondHeaderRow = getMeasuredTableRows(secondTableEl)[0]
  return secondHeaderRow instanceof HTMLElement ? getElementLayoutHeight(secondHeaderRow) : 0
}

function getProjectedMergedTableBottom(
  measurementResolver: EditorMeasurementResolver,
  firstTableNode: ProseMirrorNode,
  firstTableEl: HTMLElement,
  secondTableNode: ProseMirrorNode,
  secondTableEl: HTMLElement
) {
  const firstMeasurementElement = getTableMeasurementElement(firstTableEl)
  const secondMeasurementElement = getTableMeasurementElement(secondTableEl)
  const firstBottom = measurementResolver.getMeasuredElementBottomInEditor(firstMeasurementElement)
  const secondTop = measurementResolver.getElementTopInEditor(secondMeasurementElement)
  const secondBottom = measurementResolver.getMeasuredElementBottomInEditor(secondMeasurementElement)
  const gapBetweenTables = Math.max(0, secondTop - firstBottom)
  const repeatedHeaderHeight = getRepeatedHeaderHeight(firstTableNode, secondTableNode, secondMeasurementElement)

  return secondBottom - gapBetweenTables - repeatedHeaderHeight
}

function getBandIndexForOffset(bodyBands: TablePaginationBodyBand[], offset: number, tolerance: number) {
  let low = 0
  let high = bodyBands.length - 1
  let resolvedIndex = high

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    if (offset >= bodyBands[mid].bottom - tolerance) {
      low = mid + 1
      continue
    }

    resolvedIndex = mid
    high = mid - 1
  }

  return resolvedIndex
}

function isOffsetWithinBand(band: Pick<TablePaginationBodyBand, 'top' | 'bottom'>, offset: number, tolerance: number) {
  return offset >= band.top - tolerance && offset <= band.bottom + tolerance
}

function getAdjacentPaginationTableFragment(
  doc: ProseMirrorNode,
  tablePos: number,
  direction: 'previous' | 'next',
  paginationSplitId: string
) {
  const $tablePos = doc.resolve(tablePos)
  const parent = $tablePos.node($tablePos.depth)
  const tableIndex = $tablePos.index($tablePos.depth)
  const adjacentIndex = direction === 'previous' ? tableIndex - 1 : tableIndex + 1

  if (adjacentIndex < 0 || adjacentIndex >= parent.childCount) {
    return null
  }

  let adjacentPos = $tablePos.start($tablePos.depth)
  for (let index = 0; index < adjacentIndex; index += 1) {
    adjacentPos += parent.child(index).nodeSize
  }

  const adjacentNode = parent.child(adjacentIndex)
  if (adjacentNode.type.name !== 'table' || getTablePaginationSplitId(adjacentNode) !== paginationSplitId) {
    return null
  }

  return {
    node: adjacentNode,
    pos: adjacentPos,
    rowCount: getTableRowCount(adjacentNode)
  }
}

function getTableColumnCount(tableNode: ProseMirrorNode) {
  const firstRow = getTableRows(tableNode)[0]
  if (!firstRow) return 1

  let columnCount = 0
  firstRow.forEach(cellNode => {
    columnCount += Math.max(1, Number(cellNode.attrs.colspan ?? 1))
  })

  return Math.max(1, columnCount)
}

function getSplitIndexForPushedTable(options: {
  view: EditorView
  measurementResolver: EditorMeasurementResolver
  tableNode: ProseMirrorNode
  tablePos: number
  tableMeasurementElement: HTMLElement | null
  bodyBands: TablePaginationBodyBand[]
  tolerance: number
  currentSplitRowCount: number | null
}) {
  const {
    view,
    measurementResolver,
    tableNode,
    tablePos,
    tableMeasurementElement,
    bodyBands,
    tolerance,
    currentSplitRowCount
  } = options
  const tableDom = view.nodeDOM(tablePos)
  if (!(tableDom instanceof HTMLElement) || !(tableMeasurementElement instanceof HTMLElement)) return null

  const tableTop = measurementResolver.getElementTopInEditor(tableMeasurementElement)
  const tableBandIndex = getBandIndexForOffset(bodyBands, tableTop, tolerance)
  if (tableBandIndex <= 0 || tableBandIndex >= bodyBands.length) return null

  const previousBand = bodyBands[tableBandIndex - 1]
  const previousContentElement = getPreviousContentElement(tableDom)
  if (!previousBand || !(previousContentElement instanceof HTMLElement)) return null

  const previousContentBottom = measurementResolver.getMeasuredElementBottomInEditor(previousContentElement)
  if (!isOffsetWithinBand(previousBand, previousContentBottom, tolerance)) return null

  const availableTop = previousContentBottom + getCollapsedBlockGap(previousContentElement, tableMeasurementElement)
  const availableHeight = previousBand.bottom - availableTop
  if (availableHeight <= tolerance) return null

  const rowEntries = getTableRowEntries(tableNode, tablePos)
  if (rowEntries.length < 2) return null

  const resolveRowElement = createTableRowElementResolver(view, tableMeasurementElement)
  for (const rowEntry of rowEntries) {
    const rowDom = resolveRowElement(rowEntry)
    if (!(rowDom instanceof HTMLTableRowElement)) continue

    const rowBottom = measurementResolver.getElementBottomInEditor(rowDom)
    const rowHeight = Math.max(0, rowBottom - measurementResolver.getElementTopInEditor(rowDom))
    const consumedHeight = Math.max(0, rowBottom - tableTop)
    const spareSpace = availableHeight - consumedHeight

    if (rowHeight >= availableHeight - tolerance) continue
    if (consumedHeight > availableHeight + tolerance) continue
    if (currentSplitRowCount !== null && spareSpace < TABLE_SPLIT_RETURN_HYSTERESIS_PX) break

    const splitIndex = rowEntry.rowIndex + 1
    return splitIndex < rowEntries.length ? splitIndex : null
  }

  return null
}

function getElementMarginTop(element: HTMLElement): number {
  if (globalThis.window === undefined) return 0
  const computedStyle = globalThis.window.getComputedStyle(element)
  const marginTop = Number.parseFloat(computedStyle.marginTop ?? '')
  return Number.isFinite(marginTop) ? marginTop : 0
}

function getElementMarginBottom(element: HTMLElement): number {
  if (globalThis.window === undefined) return 0
  const computedStyle = globalThis.window.getComputedStyle(element)
  const marginBottom = Number.parseFloat(computedStyle.marginBottom ?? '')
  return Number.isFinite(marginBottom) ? marginBottom : 0
}

function getCollapsedBlockGap(previousElement: HTMLElement, nextElement: HTMLElement): number {
  return Math.max(getElementMarginBottom(previousElement), getElementMarginTop(nextElement))
}

function scanOverflowingTableSplitCandidates(
  view: EditorView,
  bodyBands: TablePaginationBodyBand[],
  options: TableSplitCandidateScanOptions = {}
): TableOverflowSplitCandidate[] {
  if (!bodyBands.length) {
    return []
  }

  const tolerance = 1
  const overflowThreshold = tolerance + TABLE_SPLIT_OVERFLOW_HYSTERESIS_PX
  const candidates: TableOverflowSplitCandidate[] = []
  const measurementResolver = createEditorMeasurementResolver(view.dom)

  view.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'table') return true
    if (options.allowedTablePositions && !options.allowedTablePositions.has(pos)) {
      return true
    }

    const rowEntries = getTableRowEntries(node, pos)
    const columnCount = getTableColumnCount(node)
    const paginationChainKey = getTableRuntimeChainKey(node, pos)
    const paginationSplitId = getTablePaginationSplitId(node)
    const previousFragment =
      paginationSplitId == null
        ? null
        : getAdjacentPaginationTableFragment(view.state.doc, pos, 'previous', paginationSplitId)
    const nextFragment =
      paginationSplitId == null
        ? null
        : getAdjacentPaginationTableFragment(view.state.doc, pos, 'next', paginationSplitId)

    if (rowEntries.length < 2 || columnCount < 1) return true

    const tableDom = view.nodeDOM(pos)
    const tableMeasurementElement = tableDom instanceof HTMLElement ? getTableMeasurementElement(tableDom) : null

    let tableCandidate: TableOverflowSplitCandidate | null = null

    const pushedSplitIndex = getSplitIndexForPushedTable({
      view,
      measurementResolver,
      tableNode: node,
      tablePos: pos,
      tableMeasurementElement,
      bodyBands,
      tolerance,
      currentSplitRowCount: previousFragment?.rowCount ?? null
    })

    if (pushedSplitIndex !== null) {
      const safeSplitIndex = findSafeSplitRow(node, pushedSplitIndex)
      if (safeSplitIndex >= 1 && safeSplitIndex < rowEntries.length) {
        tableCandidate =
          previousFragment && paginationSplitId != null
            ? {
                mode: 'rebalance',
                tablePos: previousFragment.pos,
                paginationChainKey,
                splitRowIndex: resolveMergedSplitIndex(previousFragment.node, node, safeSplitIndex),
                paginationSplitId
              }
            : { mode: 'split', tablePos: pos, splitRowIndex: safeSplitIndex, paginationChainKey, paginationSplitId }
      }
      if (tableCandidate) {
        candidates.push(tableCandidate)
        return true
      }
    }

    const resolveRowElement = createTableRowElementResolver(view, tableMeasurementElement)
    for (const rowEntry of rowEntries) {
      const rowDom = resolveRowElement(rowEntry)
      if (!(rowDom instanceof HTMLTableRowElement)) continue

      const rowTop = measurementResolver.getElementTopInEditor(rowDom)
      const rowBottom = measurementResolver.getElementBottomInEditor(rowDom)
      const currentBand = bodyBands[getBandIndexForOffset(bodyBands, rowTop, tolerance)]
      if (!currentBand) continue

      const rowHeight = Math.max(0, rowBottom - rowTop)
      if (rowHeight >= currentBand.bottom - currentBand.top - tolerance) continue
      if (rowBottom <= currentBand.bottom + overflowThreshold) continue
      if (rowEntry.rowIndex <= 0 || rowEntry.rowIndex >= rowEntries.length) continue

      const safeSplitIndex = findSafeSplitRow(node, rowEntry.rowIndex)
      if (safeSplitIndex < 1 || safeSplitIndex >= rowEntries.length) continue

      tableCandidate =
        nextFragment && paginationSplitId != null
          ? { mode: 'rebalance', tablePos: pos, splitRowIndex: safeSplitIndex, paginationChainKey, paginationSplitId }
          : { mode: 'split', tablePos: pos, splitRowIndex: safeSplitIndex, paginationChainKey, paginationSplitId }
      break
    }

    if (tableCandidate) {
      candidates.push(tableCandidate)
    }

    return true
  })

  return candidates
}

export function findOverflowingTableSplitCandidates(
  view: EditorView,
  bodyBands: TablePaginationBodyBand[]
): TableOverflowSplitCandidate[] {
  const candidates = scanOverflowingTableSplitCandidates(view, bodyBands)
  logPaginationDebug('table-detection-split-candidates', {
    bodyBandCount: bodyBands.length,
    candidateCount: candidates.length,
    candidates: candidates.map(summarizeSplitCandidate)
  })
  return candidates
}

export function findOverflowingTableSplitCandidatesFromLayoutFragments(
  view: EditorView,
  bodyBands: TablePaginationBodyBand[],
  layoutTableFragments: readonly PaginationLayoutTableFragment[]
): TableOverflowSplitCandidate[] {
  const allowedTablePositions = resolveLayoutFragmentSplitTablePositions(layoutTableFragments)
  const candidates =
    allowedTablePositions.size === 0
      ? []
      : scanOverflowingTableSplitCandidates(view, bodyBands, {
          allowedTablePositions
        })

  logPaginationDebug('table-detection-fragment-split-candidates', {
    bodyBandCount: bodyBands.length,
    layoutTableFragmentCount: layoutTableFragments.length,
    scannedTableCount: allowedTablePositions.size,
    candidateCount: candidates.length,
    candidates: candidates.map(summarizeSplitCandidate)
  })

  return candidates
}

export function findOverflowingTableSplit(
  view: EditorView,
  bodyBands: TablePaginationBodyBand[]
): TableOverflowSplitCandidate | null {
  return findOverflowingTableSplitCandidates(view, bodyBands)[0] ?? null
}

function scanMergeableTableFragmentCandidates(
  view: EditorView,
  bodyBands: TablePaginationBodyBand[],
  options: TableMergeCandidateScanOptions = {}
): MergeableTableFragmentsCandidate[] {
  if (!bodyBands.length) {
    return []
  }

  const tolerance = 1
  const measurementResolver = createEditorMeasurementResolver(view.dom)
  let previousTable: {
    node: ProseMirrorNode
    pos: number
    paginationChainKey: string
    paginationSplitId: string
    bandIndex: number
    tableDom: HTMLElement
  } | null = null
  const candidates: MergeableTableFragmentsCandidate[] = []

  view.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'table') return true

    const paginationChainKey = getTableRuntimeChainKey(node, pos)
    if (options.allowedChainKeys && !options.allowedChainKeys.has(paginationChainKey)) {
      previousTable = null
      return true
    }
    const paginationSplitId = getTablePaginationSplitId(node)
    if (!paginationSplitId) {
      previousTable = null
      return true
    }

    const tableDom = view.nodeDOM(pos)
    if (!(tableDom instanceof HTMLElement)) {
      previousTable = null
      return true
    }

    const tableMeasurementElement = getTableMeasurementElement(tableDom)
    const bandIndex = getBandIndexForOffset(
      bodyBands,
      measurementResolver.getElementTopInEditor(tableMeasurementElement),
      tolerance
    )
    const currentBand = bodyBands[bandIndex]
    const tableBottom = measurementResolver.getMeasuredElementBottomInEditor(tableMeasurementElement)

    if (!currentBand || tableBottom > currentBand.bottom - TABLE_MERGE_SAFETY_MARGIN_PX) {
      previousTable = { node, pos, paginationChainKey, paginationSplitId, bandIndex, tableDom }
      return true
    }

    const prevTable = previousTable
    if (
      prevTable?.paginationChainKey === paginationChainKey &&
      prevTable.paginationSplitId === paginationSplitId &&
      pos === prevTable.pos + prevTable.node.nodeSize &&
      bandIndex === prevTable.bandIndex
    ) {
      const projectedMergedBottom = getProjectedMergedTableBottom(
        measurementResolver,
        prevTable.node,
        prevTable.tableDom,
        node,
        tableDom
      )
      if (projectedMergedBottom <= currentBand.bottom - TABLE_MERGE_SAFETY_MARGIN_PX) {
        candidates.push({
          firstTablePos: prevTable.pos,
          secondTablePos: pos,
          paginationChainKey,
          paginationSplitId
        })
      }
    }

    previousTable = { node, pos, paginationChainKey, paginationSplitId, bandIndex, tableDom }
    return true
  })

  return candidates
}

export function findMergeableTableFragmentCandidates(
  view: EditorView,
  bodyBands: TablePaginationBodyBand[]
): MergeableTableFragmentsCandidate[] {
  const candidates = scanMergeableTableFragmentCandidates(view, bodyBands)
  logPaginationDebug('table-detection-merge-candidates', {
    bodyBandCount: bodyBands.length,
    candidateCount: candidates.length,
    candidates: candidates.map(summarizeMergeCandidate)
  })
  return candidates
}

export function findMergeableTableFragmentCandidatesFromLayoutFragments(
  view: EditorView,
  bodyBands: TablePaginationBodyBand[],
  layoutTableFragments: readonly PaginationLayoutTableFragment[]
): MergeableTableFragmentsCandidate[] {
  const allowedChainKeys = resolveLayoutFragmentMergeChainKeys(layoutTableFragments)
  const candidates =
    allowedChainKeys.size === 0
      ? []
      : scanMergeableTableFragmentCandidates(view, bodyBands, {
          allowedChainKeys
        })

  logPaginationDebug('table-detection-fragment-merge-candidates', {
    bodyBandCount: bodyBands.length,
    layoutTableFragmentCount: layoutTableFragments.length,
    scannedChainCount: allowedChainKeys.size,
    candidateCount: candidates.length,
    candidates: candidates.map(summarizeMergeCandidate)
  })

  return candidates
}

export function findMergeableTableFragments(
  view: EditorView,
  bodyBands: TablePaginationBodyBand[]
): MergeableTableFragmentsCandidate | null {
  return findMergeableTableFragmentCandidates(view, bodyBands)[0] ?? null
}

export function findAdjacentPaginationTableFragments(doc: ProseMirrorNode): MergeableTableFragmentsCandidate | null {
  let previousTable: {
    node: ProseMirrorNode
    pos: number
    paginationChainKey: string
    paginationSplitId: string
  } | null = null
  let candidate: MergeableTableFragmentsCandidate | null = null

  doc.descendants((node, pos) => {
    if (candidate || node.type.name !== 'table') return !candidate

    const paginationChainKey = getTableRuntimeChainKey(node, pos)
    const paginationSplitId = getTablePaginationSplitId(node)
    if (!paginationSplitId) {
      previousTable = null
      return !candidate
    }

    if (
      previousTable?.paginationChainKey === paginationChainKey &&
      previousTable.paginationSplitId === paginationSplitId &&
      pos === previousTable.pos + previousTable.node.nodeSize
    ) {
      candidate = { firstTablePos: previousTable.pos, secondTablePos: pos, paginationChainKey, paginationSplitId }
      return !candidate
    }

    previousTable = { node, pos, paginationChainKey, paginationSplitId }
    return !candidate
  })

  return candidate
}
