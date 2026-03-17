import type { EditorState, Transaction } from '@tiptap/pm/state'
import { TableMap, cellAround } from '@tiptap/pm/tables'
import { Fragment, type Node as ProseMirrorNode } from '@tiptap/pm/model'

export interface TableContext {
  table: ProseMirrorNode
  tablePos: number
  map: TableMap
  rowIndex: number
  columnIndex: number
}

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

function rowHasMergedCells(row: ProseMirrorNode) {
  let hasMergedCells = false

  row.forEach(cellNode => {
    if ((cellNode.attrs.colspan ?? 1) > 1 || (cellNode.attrs.rowspan ?? 1) > 1) {
      hasMergedCells = true
    }
  })

  return hasMergedCells
}

function tableHasMergedCells(table: ProseMirrorNode) {
  let hasMergedCells = false

  table.forEach(rowNode => {
    if (rowHasMergedCells(rowNode)) {
      hasMergedCells = true
    }
  })

  return hasMergedCells
}

function isHeaderRow(row: ProseMirrorNode) {
  if (row.childCount === 0) return false

  let headerCellCount = 0
  row.forEach(cellNode => {
    if (cellNode.type.name === 'tableHeader') {
      headerCellCount += 1
    }
  })

  return headerCellCount === row.childCount
}

export function splitTableAtRow(state: EditorState, tr: Transaction, tablePos: number, splitRowIndex: number) {
  const table = state.doc.nodeAt(tablePos)
  if (!table || table.type.name !== 'table') return false
  if (splitRowIndex <= 0 || splitRowIndex >= table.childCount) return false
  if (tableHasMergedCells(table)) return false

  const rows: ProseMirrorNode[] = []
  table.forEach(rowNode => {
    rows.push(rowNode)
  })

  const firstRows = rows.slice(0, splitRowIndex).map(cloneNode)
  const remainingRows = rows.slice(splitRowIndex).map(cloneNode)
  if (!firstRows.length || !remainingRows.length) return false

  const repeatHeaderRow = isHeaderRow(rows[0])
  const continuationRows = repeatHeaderRow ? [cloneNode(rows[0]), ...remainingRows] : remainingRows
  const leadingTable = table.type.create(table.attrs, Fragment.fromArray(firstRows), table.marks)
  const continuationTable = table.type.create(table.attrs, Fragment.fromArray(continuationRows), table.marks)

  tr.replaceWith(tablePos, tablePos + table.nodeSize, Fragment.fromArray([leadingTable, continuationTable]))
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
