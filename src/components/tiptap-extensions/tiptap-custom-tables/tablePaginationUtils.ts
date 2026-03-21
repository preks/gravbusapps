import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

export interface TableRowGroupRange {
  startIndex: number
  endIndex: number
}

interface ResolveSplitTableRowsOptions {
  repeatHeaderRow?: boolean
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

export function serializeTableRowGroups(groups: TableRowGroupRange[]) {
  return groups.map(group => `${group.startIndex}-${group.endIndex}`).join(',')
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
  const rows = getTableRows(table)

  return rows.some((rowNode, rowIndex) => {
    if (rowIndex >= splitIndex) return false

    let crossesSplit = false
    rowNode.forEach(cellNode => {
      const rowSpan = Number(cellNode.attrs.rowspan ?? 1)
      if (rowIndex + rowSpan > splitIndex) {
        crossesSplit = true
      }
    })

    return crossesSplit
  })
}

export function findSafeSplitRow(table: ProseMirrorNode, proposedSplitIndex: number) {
  for (let splitIndex = proposedSplitIndex; splitIndex >= 1; splitIndex -= 1) {
    if (!tableHasRowSpanCrossingAt(table, splitIndex)) {
      return splitIndex
    }
  }

  return -1
}
