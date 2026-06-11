import type { MutableRefObject } from 'react'
import {
  mergeWorkbookFormattingFromDonor,
  stripWorkbookSnapshotValuesPreservingFormatting
} from '../utils/univerAdapter'
import {
  SpreadsheetApiRequestError,
  SpreadsheetApiService,
  getSpreadsheetBatchConflictServerVersion
} from '../services/SpreadsheetApiService'
import type { UniverSheetGridHandle } from '../components/UniverSheetGrid.types'
import { writeUniverSnapshotCache } from '../utils/univerSnapshotCache'
import {
  attachSnapshotCoversVersions,
  mergeSnapshotCoversVersions,
  type SpreadsheetSnapshotCoversVersions
} from '../utils/spreadsheetSnapshotCoverage'
import { cloneSnapshot } from './spreadsheetSnapshotWorkbookUtils'

const snapshotRecordMap = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

const mergeTargetWorksheetIntoLatestWorkbookSnapshot = (
  latestSnapshot: Record<string, unknown>,
  localSnapshot: Record<string, unknown>,
  targetSheetId: string
): Record<string, unknown> => {
  const merged = cloneSnapshot(latestSnapshot) as Record<string, unknown>
  const mergedSheets = snapshotRecordMap(merged.sheets) ?? {}
  const localSheets = snapshotRecordMap(localSnapshot.sheets)
  const localSheet = snapshotRecordMap(localSheets?.[targetSheetId])
  if (!localSheet) return merged

  merged.sheets = mergedSheets
  mergedSheets[targetSheetId] = cloneSnapshot(localSheet)
  const mergedSheetOrder = Array.isArray(merged.sheetOrder) ? [...merged.sheetOrder] : []
  if (!mergedSheetOrder.includes(targetSheetId)) {
    merged.sheetOrder = [...mergedSheetOrder, targetSheetId]
  }

  const latestStyles = snapshotRecordMap(merged.styles) ?? {}
  const localStyles = snapshotRecordMap(localSnapshot.styles) ?? {}
  merged.styles = { ...latestStyles, ...localStyles }
  return mergeWorkbookFormattingFromDonor(merged, latestSnapshot, targetSheetId)
}

const shouldAcceptRemoteWorkbookSnapshotAfterConflict = (useKeepaliveHttp: boolean): boolean => {
  if (useKeepaliveHttp) return true
  try {
    return globalThis.document?.visibilityState === 'hidden'
  } catch {
    return false
  }
}

export type SpreadsheetSaveWorkbookSnapshotWithRetryParams = {
  appId: string
  activeSheetId: string
  baseSnapshot: unknown
  prepareSnapshotForSave?: (snapshot: unknown) => unknown
  workbookSnapshotVersionRef: MutableRefObject<number>
  workbookSnapshotCoversVersionsRef: MutableRefObject<SpreadsheetSnapshotCoversVersions>
  snapshotSaveMetricsRef: MutableRefObject<{
    attempts: number
    conflicts: number
    failures: number
    fallbackLoads: number
  }>
  recoverFromVersionConflict: () => Promise<boolean>
  spreadsheetGridRef: MutableRefObject<UniverSheetGridHandle | null>
  maxSnapshotRetries: number
  /** When true (tab unloading), use fetch keepalive for small snapshot payloads so the request may outlive the page. */
  useKeepaliveHttp?: boolean
}

/** Snapshot PUT params without `appId` — caller supplies app via `SpreadsheetMutationFacade`. */
export type SpreadsheetSaveWorkbookSnapshotInput = Omit<SpreadsheetSaveWorkbookSnapshotWithRetryParams, 'appId'>

export const saveSpreadsheetSnapshotWithRetry = async ({
  appId,
  activeSheetId,
  baseSnapshot,
  prepareSnapshotForSave,
  workbookSnapshotVersionRef,
  workbookSnapshotCoversVersionsRef,
  snapshotSaveMetricsRef,
  recoverFromVersionConflict,
  spreadsheetGridRef,
  maxSnapshotRetries,
  useKeepaliveHttp = false
}: SpreadsheetSaveWorkbookSnapshotWithRetryParams): Promise<{
  savedSnapshot: unknown
  cacheResult: { stored: boolean; reason: string | null }
}> => {
  let lastError: unknown
  let retrySnapshotBase: unknown = baseSnapshot
  for (let attempt = 0; attempt < maxSnapshotRetries; attempt++) {
    let snapshotToSave: Record<string, unknown> | null = null
    try {
      const rawSnapshot =
        attempt === 0
          ? retrySnapshotBase
          : (retrySnapshotBase ?? spreadsheetGridRef.current?.getWorkbookSnapshot?.() ?? baseSnapshot)
      const clonedSnapshot = cloneSnapshot(rawSnapshot)
      const preparedSnapshot = (
        prepareSnapshotForSave ? prepareSnapshotForSave(clonedSnapshot) : clonedSnapshot
      ) as Record<string, unknown> | null
      const snapshotWithCoverage =
        preparedSnapshot && typeof preparedSnapshot === 'object'
          ? attachSnapshotCoversVersions(preparedSnapshot, workbookSnapshotCoversVersionsRef.current)
          : preparedSnapshot
      snapshotToSave =
        snapshotWithCoverage && typeof snapshotWithCoverage === 'object'
          ? stripWorkbookSnapshotValuesPreservingFormatting(snapshotWithCoverage)
          : preparedSnapshot
      const versionForSave = workbookSnapshotVersionRef.current
      const response = await SpreadsheetApiService.saveUniverSnapshot(
        appId,
        {
          version: versionForSave,
          snapshot: snapshotToSave as Record<string, unknown>
        },
        useKeepaliveHttp ? { keepalive: true } : undefined
      )
      workbookSnapshotVersionRef.current = response.version
      const cacheWrite = writeUniverSnapshotCache(
        appId,
        Number(response.version || versionForSave || 0),
        snapshotToSave as Record<string, unknown>
      )
      const cacheResult = {
        stored: cacheWrite.stored,
        reason: cacheWrite.reason ?? null
      }
      return { savedSnapshot: snapshotToSave, cacheResult }
    } catch (error) {
      lastError = error
      if (error instanceof SpreadsheetApiRequestError && error.status === 409 && attempt < maxSnapshotRetries - 1) {
        snapshotSaveMetricsRef.current.conflicts += 1
        const serverVersion = getSpreadsheetBatchConflictServerVersion(error.details)
        if (serverVersion != null) {
          workbookSnapshotVersionRef.current = serverVersion
          try {
            const latestWorkbookSnapshot = await SpreadsheetApiService.getUniverSnapshot(appId)
            const latestSnapshot =
              latestWorkbookSnapshot.snapshot && typeof latestWorkbookSnapshot.snapshot === 'object'
                ? latestWorkbookSnapshot.snapshot
                : null
            workbookSnapshotCoversVersionsRef.current = mergeSnapshotCoversVersions(
              workbookSnapshotCoversVersionsRef.current,
              latestWorkbookSnapshot.coversVersions
            )
            const latestVersion = Number(latestWorkbookSnapshot.version ?? serverVersion)
            if (Number.isFinite(latestVersion) && latestVersion >= 0) {
              workbookSnapshotVersionRef.current = latestVersion
            }
            if (latestSnapshot) {
              const visualLatestSnapshot = stripWorkbookSnapshotValuesPreservingFormatting(
                attachSnapshotCoversVersions(
                  latestSnapshot,
                  mergeSnapshotCoversVersions(
                    workbookSnapshotCoversVersionsRef.current,
                    latestWorkbookSnapshot.coversVersions
                  )
                ) ?? latestSnapshot
              )
              if (shouldAcceptRemoteWorkbookSnapshotAfterConflict(useKeepaliveHttp)) {
                const cacheWrite = writeUniverSnapshotCache(appId, latestVersion, visualLatestSnapshot)
                return {
                  savedSnapshot: visualLatestSnapshot,
                  cacheResult: { stored: cacheWrite.stored, reason: cacheWrite.reason ?? null }
                }
              }
              retrySnapshotBase =
                snapshotToSave && typeof snapshotToSave === 'object'
                  ? mergeTargetWorksheetIntoLatestWorkbookSnapshot(visualLatestSnapshot, snapshotToSave, activeSheetId)
                  : visualLatestSnapshot
            }
          } catch {
            // Fall back to retrying with the server version when the refresh itself fails.
          }
          continue
        }
        const recovered = await recoverFromVersionConflict()
        if (!recovered) {
          snapshotSaveMetricsRef.current.failures += 1
          throw error
        }
        continue
      }
      snapshotSaveMetricsRef.current.failures += 1
      throw error
    }
  }
  throw lastError
}
