import { useCallback, useRef, type MutableRefObject } from 'react'

import type { SpreadsheetSheet } from '../types'
import { isSheetCreationAwaitingPersistedId, resolveReconciledSheetId } from '../utils/reconcileTemporarySheetId'

type PendingCreatedSheetSelection = {
  temporarySheetId: string
  persistedSheetId: string | null
} | null

export interface UseSpreadsheetSheetIdentityBridgeParams {
  sheets: Array<Pick<SpreadsheetSheet, 'id' | 'name'>>
  activeSheetIdRef: MutableRefObject<string>
  createdSheetIdAliasesRef: MutableRefObject<Map<string, string>>
  programmaticWorksheetActivationGuardRef?: MutableRefObject<{
    expectedActiveSheetId: string
    expiresAt: number
  } | null>
  pendingCreatedSheetSelectionRef: MutableRefObject<PendingCreatedSheetSelection>
  setActiveSheetIdWithPeerCache: (sheetId: string) => void
  resolveKnownSheetVersion: (sheetId: string) => number
  debugLog: (message: string, meta?: Record<string, unknown>) => void
}

export interface SpreadsheetActiveWorksheetSyncDecision {
  accepted: boolean
  decision:
    | 'matched'
    | 'synced'
    | 'blocked_programmatic_activation'
    | 'blocked_pending_sheet_creation'
    | 'unknown_sheet'
  canonicalWorksheetId: string
  canonicalActiveSheetId: string
  targetSheetId: string | null
}

export interface SpreadsheetPersistTargetDecision {
  submit: boolean
  decision:
    | 'matched'
    | 'selection_sync_required'
    | 'pending_sheet_creation'
    | 'unknown_sheet'
    | 'unsafe_unpersisted_sheet'
  producerSheetId: string
  canonicalProducerSheetId: string
  reactActiveSheetId: string
  canonicalReactActiveSheetId: string
  targetSheetId: string | null
  knownSheetIds: string[]
  targetSheetVersion: number
  activeSheetVersion: number
}

export interface UseSpreadsheetSheetIdentityBridgeResult {
  handleUniverActiveWorksheetChange: (
    worksheetId: string,
    worksheetName: string
  ) => SpreadsheetActiveWorksheetSyncDecision
  resolveMutationPersistTarget: (producerSheetId: string) => SpreadsheetPersistTargetDecision
}

const findTargetSheet = (
  sheets: Array<Pick<SpreadsheetSheet, 'id' | 'name'>>,
  canonicalWorksheetId: string,
  worksheetName: string
): Pick<SpreadsheetSheet, 'id' | 'name'> | null =>
  sheets.find(sheet => sheet.id === canonicalWorksheetId) ?? sheets.find(sheet => sheet.name === worksheetName) ?? null

const buildKnownSheetIds = (
  sheets: Array<Pick<SpreadsheetSheet, 'id' | 'name'>>,
  aliases: ReadonlyMap<string, string>
): string[] => sheets.map(sheet => resolveReconciledSheetId(sheet.id, aliases))

const pendingSelectionContainsSheet = (
  pendingCreatedSheetSelection: PendingCreatedSheetSelection,
  sheetId: string,
  aliases: ReadonlyMap<string, string>
): boolean => {
  if (!pendingCreatedSheetSelection) return false
  return [pendingCreatedSheetSelection.temporarySheetId, pendingCreatedSheetSelection.persistedSheetId]
    .filter((candidate): candidate is string => Boolean(candidate))
    .map(candidate => resolveReconciledSheetId(candidate, aliases))
    .includes(sheetId)
}

export function useSpreadsheetSheetIdentityBridge(
  params: UseSpreadsheetSheetIdentityBridgeParams
): UseSpreadsheetSheetIdentityBridgeResult {
  const {
    sheets,
    activeSheetIdRef,
    createdSheetIdAliasesRef,
    programmaticWorksheetActivationGuardRef,
    pendingCreatedSheetSelectionRef,
    setActiveSheetIdWithPeerCache,
    resolveKnownSheetVersion,
    debugLog
  } = params

  const lastUnknownWorksheetIdRef = useRef<string>('')

  const handleUniverActiveWorksheetChange = useCallback(
    (worksheetId: string, worksheetName: string): SpreadsheetActiveWorksheetSyncDecision => {
      const aliases = createdSheetIdAliasesRef.current
      const canonicalWorksheetId = resolveReconciledSheetId(worksheetId, aliases)
      const canonicalActiveSheetId = resolveReconciledSheetId(activeSheetIdRef.current, aliases)
      const programmaticWorksheetActivationGuard = programmaticWorksheetActivationGuardRef?.current

      if (programmaticWorksheetActivationGuard) {
        const expectedActiveSheetId = resolveReconciledSheetId(
          programmaticWorksheetActivationGuard.expectedActiveSheetId,
          aliases
        )

        if (Date.now() > programmaticWorksheetActivationGuard.expiresAt) {
          programmaticWorksheetActivationGuardRef.current = null
        } else if (canonicalWorksheetId === expectedActiveSheetId) {
          programmaticWorksheetActivationGuardRef.current = null
        } else if (canonicalActiveSheetId === expectedActiveSheetId) {
          return {
            accepted: false,
            decision: 'blocked_programmatic_activation',
            canonicalWorksheetId,
            canonicalActiveSheetId,
            targetSheetId: null
          }
        } else {
          programmaticWorksheetActivationGuardRef.current = null
        }
      }

      const pendingCreatedSheetSelection = pendingCreatedSheetSelectionRef.current
      if (pendingCreatedSheetSelection) {
        const expectedSheetIds = new Set(
          [pendingCreatedSheetSelection.temporarySheetId, pendingCreatedSheetSelection.persistedSheetId]
            .filter((sheetId): sheetId is string => Boolean(sheetId))
            .map(sheetId => resolveReconciledSheetId(sheetId, aliases))
        )

        if (expectedSheetIds.has(canonicalWorksheetId)) {
          if (
            pendingCreatedSheetSelection.persistedSheetId &&
            canonicalWorksheetId === resolveReconciledSheetId(pendingCreatedSheetSelection.persistedSheetId, aliases)
          ) {
            pendingCreatedSheetSelectionRef.current = null
          }
        } else if (expectedSheetIds.has(canonicalActiveSheetId)) {
          return {
            accepted: false,
            decision: 'blocked_pending_sheet_creation',
            canonicalWorksheetId,
            canonicalActiveSheetId,
            targetSheetId: null
          }
        }
      }

      const targetSheet = findTargetSheet(sheets, canonicalWorksheetId, worksheetName)
      if (!targetSheet) {
        if (lastUnknownWorksheetIdRef.current !== canonicalWorksheetId) {
          lastUnknownWorksheetIdRef.current = canonicalWorksheetId
          debugLog('sheet identity bridge observed unknown active worksheet', {
            worksheetId,
            worksheetName,
            canonicalWorksheetId,
            canonicalActiveSheetId,
            knownSheetIds: buildKnownSheetIds(sheets, aliases)
          })
        }
        return {
          accepted: false,
          decision: 'unknown_sheet',
          canonicalWorksheetId,
          canonicalActiveSheetId,
          targetSheetId: null
        }
      }

      lastUnknownWorksheetIdRef.current = ''
      if (targetSheet.id === canonicalActiveSheetId) {
        return {
          accepted: true,
          decision: 'matched',
          canonicalWorksheetId,
          canonicalActiveSheetId,
          targetSheetId: targetSheet.id
        }
      }

      setActiveSheetIdWithPeerCache(targetSheet.id)

      return {
        accepted: true,
        decision: 'synced',
        canonicalWorksheetId,
        canonicalActiveSheetId,
        targetSheetId: targetSheet.id
      }
    },
    [
      activeSheetIdRef,
      createdSheetIdAliasesRef,
      debugLog,
      pendingCreatedSheetSelectionRef,
      programmaticWorksheetActivationGuardRef,
      setActiveSheetIdWithPeerCache,
      sheets
    ]
  )

  const resolveMutationPersistTarget = useCallback(
    (producerSheetId: string): SpreadsheetPersistTargetDecision => {
      const aliases = createdSheetIdAliasesRef.current
      const canonicalProducerSheetId = resolveReconciledSheetId(producerSheetId, aliases)
      const reactActiveSheetId = activeSheetIdRef.current
      const canonicalReactActiveSheetId = resolveReconciledSheetId(reactActiveSheetId, aliases)
      const knownSheetIds = buildKnownSheetIds(sheets, aliases)
      const targetSheet = sheets.find(sheet => resolveReconciledSheetId(sheet.id, aliases) === canonicalProducerSheetId)
      const targetSheetVersion = targetSheet ? resolveKnownSheetVersion(targetSheet.id) : 0
      const activeSheetVersion = resolveKnownSheetVersion(canonicalReactActiveSheetId)
      const pendingCreatedSheetSelection = pendingCreatedSheetSelectionRef.current

      if (
        isSheetCreationAwaitingPersistedId({
          pendingCreatedSheetSelection,
          effectiveSheetId: producerSheetId,
          aliases
        })
      ) {
        return {
          submit: false,
          decision: 'pending_sheet_creation',
          producerSheetId,
          canonicalProducerSheetId,
          reactActiveSheetId,
          canonicalReactActiveSheetId,
          targetSheetId: null,
          knownSheetIds,
          targetSheetVersion,
          activeSheetVersion
        }
      }

      if (!targetSheet) {
        return {
          submit: false,
          decision: 'unknown_sheet',
          producerSheetId,
          canonicalProducerSheetId,
          reactActiveSheetId,
          canonicalReactActiveSheetId,
          targetSheetId: null,
          knownSheetIds,
          targetSheetVersion,
          activeSheetVersion
        }
      }

      if (
        canonicalProducerSheetId !== canonicalReactActiveSheetId &&
        targetSheetVersion <= 0 &&
        activeSheetVersion > 0 &&
        !pendingSelectionContainsSheet(pendingCreatedSheetSelection, canonicalProducerSheetId, aliases)
      ) {
        return {
          submit: false,
          decision: 'unsafe_unpersisted_sheet',
          producerSheetId,
          canonicalProducerSheetId,
          reactActiveSheetId,
          canonicalReactActiveSheetId,
          targetSheetId: null,
          knownSheetIds,
          targetSheetVersion,
          activeSheetVersion
        }
      }

      if (canonicalProducerSheetId !== canonicalReactActiveSheetId) {
        debugLog('sheet identity bridge blocked mutation batch until selection sync completes', {
          producerSheetId,
          canonicalProducerSheetId,
          reactActiveSheetId,
          canonicalReactActiveSheetId,
          knownSheetIds
        })

        return {
          submit: false,
          decision: 'selection_sync_required',
          producerSheetId,
          canonicalProducerSheetId,
          reactActiveSheetId,
          canonicalReactActiveSheetId,
          targetSheetId: targetSheet.id,
          knownSheetIds,
          targetSheetVersion,
          activeSheetVersion
        }
      }

      return {
        submit: true,
        decision: 'matched',
        producerSheetId,
        canonicalProducerSheetId,
        reactActiveSheetId,
        canonicalReactActiveSheetId,
        targetSheetId: targetSheet.id,
        knownSheetIds,
        targetSheetVersion,
        activeSheetVersion
      }
    },
    [
      activeSheetIdRef,
      createdSheetIdAliasesRef,
      debugLog,
      pendingCreatedSheetSelectionRef,
      resolveKnownSheetVersion,
      setActiveSheetIdWithPeerCache,
      sheets
    ]
  )

  return {
    handleUniverActiveWorksheetChange,
    resolveMutationPersistTarget
  }
}
