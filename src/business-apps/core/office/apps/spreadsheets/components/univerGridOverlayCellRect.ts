import type { SnapshotDimensions } from './univerGridInternalTypes'
import { CURSOR_OVERLAY_COL_WIDTH_PX, CURSOR_OVERLAY_ROW_HEIGHT_PX } from './univerGridLayoutConstants'

export type CollaborationOverlayRect = {
  top: number
  left: number
  width: number
  height: number
}

export type CollaborationOverlayPropsSnapshot = {
  sheet?: { id?: string }
  getCanonicalSheetId?: (id: string) => string | undefined
}

function resolveMainGridCanvas(container: HTMLElement): HTMLCanvasElement | null {
  const canvases = Array.from(container.querySelectorAll<HTMLCanvasElement>('canvas'))

  return canvases.reduce<HTMLCanvasElement | null>((best, candidate) => {
    const candidateBox = candidate.getBoundingClientRect()
    const candidateWidth = candidateBox.width > 0 ? candidateBox.width : candidate.width
    const candidateHeight = candidateBox.height > 0 ? candidateBox.height : candidate.height
    const candidateArea = Math.max(0, candidateWidth) * Math.max(0, candidateHeight)

    if (candidateArea <= 0) {
      return best
    }

    if (!best) {
      return candidate
    }

    const bestBox = best.getBoundingClientRect()
    const bestWidth = bestBox.width > 0 ? bestBox.width : best.width
    const bestHeight = bestBox.height > 0 ? bestBox.height : best.height
    const bestArea = Math.max(0, bestWidth) * Math.max(0, bestHeight)

    return candidateArea > bestArea ? candidate : best
  }, null)
}

export function resolveGridCanvasViewport(
  container: HTMLElement,
  cellDimensions?: SnapshotDimensions | null
): CollaborationOverlayRect | null {
  const canvas = resolveMainGridCanvas(container)
  if (!canvas) return null

  const containerBox = container.getBoundingClientRect()
  const canvasBox = canvas.getBoundingClientRect()
  const width = canvasBox.width > 0 ? canvasBox.width : canvas.width
  const height = canvasBox.height > 0 ? canvasBox.height : canvas.height

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null
  }

  const rawZoom = cellDimensions?.zoomRatio ?? 1
  const zoom = Number.isFinite(rawZoom) && rawZoom > 0 ? rawZoom : 1
  const headerLeft = (cellDimensions?.rowHeaderWidth ?? 0) * zoom
  const headerTop = (cellDimensions?.columnHeaderHeight ?? 0) * zoom
  const viewportWidth = Math.max(0, width - headerLeft)
  const viewportHeight = Math.max(0, height - headerTop)

  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return null
  }

  return {
    top: canvasBox.top - containerBox.top + headerTop,
    left: canvasBox.left - containerBox.left + headerLeft,
    width: viewportWidth,
    height: viewportHeight
  }
}

/**
 * Resolves a cell's on-screen rectangle inside the grid container for remote cursor / comment overlays.
 *
 * Does not use Univer `FRange.getCellRect()` / render skeleton: those APIs log and throw when the sheet
 * skeleton is not ready (sheet switch, first paint, HMR). Layout is derived from snapshot dimensions and
 * scroll state so it stays consistent with `registerUniverMountScrollSync`.
 */
export function resolveCollaborationOverlayCellRect(params: {
  api: { getActiveWorkbook?: () => unknown }
  container: HTMLElement
  props: CollaborationOverlayPropsSnapshot
  cellDimensions: SnapshotDimensions | null | undefined
  sheetScroll: { scrollLeft: number; scrollTop: number }
  row: number
  col: number
}): CollaborationOverlayRect | null {
  const { api, container, props, cellDimensions: dims, sheetScroll, row, col } = params
  try {
    if (row < 0 || col < 0) return null

    const workbook = api.getActiveWorkbook?.() as
      | {
          getActiveSheet?: () => { getSheetId?: () => string; getScrollState?: () => Record<string, unknown> }
        }
      | null
      | undefined
    const propSheetId = props.sheet?.id
    const normalizedPropSheetId = propSheetId ? (props.getCanonicalSheetId?.(propSheetId) ?? propSheetId) : undefined
    const activeSheet = workbook?.getActiveSheet?.()
    const activeSheetId =
      activeSheet && typeof (activeSheet as { getSheetId?: () => string }).getSheetId === 'function'
        ? (activeSheet as { getSheetId: () => string }).getSheetId()
        : undefined
    const normalizedActiveSheetId = activeSheetId
      ? (props.getCanonicalSheetId?.(activeSheetId) ?? activeSheetId)
      : undefined

    const worksheet = activeSheet
    if (!worksheet || !normalizedActiveSheetId) return null
    if (normalizedPropSheetId && normalizedPropSheetId !== normalizedActiveSheetId) return null

    const rawZoom = dims?.zoomRatio ?? 1
    const zoom = Number.isFinite(rawZoom) && rawZoom > 0 ? rawZoom : 1

    const getColumnWidth = (c: number): number =>
      (dims?.columnData[c]?.w ?? dims?.defaultColWidth ?? CURSOR_OVERLAY_COL_WIDTH_PX) * zoom
    const getRowHeight = (r: number): number =>
      (dims?.rowData[r]?.h ?? dims?.defaultRowHeight ?? CURSOR_OVERLAY_ROW_HEIGHT_PX) * zoom

    const headerLeft = (dims?.rowHeaderWidth ?? 0) * zoom
    const headerTop = (dims?.columnHeaderHeight ?? 0) * zoom

    let cellLeft = headerLeft
    for (let c = 0; c < col; c++) cellLeft += getColumnWidth(c)
    let cellTop = headerTop
    for (let r = 0; r < row; r++) cellTop += getRowHeight(r)
    const cellWidth = getColumnWidth(col)
    const cellHeight = getRowHeight(row)

    if (
      !Number.isFinite(cellLeft) ||
      !Number.isFinite(cellTop) ||
      !Number.isFinite(cellWidth) ||
      !Number.isFinite(cellHeight)
    ) {
      return null
    }

    const containerBox = container.getBoundingClientRect()

    const scrollState = (
      worksheet as {
        getScrollState?: () => {
          sheetViewStartRow?: number
          sheetViewStartColumn?: number
          offsetX?: number
          offsetY?: number
        }
      }
    ).getScrollState?.()
    let scrollLeftFromState: number | undefined
    let scrollTopFromState: number | undefined
    if (scrollState) {
      const startCol = Math.max(0, scrollState.sheetViewStartColumn ?? 0)
      const startRow = Math.max(0, scrollState.sheetViewStartRow ?? 0)
      let left = 0
      let top = 0
      for (let c = 0; c < startCol; c++) left += getColumnWidth(c)
      for (let r = 0; r < startRow; r++) top += getRowHeight(r)
      left += (scrollState.offsetX ?? 0) * zoom
      top += (scrollState.offsetY ?? 0) * zoom
      scrollLeftFromState = left
      scrollTopFromState = top
    }
    const scrollLeft =
      typeof scrollLeftFromState === 'number' && Number.isFinite(scrollLeftFromState)
        ? scrollLeftFromState
        : sheetScroll.scrollLeft
    const scrollTop =
      typeof scrollTopFromState === 'number' && Number.isFinite(scrollTopFromState)
        ? scrollTopFromState
        : sheetScroll.scrollTop

    const mainCanvas = resolveMainGridCanvas(container)

    if (mainCanvas) {
      const canvasBox = mainCanvas.getBoundingClientRect()
      const result = {
        top: canvasBox.top - containerBox.top + cellTop - scrollTop,
        left: canvasBox.left - containerBox.left + cellLeft - scrollLeft,
        width: cellWidth,
        height: cellHeight
      }

      if ((globalThis as Record<string, unknown>).__debugCursorRect) {
        console.debug('[resolveCollaborationOverlayCellRect]', {
          row,
          col,
          zoom,
          cellLeft,
          cellTop,
          scrollLeft,
          scrollTop,
          canvasTop: canvasBox.top,
          containerTop: containerBox.top,
          canvasLeft: canvasBox.left,
          containerLeft: containerBox.left,
          result
        })
      }

      return result
    }

    return null
  } catch {
    return null
  }
}
