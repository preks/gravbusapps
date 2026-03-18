import type { EditorState, Transaction } from '@tiptap/pm/state'
import { TableMap, cellAround } from '@tiptap/pm/tables'
import { Fragment, type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { findSafeSplitRow, getTableRows, isHeaderRow, rowHasMergedCells } from './tablePaginationUtils'

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

let paginationSplitIdCounter = 0

interface RowInfo {
  node: ProseMirrorNode
  offset: number
}

function getRowInfo(table: ProseMirrorNode, rowIndex: number): RowInfo | null {
  let match: RowInfo | null = null

  table.forEach((rowNode, offset, index) => {
    if (index === rowIndex) {
      match = {
        node: rowNode,
        offset
      }
    }
  })

  return match
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
  if (typeof table.attrs.paginationSplitId === 'string' && table.attrs.paginationSplitId.length > 0) {
    const existingSplitId = table.attrs.paginationSplitId
    const previousFragment = getAdjacentTableFragment(state, tablePos, 'previous')
    const nextFragment = getAdjacentTableFragment(state, tablePos, 'next')
    const hasAdjacentFragment = [previousFragment, nextFragment].some(
      fragment => fragment?.attrs.paginationSplitId === existingSplitId
    )

    if (hasAdjacentFragment) {
      return existingSplitId
    }
  }

  paginationSplitIdCounter += 1
  return `pagination-split-${paginationSplitIdCounter}`
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
  if (splitRowIndex <= 0 || splitRowIndex >= table.childCount) return false

  const safeSplitIndex = findSafeSplitRow(table, splitRowIndex)
  if (safeSplitIndex < 1) return false

  const rows = getTableRows(table)

  const firstRows = rows.slice(0, safeSplitIndex).map(cloneNode)
  const remainingRows = rows.slice(safeSplitIndex).map(cloneNode)
  if (!firstRows.length || !remainingRows.length) return false

  const paginationSplitId = getPaginationSplitId(state, table, tablePos)
  const repeatHeaderRow = options.repeatHeaderRow === true && isHeaderRow(rows[0])
  const continuationRows = repeatHeaderRow ? [cloneNode(rows[0]), ...remainingRows] : remainingRows
  const leadingTableAttrs = {
    ...table.attrs,
    paginationSplitId
  }
  const continuationTableAttrs = {
    ...table.attrs,
    paginationSplitId
  }
  const leadingTable = table.type.create(leadingTableAttrs, Fragment.fromArray(firstRows), table.marks)
  const continuationTable = table.type.create(continuationTableAttrs, Fragment.fromArray(continuationRows), table.marks)

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

  const firstRows = getTableRows(firstTable).map(cloneNode)
  const secondRows = getTableRows(secondTable)
  const trailingRows = secondRows.slice(isHeaderRow(firstRows[0]) && isHeaderRow(secondRows[0]) ? 1 : 0).map(cloneNode)
  const mergedRows = [...firstRows, ...trailingRows]

  if (!mergedRows.length) return false

  const mergedTable = firstTable.type.create(firstTable.attrs, Fragment.fromArray(mergedRows), firstTable.marks)
  tr.replaceWith(firstTablePos, secondTablePos + secondTable.nodeSize, mergedTable)
  return true
}

export function duplicateCurrentRow(state: EditorState, tr: Transaction, tableNodeName: string) {
  const context = getCurrentTableContext(state, tableNodeName)
  if (!context) return false

  const rowInfo = getRowInfo(context.table, context.rowIndex)
  if (!rowInfo || rowHasMergedCells(rowInfo.node)) return false

  const clonedRow = cloneNode(rowInfo.node)
  const insertPos = context.tablePos + 1 + rowInfo.offset + rowInfo.node.nodeSize

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

  for (let rowIndex = 0; rowIndex < context.table.childCount; rowIndex += 1) {
    const rowInfo = getRowInfo(context.table, rowIndex)
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
    const rowPos = context.tablePos + 1 + entry.rowInfo.offset
    tr.insert(rowPos + 1 + entry.insertOffset, entry.clonedCell)
  }

  return true
}
