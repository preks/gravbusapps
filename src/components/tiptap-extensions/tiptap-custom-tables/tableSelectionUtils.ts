import type { EditorState, Transaction } from '@tiptap/pm/state'
import { TableMap, cellAround } from '@tiptap/pm/tables'
import { Fragment, type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { v4 as uuid } from 'uuid'
import {
  createPaginationChainId,
  createPaginationSplitId,
  getTableId,
  getTablePaginationChainId,
  getTablePaginationSplitId
} from './tablePaginationIdentity'
import {
  buildTableChildrenFromRows,
  getTableRowCount,
  getTableRowEntries,
  getSerializedTableRowGroupsForRows,
  resolveMergedTableRows,
  resolveSplitTableRows,
  rowHasMergedCells
} from './tablePaginationUtils'

export interface TableContext {
  table: ProseMirrorNode
  tablePos: number
  map: TableMap
  rowIndex: number
  columnIndex: number
}

interface SplitTableOptions {
  repeatHeaderRow?: boolean
}

interface RowInfo {
  node: ProseMirrorNode
  pos: number
}

function getRowInfo(table: ProseMirrorNode, tablePos: number, rowIndex: number): RowInfo | null {
  const rowEntry = getTableRowEntries(table, tablePos).find(entry => entry.rowIndex === rowIndex)
  if (!rowEntry) return null

  return {
    node: rowEntry.node,
    pos: rowEntry.rowPos
  }
}

export function getCurrentTableContext(state: EditorState, tableNodeName: string): TableContext | null {
  const $cell = cellAround(state.selection.$from)
  if (!$cell) return null

  for (let depth = $cell.depth; depth > 0; depth -= 1) {
    const node = $cell.node(depth)
    if (node.type.name !== tableNodeName) continue

    const tablePos = $cell.before(depth)
    const map = TableMap.get(node)
    const rect = map.findCell($cell.pos - tablePos - 1)

    return {
      table: node,
      tablePos,
      map,
      rowIndex: rect.top,
      columnIndex: rect.left
    }
  }

  return null
}

function cloneNode(node: ProseMirrorNode) {
  return node.type.create(node.attrs, node.content, node.marks)
}

/** Continuation fragments must not reuse row `id`s from the source table (e.g. repeated header row). */
function cloneTableRowFreshIds(node: ProseMirrorNode) {
  if (node.type.name !== 'tableRow') {
    return cloneNode(node)
  }
  return node.type.create({ ...node.attrs, id: null, rowId: null }, node.content, node.marks)
}

function getAdjacentTableFragment(
  state: EditorState,
  tablePos: number,
  direction: 'previous' | 'next'
): ProseMirrorNode | null {
  const $tablePos = state.doc.resolve(tablePos)
  const parent = $tablePos.node($tablePos.depth)
  const tableIndex = $tablePos.index($tablePos.depth)
  const adjacentIndex = direction === 'previous' ? tableIndex - 1 : tableIndex + 1

  if (adjacentIndex < 0 || adjacentIndex >= parent.childCount) {
    return null
  }

  const adjacentNode = parent.child(adjacentIndex)
  return adjacentNode.type.name === 'table' ? adjacentNode : null
}

function getPaginationSplitId(state: EditorState, table: ProseMirrorNode, tablePos: number) {
  const existingSplitId = getTablePaginationSplitId(table)
  if (existingSplitId) {
    const previousFragment = getAdjacentTableFragment(state, tablePos, 'previous')
    const nextFragment = getAdjacentTableFragment(state, tablePos, 'next')
    const hasAdjacentFragment = [previousFragment, nextFragment].some(
      fragment => fragment !== null && getTablePaginationSplitId(fragment) === existingSplitId
    )

    if (hasAdjacentFragment) {
      return existingSplitId
    }
  }

  return createPaginationSplitId()
}

function getPaginationChainId(table: ProseMirrorNode) {
  return getTableId(table) ?? getTablePaginationChainId(table) ?? createPaginationChainId()
}

export function splitTableAtRow(
  state: EditorState,
  tr: Transaction,
  tablePos: number,
  splitRowIndex: number,
  options: SplitTableOptions = {}
) {
  const table = state.doc.nodeAt(tablePos)
  if (table?.type?.name !== 'table') return false
  if (splitRowIndex <= 0 || splitRowIndex >= getTableRowCount(table)) return false

  const splitRows = resolveSplitTableRows(table, splitRowIndex, options)
  if (!splitRows) return false

  const paginationSplitId = getPaginationSplitId(state, table, tablePos)
  const paginationChainId = getPaginationChainId(table)
  const leadingTableAttrs = {
    ...table.attrs,
    paginationChainId,
    paginationSplitId,
    paginationRowGroups: getSerializedTableRowGroupsForRows(splitRows.leadingRows)
  }
  const continuationTableAttrs = {
    ...table.attrs,
    id: uuid(),
    paginationChainId,
    paginationSplitId,
    paginationRowGroups: getSerializedTableRowGroupsForRows(splitRows.continuationRows)
  }
  const leadingTable = table.type.create(
    leadingTableAttrs,
    Fragment.fromArray(buildTableChildrenFromRows(table, splitRows.leadingRows.map(cloneNode))),
    table.marks
  )
  const continuationTable = table.type.create(
    continuationTableAttrs,
    Fragment.fromArray(buildTableChildrenFromRows(table, splitRows.continuationRows.map(cloneTableRowFreshIds))),
    table.marks
  )

  tr.replaceWith(tablePos, tablePos + table.nodeSize, Fragment.fromArray([leadingTable, continuationTable]))
  return true
}

export function mergeAdjacentPaginationTables(state: EditorState, tr: Transaction, firstTablePos: number) {
  const firstTable = state.doc.nodeAt(firstTablePos)
  if (firstTable?.type?.name !== 'table') return false

  const secondTablePos = firstTablePos + firstTable.nodeSize
  const secondTable = state.doc.nodeAt(secondTablePos)
  if (secondTable?.type?.name !== 'table') return false

  const firstSplitId = firstTable.attrs.paginationSplitId
  const secondSplitId = secondTable.attrs.paginationSplitId
  if (
    typeof firstSplitId !== 'string' ||
    firstSplitId.length === 0 ||
    typeof secondSplitId !== 'string' ||
    secondSplitId !== firstSplitId
  ) {
    return false
  }

  const mergedRows = resolveMergedTableRows(firstTable, secondTable).map(cloneNode)
  if (!mergedRows.length) return false

  const mergedTable = firstTable.type.create(
    {
      ...firstTable.attrs,
      paginationChainId: getPaginationChainId(firstTable),
      paginationRowGroups: getSerializedTableRowGroupsForRows(mergedRows)
    },
    Fragment.fromArray(buildTableChildrenFromRows(firstTable, mergedRows)),
    firstTable.marks
  )
  tr.replaceWith(firstTablePos, secondTablePos + secondTable.nodeSize, mergedTable)
  return true
}

export function rebalanceAdjacentPaginationTables(
  state: EditorState,
  tr: Transaction,
  firstTablePos: number,
  splitRowIndex: number,
  options: SplitTableOptions = {}
) {
  const firstTable = state.doc.nodeAt(firstTablePos)
  if (firstTable?.type?.name !== 'table') return false

  const secondTablePos = firstTablePos + firstTable.nodeSize
  const secondTable = state.doc.nodeAt(secondTablePos)
  if (secondTable?.type?.name !== 'table') return false

  const firstSplitId = firstTable.attrs.paginationSplitId
  const secondSplitId = secondTable.attrs.paginationSplitId
  if (
    typeof firstSplitId !== 'string' ||
    firstSplitId.length === 0 ||
    typeof secondSplitId !== 'string' ||
    secondSplitId !== firstSplitId
  ) {
    return false
  }

  const mergedRows = resolveMergedTableRows(firstTable, secondTable).map(cloneNode)
  if (splitRowIndex <= 0 || splitRowIndex >= mergedRows.length) return false

  const mergedTable = firstTable.type.create(
    {
      ...firstTable.attrs,
      paginationChainId: getPaginationChainId(firstTable),
      paginationRowGroups: getSerializedTableRowGroupsForRows(mergedRows)
    },
    Fragment.fromArray(buildTableChildrenFromRows(firstTable, mergedRows)),
    firstTable.marks
  )
  const splitRows = resolveSplitTableRows(mergedTable, splitRowIndex, options)
  if (!splitRows) return false
  if (splitRows.safeSplitIndex === getTableRowCount(firstTable)) return false

  const leadingTable = firstTable.type.create(
    {
      ...firstTable.attrs,
      paginationChainId: getPaginationChainId(firstTable),
      paginationRowGroups: getSerializedTableRowGroupsForRows(splitRows.leadingRows)
    },
    Fragment.fromArray(buildTableChildrenFromRows(firstTable, splitRows.leadingRows.map(cloneNode))),
    firstTable.marks
  )
  const continuationTable = firstTable.type.create(
    {
      ...secondTable.attrs,
      id: uuid(),
      paginationChainId: getPaginationChainId(firstTable),
      paginationRowGroups: getSerializedTableRowGroupsForRows(splitRows.continuationRows)
    },
    Fragment.fromArray(buildTableChildrenFromRows(secondTable, splitRows.continuationRows.map(cloneTableRowFreshIds))),
    secondTable.marks
  )

  tr.replaceWith(
    firstTablePos,
    secondTablePos + secondTable.nodeSize,
    Fragment.fromArray([leadingTable, continuationTable])
  )
  return true
}

export function duplicateCurrentRow(state: EditorState, tr: Transaction, tableNodeName: string) {
  const context = getCurrentTableContext(state, tableNodeName)
  if (!context) return false

  const rowInfo = getRowInfo(context.table, context.tablePos, context.rowIndex)
  if (!rowInfo || rowHasMergedCells(rowInfo.node)) return false

  const clonedRow = cloneNode(rowInfo.node)
  const insertPos = rowInfo.pos + rowInfo.node.nodeSize

  tr.insert(insertPos, clonedRow)
  return true
}

function getCellInsertOffset(rowNode: ProseMirrorNode, columnIndex: number) {
  if (rowNode.childCount <= columnIndex) return null

  let offset = 0

  for (let index = 0; index <= columnIndex; index += 1) {
    const child = rowNode.child(index)
    offset += child.nodeSize
  }

  return offset
}

export function duplicateCurrentColumn(state: EditorState, tr: Transaction, tableNodeName: string) {
  const context = getCurrentTableContext(state, tableNodeName)
  if (!context) return false

  const rowEntries: Array<{ rowInfo: RowInfo; insertOffset: number; clonedCell: ProseMirrorNode }> = []

  for (let rowIndex = 0; rowIndex < getTableRowCount(context.table); rowIndex += 1) {
    const rowInfo = getRowInfo(context.table, context.tablePos, rowIndex)
    if (!rowInfo || rowInfo.node.childCount <= context.columnIndex) return false

    const sourceCell = rowInfo.node.child(context.columnIndex)
    if ((sourceCell.attrs.colspan ?? 1) > 1 || (sourceCell.attrs.rowspan ?? 1) > 1) {
      return false
    }

    const insertOffset = getCellInsertOffset(rowInfo.node, context.columnIndex)
    if (insertOffset == null) return false

    rowEntries.push({
      rowInfo,
      insertOffset,
      clonedCell: cloneNode(sourceCell)
    })
  }

  for (let index = rowEntries.length - 1; index >= 0; index -= 1) {
    const entry = rowEntries[index]
    tr.insert(entry.rowInfo.pos + 1 + entry.insertOffset, entry.clonedCell)
  }

  return true
}
