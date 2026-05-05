import type { DataEntityColumn, DataGraphNode, DataInternalEntityField } from '../types/dataViewerTypes'

export const DATA_VIEWER_LAYOUT_COLUMNS_PER_ROW = 3
export const DATA_VIEWER_LAYOUT_GAP_X = 120
export const DATA_VIEWER_LAYOUT_GAP_Y = 80

export const DATA_VIEWER_ENTITY_NODE_WIDTH = 260
export const DATA_VIEWER_ENTITY_NODE_WIDTH_CLASS = 'gba:w-[260px]'
export const DATA_VIEWER_ENTITY_MAX_VISIBLE_COLUMNS = 6

export const DATA_VIEWER_INTERNAL_ENTITY_NODE_WIDTH = 240
export const DATA_VIEWER_INTERNAL_ENTITY_NODE_WIDTH_CLASS = 'gba:w-[240px]'
export const DATA_VIEWER_INTERNAL_ENTITY_MAX_VISIBLE_FIELDS = 5
export const DATA_VIEWER_LAYOUT_COLUMN_WIDTH = Math.max(
  DATA_VIEWER_ENTITY_NODE_WIDTH,
  DATA_VIEWER_INTERNAL_ENTITY_NODE_WIDTH
)

const DATA_VIEWER_NODE_HEADER_HEIGHT = 50
const DATA_VIEWER_NODE_SECTION_VERTICAL_PADDING = 8
const DATA_VIEWER_NODE_ROW_HEIGHT = 20
const DATA_VIEWER_NODE_SUMMARY_ROW_HEIGHT = 18
const DATA_VIEWER_NODE_EMPTY_ROW_HEIGHT = 20

function getVisibleRowCount(totalCount: number, maxVisibleCount: number): number {
  return Math.min(totalCount, maxVisibleCount)
}

function hasSummaryRow(totalCount: number, maxVisibleCount: number): boolean {
  return totalCount > maxVisibleCount
}

function estimateNodeHeight(totalCount: number, maxVisibleCount: number): number {
  const visibleRowCount = getVisibleRowCount(totalCount, maxVisibleCount)
  const baseHeight =
    DATA_VIEWER_NODE_HEADER_HEIGHT +
    DATA_VIEWER_NODE_SECTION_VERTICAL_PADDING +
    visibleRowCount * DATA_VIEWER_NODE_ROW_HEIGHT

  if (totalCount === 0) {
    return baseHeight + DATA_VIEWER_NODE_EMPTY_ROW_HEIGHT
  }

  if (hasSummaryRow(totalCount, maxVisibleCount)) {
    return baseHeight + DATA_VIEWER_NODE_SUMMARY_ROW_HEIGHT
  }

  return baseHeight
}

export function estimateEntityNodeHeight(columns: DataEntityColumn[]): number {
  return estimateNodeHeight(columns.length, DATA_VIEWER_ENTITY_MAX_VISIBLE_COLUMNS)
}

export function estimateInternalEntityNodeHeight(fields?: DataInternalEntityField[]): number {
  return estimateNodeHeight(fields?.length ?? 0, DATA_VIEWER_INTERNAL_ENTITY_MAX_VISIBLE_FIELDS)
}

export function getDataViewerNodeDimensions(node: DataGraphNode): { width: number; height: number } {
  if (node.type === 'internalEntity') {
    return {
      width: DATA_VIEWER_INTERNAL_ENTITY_NODE_WIDTH,
      height: estimateInternalEntityNodeHeight(node.data.fields)
    }
  }

  return {
    width: DATA_VIEWER_ENTITY_NODE_WIDTH,
    height: estimateEntityNodeHeight(node.data.columns)
  }
}

export function layoutDataGraphNodes(nodes: DataGraphNode[]): DataGraphNode[] {
  const rowHeights: number[] = []
  const columnOffsets = Array.from({ length: DATA_VIEWER_LAYOUT_COLUMNS_PER_ROW }, (_, index) => {
    return index * (DATA_VIEWER_LAYOUT_COLUMN_WIDTH + DATA_VIEWER_LAYOUT_GAP_X)
  })

  return nodes.map((node, index) => {
    const columnIndex = index % DATA_VIEWER_LAYOUT_COLUMNS_PER_ROW
    const rowIndex = Math.floor(index / DATA_VIEWER_LAYOUT_COLUMNS_PER_ROW)
    const nodeDimensions = getDataViewerNodeDimensions(node)

    if (rowHeights[rowIndex] === undefined) {
      rowHeights[rowIndex] = 0
    }

    rowHeights[rowIndex] = Math.max(rowHeights[rowIndex], nodeDimensions.height)

    const yOffset = rowHeights.slice(0, rowIndex).reduce((totalHeight, rowHeight) => {
      return totalHeight + rowHeight + DATA_VIEWER_LAYOUT_GAP_Y
    }, 0)

    return {
      ...node,
      position: {
        x: columnOffsets[columnIndex],
        y: yOffset
      }
    }
  })
}
