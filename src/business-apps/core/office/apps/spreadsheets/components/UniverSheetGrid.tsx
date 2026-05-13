/**
 * UniverSheetGrid Component
 *
 * Wrapper that integrates Univer with our spreadsheet system.
 * Replaces FortuneSheetGrid; same props and ref contract for TableView and collaboration.
 */

import React, {
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useReducer,
  useState
} from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import spreadsheetTranslations from '../_i18n'
import {
  parseA1Reference,
  toA1Reference,
  type SpreadsheetBulkRemoteApplyMeta,
  type SpreadsheetBulkRemoteCellItem
} from '../core'
import type { SpreadsheetColumn, SpreadsheetSheet } from '../types/spreadsheet'
import { buildWorkbookSnapshot, createUniverConversionContext } from '../utils/univerAdapter'
import type {
  AuthoritativeGridRegion,
  ForceAuthoritativeGridReapplyOptions
} from '../utils/spreadsheetAuthoritativeRegion'
import {
  SPREADSHEET_BULK_APPLY_CHUNK_SIZE,
  SPREADSHEET_BULK_MAX_DENSE_RECTANGLE_CELLS,
  SPREADSHEET_BULK_MIN_CELLS_FOR_FAST_PATH,
  SPREADSHEET_BULK_RAF_BUDGET_MS,
  SPREADSHEET_BULK_RAF_MIN_CHUNK_CELLS
} from '../utils/spreadsheetBulkRemoteConstants'
import { parseSpreadsheetCursorPath } from './cursorPathUtils'
import type {
  ApplyRemoteCellUpdateOptions,
  CellDimensionsPayload,
  UniverSheetGridHandle,
  UniverSheetGridProps
} from './UniverSheetGrid.types'
import type { SnapshotDimensions } from './univerGridInternalTypes'
import { syncUniverGridUiSession } from './univerGridUiSession'
import { useUniverGridController } from './useUniverGridController'
import { debugRemoteApply } from './univerGridDebug'
import { useUniverDomChrome } from './useUniverDomChrome'
import { remoteEchoKey, toEchoSignature } from './univerGridAuthoritativeHelpers'
import { useUniverAuthoritativeGridSync } from './useUniverAuthoritativeGridSync'
import { useUniverRemoteApply } from './useUniverRemoteApply'
import { useUniverReadOnlyInteraction } from './useUniverReadOnlyInteraction'
import { mountUniverWorkbookBootstrap } from './univerWorkbookBootstrapMount'
import { BULK_SERIAL_FALLBACK_CELLS_PER_FRAME, REMOTE_ECHO_SUPPRESSION_TTL_MS } from './univerGridUniverConstants'
import {
  isCurrentFacadeWorksheet,
  runWithWorkbookFacadeSheetActive,
  mergeWorksheetFormattingWithAuthoritativeValues,
  normalizeBlankLikeEchoSignature,
  normalizeValueForGridWrite,
  parseLegacySpreadsheetCursorPath,
  writeRemoteCellIntoUniverWorksheetSync
} from './univerGridWorkbookMutationModule'
import { useUniverGridContextMenuChrome } from './useUniverGridContextMenuChrome'
import { useUniverGridLocaleRibbonChrome } from './useUniverGridLocaleRibbonChrome'
import { useUniverGridHyperlinkCapture } from './useUniverGridHyperlinkCapture'
import { useUniverGridEmbeddedShortcuts } from './useUniverGridEmbeddedShortcuts'
import {
  useUniverGridConversionContextSync,
  useUniverGridSnapshotColumnAndTimerEffects
} from './useUniverGridWorkbookAuxiliaryEffects'
import { useUniverGridCollaborationOverlays } from './useUniverGridCollaborationOverlays'

import {
  CURSOR_OVERLAY_COL_WIDTH_PX,
  CURSOR_OVERLAY_HEADER_HEIGHT_PX,
  CURSOR_OVERLAY_ROW_HEIGHT_PX,
  CURSOR_OVERLAY_ROW_INDEX_WIDTH_PX
} from './univerGridLayoutConstants'
import { getSupportedUniverFonts } from './univerGridLocaleChrome'
import { extractActiveRangePosition } from './univerGridRangeSelection'
import { formatCommentTime, getInitials } from './univerGridCommentPresentation'
import { tryStructuredClone } from '../utils/tryStructuredClone'

export const UniverSheetGrid = forwardRef<UniverSheetGridHandle, UniverSheetGridProps>(
  function UniverSheetGrid(props, ref) {
    const { t, locale: appLocale } = useTranslation(spreadsheetTranslations)
    const resolveMenuLabel = (key: string, fallback: string): string => {
      const translated = t(key)
      return translated && translated !== key ? translated : fallback
    }
    const mergeMenuLabels = {
      merge: resolveMenuLabel('spreadsheet-merge', 'Merge'),
      unmerge: resolveMenuLabel('spreadsheet-unmerge', 'Unmerge')
    }
    syncUniverGridUiSession({ appLocale, mergeMenuLabels })

    const { sheet, data, columns } = props

    const { containerRef, gridHostEl, gridHostReady, setGridHostRef } = useUniverDomChrome()
    const [authoritativeReapplySeed, setAuthoritativeReapplySeed] = useState(0)
    const gridMountedRef = useRef(false)
    const isMountAlive = useCallback(() => gridMountedRef.current, [])

    useEffect(() => {
      gridMountedRef.current = true
      return () => {
        gridMountedRef.current = false
      }
    }, [])

    const ctl = useUniverGridController(props)
    const {
      isSheetInteractionActiveRef,
      univerAPIRef,
      remoteEchoSuppressionRef,
      deferredRemoteCellAppliesRef,
      isApplyingRemoteUpdateRef,
      isDirtyRef,
      snapshotRequestInFlightRef,
      snapshotRequestQueuedRef,
      requestSnapshotCheckpointRef,
      scheduleSnapshotCheckpointRef,
      lastSyncedGridCellSignaturesRef,
      collabPersistedBulkApplyDepthRef,
      lastSyncedGridRowCountRef,
      lastSyncedGridColumnCountRef,
      lastProcessedAuthoritativeDataSyncTokenRef,
      pendingAuthoritativeRegionRef,
      pendingForcedAuthoritativeReapplyRef,
      lastProcessedAuthoritativeReapplySeedRef,
      skipNextAuthoritativeSyncAfterSnapshotInitRef,
      recentLocallyMutatedGridCellsRef,
      activeSelectionRef,
      contextRef,
      propsRef,
      callbacksRef,
      readOnlyRef,
      lastEmittedCursorPathRef,
      pendingInitialCursorPathRef,
      recentSheetMutationIdsRef,
      cellDimensionsRef,
      sheetScrollRef,
      refreshCursorRectsRef,
      refreshCommentRectsRef,
      updateCellDimensionsRef
    } = ctl

    useUniverGridContextMenuChrome({
      isReadOnly: props.isReadOnly,
      containerRef,
      mergeMenuLabels,
      openLinkMenuLabel: t('link-editor-open-link'),
      univerAPIRef,
      activeSelectionRef,
      propsRef,
      callbacksRef
    })

    useUniverGridLocaleRibbonChrome({
      isReadOnly: props.isReadOnly,
      gridHostEl,
      univerAPIRef
    })

    useUniverGridHyperlinkCapture({
      containerRef,
      univerAPIRef,
      activeSelectionRef,
      propsRef
    })

    const { onSpreadsheetKeyDown } = useUniverGridEmbeddedShortcuts({
      isReadOnly: props.isReadOnly,
      containerRef,
      univerAPIRef,
      isSheetInteractionActiveRef
    })

    useEffect(() => {
      const box = gridHostEl?.getBoundingClientRect()
      props.onInitLifecycle?.({
        phase: gridHostEl && gridHostReady ? 'host_ready' : 'host_waiting',
        sheetId: sheet.id,
        workbookInstanceKey: props.workbookInstanceKey,
        snapshotSeed: props.snapshotSeed,
        width: box?.width,
        height: box?.height,
        reason: gridHostEl ? 'grid_host_size_gate' : 'grid_host_missing'
      })
    }, [gridHostEl, gridHostReady, props.workbookInstanceKey, props.snapshotSeed, props.onInitLifecycle, sheet.id])

    const [collabBulkApplyIdleNonce, bumpCollabBulkApplyIdle] = useReducer((n: number) => n + 1, 0)
    const legacyCursorContext = useMemo(() => createUniverConversionContext(columns, data), [columns, data])
    const renderedSheetId = useMemo(
      () => props.getCanonicalSheetId?.(sheet.id) ?? sheet.id,
      [props.getCanonicalSheetId, sheet.id]
    )
    const remoteCursorOverlays = useMemo(
      () =>
        (props.participants ?? [])
          .map(participant => {
            const parsed =
              parseSpreadsheetCursorPath(participant.cursor?.path, renderedSheetId, {
                requireSheetMatch: Boolean(props.multiSheetWorkbookMode),
                normalizeSheetId: props.getCanonicalSheetId
              }) ||
              parseLegacySpreadsheetCursorPath(
                participant.cursor?.path,
                renderedSheetId,
                legacyCursorContext,
                columns,
                props.getCanonicalSheetId
              )
            if (!parsed) return null
            return {
              id: `${participant.socketId || participant.userId}`,
              userName: participant.userName || t('editor-user-fallback'),
              userColor: participant.userColor || '#4ECDC4',
              avatarUrl: participant.avatarUrl,
              row: parsed.row,
              col: parsed.col,
              endRow: parsed.endRow,
              endCol: parsed.endCol
            }
          })
          .filter(
            (
              entry
            ): entry is {
              id: string
              userName: string
              userColor: string
              avatarUrl: string | undefined
              row: number
              col: number
              endRow: number | undefined
              endCol: number | undefined
            } => !!entry
          ),
      [
        columns,
        legacyCursorContext,
        props.getCanonicalSheetId,
        props.multiSheetWorkbookMode,
        props.participants,
        renderedSheetId,
        t
      ]
    )

    useEffect(() => {
      if (props.collaborationEnabled) {
        lastEmittedCursorPathRef.current = ''
        pendingInitialCursorPathRef.current = ''
      }
    }, [props.collaborationEnabled, sheet.id, props.snapshotSeed])
    const supportedUniverFonts = useMemo(() => getSupportedUniverFonts(), [])
    const commentOverlays = useMemo(
      () =>
        (props.commentedCells ?? [])
          .map(comment => {
            const parsed = parseA1Reference(comment.cellReference)
            if (!parsed) return null
            return {
              id: comment.cellReference,
              ref: comment.cellReference,
              row: parsed.row,
              col: parsed.col,
              content: comment.content,
              createdByName: comment.createdByName,
              createdByAvatar: comment.createdByAvatar,
              createdAt: comment.createdAt
            }
          })
          .filter(
            (
              entry
            ): entry is {
              id: string
              ref: string
              row: number
              col: number
              content: string
              createdByName: string | undefined
              createdByAvatar: string | undefined
              createdAt: string | undefined
            } => !!entry
          ),
      [props.commentedCells]
    )

    const { cursorRects, commentRects, hoveredCommentId, setHoveredCommentId } = useUniverGridCollaborationOverlays({
      containerRef,
      remoteCursorOverlays,
      commentOverlays,
      univerAPIRef,
      propsRef,
      cellDimensionsRef,
      sheetScrollRef,
      refreshCursorRectsRef,
      refreshCommentRectsRef,
      updateCellDimensionsRef
    })

    // Callers should prefer passing A1-resolved coordinates (from cellRef) directly as rowIndex/colIndex.
    // The rowId fallback attempts to re-resolve via contextRef, but contextRef tracks the data prop
    // (not the Univer workbook), so it can be wrong vs the sender's cellRef — use `useSenderA1Row` from collab.
    const applyRemoteCellUpdate = useCallback(
      (rowIndex: number, colIndex: number, value: unknown, rowId?: string, options?: ApplyRemoteCellUpdateOptions) => {
        const traceRemoteApply = (
          stage: 'grid_remote_apply_succeeded' | 'grid_remote_apply_failed',
          payload: Record<string, unknown>,
          severity: 'info' | 'warning' | 'error' = 'info'
        ) => {
          callbacksRef.current.onDiagnosticsTraceEvent?.({
            source: 'client',
            stage,
            severity,
            traceSessionId: options?.diagnosticTraceSessionId ?? null,
            traceId: options?.diagnosticTraceId ?? null,
            batchId: options?.diagnosticBatchId ?? null,
            operationType: options?.diagnosticOperationType ?? null,
            payload
          })
        }
        const tryApply = (attempt: number) => {
          if (!gridMountedRef.current) return
          try {
            const api = univerAPIRef.current
            if (!api) {
              if (attempt < 2) {
                debugRemoteApply('schedule_retry', {
                  reason: 'no_api',
                  attempt,
                  row0: rowIndex,
                  col0: colIndex,
                  a1: toA1Reference(rowIndex, colIndex)
                })
                globalThis.setTimeout(() => {
                  if (gridMountedRef.current) tryApply(attempt + 1)
                }, 150)
                return
              }
              console.warn('[UniverSheetGrid] applyRemoteCellUpdate: Univer API unavailable after retries')
              debugRemoteApply('give_up', { reason: 'no_api', row0: rowIndex, col0: colIndex })
              traceRemoteApply(
                'grid_remote_apply_failed',
                { reason: 'no_api', rowIndex, colIndex, rowId: rowId ?? null },
                'error'
              )
              return
            }
            let resolvedRow = rowIndex
            const targetSheetId =
              typeof options?.targetSheetId === 'string' && options.targetSheetId.trim()
                ? options.targetSheetId.trim()
                : ''
            const shouldResolveRowFromActiveContext =
              !options?.useSenderA1Row && rowId && (!targetSheetId || targetSheetId === propsRef.current.sheet.id)
            if (shouldResolveRowFromActiveContext && contextRef.current) {
              const gridIndex = contextRef.current.rowIdToIndex.get(rowId)
              if (gridIndex !== undefined) {
                resolvedRow = gridIndex
              } else {
                const d = propsRef.current.data
                const fallback = d.findIndex(r => {
                  const ids = [r._rowUuid, r._id, r.id].map(v => (v == null ? '' : String(v))).filter(Boolean)
                  return ids.includes(rowId)
                })
                if (fallback >= 0) resolvedRow = fallback
              }
            }
            const expiresAt = Date.now() + REMOTE_ECHO_SUPPRESSION_TTL_MS
            const key = remoteEchoKey(resolvedRow, colIndex)
            const echoSource =
              options?.univerCell && typeof options.univerCell === 'object' ? options.univerCell : value
            const signatureCandidates = new Set<string>()
            signatureCandidates.add(normalizeBlankLikeEchoSignature(toEchoSignature(echoSource)))
            // Authoritative clears (`clear_cell` / blank value over `batch_operations`) surface as
            // blank-like cell-change events after apply, so add the 'blank' candidate for them.
            // Style-only `cells_changed` payloads no longer need this — we merge style without
            // touching `v`/`f`/`m`, so no blank-like event is generated on the receiver.
            if (value === null || value === undefined || value === '') {
              signatureCandidates.add('blank')
            }
            remoteEchoSuppressionRef.current.set(key, {
              expiresAt,
              signatures: signatureCandidates
            })
            globalThis.setTimeout(() => {
              if (!gridMountedRef.current) return
              const current = remoteEchoSuppressionRef.current.get(key)
              if (current?.expiresAt === expiresAt) {
                remoteEchoSuppressionRef.current.delete(key)
              }
            }, REMOTE_ECHO_SUPPRESSION_TTL_MS + 50)

            const workbook = api.getActiveWorkbook()
            if (!workbook) {
              if (attempt < 2) {
                debugRemoteApply('schedule_retry', {
                  reason: 'no_workbook',
                  attempt,
                  row0: resolvedRow,
                  col0: colIndex,
                  a1: toA1Reference(resolvedRow, colIndex)
                })
                globalThis.setTimeout(() => {
                  if (gridMountedRef.current) tryApply(attempt + 1)
                }, 150)
                return
              }
              console.warn('[UniverSheetGrid] applyRemoteCellUpdate: no active workbook after retries')
              debugRemoteApply('give_up', { reason: 'no_workbook', row0: resolvedRow, col0: colIndex })
              traceRemoteApply(
                'grid_remote_apply_failed',
                { reason: 'no_workbook', rowIndex: resolvedRow, colIndex, rowId: rowId ?? null },
                'error'
              )
              return
            }
            const activeWorksheet = workbook.getActiveSheet()
            const candidateWorksheet =
              targetSheetId && propsRef.current.multiSheetWorkbookMode
                ? (((workbook as { getSheetBySheetId?: (id: string) => unknown }).getSheetBySheetId?.(targetSheetId) as
                    | ReturnType<typeof workbook.getActiveSheet>
                    | undefined) ?? null)
                : activeWorksheet
            const worksheet =
              targetSheetId && propsRef.current.multiSheetWorkbookMode && candidateWorksheet
                ? candidateWorksheet
                : isCurrentFacadeWorksheet(activeWorksheet, candidateWorksheet, targetSheetId || undefined)
                  ? candidateWorksheet
                  : undefined
            if (!worksheet) {
              if (attempt < 2) {
                debugRemoteApply('schedule_retry', {
                  reason: targetSheetId ? 'worksheet_not_current' : 'no_worksheet',
                  attempt,
                  row0: resolvedRow,
                  col0: colIndex,
                  a1: toA1Reference(resolvedRow, colIndex)
                })
                globalThis.setTimeout(() => {
                  if (gridMountedRef.current) tryApply(attempt + 1)
                }, 150)
                return
              }
              console.warn('[UniverSheetGrid] applyRemoteCellUpdate: no active worksheet after retries')
              debugRemoteApply('give_up', {
                reason: targetSheetId ? 'worksheet_not_current' : 'no_worksheet',
                row0: resolvedRow,
                col0: colIndex
              })
              traceRemoteApply(
                'grid_remote_apply_failed',
                {
                  reason: targetSheetId ? 'worksheet_not_current' : 'no_worksheet',
                  rowIndex: resolvedRow,
                  colIndex,
                  rowId: rowId ?? null,
                  targetSheetId: targetSheetId || null
                },
                'error'
              )
              return
            }
            debugRemoteApply('sync_path', {
              attempt,
              row0: resolvedRow,
              col0: colIndex,
              a1: toA1Reference(resolvedRow, colIndex),
              usedRowId: Boolean(rowId && shouldResolveRowFromActiveContext),
              targetSheetId: targetSheetId || undefined
            })
            const range = worksheet.getRange(resolvedRow, colIndex)
            if (!range) {
              console.warn('[UniverSheetGrid] applyRemoteCellUpdate: getRange returned null', { resolvedRow, colIndex })
              debugRemoteApply('sync_getRange_null', {
                row0: resolvedRow,
                col0: colIndex,
                a1: toA1Reference(resolvedRow, colIndex),
                attempt
              })
              traceRemoteApply(
                'grid_remote_apply_failed',
                { reason: 'get_range_null', rowIndex: resolvedRow, colIndex, rowId: rowId ?? null },
                'error'
              )
              return
            }
            // Defer setValue so React/state updates from commitLocalSheetData (same collab tick) and
            // any microtasks Univer schedules from prior cells run first — avoids sporadic blank cells
            // under fast remote bursts (same refs applied, withA1Applied=1, but UI missing a value).
            const rowForApply = resolvedRow
            const colForApply = colIndex
            debugRemoteApply('queue_setValue_microtask', {
              row0: rowForApply,
              col0: colForApply,
              a1: toA1Reference(rowForApply, colForApply),
              attempt
            })
            queueMicrotask(() => {
              if (!gridMountedRef.current) return
              isApplyingRemoteUpdateRef.current = true
              try {
                debugRemoteApply('microtask_begin', {
                  row0: rowForApply,
                  col0: colForApply,
                  a1: toA1Reference(rowForApply, colForApply)
                })
                const apiQ = univerAPIRef.current
                if (!apiQ) {
                  debugRemoteApply('microtask_skip', { reason: 'no_api', row0: rowForApply, col0: colForApply })
                  return
                }
                const wbQ = apiQ.getActiveWorkbook()
                if (!wbQ) {
                  debugRemoteApply('microtask_skip', { reason: 'no_workbook', row0: rowForApply, col0: colForApply })
                  return
                }
                const activeWsQ = wbQ.getActiveSheet?.()
                const candidateWsQ =
                  targetSheetId && propsRef.current.multiSheetWorkbookMode
                    ? (((wbQ as { getSheetBySheetId?: (id: string) => unknown }).getSheetBySheetId?.(targetSheetId) as
                        | ReturnType<typeof wbQ.getActiveSheet>
                        | undefined) ?? null)
                    : activeWsQ
                const wsQ =
                  targetSheetId && propsRef.current.multiSheetWorkbookMode && candidateWsQ
                    ? candidateWsQ
                    : isCurrentFacadeWorksheet(activeWsQ, candidateWsQ, targetSheetId || undefined)
                      ? candidateWsQ
                      : undefined
                if (!wsQ) {
                  debugRemoteApply('microtask_skip', {
                    reason: targetSheetId ? 'worksheet_not_current' : 'no_worksheet',
                    row0: rowForApply,
                    col0: colForApply,
                    targetSheetId: targetSheetId || undefined
                  })
                  return
                }
                const wsSheetId = (wsQ as { getSheetId?: () => string }).getSheetId?.()
                const activeFacadeSheetId = (activeWsQ as { getSheetId?: () => string } | null)?.getSheetId?.()
                const shouldTempActivateForFacade =
                  Boolean(propsRef.current.multiSheetWorkbookMode) &&
                  typeof wsSheetId === 'string' &&
                  wsSheetId !== activeFacadeSheetId
                debugRemoteApply('setValue_call', {
                  row0: rowForApply,
                  col0: colForApply,
                  a1: toA1Reference(rowForApply, colForApply)
                })
                runWithWorkbookFacadeSheetActive(
                  wbQ as {
                    getActiveSheet?: () => { getSheetId?: () => string } | null | undefined
                    setActiveSheet?: (id: string) => unknown
                  },
                  shouldTempActivateForFacade ? wsSheetId : undefined,
                  () => {
                    const sheetForWrite = (shouldTempActivateForFacade ? wbQ.getActiveSheet?.() : wsQ) as {
                      getRange: (
                        row: number,
                        col: number,
                        numRows?: number,
                        numColumns?: number
                      ) => { getCellData?: () => unknown; setValue: (v: unknown) => unknown } | null | undefined
                    }
                    if (!sheetForWrite) {
                      debugRemoteApply('microtask_skip', {
                        reason: 'no_worksheet_after_activation',
                        row0: rowForApply,
                        col0: colForApply,
                        targetSheetId: targetSheetId || undefined
                      })
                      return
                    }
                    writeRemoteCellIntoUniverWorksheetSync({
                      workbook: wbQ as { addStyles?: (s: Record<string, unknown>) => void },
                      worksheet: sheetForWrite,
                      rowForApply,
                      colForApply,
                      value,
                      options,
                      echoKey: key,
                      remoteEchoSuppressionRef
                    })
                  }
                )
                debugRemoteApply('setValue_done', {
                  row0: rowForApply,
                  col0: colForApply,
                  a1: toA1Reference(rowForApply, colForApply)
                })
                traceRemoteApply('grid_remote_apply_succeeded', {
                  rowIndex: rowForApply,
                  colIndex: colForApply,
                  rowId: rowId ?? null,
                  hasUniverCell: Boolean(options?.univerCell),
                  hasUniverStyles: Boolean(options?.univerStyles)
                })
              } catch (e) {
                console.error('[UniverSheetGrid] applyRemoteCellUpdate error:', e)
                debugRemoteApply('microtask_error', {
                  row0: rowForApply,
                  col0: colForApply,
                  message: e instanceof Error ? e.message : 'unknown'
                })
                traceRemoteApply(
                  'grid_remote_apply_failed',
                  {
                    reason: 'microtask_error',
                    rowIndex: rowForApply,
                    colIndex: colForApply,
                    rowId: rowId ?? null,
                    message: e instanceof Error ? e.message : 'unknown'
                  },
                  'error'
                )
              } finally {
                isApplyingRemoteUpdateRef.current = false
                debugRemoteApply('microtask_finally', { row0: rowForApply, col0: colForApply })
              }
            })
          } catch (e) {
            console.error('[UniverSheetGrid] applyRemoteCellUpdate error:', e)
            debugRemoteApply('tryApply_throw', {
              row0: rowIndex,
              col0: colIndex,
              message: e instanceof Error ? e.message : 'unknown'
            })
            traceRemoteApply(
              'grid_remote_apply_failed',
              {
                reason: 'try_apply_throw',
                rowIndex,
                colIndex,
                rowId: rowId ?? null,
                message: e instanceof Error ? e.message : 'unknown'
              },
              'error'
            )
          }
        }
        tryApply(0)
      },
      []
    )

    const prepareAuthoritativeRegionSync = useCallback((region: AuthoritativeGridRegion | null) => {
      pendingAuthoritativeRegionRef.current = region
    }, [])

    const applyRemoteCellUpdatesBulk = useCallback(
      (items: SpreadsheetBulkRemoteCellItem[], meta?: SpreadsheetBulkRemoteApplyMeta) => {
        if (items.length === 0) return
        if (items.length < SPREADSHEET_BULK_MIN_CELLS_FOR_FAST_PATH) {
          for (const it of items) {
            applyRemoteCellUpdate(it.rowIndex, it.colIndex, it.value, it.rowId, it.options)
          }
          meta?.onApplyComplete?.()
          return
        }

        const traceBulk = (stage: string, payload: Record<string, unknown>) => {
          callbacksRef.current.onDiagnosticsTraceEvent?.({
            source: 'client',
            stage,
            traceSessionId: meta?.traceSessionId ?? null,
            traceId: meta?.traceId ?? null,
            batchId: meta?.batchId ?? null,
            operationType: meta?.operationType ?? 'bulk_remote_cell',
            payload
          })
        }

        const started = globalThis.performance?.now?.() ?? Date.now()
        const d = propsRef.current.data

        const normalized: SpreadsheetBulkRemoteCellItem[] = items.map(it => {
          let rowIndex = it.rowIndex
          const targetSheetId =
            typeof it.options?.targetSheetId === 'string' && it.options.targetSheetId.trim()
              ? it.options.targetSheetId.trim()
              : ''
          const shouldResolveRowFromActiveContext =
            !it.options?.useSenderA1Row && it.rowId && (!targetSheetId || targetSheetId === propsRef.current.sheet.id)
          const resolvedRowId = it.rowId
          if (shouldResolveRowFromActiveContext && contextRef.current && resolvedRowId) {
            const gridIndex = contextRef.current.rowIdToIndex.get(resolvedRowId)
            if (gridIndex !== undefined) {
              rowIndex = gridIndex
            } else {
              const fallback = d.findIndex(r => {
                const ids = [r._rowUuid, r._id, r.id].map(v => (v == null ? '' : String(v))).filter(Boolean)
                return ids.includes(resolvedRowId)
              })
              if (fallback >= 0) rowIndex = fallback
            }
          }
          return { ...it, rowIndex }
        })

        const seededEchoSuppressAt = Date.now()
        for (const it of normalized) {
          const resolvedRow = it.rowIndex
          const colIndex = it.colIndex
          const key = remoteEchoKey(resolvedRow, colIndex)
          const expiresAt = seededEchoSuppressAt + REMOTE_ECHO_SUPPRESSION_TTL_MS
          const echoSource =
            it.options?.univerCell && typeof it.options.univerCell === 'object' ? it.options.univerCell : it.value
          const signatureCandidates = new Set<string>()
          signatureCandidates.add(normalizeBlankLikeEchoSignature(toEchoSignature(echoSource)))
          if (it.value === null || it.value === undefined || it.value === '') {
            signatureCandidates.add('blank')
          }
          remoteEchoSuppressionRef.current.set(key, { expiresAt, signatures: signatureCandidates })
        }

        queueMicrotask(() => {
          if (!gridMountedRef.current) {
            meta?.onApplyComplete?.()
            return
          }
          collabPersistedBulkApplyDepthRef.current += 1
          let bulkApplyFinished = false
          const finishBulkApplyOnce = () => {
            if (bulkApplyFinished) return
            bulkApplyFinished = true
            collabPersistedBulkApplyDepthRef.current -= 1
            if (gridMountedRef.current) {
              bumpCollabBulkApplyIdle()
            }
            meta?.onApplyComplete?.()
          }

          const recordBulkCellSignature = (cellItem: SpreadsheetBulkRemoteCellItem) => {
            const sigKey = remoteEchoKey(cellItem.rowIndex, cellItem.colIndex)
            const sigVal =
              cellItem.options?.univerCell &&
              typeof cellItem.options.univerCell === 'object' &&
              Object.keys(cellItem.options.univerCell).length > 0
                ? cellItem.options.univerCell
                : normalizeValueForGridWrite(cellItem.value)
            lastSyncedGridCellSignaturesRef.current.set(sigKey, toEchoSignature(sigVal))
          }

          if (!normalized.length) {
            finishBulkApplyOnce()
            return
          }

          const apiQ = univerAPIRef.current
          if (!apiQ) {
            traceBulk('grid_bulk_remote_apply_failed', {
              reason: 'no_api',
              cellCount: normalized.length,
              hint: 'skipped_bulk_fallback_avoids_join_deadlocks_from_retry_timers'
            })
            finishBulkApplyOnce()
            return
          }
          const wbQ = apiQ.getActiveWorkbook() as {
            addStyles?: (s: Record<string, unknown>) => void
            getActiveSheet?: () => unknown
            getSheetBySheetId?: (id: string) => unknown
          } | null
          if (!wbQ) {
            traceBulk('grid_bulk_remote_apply_failed', {
              reason: 'no_workbook',
              cellCount: normalized.length,
              hint: 'skipped_bulk_fallback_avoids_join_deadlocks_from_retry_timers'
            })
            finishBulkApplyOnce()
            return
          }
          const targetSheetId =
            typeof normalized[0]?.options?.targetSheetId === 'string' && normalized[0].options.targetSheetId.trim()
              ? normalized[0].options.targetSheetId.trim()
              : ''
          const activeWsQ = wbQ.getActiveSheet?.() as { getSheetId?: () => string } | null
          const candidateWsQ =
            targetSheetId && propsRef.current.multiSheetWorkbookMode
              ? ((wbQ.getSheetBySheetId?.(targetSheetId) as typeof activeWsQ | undefined) ?? null)
              : activeWsQ
          const wsQ = isCurrentFacadeWorksheet(activeWsQ, candidateWsQ, targetSheetId || undefined)
            ? candidateWsQ
            : undefined
          if (!wsQ) {
            traceBulk('grid_bulk_remote_apply_fallback_serial', {
              reason: 'worksheet_not_ready_for_bulk',
              cellCount: normalized.length,
              cellsPerFrame: BULK_SERIAL_FALLBACK_CELLS_PER_FRAME,
              targetSheetId: targetSheetId || null,
              multiSheetWorkbookMode: propsRef.current.multiSheetWorkbookMode
            })
            let serialOffset = 0
            const runSerialChunk = () => {
              if (!gridMountedRef.current) {
                finishBulkApplyOnce()
                return
              }
              const end = Math.min(serialOffset + BULK_SERIAL_FALLBACK_CELLS_PER_FRAME, normalized.length)
              for (; serialOffset < end; serialOffset += 1) {
                const it = normalized[serialOffset]
                if (it) {
                  applyRemoteCellUpdate(it.rowIndex, it.colIndex, it.value, it.rowId, it.options)
                }
              }
              if (serialOffset < normalized.length) {
                globalThis.requestAnimationFrame(runSerialChunk)
              } else {
                finishBulkApplyOnce()
              }
            }
            globalThis.requestAnimationFrame(runSerialChunk)
            return
          }

          const workbook = wbQ as { addStyles?: (s: Record<string, unknown>) => void }
          const worksheet = wsQ as {
            getRange: (
              r: number,
              c: number,
              nr?: number,
              nc?: number
            ) => {
              getCellData?: () => unknown
              setValue: (v: unknown) => unknown
              setValues?: (v: unknown) => unknown
            } | null
          }

          const mergedStyleReg: Record<string, unknown> = {}
          for (const it of normalized) {
            const s = it.options?.univerStyles
            if (s && typeof s === 'object') {
              for (const [id, def] of Object.entries(s)) {
                if (def && typeof def === 'object') mergedStyleReg[id] = def
              }
            }
          }
          if (Object.keys(mergedStyleReg).length > 0) {
            try {
              workbook.addStyles?.(mergedStyleReg)
            } catch (e) {
              console.warn('[UniverSheetGrid] bulk addStyles failed', e)
            }
          }

          const noUniverCell = normalized.every(it => {
            const uc = it.options?.univerCell
            const hasNonEmptyUniverCell =
              uc && typeof uc === 'object' && !Array.isArray(uc) && Object.keys(uc).length > 0
            if (hasNonEmptyUniverCell) return false
            const stylePatch = it.options?.stylePatch
            const hasStylePatch =
              stylePatch &&
              typeof stylePatch === 'object' &&
              ((stylePatch.set &&
                typeof stylePatch.set === 'object' &&
                Object.keys(stylePatch.set as Record<string, unknown>).length > 0) ||
                (Array.isArray(stylePatch.unset) && stylePatch.unset.length > 0))
            if (hasStylePatch) return false
            const us = it.options?.univerStyles
            const hasStyles = us && typeof us === 'object' && Object.keys(us).length > 0
            return !hasStyles
          })

          if (noUniverCell) {
            const byKey = new Map<string, SpreadsheetBulkRemoteCellItem>()
            for (const it of normalized) {
              byKey.set(`${it.rowIndex}:${it.colIndex}`, it)
            }
            const coords = Array.from(byKey.values())
            const minR = Math.min(...coords.map(c => c.rowIndex))
            const maxR = Math.max(...coords.map(c => c.rowIndex))
            const minC = Math.min(...coords.map(c => c.colIndex))
            const maxC = Math.max(...coords.map(c => c.colIndex))
            const h = maxR - minR + 1
            const w = maxC - minC + 1
            if (byKey.size === h * w && h * w <= SPREADSHEET_BULK_MAX_DENSE_RECTANGLE_CELLS) {
              const matrix: unknown[][] = []
              let denseOk = true
              for (let r = 0; r < h && denseOk; r++) {
                const row: unknown[] = []
                for (let c = 0; c < w; c++) {
                  const cellItem = byKey.get(`${minR + r}:${minC + c}`)
                  if (!cellItem) {
                    denseOk = false
                    break
                  }
                  const rQ = worksheet.getRange(minR + r, minC + c)
                  if (!rQ) {
                    denseOk = false
                    break
                  }
                  const scalar = normalizeValueForGridWrite(cellItem.value)
                  if (scalar && typeof scalar === 'object') {
                    denseOk = false
                    break
                  }
                  try {
                    const current = rQ.getCellData?.() as Record<string, unknown> | null | undefined
                    const keepStyle = current && typeof current === 'object' && 's' in current && current.s != null
                    if (keepStyle) {
                      denseOk = false
                      break
                    }
                    row.push(scalar)
                  } catch {
                    row.push(scalar)
                  }
                }
                if (denseOk) matrix.push(row)
              }
              if (denseOk && matrix.length === h) {
                try {
                  const range = worksheet.getRange(minR, minC, h, w)
                  if (range && typeof range.setValues === 'function') {
                    isApplyingRemoteUpdateRef.current = true
                    try {
                      range.setValues(matrix as any)
                      traceBulk('grid_bulk_remote_apply_completed', {
                        mode: 'dense_setValues',
                        cellCount: normalized.length,
                        durationMs: Math.round((globalThis.performance?.now?.() ?? Date.now()) - started)
                      })
                      for (const cellItem of byKey.values()) {
                        recordBulkCellSignature(cellItem)
                      }
                    } finally {
                      isApplyingRemoteUpdateRef.current = false
                    }
                    finishBulkApplyOnce()
                    return
                  }
                } catch (e) {
                  console.warn('[UniverSheetGrid] bulk setValues failed, using chunked applies', e)
                }
              }
            }
          }

          let offset = 0
          let chunkCount = 0
          const runChunk = () => {
            if (!gridMountedRef.current) {
              finishBulkApplyOnce()
              return
            }
            isApplyingRemoteUpdateRef.current = true
            const chunkStart = globalThis.performance?.now?.() ?? Date.now()
            try {
              let written = 0
              while (offset < normalized.length) {
                const it = normalized[offset]!
                const key = remoteEchoKey(it.rowIndex, it.colIndex)
                writeRemoteCellIntoUniverWorksheetSync({
                  workbook,
                  worksheet,
                  rowForApply: it.rowIndex,
                  colForApply: it.colIndex,
                  value: it.value,
                  options: it.options,
                  echoKey: key,
                  remoteEchoSuppressionRef
                })
                recordBulkCellSignature(it)
                offset += 1
                written += 1
                const elapsed = (globalThis.performance?.now?.() ?? Date.now()) - chunkStart
                if (
                  written >= SPREADSHEET_BULK_APPLY_CHUNK_SIZE ||
                  (elapsed >= SPREADSHEET_BULK_RAF_BUDGET_MS && written >= SPREADSHEET_BULK_RAF_MIN_CHUNK_CELLS)
                ) {
                  break
                }
              }
              chunkCount += 1
            } finally {
              isApplyingRemoteUpdateRef.current = false
            }
            if (offset < normalized.length) {
              globalThis.requestAnimationFrame(runChunk)
            } else {
              traceBulk('grid_bulk_remote_apply_completed', {
                mode: noUniverCell ? 'chunked' : 'chunked_mixed_payload',
                cellCount: normalized.length,
                chunkCount,
                durationMs: Math.round((globalThis.performance?.now?.() ?? Date.now()) - started)
              })
              finishBulkApplyOnce()
            }
          }
          globalThis.requestAnimationFrame(runChunk)
        })
      },
      [applyRemoteCellUpdate]
    )

    useEffect(() => {
      if (!props.multiSheetWorkbookMode) return undefined
      const sid = sheet.id
      const queued = deferredRemoteCellAppliesRef.current.get(sid)
      if (!queued?.length) return undefined
      deferredRemoteCellAppliesRef.current.delete(sid)
      const raf = globalThis.requestAnimationFrame(() => {
        if (!gridMountedRef.current) return
        queued.forEach(item => {
          applyRemoteCellUpdate(item.rowIndex, item.colIndex, item.value, item.rowId, item.options)
        })
      })
      return () => globalThis.cancelAnimationFrame(raf)
    }, [props.multiSheetWorkbookMode, sheet.id, applyRemoteCellUpdate])

    const getWorkbookSnapshot = useCallback((): Record<string, unknown> | null => {
      const api = univerAPIRef.current
      if (!api) return null
      try {
        const workbook = api.getActiveWorkbook()
        if (!workbook) return null
        const wb = workbook as unknown as {
          save?: () => unknown
          getSnapshot?: () => unknown
          snapshot?: unknown
          _workbook?: {
            getStyles?: () => { toJSON?: () => Record<string, unknown> } | undefined
            getSnapshot?: () => Record<string, unknown> | undefined
          }
        }
        const rawSnapshot = wb.save?.() ?? wb.getSnapshot?.() ?? wb.snapshot
        if (!rawSnapshot || typeof rawSnapshot !== 'object') return null

        // Safety net: Univer's FWorkbook.save() deep-clones workbook._snapshot, but that
        // _snapshot.styles can drift from the live Styles registry in edge cases (e.g. a
        // snapshot replacement after bootstrap while the live registry keeps mutating).
        // Rehydrate from the authoritative Styles instance so cell `s` refs always resolve.
        try {
          const snapshotObj = rawSnapshot as Record<string, unknown>
          const snapshotStylesKeys = Object.keys((snapshotObj.styles as Record<string, unknown>) ?? {})
          const liveStyles = wb._workbook?.getStyles?.()?.toJSON?.()
          const liveStylesKeys = liveStyles ? Object.keys(liveStyles) : []
          if (liveStyles && liveStylesKeys.length > snapshotStylesKeys.length) {
            snapshotObj.styles = { ...(snapshotObj.styles as Record<string, unknown> | undefined), ...liveStyles }
          }
        } catch {
          // Non-fatal; fall back to raw snapshot if style rehydration fails.
        }

        const clonedSnapshot = tryStructuredClone(rawSnapshot as Record<string, unknown>)
        if (!clonedSnapshot) {
          console.error('[UniverSheetGrid] snapshot could not be cloned safely')
          return null
        }
        return clonedSnapshot
      } catch (e) {
        console.error('[UniverSheetGrid] getWorkbookSnapshot error:', e)
        return null
      }
    }, [])

    const getWorkbookSnapshotRef = useRef(getWorkbookSnapshot)
    getWorkbookSnapshotRef.current = getWorkbookSnapshot

    const {
      applyRemoteDimensions,
      applyRemoteClearAllRange,
      applyRemoteClearFormatRange,
      applyRemoteSpreadsheetFeatureOperation
    } = useUniverRemoteApply({
      sheetId: sheet.id,
      propsRef,
      univerAPIRef,
      cellDimensionsRef,
      isApplyingRemoteUpdateRef,
      refreshCursorRectsRef,
      refreshCommentRectsRef
    })

    const getVisibleRangeValues = useCallback(
      (rowCount: number, colCount: number): Record<number, Record<number, unknown>> | null => {
        const api = univerAPIRef.current
        if (!api) return null
        try {
          const workbook = api.getActiveWorkbook()
          const worksheet = workbook?.getActiveSheet?.()
          if (!worksheet) return null

          const values: Record<number, Record<number, unknown>> = {}
          const safeRowCount = Math.max(0, Math.min(rowCount, 1000))
          let effectiveMaxCol = Math.max(0, Math.min(colCount, 256))
          for (let row = 0; row < safeRowCount; row++) {
            for (let col = 0; col < effectiveMaxCol; col++) {
              try {
                const range = worksheet.getRange?.(row, col)
                const value =
                  (range as { getValue?: () => unknown })?.getValue?.() ??
                  (range as { getCellData?: () => { v?: unknown } })?.getCellData?.()?.v
                if (value === undefined) continue
                if (!values[row]) values[row] = {}
                values[row][col] = value
              } catch {
                effectiveMaxCol = col
                break
              }
            }
          }
          return values
        } catch (e) {
          console.error('[UniverSheetGrid] getVisibleRangeValues error:', e)
          return null
        }
      },
      []
    )

    const getActiveCellReference = useCallback((): string | null => {
      const active =
        activeSelectionRef.current ?? extractActiveRangePosition(univerAPIRef.current?.getActiveWorkbook?.())
      if (!active) return null
      const a1 = toA1Reference(active.row, active.col)
      return a1 || null
    }, [])

    const toCellDimensionsPayload = useCallback(
      (dims: SnapshotDimensions): CellDimensionsPayload => ({
        sheetId: sheet.id,
        defaultColWidth: dims.defaultColWidth,
        defaultRowHeight: dims.defaultRowHeight,
        columnData: dims.columnData,
        rowData: dims.rowData,
        rowHeaderWidth: dims.rowHeaderWidth,
        columnHeaderHeight: dims.columnHeaderHeight,
        zoomRatio: dims.zoomRatio
      }),
      [sheet.id]
    )

    useImperativeHandle(
      ref,
      () => ({
        applyRemoteCellUpdate,
        applyRemoteCellUpdatesBulk,
        applyRemoteClearAllRange,
        prepareAuthoritativeRegionSync,
        forceAuthoritativeReapply: (
          region?: AuthoritativeGridRegion | null,
          options?: ForceAuthoritativeGridReapplyOptions
        ) => {
          const isFullGrid = region == null
          const clearAllSignatures = options?.clearAllSignatures ?? isFullGrid
          const preferBulk = options?.preferBulk ?? true
          if (clearAllSignatures) {
            lastSyncedGridCellSignaturesRef.current = new Map()
          } else if (region) {
            const sig = lastSyncedGridCellSignaturesRef.current
            for (let r = region.minRow; r <= region.maxRow; r += 1) {
              for (let c = region.minCol; c <= region.maxCol; c += 1) {
                sig.delete(remoteEchoKey(r, c))
              }
            }
          } else {
            lastSyncedGridCellSignaturesRef.current = new Map()
          }
          pendingForcedAuthoritativeReapplyRef.current = {
            region: isFullGrid ? null : region,
            preferBulk,
            clearAllSignatures
          }
          setAuthoritativeReapplySeed(prev => prev + 1)
        },
        getWorkbookSnapshot,
        getVisibleRangeValues,
        applyRemoteDimensions,
        applyRemoteClearFormatRange,
        applyRemoteSpreadsheetFeatureOperation,
        getActiveCellReference,
        syncGridConversionContext: (nextColumns: SpreadsheetColumn[], nextData?: Record<string, unknown>[]) => {
          if (!univerAPIRef.current) return
          propsRef.current.columns = nextColumns
          if (nextData) {
            propsRef.current.data = nextData
          }
          contextRef.current = createUniverConversionContext(nextColumns, propsRef.current.data)
        },
        requestSnapshotCheckpoint: (force = false) => {
          requestSnapshotCheckpointRef.current?.(force)
        },
        ensureWorksheetExists: (targetSheet, targetData = [], targetColumns = targetSheet.columns, options = {}) => {
          const sheetId = typeof targetSheet?.id === 'string' ? targetSheet.id : ''
          if (!sheetId) return false
          try {
            const api = univerAPIRef.current
            const workbook = api?.getActiveWorkbook?.() as
              | {
                  getActiveSheet?: () => { getSheetId?: () => string } | null | undefined
                  getSheetBySheetId?: (id: string) => unknown
                  getSheets?: () => Array<{ getSheetId?: () => string } | unknown>
                  setActiveSheet?: (idOrSheet: string) => unknown
                }
              | null
              | undefined
            if (!api || !workbook) return false
            if (workbook.getSheetBySheetId?.(sheetId)) {
              if (!options.replaceExisting || !options.worksheetSnapshot) {
                if (options.activate) workbook.setActiveSheet?.(sheetId)
                return true
              }
            }

            const normalizedSheet: SpreadsheetSheet = {
              ...targetSheet,
              id: sheetId,
              name: targetSheet.name || 'Sheet',
              viewType: targetSheet.viewType ?? 'table',
              columns: targetColumns,
              views: targetSheet.views ?? [],
              data: targetData,
              settings: targetSheet.settings ?? {
                allowAdd: true,
                allowEdit: true,
                allowDelete: true,
                allowExport: true,
                allowImport: true,
                rowsPerPage: 25,
                showRowNumbers: true
              }
            }
            const snapshot = buildWorkbookSnapshot(normalizedSheet, targetData, targetColumns)
            const valueWorksheet = snapshot.sheets[sheetId]
            const worksheet = options.worksheetSnapshot
              ? mergeWorksheetFormattingWithAuthoritativeValues(
                  options.worksheetSnapshot,
                  valueWorksheet as unknown as Record<string, unknown>,
                  sheetId,
                  normalizedSheet.name
                )
              : valueWorksheet
            if (!worksheet) return false
            const existingSheets = workbook.getSheets?.() ?? []
            const existingCount = Array.isArray(existingSheets) ? existingSheets.length : undefined
            const existingIndex = Array.isArray(existingSheets)
              ? existingSheets.findIndex(entry => {
                  if (entry == null || typeof entry !== 'object') return false
                  const getSheetId = (entry as { getSheetId?: () => string }).getSheetId
                  if (typeof getSheetId !== 'function') return false
                  try {
                    const id = getSheetId.call(entry)
                    return typeof id === 'string' && id === sheetId
                  } catch {
                    return false
                  }
                })
              : -1
            const index =
              typeof options.index === 'number' && Number.isFinite(options.index)
                ? Math.max(0, Math.trunc(options.index))
                : Math.max(0, existingIndex >= 0 ? existingIndex : (existingCount ?? 0))
            const executeCommand = (api as { executeCommand?: (id: string, params: unknown) => unknown }).executeCommand
            if (typeof executeCommand !== 'function') return false

            let previousActiveSheetId: string | undefined
            try {
              const id = workbook.getActiveSheet?.()?.getSheetId?.()
              previousActiveSheetId = typeof id === 'string' ? id : undefined
            } catch {
              previousActiveSheetId = undefined
            }
            if (options.replaceExisting && workbook.getSheetBySheetId?.(sheetId)) {
              recentSheetMutationIdsRef.current.add(`rm:${sheetId}`)
              executeCommand.call(api, 'sheet.command.remove-sheet', {
                subUnitId: sheetId
              })
            }
            recentSheetMutationIdsRef.current.add(`ins:${sheetId}`)
            executeCommand.call(api, 'sheet.command.insert-sheet', {
              index,
              sheet: worksheet
            })
            if (options.activate) {
              workbook.setActiveSheet?.(sheetId)
            } else if (previousActiveSheetId && previousActiveSheetId !== sheetId) {
              workbook.setActiveSheet?.(previousActiveSheetId)
            }
            return true
          } catch (error) {
            console.warn('[UniverSheetGrid] ensureWorksheetExists failed:', error)
            return false
          }
        },
        renameWorksheet: (sheetId, sheetName) => {
          const targetSheetId = typeof sheetId === 'string' ? sheetId.trim() : ''
          const targetSheetName = typeof sheetName === 'string' ? sheetName.trim() : ''
          if (!targetSheetId || !targetSheetName) return false
          try {
            const api = univerAPIRef.current
            const workbook = api?.getActiveWorkbook?.() as
              | {
                  getSheetBySheetId?: (id: string) => unknown
                }
              | null
              | undefined
            if (!api || !workbook) return false
            if (!workbook.getSheetBySheetId?.(targetSheetId)) return true
            const executeCommand = (api as { executeCommand?: (id: string, params: unknown) => unknown }).executeCommand
            if (typeof executeCommand !== 'function') return false

            recentSheetMutationIdsRef.current.add(`rn:${targetSheetId}:${targetSheetName}`)
            executeCommand.call(api, 'sheet.command.set-worksheet-name', {
              subUnitId: targetSheetId,
              name: targetSheetName
            })
            return true
          } catch (error) {
            console.warn('[UniverSheetGrid] renameWorksheet failed:', error)
            return false
          }
        },
        removeWorksheet: sheetId => {
          const targetSheetId = typeof sheetId === 'string' ? sheetId.trim() : ''
          if (!targetSheetId) return false
          try {
            const api = univerAPIRef.current
            const workbook = api?.getActiveWorkbook?.() as
              | {
                  getSheetBySheetId?: (id: string) => unknown
                }
              | null
              | undefined
            if (!api || !workbook) return false
            if (!workbook.getSheetBySheetId?.(targetSheetId)) return true
            const executeCommand = (api as { executeCommand?: (id: string, params: unknown) => unknown }).executeCommand
            if (typeof executeCommand !== 'function') return false

            recentSheetMutationIdsRef.current.add(`rm:${targetSheetId}`)
            executeCommand.call(api, 'sheet.command.remove-sheet', {
              subUnitId: targetSheetId
            })
            return true
          } catch (error) {
            console.warn('[UniverSheetGrid] removeWorksheet failed:', error)
            return false
          }
        },
        setWorksheetVisibility: (sheetId, hidden) => {
          const targetSheetId = typeof sheetId === 'string' ? sheetId.trim() : ''
          if (!targetSheetId) return false
          try {
            const api = univerAPIRef.current
            const workbook = api?.getActiveWorkbook?.() as
              | {
                  getSheetBySheetId?: (id: string) => unknown
                  getUnitId?: () => string
                }
              | null
              | undefined
            if (!api || !workbook) return false
            if (!workbook.getSheetBySheetId?.(targetSheetId)) return true
            const executeCommand = (api as { executeCommand?: (id: string, params: unknown) => unknown }).executeCommand
            if (typeof executeCommand !== 'function') return false

            recentSheetMutationIdsRef.current.add(`vis:${targetSheetId}:${hidden ? 'hidden' : 'visible'}`)
            executeCommand.call(
              api,
              hidden ? 'sheet.command.set-worksheet-hidden' : 'sheet.command.set-worksheet-show',
              {
                unitId: workbook.getUnitId?.(),
                subUnitId: targetSheetId
              }
            )
            return true
          } catch (error) {
            console.warn('[UniverSheetGrid] setWorksheetVisibility failed:', error)
            return false
          }
        }
      }),
      [
        applyRemoteCellUpdate,
        applyRemoteCellUpdatesBulk,
        applyRemoteClearAllRange,
        prepareAuthoritativeRegionSync,
        getWorkbookSnapshot,
        getVisibleRangeValues,
        applyRemoteDimensions,
        applyRemoteClearFormatRange,
        applyRemoteSpreadsheetFeatureOperation,
        getActiveCellReference
      ]
    )

    const flushQueuedSnapshotRequest = useCallback(() => {
      if (!snapshotRequestQueuedRef.current) return
      snapshotRequestQueuedRef.current = false
      if (!isDirtyRef.current) return
      requestSnapshotCheckpointRef.current?.(true)
    }, [])

    useUniverGridConversionContextSync({
      data,
      columns,
      univerAPIRef,
      contextRef
    })

    useUniverAuthoritativeGridSync({
      sheet,
      data,
      columns,
      authoritativeDataSyncToken: props.authoritativeDataSyncToken,
      authoritativeReapplySeed,
      collabBulkApplyIdleNonce,
      univerAPIRef,
      lastSyncedGridCellSignaturesRef,
      lastSyncedGridRowCountRef,
      lastSyncedGridColumnCountRef,
      lastProcessedAuthoritativeDataSyncTokenRef,
      lastProcessedAuthoritativeReapplySeedRef,
      collabPersistedBulkApplyDepthRef,
      skipNextAuthoritativeSyncAfterSnapshotInitRef,
      getWorkbookSnapshotRef,
      pendingAuthoritativeRegionRef,
      pendingForcedAuthoritativeReapplyRef,
      recentLocallyMutatedGridCellsRef,
      applyRemoteCellUpdate,
      applyRemoteCellUpdatesBulk
    })

    useUniverGridSnapshotColumnAndTimerEffects({
      columns,
      univerAPIRef,
      cellDimensionsRef,
      isDirtyRef,
      snapshotRequestInFlightRef,
      requestSnapshotCheckpointRef,
      scheduleSnapshotCheckpointRef,
      readOnlyRef
    })

    // Recreate Univer when workbook identity / snapshot seed / host / fonts / app locale change.
    useEffect(() => {
      return mountUniverWorkbookBootstrap({
        ...ctl,
        gridHostEl,
        gridHostReady,
        containerRef,
        getWorkbookSnapshotRef,
        props,
        sheet,
        appLocale,
        supportedUniverFonts,
        flushQueuedSnapshotRequest,
        isMountAlive,
        toCellDimensionsPayload
      })
    }, [
      props.workbookInstanceKey,
      props.snapshotSeed,
      gridHostEl,
      gridHostReady,
      supportedUniverFonts,
      appLocale,
      isMountAlive
    ])

    useEffect(() => {
      if (!props.multiSheetWorkbookMode) return
      try {
        const wb = univerAPIRef.current?.getActiveWorkbook?.() as
          | {
              getActiveSheet?: () => { getSheetId?: () => string }
              setActiveSheet?: (id: string) => void
            }
          | undefined
        const activeWorksheetId = wb?.getActiveSheet?.()?.getSheetId?.()
        if (activeWorksheetId === sheet.id) return
        wb?.setActiveSheet?.(sheet.id)
      } catch {
        /* ignore */
      }
    }, [props.multiSheetWorkbookMode, sheet.id])

    const { forwardReadOnlyOverlayWheel } = useUniverReadOnlyInteraction()

    return (
      <div
        className="gba:absolute gba:inset-0 gba:w-full gba:h-full gba:overflow-hidden"
        style={{ height: props.height ?? '100%', width: props.width ?? '100%' }}
        onKeyDown={onSpreadsheetKeyDown}
      >
        <div ref={setGridHostRef} className="gba:w-full gba:h-full" data-testid="univer-sheet-grid-container" />
        {props.isReadOnly && (
          <div
            data-testid="univer-readonly-overlay"
            className="gba:absolute gba:inset-0 gba:z-30 gba:cursor-not-allowed"
            onWheel={forwardReadOnlyOverlayWheel}
            aria-hidden="true"
          />
        )}
        <div className="gba:absolute gba:inset-0 gba:pointer-events-none gba:z-20">
          {remoteCursorOverlays.map(cursor =>
            (() => {
              const rect = cursorRects[cursor.id]
              if (!rect) return null
              return (
                <div
                  key={cursor.id}
                  className="gba:absolute gba:box-border gba:rounded-sm"
                  style={{
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                    border: `2px solid ${cursor.userColor}`,
                    backgroundColor: `${cursor.userColor}1A`,
                    boxShadow: `0 0 8px ${cursor.userColor}33`
                  }}
                >
                  {cursor.avatarUrl ? (
                    <img
                      src={cursor.avatarUrl}
                      alt={cursor.userName}
                      title={cursor.userName}
                      className="gba:absolute gba:-top-2 gba:-right-2 gba:h-5 gba:w-5 gba:rounded-full gba:object-cover gba:shadow-sm"
                      style={{ border: `2px solid ${cursor.userColor}` }}
                    />
                  ) : (
                    <div
                      className="gba:absolute gba:-top-2 gba:-right-2 gba:h-5 gba:min-w-5 gba:px-1 gba:text-[9px] gba:leading-5 gba:font-semibold gba:text-white gba:rounded-full gba:text-center gba:whitespace-nowrap gba:shadow-sm"
                      style={{ backgroundColor: cursor.userColor }}
                      title={cursor.userName}
                    >
                      {getInitials(cursor.userName)}
                    </div>
                  )}
                </div>
              )
            })()
          )}
        </div>
        <div className="gba:absolute gba:inset-0 gba:pointer-events-none gba:z-10">
          {commentOverlays.map(marker => {
            const rect = commentRects[marker.id]
            const top = rect ? rect.top : CURSOR_OVERLAY_HEADER_HEIGHT_PX + marker.row * CURSOR_OVERLAY_ROW_HEIGHT_PX
            const leftBase = rect
              ? rect.left
              : CURSOR_OVERLAY_ROW_INDEX_WIDTH_PX + marker.col * CURSOR_OVERLAY_COL_WIDTH_PX
            const width = rect ? rect.width : CURSOR_OVERLAY_COL_WIDTH_PX
            return (
              <React.Fragment key={marker.id}>
                <div
                  className="gba:absolute gba:h-2.5 gba:w-2.5 gba:rounded-full gba:bg-blue-500 gba:border gba:border-white gba:shadow-sm"
                  style={{
                    top: Math.max(0, top + 2),
                    left: Math.max(0, leftBase + width - 12)
                  }}
                  title={`Comment: ${marker.ref}`}
                  data-testid="univer-cell-comment-badge"
                />
                <div
                  className="gba:absolute gba:pointer-events-auto gba:cursor-pointer"
                  style={{
                    top: Math.max(0, top),
                    left: Math.max(0, leftBase + width - 24),
                    width: 24,
                    height: 24
                  }}
                  onMouseEnter={() => setHoveredCommentId(marker.id)}
                  onMouseLeave={() => setHoveredCommentId(prev => (prev === marker.id ? null : prev))}
                />
              </React.Fragment>
            )
          })}
          {(() => {
            if (!hoveredCommentId) return null
            const marker = commentOverlays.find(entry => entry.id === hoveredCommentId)
            if (!marker) return null
            const rect = commentRects[marker.id]
            if (!rect) return null
            const top = rect.top
            const left = rect.left
            const author = marker.createdByName || t('editor-user-fallback')
            const avatar = marker.createdByAvatar
            const time = formatCommentTime(marker.createdAt)
            return (
              <div
                className="gba:absolute gba:w-[260px] gba:max-w-[65vw] gba:rounded-2xl gba:border gba:bg-card gba:p-4 gba:shadow-xl"
                style={{ top: Math.max(8, top - 164), left: Math.max(8, left - 24) }}
                data-testid="univer-cell-comment-hover-card"
              >
                <div className="gba:flex gba:items-center gba:gap-3">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={author}
                      className="gba:h-9 gba:w-9 gba:rounded-full gba:object-cover gba:border"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="gba:flex gba:h-9 gba:w-9 gba:items-center gba:justify-center gba:rounded-full gba:bg-emerald-800 gba:text-xs gba:font-semibold gba:text-white">
                      {getInitials(author)}
                    </div>
                  )}
                  <div className="gba:flex gba:flex-col">
                    <div className="gba:text-sm gba:leading-none gba:font-semibold">{author}</div>
                    {time && <div className="gba:text-xs gba:leading-none gba:text-muted-foreground">{time}</div>}
                  </div>
                </div>
                <div className="gba:mt-3 gba:text-sm gba:leading-snug">{marker.content || ''}</div>
              </div>
            )
          })()}
        </div>
      </div>
    )
  }
)

export default UniverSheetGrid
