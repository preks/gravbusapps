import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

export interface TableRowGroupRange {
  startIndex: number
  endIndex: number
}

interface ResolveSplitTableRowsOptions {
  repeatHeaderRow?: boolean
}

export interface TableRowEntry {
  node: ProseMirrorNode
  rowIndex: number
  rowPos: number
}

function normalizeRowGroupIndex(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

function computeTableRowGroupsFromRows(rows: ProseMirrorNode[]): TableRowGroupRange[] {
  if (!rows.length) return []

  const rawGroups = rows.map((rowNode, rowIndex) => {
    const endIndex = Math.min(rows.length - 1, rowIndex + getMaximumRowSpan(rowNode) - 1)
    return [rowIndex, endIndex] as const
  })

  const mergedGroups: TableRowGroupRange[] = []

  rawGroups.forEach(([startIndex, endIndex]) => {
    const previousGroup = mergedGroups[mergedGroups.length - 1]
    if (previousGroup && startIndex <= previousGroup.endIndex) {
      previousGroup.endIndex = Math.max(previousGroup.endIndex, endIndex)
      return
    }

    mergedGroups.push({
      startIndex,
      endIndex
    })
  })

  return mergedGroups
}

export function getTableRows(table: ProseMirrorNode) {
  const rows: ProseMirrorNode[] = []

  table.forEach(childNode => {
    if (!childNode.type || childNode.type.name === 'tableRow') {
      rows.push(childNode)
      return
    }

    if (childNode.type.name === 'tableRowGroup') {
      childNode.forEach(rowNode => {
        if (rowNode.type.name === 'tableRow') {
          rows.push(rowNode)
        }
      })
    }
  })

  return rows
}

export function getTableRowEntries(table: ProseMirrorNode, tablePos: number): TableRowEntry[] {
  const rows: TableRowEntry[] = []

  table.forEach((childNode, childOffset) => {
    if (!childNode.type || childNode.type.name === 'tableRow') {
      rows.push({
        node: childNode,
        rowIndex: rows.length,
        rowPos: tablePos + 1 + childOffset
      })
      return
    }

    if (childNode.type.name !== 'tableRowGroup') return

    const rowGroupPos = tablePos + 1 + childOffset
    childNode.forEach((rowNode, rowOffset) => {
      if (rowNode.type && rowNode.type.name !== 'tableRow') return

      rows.push({
        node: rowNode,
        rowIndex: rows.length,
        rowPos: rowGroupPos + 1 + rowOffset
      })
    })
  })

  return rows
}

export function getTableRowCount(table: ProseMirrorNode) {
  return getTableRows(table).length
}

export function rowHasMergedCells(row: ProseMirrorNode) {
  let hasMergedCells = false

  row.forEach(cellNode => {
    if ((cellNode.attrs.colspan ?? 1) > 1 || (cellNode.attrs.rowspan ?? 1) > 1) {
      hasMergedCells = true
    }
  })

  return hasMergedCells
}

export function isHeaderRow(row: ProseMirrorNode | null | undefined) {
  if (!row || row.childCount === 0) return false

  let headerCellCount = 0
  row.forEach(cellNode => {
    if (cellNode.type.name === 'tableHeader') {
      headerCellCount += 1
    }
  })

  return headerCellCount === row.childCount
}

export function tableHasMergedCells(table: ProseMirrorNode) {
  return getTableRows(table).some(rowNode => rowHasMergedCells(rowNode))
}

export function getMaximumRowSpan(row: ProseMirrorNode) {
  let maximumRowSpan = 1

  row.forEach(cellNode => {
    maximumRowSpan = Math.max(maximumRowSpan, Number(cellNode.attrs.rowspan ?? 1))
  })

  return maximumRowSpan
}

export function getTableRowGroups(table: ProseMirrorNode): TableRowGroupRange[] {
  const rows = getTableRows(table)
  const maximumIndex = rows.length - 1
  const storedGroups = parseSerializedTableRowGroups(table.attrs.paginationRowGroups).filter(
    group => group.startIndex <= maximumIndex && group.endIndex <= maximumIndex
  )

  return storedGroups.length > 0 ? storedGroups : computeTableRowGroupsFromRows(rows)
}

export function serializeTableRowGroups(groups: TableRowGroupRange[]) {
  return groups.map(group => `${group.startIndex}-${group.endIndex}`).join(',')
}

export function parseSerializedTableRowGroups(value: unknown): TableRowGroupRange[] {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return []
  }

  return value
    .split(',')
    .map(part => {
      const [rawStart, rawEnd] = part.split('-', 2)
      const startIndex = normalizeRowGroupIndex(rawStart ?? '')
      const endIndex = normalizeRowGroupIndex(rawEnd ?? '')

      if (startIndex == null || endIndex == null || endIndex < startIndex) {
        return null
      }

      return {
        startIndex,
        endIndex
      }
    })
    .filter((group): group is TableRowGroupRange => group !== null)
}

export function getSerializedTableRowGroups(table: ProseMirrorNode) {
  const groups = computeTableRowGroupsFromRows(getTableRows(table))
  return groups.length > 0 ? serializeTableRowGroups(groups) : null
}

export function getSerializedTableRowGroupsForRows(rows: ProseMirrorNode[]) {
  const groups = computeTableRowGroupsFromRows(rows)
  return groups.length > 0 ? serializeTableRowGroups(groups) : null
}

export function buildTableChildrenFromRows(_table: ProseMirrorNode, rows: ProseMirrorNode[]) {
  return rows
}

export function getMergedSecondTableRowOffset(firstTable: ProseMirrorNode, secondTable: ProseMirrorNode) {
  const firstRows = getTableRows(firstTable)
  const secondRows = getTableRows(secondTable)
  return isHeaderRow(firstRows[0]) && isHeaderRow(secondRows[0]) ? 1 : 0
}

export function resolveMergedTableRows(firstTable: ProseMirrorNode, secondTable: ProseMirrorNode) {
  const firstRows = getTableRows(firstTable)
  const secondRows = getTableRows(secondTable)
  return [...firstRows, ...secondRows.slice(getMergedSecondTableRowOffset(firstTable, secondTable))]
}

export function resolveMergedSplitIndex(
  firstTable: ProseMirrorNode,
  secondTable: ProseMirrorNode,
  secondTableSplitIndex: number
) {
  return (
    getTableRowCount(firstTable) +
    Math.max(0, secondTableSplitIndex - getMergedSecondTableRowOffset(firstTable, secondTable))
  )
}

export function resolveSplitTableRows(
  table: ProseMirrorNode,
  proposedSplitIndex: number,
  options: ResolveSplitTableRowsOptions = {}
) {
  const rows = getTableRows(table)
  if (proposedSplitIndex <= 0 || proposedSplitIndex >= rows.length) {
    return null
  }

  const safeSplitIndex = findSafeSplitRow(table, proposedSplitIndex)
  if (safeSplitIndex < 1 || safeSplitIndex >= rows.length) {
    return null
  }

  const leadingRows = rows.slice(0, safeSplitIndex)
  const remainingRows = rows.slice(safeSplitIndex)
  if (!leadingRows.length || !remainingRows.length) {
    return null
  }

  return {
    safeSplitIndex,
    leadingRows,
    continuationRows:
      options.repeatHeaderRow === true && isHeaderRow(rows[0]) ? [rows[0], ...remainingRows] : remainingRows
  }
}

export function tableHasRowSpanCrossingAt(table: ProseMirrorNode, splitIndex: number) {
  return getTableRowGroups(table).some(group => group.startIndex < splitIndex && group.endIndex >= splitIndex)
}

export function findSafeSplitRow(table: ProseMirrorNode, proposedSplitIndex: number) {
  let safeSplitIndex = -1

  for (const group of getTableRowGroups(table)) {
    if (group.startIndex >= proposedSplitIndex) {
      break
    }

    if (group.endIndex < proposedSplitIndex) {
      safeSplitIndex = group.endIndex + 1
    }
  }

  return safeSplitIndex
}
