/**
 * UniverSheetGrid Component
 *
 * Wrapper that integrates Univer with our spreadsheet system.
 * Replaces FortuneSheetGrid; same props and ref contract for TableView and collaboration.
 */

import {
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useImperativeHandle,
  forwardRef
} from 'react'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US'
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets'
import '@univerjs/preset-sheets-core/lib/index.css'
import type { SpreadsheetSheet, SpreadsheetColumn } from '../types/spreadsheet'
import type {
  DocumentParticipant,
  DocumentOperation
} from '../../shared/services/CollaborationClient'
import {
  buildWorkbookSnapshot,
  createUniverConversionContext,
  type UniverWorkbookSnapshot
} from '../utils/univerAdapter'

export interface UniverSheetGridProps {
  sheet: SpreadsheetSheet
  data: Record<string, unknown>[]
  columns: SpreadsheetColumn[]
  isReadOnly: boolean
  onCellChange: (rowId: string, columnId: string, value: unknown) => void
  onDataChange: (data: Record<string, unknown>[]) => void
  onColumnAdd?: (columnIndex: number, initialValue?: unknown, rowIndex?: number) => void
  onFormulaEvaluated?: (rowId: string, columnId: string, result: unknown) => void
  participants?: DocumentParticipant[]
  onOperationEmit?: (operation: DocumentOperation) => void
  onCursorEmit?: (position: { path: string[] }) => void
  collaborationEnabled?: boolean
  height?: string | number
  width?: string | number
}

export interface UniverSheetGridHandle {
  applyRemoteCellUpdate: (rowIndex: number, colIndex: number, value: unknown) => void
}

export const UniverSheetGrid = forwardRef<UniverSheetGridHandle, UniverSheetGridProps>(
  function UniverSheetGrid(props, ref) {
    const {
      sheet,
      data,
      columns,
      isReadOnly,
      onCellChange,
      onDataChange,
      onColumnAdd,
      onOperationEmit = () => {},
      onCursorEmit = () => {},
      collaborationEnabled = false
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const univerAPIRef = useRef<ReturnType<typeof createUniver>['univerAPI'] | null>(null)
    const isLocalEditRef = useRef(false)
    const contextRef = useRef<ReturnType<typeof createUniverConversionContext> | null>(null)

    const snapshot = useMemo<UniverWorkbookSnapshot | null>(() => {
      try {
        return buildWorkbookSnapshot(sheet, data, columns)
      } catch (e) {
        console.error('[UniverSheetGrid] buildWorkbookSnapshot error:', e)
        return null
      }
    }, [sheet, data, columns])

    const applyRemoteCellUpdate = useCallback((rowIndex: number, colIndex: number, value: unknown) => {
      const api = univerAPIRef.current
      if (!api) return
      try {
        isLocalEditRef.current = true
        const workbook = api.getActiveWorkbook()
        if (!workbook) return
        const worksheet = workbook.getActiveSheet()
        if (!worksheet) return
        const range = worksheet.getRange(rowIndex, colIndex)
        if (range) range.setValue(value as string | number | boolean)
      } catch (e) {
        console.error('[UniverSheetGrid] applyRemoteCellUpdate error:', e)
      } finally {
        setTimeout(() => {
          isLocalEditRef.current = false
        }, 50)
      }
    }, [])

    useImperativeHandle(
      ref,
      () => ({
        applyRemoteCellUpdate
      }),
      [applyRemoteCellUpdate]
    )

    useEffect(() => {
      if (!containerRef.current || !snapshot) return

      contextRef.current = createUniverConversionContext(columns, data)

      const { univerAPI } = createUniver({
        locale: LocaleType.EN_US,
        locales: {
          [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS)
        },
        presets: [
          UniverSheetsCorePreset({
            container: containerRef.current
          })
        ]
      })

      univerAPIRef.current = univerAPI
      univerAPI.createWorkbook(snapshot as unknown as Record<string, unknown>)

      const dispose = () => {
        univerAPI.dispose()
        univerAPIRef.current = null
        contextRef.current = null
      }

      return dispose
    }, [sheet.id, snapshot, columns, data])

    if (!snapshot) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full">
          <div className="gba:text-muted-foreground">Loading spreadsheet...</div>
        </div>
      )
    }

    return (
      <div
        className="gba:absolute gba:inset-0 gba:w-full gba:h-full gba:overflow-hidden"
        style={{ height: props.height ?? '100%', width: props.width ?? '100%' }}
      >
        <div ref={containerRef} className="gba:w-full gba:h-full" />
      </div>
    )
  }
)

export default UniverSheetGrid
