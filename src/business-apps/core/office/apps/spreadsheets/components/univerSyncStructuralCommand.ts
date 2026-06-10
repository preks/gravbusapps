/** Univer CommandService rejects async handlers — structural remote applies must use syncExecuteCommand only. */

export type UniverSyncCommandApi = {
  syncExecuteCommand?: (commandId: string, params?: object) => unknown
} | null

export type UniverSyncStructuralCommandFailure =
  | {
      ok: false
      reason: 'missing_sync_execute_command'
    }
  | {
      ok: false
      reason: 'command_failed'
      detail: 'returned_false' | 'returned_thenable' | 'threw'
      resultType?: string
      errorMessage?: string
    }

const isThenable = (value: unknown): boolean =>
  Boolean(value) && typeof value === 'object' && typeof (value as Promise<unknown>).then === 'function'

export const isSyncStructuralCommandSuccess = (result: unknown): boolean => {
  if (isThenable(result)) return false
  return result !== false
}

export const runUniverSyncStructuralCommand = (
  api: UniverSyncCommandApi,
  commandId: string,
  commandParams: object
): { ok: true; result: unknown } | UniverSyncStructuralCommandFailure => {
  const syncExecuteCommand = api?.syncExecuteCommand
  if (typeof syncExecuteCommand !== 'function') {
    return { ok: false, reason: 'missing_sync_execute_command' }
  }
  try {
    const result = syncExecuteCommand.call(api, commandId, commandParams)
    if (isThenable(result)) {
      return { ok: false, reason: 'command_failed', detail: 'returned_thenable', resultType: typeof result }
    }
    if (result === false) {
      return { ok: false, reason: 'command_failed', detail: 'returned_false', resultType: typeof result }
    }
    if (!isSyncStructuralCommandSuccess(result)) {
      return { ok: false, reason: 'command_failed', detail: 'returned_false', resultType: typeof result }
    }
    return { ok: true, result }
  } catch (error) {
    return {
      ok: false,
      reason: 'command_failed',
      detail: 'threw',
      errorMessage: error instanceof Error ? error.message : String(error ?? 'unknown')
    }
  }
}
