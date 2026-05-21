import { getViewerRowVisualIndex } from '../utils/spreadsheetPeerRowHydration'
import { getClientRowIdentity, type ViewerRow } from '../utils/spreadsheetRowIdentity'

export type TempRowReadinessStatus =
  | 'resolved'
  | 'in_flight_timeout'
  | 'create_failed'
  | 'not_found_in_latest_snapshot'
  | 'not_materializable'

export interface RowReadinessResult {
  resolved: Map<string, string>
  unresolved: Array<{
    clientRowId: string
    status: TempRowReadinessStatus
    reason?: string
    gridRowIndex?: number
  }>
}

export interface AwaitRowReadinessOptions {
  sheetId: string
  clientRowIds: string[]
  waitTimeoutMs?: number
  getLatestSnapshotRows: (sheetId: string) => ViewerRow[] | null
  materializeRowsFromSnapshot: (args: { sheetId: string; clientRowIds: string[]; rows: ViewerRow[] }) => Promise<void>
}

type PendingEntry = {
  kind: 'pending'
  promise: Promise<string>
  updatedAt: number
}

type ResolvedEntry = {
  kind: 'resolved'
  backendRowId: string
  updatedAt: number
}

type FailedEntry = {
  kind: 'failed'
  reason: string
  updatedAt: number
}

type ReadinessEntry = PendingEntry | ResolvedEntry | FailedEntry

export interface SpreadsheetRowMaterializationReadiness {
  registerPending: (sheetId: string, clientRowId: string, promise: Promise<string>) => void
  registerPendingBatch: (sheetId: string, clientRowIds: string[], promise: Promise<Map<string, string>>) => void
  resolve: (sheetId: string, clientRowId: string, backendRowId: string) => void
  resolveMany: (sheetId: string, resolved: Map<string, string>) => void
  reject: (sheetId: string, clientRowId: string, error: unknown) => void
  getResolvedBackendRowId: (sheetId: string, clientRowId: string) => string | undefined
  getResolvedBackendRowIds: (sheetId: string, clientRowIds: string[]) => Map<string, string>
  awaitTemporaryRowsReadyForSubmit: (options: AwaitRowReadinessOptions) => Promise<RowReadinessResult>
  clear: () => void
}

const RESOLVED_ENTRY_MAX_AGE_MS = 30_000
const FAILED_ENTRY_MAX_AGE_MS = 30_000
const PENDING_ENTRY_MAX_AGE_MS = 5 * 60_000
const DEFAULT_WAIT_TIMEOUT_MS = 2_000

const toEntryKey = (sheetId: string, clientRowId: string): string => `${sheetId}:${clientRowId}`

const describeUnknownError = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  return 'unknown'
}

const createTimeoutResult = (
  clientRowId: string
): {
  clientRowId: string
  status: 'in_flight_timeout'
} => ({
  clientRowId,
  status: 'in_flight_timeout'
})

export function createSpreadsheetRowMaterializationReadiness(): SpreadsheetRowMaterializationReadiness {
  const entries = new Map<string, ReadinessEntry>()

  const prune = () => {
    const now = Date.now()
    for (const [key, entry] of entries.entries()) {
      if (entry.kind === 'resolved' && now - entry.updatedAt > RESOLVED_ENTRY_MAX_AGE_MS) {
        entries.delete(key)
        continue
      }
      if (entry.kind === 'failed' && now - entry.updatedAt > FAILED_ENTRY_MAX_AGE_MS) {
        entries.delete(key)
        continue
      }
      if (entry.kind === 'pending' && now - entry.updatedAt > PENDING_ENTRY_MAX_AGE_MS) {
        entries.delete(key)
      }
    }
  }

  const resolve = (sheetId: string, clientRowId: string, backendRowId: string) => {
    if (!clientRowId || !backendRowId) return
    prune()
    entries.set(toEntryKey(sheetId, clientRowId), {
      kind: 'resolved',
      backendRowId,
      updatedAt: Date.now()
    })
  }

  const resolveMany = (sheetId: string, resolved: Map<string, string>) => {
    resolved.forEach((backendRowId, clientRowId) => {
      resolve(sheetId, clientRowId, backendRowId)
    })
  }

  const reject = (sheetId: string, clientRowId: string, error: unknown) => {
    if (!clientRowId) return
    prune()
    entries.set(toEntryKey(sheetId, clientRowId), {
      kind: 'failed',
      reason: describeUnknownError(error),
      updatedAt: Date.now()
    })
  }

  const registerPending = (sheetId: string, clientRowId: string, promise: Promise<string>) => {
    if (!clientRowId) return
    prune()
    entries.set(toEntryKey(sheetId, clientRowId), {
      kind: 'pending',
      promise,
      updatedAt: Date.now()
    })
  }

  const registerPendingBatch = (sheetId: string, clientRowIds: string[], promise: Promise<Map<string, string>>) => {
    Array.from(new Set(clientRowIds.filter(Boolean))).forEach(clientRowId => {
      registerPending(
        sheetId,
        clientRowId,
        promise.then(result => {
          const backendRowId = result.get(clientRowId)
          if (!backendRowId) {
            throw new Error(`Missing backend mapping for ${clientRowId}`)
          }
          return backendRowId
        })
      )
    })
  }

  const getResolvedBackendRowId = (sheetId: string, clientRowId: string): string | undefined => {
    if (!clientRowId) return undefined
    prune()
    const entry = entries.get(toEntryKey(sheetId, clientRowId))
    return entry?.kind === 'resolved' ? entry.backendRowId : undefined
  }

  const getResolvedBackendRowIds = (sheetId: string, clientRowIds: string[]): Map<string, string> => {
    const resolved = new Map<string, string>()
    Array.from(new Set(clientRowIds.filter(Boolean))).forEach(clientRowId => {
      const backendRowId = getResolvedBackendRowId(sheetId, clientRowId)
      if (backendRowId) {
        resolved.set(clientRowId, backendRowId)
      }
    })
    return resolved
  }

  const waitForPendingEntry = async (
    sheetId: string,
    clientRowId: string,
    waitTimeoutMs: number,
    gridRowIndex?: number
  ): Promise<
    | {
        clientRowId: string
        status: 'resolved'
        backendRowId: string
        gridRowIndex?: number
      }
    | {
        clientRowId: string
        status: Exclude<TempRowReadinessStatus, 'resolved'>
        reason?: string
        gridRowIndex?: number
      }
  > => {
    const key = toEntryKey(sheetId, clientRowId)
    const entry = entries.get(key)
    if (!entry) {
      return {
        clientRowId,
        status: 'not_materializable',
        reason: 'No readiness entry was registered',
        gridRowIndex
      }
    }
    if (entry.kind === 'resolved') {
      return {
        clientRowId,
        status: 'resolved',
        backendRowId: entry.backendRowId,
        gridRowIndex
      }
    }
    if (entry.kind === 'failed') {
      return {
        clientRowId,
        status: 'create_failed',
        reason: entry.reason,
        gridRowIndex
      }
    }

    const timeoutResult = await Promise.race([
      entry.promise.then(() => ({ kind: 'settled' as const })).catch(error => ({ kind: 'failed' as const, error })),
      new Promise<{ kind: 'timeout' }>(resolve => {
        setTimeout(() => resolve({ kind: 'timeout' }), waitTimeoutMs)
      })
    ])

    const currentEntry = entries.get(key)
    if (currentEntry?.kind === 'resolved') {
      return {
        clientRowId,
        status: 'resolved',
        backendRowId: currentEntry.backendRowId,
        gridRowIndex
      }
    }
    if (currentEntry?.kind === 'failed') {
      return {
        clientRowId,
        status: 'create_failed',
        reason: currentEntry.reason,
        gridRowIndex
      }
    }
    if (timeoutResult.kind === 'timeout') {
      return {
        ...createTimeoutResult(clientRowId),
        gridRowIndex
      }
    }
    if (timeoutResult.kind === 'failed') {
      return {
        clientRowId,
        status: 'create_failed',
        reason: describeUnknownError(timeoutResult.error),
        gridRowIndex
      }
    }

    return {
      clientRowId,
      status: 'not_materializable',
      reason: 'Materialization completed without publishing a backend row id',
      gridRowIndex
    }
  }

  const awaitTemporaryRowsReadyForSubmit = async ({
    sheetId,
    clientRowIds,
    waitTimeoutMs = DEFAULT_WAIT_TIMEOUT_MS,
    getLatestSnapshotRows,
    materializeRowsFromSnapshot
  }: AwaitRowReadinessOptions): Promise<RowReadinessResult> => {
    prune()
    const uniqueClientRowIds = Array.from(new Set(clientRowIds.filter(Boolean)))
    const result: RowReadinessResult = {
      resolved: new Map<string, string>(),
      unresolved: []
    }

    if (uniqueClientRowIds.length === 0) {
      return result
    }

    const pendingGridRowIndexByClientRowId = new Map<string, number>()
    const snapshotRows = getLatestSnapshotRows(sheetId) ?? []
    const snapshotRowByClientRowId = new Map<string, ViewerRow>()
    snapshotRows.forEach((row, index) => {
      const clientRowId = getClientRowIdentity(row)
      if (!clientRowId) return
      snapshotRowByClientRowId.set(clientRowId, { ...row, _gridRowIndex: getViewerRowVisualIndex(row, index) })
    })

    const idsToMaterialize: string[] = []
    const rowsToMaterialize: ViewerRow[] = []
    const idsToAwait: string[] = []

    uniqueClientRowIds.forEach(clientRowId => {
      const resolvedBackendRowId = getResolvedBackendRowId(sheetId, clientRowId)
      if (resolvedBackendRowId) {
        result.resolved.set(clientRowId, resolvedBackendRowId)
        return
      }

      const entry = entries.get(toEntryKey(sheetId, clientRowId))
      if (entry?.kind === 'failed') {
        result.unresolved.push({
          clientRowId,
          status: 'create_failed',
          reason: entry.reason
        })
        return
      }

      if (entry?.kind === 'pending') {
        idsToAwait.push(clientRowId)
        return
      }

      const snapshotRow = snapshotRowByClientRowId.get(clientRowId)
      if (!snapshotRow) {
        result.unresolved.push({
          clientRowId,
          status: 'not_found_in_latest_snapshot',
          reason: 'Temporary row id was not found in the latest authoritative snapshot'
        })
        return
      }

      pendingGridRowIndexByClientRowId.set(
        clientRowId,
        getViewerRowVisualIndex(snapshotRow, Number(snapshotRow._gridRowIndex) || 0)
      )
      idsToMaterialize.push(clientRowId)
      rowsToMaterialize.push(snapshotRow)
    })

    if (rowsToMaterialize.length > 0) {
      await materializeRowsFromSnapshot({
        sheetId,
        clientRowIds: idsToMaterialize,
        rows: rowsToMaterialize
      })

      idsToMaterialize.forEach(clientRowId => {
        const resolvedBackendRowId = getResolvedBackendRowId(sheetId, clientRowId)
        if (resolvedBackendRowId) {
          result.resolved.set(clientRowId, resolvedBackendRowId)
          return
        }

        const entry = entries.get(toEntryKey(sheetId, clientRowId))
        if (entry?.kind === 'failed') {
          result.unresolved.push({
            clientRowId,
            status: 'create_failed',
            reason: entry.reason,
            gridRowIndex: pendingGridRowIndexByClientRowId.get(clientRowId)
          })
          return
        }

        if (entry?.kind === 'pending') {
          idsToAwait.push(clientRowId)
          return
        }

        result.unresolved.push({
          clientRowId,
          status: 'not_materializable',
          reason: 'Snapshot row could not be routed into row materialization',
          gridRowIndex: pendingGridRowIndexByClientRowId.get(clientRowId)
        })
      })
    }

    const waitedResults = await Promise.all(
      Array.from(new Set(idsToAwait)).map(clientRowId =>
        waitForPendingEntry(sheetId, clientRowId, waitTimeoutMs, pendingGridRowIndexByClientRowId.get(clientRowId))
      )
    )

    waitedResults.forEach(waitedResult => {
      if (waitedResult.status === 'resolved') {
        result.resolved.set(waitedResult.clientRowId, waitedResult.backendRowId)
        return
      }

      result.unresolved.push({
        clientRowId: waitedResult.clientRowId,
        status: waitedResult.status,
        reason: waitedResult.reason,
        gridRowIndex: waitedResult.gridRowIndex
      })
    })

    return {
      resolved: new Map(result.resolved),
      unresolved: result.unresolved.filter(
        (entry, index, entriesToFilter) =>
          entriesToFilter.findIndex(candidate => candidate.clientRowId === entry.clientRowId) === index
      )
    }
  }

  return {
    registerPending,
    registerPendingBatch,
    resolve,
    resolveMany,
    reject,
    getResolvedBackendRowId,
    getResolvedBackendRowIds,
    awaitTemporaryRowsReadyForSubmit,
    clear: () => {
      entries.clear()
    }
  }
}
