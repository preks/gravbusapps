import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

export interface TableRowGroupRange {
  startIndex: number
  endIndex: number
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
