import type { SpreadsheetBatchOperation, SpreadsheetBatchOperationResponse } from '../services/SpreadsheetApiService'
import { getSpreadsheetRowRefIdentity, resolveSpreadsheetRowRef } from '../utils/spreadsheetRowIdentity'
import { promoteSpreadsheetRowIdentities } from '../utils/spreadsheetRowIdentityPromotion'
import { isSpreadsheetStoredCellClearValue } from './spreadsheetBatchBuilders'
import type { SpreadsheetIntentJournal } from './spreadsheetIntentJournal'
import type { SpreadsheetVersionCausalOwnershipRegistry } from './spreadsheetVersionCausalOwnership'

type OperationCellTarget = {
  logicalRowHandle: string
  columnName: string
}

const readCellTargetFromRecord = (record: Record<string, unknown>): OperationCellTarget | null => {
  const rowRef = resolveSpreadsheetRowRef(record.rowRef)
  const rowId = String(record.rowId ?? '')
  const logicalRowHandle = rowId || (rowRef ? getSpreadsheetRowRefIdentity(rowRef) : '')
  const columnName = String(record.columnName ?? record.column ?? '')
  if (!logicalRowHandle || !columnName) {
    return null
  }
  return { logicalRowHandle, columnName }
}

const readOperationCellTargets = (operation: SpreadsheetBatchOperation): OperationCellTarget[] => {
  const type = String(operation.type ?? '')
  const data = operation.data
  if (!data || typeof data !== 'object') {
    return []
  }
  const record = data as Record<string, unknown>

  if (type === 'set_cell' || type === 'clear_cell') {
    const target = readCellTargetFromRecord(record)
    return target ? [target] : []
  }

  if (type === 'set_range') {
    const cells = Array.isArray(record.cells) ? (record.cells as Array<Record<string, unknown>>) : []
    const targets: OperationCellTarget[] = []
    for (const cell of cells) {
      if (!Object.prototype.hasOwnProperty.call(cell, 'value') || !isSpreadsheetStoredCellClearValue(cell.value)) {
        continue
      }
      const target = readCellTargetFromRecord(cell)
      if (target) {
        targets.push(target)
      }
    }
    return targets
  }

  return []
}

const indexOperationCellTargets = (operations: SpreadsheetBatchOperation[]): Map<string, OperationCellTarget[]> => {
  const index = new Map<string, OperationCellTarget[]>()
  for (const operation of operations) {
    const operationId = (operation as { operationId?: unknown }).operationId
    if (typeof operationId !== 'string') continue
    const targets = readOperationCellTargets(operation)
    if (targets.length > 0) {
      index.set(operationId, targets)
    }
  }
  return index
}

/**
 * Releases version-causal ownership and intent-journal entries using explicit
 * Tier-1 `results[]` when present; otherwise acknowledges all operation-bound cells.
 */
export function releaseSpreadsheetMutationOwnershipFromResponse(params: {
  sheetId: string
  operations: SpreadsheetBatchOperation[]
  response: SpreadsheetBatchOperationResponse
  intentJournal?: SpreadsheetIntentJournal | null
  versionCausalOwnership?: SpreadsheetVersionCausalOwnershipRegistry | null
  rowMaterializationReadiness?: { resolveMany: (sheetId: string, mapping: Map<string, string>) => void } | null
  rowSlotIdentityRegistry?: {
    bindBackendRowId: (sheetId: string, clientRowId: string, backendRowId: string) => void
  } | null
  pendingLocalMutationCellsRef?: { current: Set<string> } | null
}): void {
  const {
    sheetId,
    operations,
    response,
    intentJournal,
    versionCausalOwnership,
    rowMaterializationReadiness,
    rowSlotIdentityRegistry,
    pendingLocalMutationCellsRef
  } = params
  const appliedVersion = Math.trunc(response.newVersion)

  const persistedIdByClientRowId = new Map<string, string>()
  for (const mapping of response.rowMappings ?? []) {
    const clientRowId = String(mapping.clientRowId ?? '')
    const rowUuid = String(mapping.rowUuid ?? '')
    if (!clientRowId || !rowUuid) continue
    persistedIdByClientRowId.set(clientRowId, rowUuid)
  }
  promoteSpreadsheetRowIdentities({
    sheetId,
    persistedIdByClientRowId,
    deps: {
      rowMaterializationReadiness,
      rowSlotIdentityRegistry,
      intentJournal,
      versionCausalOwnership,
      pendingLocalMutationCellsRef
    }
  })

  const operationTargets = indexOperationCellTargets(operations)
  const results = response.results

  const acknowledgeCell = (logicalRowHandle: string, columnName: string): void => {
    intentJournal?.markAcknowledged({
      sheetId,
      logicalRowHandle,
      columnName,
      appliedVersion
    })
    versionCausalOwnership?.markAcknowledged(sheetId, logicalRowHandle, columnName, appliedVersion)
  }

  const rejectCell = (logicalRowHandle: string, columnName: string): void => {
    intentJournal?.markRejected({ sheetId, logicalRowHandle, columnName })
    versionCausalOwnership?.markRejected(sheetId, logicalRowHandle, columnName)
  }

  if (!results || results.length === 0) {
    for (const targets of operationTargets.values()) {
      for (const target of targets) {
        acknowledgeCell(target.logicalRowHandle, target.columnName)
      }
    }
    return
  }

  const accountedOperationIds = new Set<string>()
  for (const result of results) {
    const targets = operationTargets.get(result.operationId)
    if (targets) {
      accountedOperationIds.add(result.operationId)
      for (const target of targets) {
        if (result.status === 'accepted') {
          acknowledgeCell(target.logicalRowHandle, target.columnName)
        } else {
          rejectCell(target.logicalRowHandle, target.columnName)
        }
      }
    }

    if (result.status !== 'rejected_conflict') {
      continue
    }
    for (const cell of result.serverState) {
      if (cell.field !== 'value') continue
      const serverRowId = String(cell.rowId ?? '')
      const columnName = String(cell.columnName ?? '')
      if (!serverRowId || !columnName) continue
      rejectCell(serverRowId, columnName)
    }
  }

  for (const [operationId, targets] of operationTargets.entries()) {
    if (accountedOperationIds.has(operationId)) {
      continue
    }
    for (const target of targets) {
      acknowledgeCell(target.logicalRowHandle, target.columnName)
    }
  }
}
