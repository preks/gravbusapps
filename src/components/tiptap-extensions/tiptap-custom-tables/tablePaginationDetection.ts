import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorView } from '@tiptap/pm/view'
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

  const firstChild = element.firstElementChild as HTMLElement | null
  const lastChild = element.lastElementChild as HTMLElement | null
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

function isPaginationMeasurementHelper(element: Element): boolean {
  if (element.hasAttribute('data-rm-pagination')) return true
  if (!(element instanceof HTMLElement)) return false

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

  const tableElement = Array.from(element.children).find(child => child instanceof HTMLTableElement)
  return tableElement instanceof HTMLElement ? tableElement : element
}

function getMeasuredTableRows(tableMeasurementElement: HTMLElement): HTMLTableRowElement[] {
  if (tableMeasurementElement instanceof HTMLTableElement) {
    return Array.from(tableMeasurementElement.rows)
  }

  return Array.from(tableMeasurementElement.querySelectorAll('tr'))
}

function resolveTableRowElement(
  view: EditorView,
  tablePos: number,
  rowEntry: { rowPos: number; rowIndex: number }
): HTMLTableRowElement | null {
  const directRowDom = view.nodeDOM(rowEntry.rowPos)
  if (directRowDom instanceof HTMLTableRowElement) {
    return directRowDom
  }

  const tableDom = view.nodeDOM(tablePos)
  if (!(tableDom instanceof HTMLElement)) {
    return null
  }

  return getMeasuredTableRows(getTableMeasurementElement(tableDom))[rowEntry.rowIndex] ?? null
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

  const secondHeaderRow = secondTableEl.querySelector('tr')
  return secondHeaderRow instanceof HTMLElement ? getElementLayoutHeight(secondHeaderRow) : 0
}

function getProjectedMergedTableBottom(
  view: EditorView,
  firstTableNode: ProseMirrorNode,
  firstTableEl: HTMLElement,
  secondTableNode: ProseMirrorNode,
  secondTableEl: HTMLElement
) {
  const firstMeasurementElement = getTableMeasurementElement(firstTableEl)
  const secondMeasurementElement = getTableMeasurementElement(secondTableEl)
  const firstBottom = getMeasuredElementBottomInEditor(view.dom, firstMeasurementElement)
  const secondTop = getElementTopInEditor(view.dom, secondMeasurementElement)
  const secondBottom = getMeasuredElementBottomInEditor(view.dom, secondMeasurementElement)
  const gapBetweenTables = Math.max(0, secondTop - firstBottom)
  const repeatedHeaderHeight = getRepeatedHeaderHeight(firstTableNode, secondTableNode, secondMeasurementElement)

  return secondBottom - gapBetweenTables - repeatedHeaderHeight
}

function getBandIndexForOffset(bodyBands: TablePaginationBodyBand[], offset: number, tolerance: number) {
  let bandIndex = 0

  while (bandIndex < bodyBands.length - 1 && offset >= bodyBands[bandIndex].bottom - tolerance) {
    bandIndex += 1
  }

  return bandIndex
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

function getSplitIndexForPushedTable(
  view: EditorView,
  tableNode: ProseMirrorNode,
  tablePos: number,
  bodyBands: TablePaginationBodyBand[],
  tolerance: number,
  currentSplitRowCount: number | null
) {
  const tableDom = view.nodeDOM(tablePos)
  if (!(tableDom instanceof HTMLElement)) return null

  const tableMeasurementElement = getTableMeasurementElement(tableDom)
  const tableTop = getElementTopInEditor(view.dom, tableMeasurementElement)
  const tableBandIndex = getBandIndexForOffset(bodyBands, tableTop, tolerance)
  if (tableBandIndex <= 0 || tableBandIndex >= bodyBands.length) return null

  const previousBand = bodyBands[tableBandIndex - 1]
  const previousContentElement = getPreviousContentElement(tableDom)
  if (!previousBand || !(previousContentElement instanceof HTMLElement)) return null

  const previousContentBottom = getMeasuredElementBottomInEditor(view.dom, previousContentElement)
  if (!isOffsetWithinBand(previousBand, previousContentBottom, tolerance)) return null

  const availableTop = previousContentBottom + getCollapsedBlockGap(previousContentElement, tableMeasurementElement)
  const availableHeight = previousBand.bottom - availableTop
  if (availableHeight <= tolerance) return null

  const rowEntries = getTableRowEntries(tableNode, tablePos)
  if (rowEntries.length < 2) return null

  for (const rowEntry of rowEntries) {
    const rowDom = resolveTableRowElement(view, tablePos, rowEntry)
    if (!(rowDom instanceof HTMLTableRowElement)) continue

    const rowBottom = getElementBottomInEditor(view.dom, rowDom)
    const rowHeight = Math.max(0, rowBottom - getElementTopInEditor(view.dom, rowDom))
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

export function findOverflowingTableSplitCandidates(
  view: EditorView,
  bodyBands: TablePaginationBodyBand[]
): TableOverflowSplitCandidate[] {
  if (!bodyBands.length) return []

  const tolerance = 1
  const overflowThreshold = tolerance + TABLE_SPLIT_OVERFLOW_HYSTERESIS_PX
  const candidates: TableOverflowSplitCandidate[] = []

  view.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'table') return true

    const rowEntries = getTableRowEntries(node, pos)
    const columnCount = getTableColumnCount(node)
    const paginationChainKey = getTableRuntimeChainKey(node, pos)
    const paginationSplitId = getTablePaginationSplitId(node)
    const previousFragment =
      paginationSplitId != null
        ? getAdjacentPaginationTableFragment(view.state.doc, pos, 'previous', paginationSplitId)
        : null
    const nextFragment =
      paginationSplitId != null
        ? getAdjacentPaginationTableFragment(view.state.doc, pos, 'next', paginationSplitId)
        : null

    if (rowEntries.length < 2 || columnCount < 1) return true

    let tableCandidate: TableOverflowSplitCandidate | null = null

    const pushedSplitIndex = getSplitIndexForPushedTable(
      view,
      node,
      pos,
      bodyBands,
      tolerance,
      previousFragment?.rowCount ?? null
    )

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

    for (const rowEntry of rowEntries) {
      const rowDom = resolveTableRowElement(view, pos, rowEntry)
      if (!(rowDom instanceof HTMLTableRowElement)) continue

      const rowTop = getElementTopInEditor(view.dom, rowDom)
      const rowBottom = getElementBottomInEditor(view.dom, rowDom)
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

export function findOverflowingTableSplit(
  view: EditorView,
  bodyBands: TablePaginationBodyBand[]
): TableOverflowSplitCandidate | null {
  return findOverflowingTableSplitCandidates(view, bodyBands)[0] ?? null
}

export function findMergeableTableFragmentCandidates(
  view: EditorView,
  bodyBands: TablePaginationBodyBand[]
): MergeableTableFragmentsCandidate[] {
  if (!bodyBands.length) return []

  const tolerance = 1
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
      getElementTopInEditor(view.dom, tableMeasurementElement),
      tolerance
    )
    const currentBand = bodyBands[bandIndex]
    const tableBottom = getMeasuredElementBottomInEditor(view.dom, tableMeasurementElement)

    if (!currentBand || tableBottom > currentBand.bottom - TABLE_MERGE_SAFETY_MARGIN_PX) {
      previousTable = { node, pos, paginationChainKey, paginationSplitId, bandIndex, tableDom }
      return true
    }

    const prevTable = previousTable
    if (
      prevTable &&
      prevTable.paginationChainKey === paginationChainKey &&
      prevTable.paginationSplitId === paginationSplitId &&
      pos === prevTable.pos + prevTable.node.nodeSize &&
      bandIndex === prevTable.bandIndex
    ) {
      const projectedMergedBottom = getProjectedMergedTableBottom(
        view,
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
      previousTable &&
      previousTable.paginationChainKey === paginationChainKey &&
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
