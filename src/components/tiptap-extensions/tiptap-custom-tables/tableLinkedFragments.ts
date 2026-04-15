import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { NodeSelection, type EditorState } from '@tiptap/pm/state'
import { CellSelection, TableMap, cellAround } from '@tiptap/pm/tables'
import { getTableRuntimeChainKey } from './tablePaginationIdentity'

export interface SelectedTableRectContext {
  table: ProseMirrorNode
  tablePos: number
  tableStart: number
  map: TableMap
  rect: { left: number; top: number; right: number; bottom: number }
}

export interface TableFragmentContext {
  table: ProseMirrorNode
  tablePos: number
  tableStart: number
  map: TableMap
  logicalRowStart: number
  logicalRowEnd: number
}

export interface LinkedTableContext {
  paginationChainKey: string
  fragments: TableFragmentContext[]
  totalRows: number
}

export interface LinkedSelectedTableContext extends LinkedTableContext {
  current: SelectedTableRectContext
}

function getTableFromNodeSelection(
  state: EditorState,
  tableNodeName: string
): Pick<SelectedTableRectContext, 'table' | 'tablePos' | 'tableStart' | 'map'> | null {
  if (!(state.selection instanceof NodeSelection) || state.selection.node.type.name !== tableNodeName) {
    return null
  }

  const table = state.selection.node
  const tablePos = state.selection.from
  return {
    table,
    tablePos,
    tableStart: tablePos + 1,
    map: TableMap.get(table)
  }
}

export function getSelectedTableRectContext(
  state: EditorState,
  tableNodeName: string
): SelectedTableRectContext | null {
  const fromNodeSelection = getTableFromNodeSelection(state, tableNodeName)
  if (fromNodeSelection) {
    return {
      ...fromNodeSelection,
      rect: {
        left: 0,
        top: 0,
        right: fromNodeSelection.map.width,
        bottom: fromNodeSelection.map.height
      }
    }
  }

  const $cell = cellAround(state.selection.$from)
  if (!$cell) return null

  for (let depth = $cell.depth; depth > 0; depth -= 1) {
    const node = $cell.node(depth)
    if (node.type.name !== tableNodeName) continue

    const tablePos = $cell.before(depth)
    const tableStart = tablePos + 1
    const map = TableMap.get(node)
    const rect =
      state.selection instanceof CellSelection
        ? map.rectBetween(state.selection.$anchorCell.pos - tableStart, state.selection.$headCell.pos - tableStart)
        : map.findCell($cell.pos - tableStart)

    return {
      table: node,
      tablePos,
      tableStart,
      map,
      rect
    }
  }

  return null
}

export function getLinkedTableContext(
  state: EditorState,
  tableNodeName: string,
  tablePos: number
): LinkedTableContext | null {
  const table = state.doc.nodeAt(tablePos)
  if (!table || table.type.name !== tableNodeName) {
    return null
  }

  const paginationChainKey = getTableRuntimeChainKey(table, tablePos)
  const baseFragments: Array<Omit<TableFragmentContext, 'logicalRowStart' | 'logicalRowEnd'>> = []

  state.doc.descendants((node, pos) => {
    if (node.type.name === tableNodeName && getTableRuntimeChainKey(node, pos) === paginationChainKey) {
      baseFragments.push({
        table: node,
        tablePos: pos,
        tableStart: pos + 1,
        map: TableMap.get(node)
      })
    }

    return true
  })

  let logicalRowStart = 0
  const fragments = baseFragments.map(fragment => {
    const nextFragment: TableFragmentContext = {
      ...fragment,
      logicalRowStart,
      logicalRowEnd: logicalRowStart + fragment.map.height
    }
    logicalRowStart = nextFragment.logicalRowEnd
    return nextFragment
  })

  return {
    paginationChainKey,
    fragments,
    totalRows: logicalRowStart
  }
}

export function getLinkedSelectedTableContext(
  state: EditorState,
  tableNodeName: string
): LinkedSelectedTableContext | null {
  const current = getSelectedTableRectContext(state, tableNodeName)
  if (!current) return null

  const linkedContext = getLinkedTableContext(state, tableNodeName, current.tablePos)
  if (!linkedContext) return null

  return {
    ...linkedContext,
    current
  }
}

export function getTableColumnIndex(map: TableMap, tableStart: number, cellPos: number, colspan: number) {
  return map.colCount(cellPos - tableStart) + colspan - 1
}
