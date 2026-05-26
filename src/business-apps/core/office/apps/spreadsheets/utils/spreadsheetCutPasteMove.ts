import { getCellRangeMoveMutation } from '../components/univerGridWorkbookMutationModule'
import { extractActiveRangeBounds } from '../components/univerGridRangeSelection'

export type CellRangeRect = {
  startRow: number
  endRow: number
  startColumn: number
  endColumn: number
}

export type PendingCutCellRange = {
  sheetId: string
  fromRange: CellRangeRect
  capturedAt: number
}

const CUT_PASTE_COLLAB_SUPPRESSION_MS = 2000

export const cutPasteCollabSuppressionDurationMs = (): number => CUT_PASTE_COLLAB_SUPPRESSION_MS

export function isNativeCutPasteCommand(commandId: string): boolean {
  const normalized = commandId.trim().toLowerCase()
  if (!normalized) return false
  return normalized === 'sheet.command.cut-paste' || normalized.includes('cut-paste') || normalized.includes('cutpaste')
}

export function cellRangeRectsSameDimensions(fromRange: CellRangeRect, toRange: CellRangeRect): boolean {
  const fromRowSpan = fromRange.endRow - fromRange.startRow
  const toRowSpan = toRange.endRow - toRange.startRow
  const fromColSpan = fromRange.endColumn - fromRange.startColumn
  const toColSpan = toRange.endColumn - toRange.startColumn
  return fromRowSpan === toRowSpan && fromColSpan === toColSpan
}

export function captureCutSelectionRange(workbook: unknown, sheetId: string): PendingCutCellRange | null {
  const bounds = extractActiveRangeBounds(workbook)
  if (!bounds) return null
  return {
    sheetId,
    fromRange: {
      startRow: bounds.startRow,
      endRow: bounds.endRow,
      startColumn: bounds.startColumn,
      endColumn: bounds.endColumn
    },
    capturedAt: Date.now()
  }
}

export function resolveCutPasteCellRangeMove(params: {
  commandParams: Parameters<typeof getCellRangeMoveMutation>[0] | undefined
  pendingCut: PendingCutCellRange | null
  activeSheetId: string
  workbook: unknown
}): { fromRange: CellRangeRect; toRange: CellRangeRect } | null {
  const fromCommand = getCellRangeMoveMutation(params.commandParams ?? {})
  if (fromCommand && cellRangeRectsSameDimensions(fromCommand.fromRange, fromCommand.toRange)) {
    return fromCommand
  }

  const pasteBounds = extractActiveRangeBounds(params.workbook)
  const toRange =
    fromCommand?.toRange ??
    (pasteBounds
      ? {
          startRow: pasteBounds.startRow,
          endRow: pasteBounds.endRow,
          startColumn: pasteBounds.startColumn,
          endColumn: pasteBounds.endColumn
        }
      : null)

  const pendingCut =
    params.pendingCut && params.pendingCut.sheetId === params.activeSheetId ? params.pendingCut.fromRange : null
  const fromRange = fromCommand?.fromRange ?? pendingCut
  if (!fromRange || !toRange) return null
  if (!cellRangeRectsSameDimensions(fromRange, toRange)) return null
  return { fromRange, toRange }
}

export function shouldSuppressCutPasteFollowUpCollab(params: {
  suppressUntilMs: number
  commandId: string
  commandKind: string
  isRegionReplaceStyleCommand: boolean
}): boolean {
  if (Date.now() >= params.suppressUntilMs) return false
  if (isNativeCutPasteCommand(params.commandId)) return true
  if (params.commandKind === 'clearLike' && params.commandId.includes('set-range-values')) return true
  if (params.isRegionReplaceStyleCommand) return true
  return false
}
