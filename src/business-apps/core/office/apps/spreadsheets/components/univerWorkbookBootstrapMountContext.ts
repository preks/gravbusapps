import type { MutableRefObject } from 'react'
import type { SpreadsheetSheet } from '../types/spreadsheet'
import type { UniverGridController } from './useUniverGridController'
import type { CellDimensionsPayload, UniverSheetGridProps } from './UniverSheetGrid.types'
import type { SnapshotDimensions } from './univerGridInternalTypes'

export type UniverFontListEntry = {
  value: string
  label: string
  category?: 'sans-serif' | 'serif' | 'monospace' | 'display' | 'handwriting'
}

/**
 * Inputs for `mountUniverWorkbookBootstrap` (Univer createWorkbook + command/value subscriptions + dispose).
 * Extends the grid controller ref bundle with host chrome and a few live callbacks from `UniverSheetGrid`.
 */
export type UniverWorkbookBootstrapMountContext = UniverGridController & {
  gridHostEl: HTMLElement | null
  gridHostReady: boolean
  containerRef: MutableRefObject<HTMLDivElement | null>
  getWorkbookSnapshotRef: MutableRefObject<(() => Record<string, unknown> | null) | null>
  props: UniverSheetGridProps
  sheet: SpreadsheetSheet
  appLocale: string
  supportedUniverFonts: readonly UniverFontListEntry[]
  flushQueuedSnapshotRequest: () => void
  toCellDimensionsPayload: (dims: SnapshotDimensions) => CellDimensionsPayload
  isMountAlive: () => boolean
}
