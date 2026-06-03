import type { SpreadsheetIntentJournal } from '../core/spreadsheetIntentJournal'
import type { SpreadsheetVersionCausalOwnershipRegistry } from '../core/spreadsheetVersionCausalOwnership'
import type { SpreadsheetRowMaterializationReadiness } from '../hooks/spreadsheetRowMaterializationReadiness'
import type { SpreadsheetRowSlotIdentityRegistry } from './spreadsheetRowSlotIdentity'
import { migratePendingLocalMutationProtectionRowHandle } from './spreadsheetPendingMaterializationCells'

type PendingLocalMutationCellsRef = { current: Set<string> }

interface SpreadsheetRowIdentityPromotionDeps {
  rowMaterializationReadiness?: Pick<SpreadsheetRowMaterializationReadiness, 'resolveMany'> | null
  rowSlotIdentityRegistry?: Pick<SpreadsheetRowSlotIdentityRegistry, 'bindBackendRowId'> | null
  intentJournal?: Pick<SpreadsheetIntentJournal, 'promoteLogicalRowHandle'> | null
  versionCausalOwnership?: Pick<SpreadsheetVersionCausalOwnershipRegistry, 'promoteLogicalRowHandle'> | null
  pendingLocalMutationCellsRef?: PendingLocalMutationCellsRef | null
}

/**
 * Central promotion choreography for `client_* -> backend UUID`.
 * Producers that hold row arrays still own rewriting `_id/_rowUuid`, but all
 * sidecars must move through this helper so promotion cannot be partial.
 */
export function promoteSpreadsheetRowIdentities(params: {
  sheetId: string
  persistedIdByClientRowId: ReadonlyMap<string, string>
  deps?: SpreadsheetRowIdentityPromotionDeps
}): void {
  const { sheetId, persistedIdByClientRowId, deps } = params
  if (!sheetId || persistedIdByClientRowId.size === 0) {
    return
  }

  const validMappings = new Map<string, string>()
  persistedIdByClientRowId.forEach((backendRowId, clientRowId) => {
    if (!clientRowId || !backendRowId || clientRowId === backendRowId) {
      return
    }
    validMappings.set(clientRowId, backendRowId)
  })

  if (validMappings.size === 0) {
    return
  }

  deps?.rowMaterializationReadiness?.resolveMany?.(sheetId, validMappings)

  validMappings.forEach((backendRowId, clientRowId) => {
    deps?.rowSlotIdentityRegistry?.bindBackendRowId?.(sheetId, clientRowId, backendRowId)
    deps?.intentJournal?.promoteLogicalRowHandle?.(clientRowId, backendRowId)
    deps?.versionCausalOwnership?.promoteLogicalRowHandle?.(sheetId, clientRowId, backendRowId)
    migratePendingLocalMutationProtectionRowHandle(
      deps?.pendingLocalMutationCellsRef ?? undefined,
      sheetId,
      clientRowId,
      backendRowId
    )
  })
}
