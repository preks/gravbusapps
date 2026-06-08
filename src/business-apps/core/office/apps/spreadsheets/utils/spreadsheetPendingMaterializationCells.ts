import type { PendingLocalFilterPolicy } from './spreadsheetAuthoritativeRegion'

const PENDING_LOCAL_MUTATION_KEY_SEPARATOR = '\u0000'
const DEFAULT_PENDING_LOCAL_MUTATION_PROTECTION_TTL_MS = 15_000

type PendingLocalMutationCellsRef = { current: Set<string> }

interface PendingLocalMutationCellProtectionEntry {
  key: string
  ownerId: string
  expectedSignature?: string
  kind?: PendingLocalMutationProtectionKind
}

export type PendingLocalMutationProtectionKind = 'local_user_edit' | 'materialization_adoption'

export type PendingLocalMutationProtectionOwnerClass = 'queue' | 'plan' | 'deferred' | 'materialization' | 'other'

export interface SpreadsheetPendingLocalMutationProtectionSummary {
  globalKeyCount: number
  targetSheetKeyCount: number
  globalOwnerCount: number
  targetSheetOwnerCount: number
  keysBySheet: Record<string, number>
  ownerKinds: Record<PendingLocalMutationProtectionKind, number>
  ownerClasses: Record<PendingLocalMutationProtectionOwnerClass, number>
}

interface PendingLocalMutationCellProtectionOwner {
  expectedSignature?: string
  timeoutHandle?: ReturnType<typeof globalThis.setTimeout>
  kind: PendingLocalMutationProtectionKind
}

const EMPTY_PROTECTION_SUMMARY = (): SpreadsheetPendingLocalMutationProtectionSummary => ({
  globalKeyCount: 0,
  targetSheetKeyCount: 0,
  globalOwnerCount: 0,
  targetSheetOwnerCount: 0,
  keysBySheet: {},
  ownerKinds: {
    local_user_edit: 0,
    materialization_adoption: 0
  },
  ownerClasses: {
    queue: 0,
    plan: 0,
    deferred: 0,
    materialization: 0,
    other: 0
  }
})

const pendingLocalMutationProtectionStateBySet = new WeakMap<
  Set<string>,
  Map<string, Map<string, PendingLocalMutationCellProtectionOwner>>
>()

const getPendingLocalMutationProtectionState = (
  pendingCells: Set<string>
): Map<string, Map<string, PendingLocalMutationCellProtectionOwner>> => {
  let state = pendingLocalMutationProtectionStateBySet.get(pendingCells)
  if (!state) {
    state = new Map()
    pendingLocalMutationProtectionStateBySet.set(pendingCells, state)
  }
  return state
}

const syncPendingLocalMutationProtectionKey = (
  pendingCells: Set<string>,
  state: Map<string, Map<string, PendingLocalMutationCellProtectionOwner>>,
  key: string
): void => {
  const owners = state.get(key)
  if (owners && owners.size > 0) {
    pendingCells.add(key)
    return
  }
  pendingCells.delete(key)
  state.delete(key)
}

const releasePendingLocalMutationProtectionOwner = (
  pendingCells: Set<string>,
  state: Map<string, Map<string, PendingLocalMutationCellProtectionOwner>>,
  key: string,
  ownerId: string
): void => {
  let resolvedKey = key
  let owners = state.get(resolvedKey)
  let owner = owners?.get(ownerId)
  if (!owners || !owner) {
    for (const [candidateKey, candidateOwners] of state.entries()) {
      const candidateOwner = candidateOwners.get(ownerId)
      if (!candidateOwner) continue
      resolvedKey = candidateKey
      owners = candidateOwners
      owner = candidateOwner
      break
    }
  }
  if (!owners || !owner) return
  if (owner.timeoutHandle != null) {
    globalThis.clearTimeout(owner.timeoutHandle)
  }
  owners.delete(ownerId)
  syncPendingLocalMutationProtectionKey(pendingCells, state, resolvedKey)
}

const migratePendingLocalMutationProtectionOwners = (
  pendingCells: Set<string>,
  state: Map<string, Map<string, PendingLocalMutationCellProtectionOwner>>,
  sourceKey: string,
  targetKey: string
): void => {
  if (!sourceKey || !targetKey || sourceKey === targetKey) return
  const sourceOwners = state.get(sourceKey)
  if (!sourceOwners || sourceOwners.size === 0) return
  const targetOwners = state.get(targetKey) ?? new Map<string, PendingLocalMutationCellProtectionOwner>()
  for (const [ownerId, owner] of sourceOwners.entries()) {
    const existingOwner = targetOwners.get(ownerId)
    if (existingOwner?.timeoutHandle != null) {
      globalThis.clearTimeout(existingOwner.timeoutHandle)
    }
    targetOwners.set(ownerId, owner)
  }
  state.set(targetKey, targetOwners)
  state.delete(sourceKey)
  syncPendingLocalMutationProtectionKey(pendingCells, state, sourceKey)
  syncPendingLocalMutationProtectionKey(pendingCells, state, targetKey)
}

export function spreadsheetPendingLocalMutationCoordinateCellKey(
  sheetId: string,
  rowIndex: number,
  colIndex: number
): string {
  return ['coord', sheetId, rowIndex, colIndex].join(PENDING_LOCAL_MUTATION_KEY_SEPARATOR)
}

export function spreadsheetPendingLocalMutationSemanticCellKey(
  sheetId: string,
  rowId: string,
  columnName: string
): string {
  return ['semantic', sheetId, rowId, columnName].join(PENDING_LOCAL_MUTATION_KEY_SEPARATOR)
}

export function getSheetIdFromPendingLocalMutationProtectionKey(key: string): string | null {
  if (!key) return null
  const [kind, sheetId] = key.split(PENDING_LOCAL_MUTATION_KEY_SEPARATOR)
  if ((kind !== 'coord' && kind !== 'semantic') || !sheetId) return null
  return sheetId
}

function classifyPendingLocalMutationProtectionOwner(ownerId: string): PendingLocalMutationProtectionOwnerClass {
  const normalized = ownerId.trim().toLowerCase()
  if (normalized.startsWith('queue:')) return 'queue'
  if (normalized.startsWith('plan:')) return 'plan'
  if (normalized.startsWith('deferred:')) return 'deferred'
  if (normalized.startsWith('materialization:')) return 'materialization'
  return 'other'
}

export function summarizeSpreadsheetPendingLocalMutationProtection(
  pendingLocalMutationCellsRef: PendingLocalMutationCellsRef | undefined,
  targetSheetId?: string
): SpreadsheetPendingLocalMutationProtectionSummary {
  const pendingCells = pendingLocalMutationCellsRef?.current
  if (!pendingCells || pendingCells.size === 0) {
    return EMPTY_PROTECTION_SUMMARY()
  }
  const state = pendingLocalMutationProtectionStateBySet.get(pendingCells)
  if (!state || state.size === 0) {
    const summary = EMPTY_PROTECTION_SUMMARY()
    for (const key of pendingCells) {
      const sheetId = getSheetIdFromPendingLocalMutationProtectionKey(key) ?? 'unknown'
      summary.globalKeyCount += 1
      summary.keysBySheet[sheetId] = (summary.keysBySheet[sheetId] ?? 0) + 1
      if (targetSheetId != null && sheetId === targetSheetId) {
        summary.targetSheetKeyCount += 1
      }
    }
    return summary
  }

  const summary = EMPTY_PROTECTION_SUMMARY()
  for (const [key, owners] of state.entries()) {
    const sheetId = getSheetIdFromPendingLocalMutationProtectionKey(key) ?? 'unknown'
    summary.globalKeyCount += 1
    summary.keysBySheet[sheetId] = (summary.keysBySheet[sheetId] ?? 0) + 1
    const isTargetSheet = targetSheetId != null && sheetId === targetSheetId
    if (isTargetSheet) {
      summary.targetSheetKeyCount += 1
    }
    for (const [ownerId, owner] of owners.entries()) {
      void ownerId
      summary.globalOwnerCount += 1
      if (isTargetSheet) {
        summary.targetSheetOwnerCount += 1
      }
      summary.ownerKinds[owner.kind] += 1
      const ownerClass = classifyPendingLocalMutationProtectionOwner(ownerId)
      summary.ownerClasses[ownerClass] += 1
    }
  }
  return summary
}

export function spreadsheetPendingMaterializationCellKey(sheetId: string, rowIndex: number, colIndex: number): string {
  return spreadsheetPendingLocalMutationCoordinateCellKey(sheetId, rowIndex, colIndex)
}

export function protectSpreadsheetPendingLocalMutationCells(
  pendingLocalMutationCellsRef: PendingLocalMutationCellsRef | undefined,
  entries: PendingLocalMutationCellProtectionEntry[],
  options: { ttlMs?: number } = {}
): () => void {
  if (!pendingLocalMutationCellsRef || entries.length === 0) return () => undefined
  const pendingCells = pendingLocalMutationCellsRef.current
  const state = getPendingLocalMutationProtectionState(pendingCells)
  const ttlMs = options.ttlMs ?? DEFAULT_PENDING_LOCAL_MUTATION_PROTECTION_TTL_MS
  const registeredEntries: PendingLocalMutationCellProtectionEntry[] = []

  entries.forEach(entry => {
    if (!entry.key || !entry.ownerId) return
    let owners = state.get(entry.key)
    if (!owners) {
      owners = new Map()
      state.set(entry.key, owners)
    }
    const previousOwner = owners.get(entry.ownerId)
    if (previousOwner?.timeoutHandle != null) {
      globalThis.clearTimeout(previousOwner.timeoutHandle)
    }
    const timeoutHandle =
      ttlMs > 0
        ? globalThis.setTimeout(() => {
            releasePendingLocalMutationProtectionOwner(pendingCells, state, entry.key, entry.ownerId)
          }, ttlMs)
        : undefined
    if (timeoutHandle && typeof timeoutHandle === 'object' && 'unref' in timeoutHandle) {
      const nodeTimeout = timeoutHandle as { unref: () => void }
      nodeTimeout.unref()
    }
    owners.set(entry.ownerId, {
      expectedSignature: entry.expectedSignature,
      timeoutHandle,
      kind: entry.kind ?? 'local_user_edit'
    })
    pendingCells.add(entry.key)
    registeredEntries.push(entry)
  })

  return () => {
    registeredEntries.forEach(entry => {
      releasePendingLocalMutationProtectionOwner(pendingCells, state, entry.key, entry.ownerId)
    })
  }
}

export function releaseSpreadsheetPendingLocalMutationCells(
  pendingLocalMutationCellsRef: PendingLocalMutationCellsRef | undefined,
  entries: Array<Pick<PendingLocalMutationCellProtectionEntry, 'key' | 'ownerId'>>
): void {
  if (!pendingLocalMutationCellsRef || entries.length === 0) return
  const pendingCells = pendingLocalMutationCellsRef.current
  const state = pendingLocalMutationProtectionStateBySet.get(pendingCells)
  if (!state) return
  entries.forEach(entry => {
    releasePendingLocalMutationProtectionOwner(pendingCells, state, entry.key, entry.ownerId)
  })
}

export function migratePendingLocalMutationProtectionRowHandle(
  pendingLocalMutationCellsRef: PendingLocalMutationCellsRef | undefined,
  sheetId: string,
  clientRowId: string,
  rowUuid: string
): void {
  if (!pendingLocalMutationCellsRef || !sheetId || !clientRowId || !rowUuid || clientRowId === rowUuid) return
  const pendingCells = pendingLocalMutationCellsRef.current
  const state = pendingLocalMutationProtectionStateBySet.get(pendingCells)
  if (!state || state.size === 0) return
  const semanticPrefix = ['semantic', sheetId, clientRowId].join(PENDING_LOCAL_MUTATION_KEY_SEPARATOR)
  for (const key of [...state.keys()]) {
    if (!key.startsWith(`${semanticPrefix}${PENDING_LOCAL_MUTATION_KEY_SEPARATOR}`)) continue
    const columnName = key.slice(`${semanticPrefix}${PENDING_LOCAL_MUTATION_KEY_SEPARATOR}`.length)
    migratePendingLocalMutationProtectionOwners(
      pendingCells,
      state,
      key,
      spreadsheetPendingLocalMutationSemanticCellKey(sheetId, rowUuid, columnName)
    )
  }
}

export function reconcileSpreadsheetPendingLocalMutationCellProtection(
  pendingLocalMutationCellsRef: PendingLocalMutationCellsRef | undefined,
  key: string,
  authoritativeSignature: string
): boolean {
  const pendingCells = pendingLocalMutationCellsRef?.current
  if (!pendingCells?.has(key)) return false
  const state = pendingLocalMutationProtectionStateBySet.get(pendingCells)
  const owners = state?.get(key)
  if (!state || !owners || owners.size === 0) return true
  for (const [ownerId, owner] of [...owners.entries()]) {
    if (owner.expectedSignature == null || owner.expectedSignature !== authoritativeSignature) {
      continue
    }
    releasePendingLocalMutationProtectionOwner(pendingCells, state, key, ownerId)
  }
  return true
}

export function shouldBlockSpreadsheetPendingLocalMutationCellProtection(
  pendingLocalMutationCellsRef: PendingLocalMutationCellsRef | undefined,
  key: string,
  authoritativeSignature: string,
  policy: PendingLocalFilterPolicy
): boolean {
  const pendingCells = pendingLocalMutationCellsRef?.current
  if (!pendingCells?.has(key)) return false
  const state = pendingLocalMutationProtectionStateBySet.get(pendingCells)
  const owners = state?.get(key)
  if (!state || !owners || owners.size === 0) {
    return true
  }

  let shouldBlock = false
  for (const [ownerId, owner] of [...owners.entries()]) {
    if (owner.expectedSignature != null && owner.expectedSignature === authoritativeSignature) {
      releasePendingLocalMutationProtectionOwner(pendingCells, state, key, ownerId)
      continue
    }
    if (policy === 'server_authoritative_repair' && owner.kind === 'materialization_adoption') {
      releasePendingLocalMutationProtectionOwner(pendingCells, state, key, ownerId)
      continue
    }
    shouldBlock = true
  }

  return shouldBlock
}
