/** Univer CommandService rejects async handlers — structural remote applies must use syncExecuteCommand only. */

export type UniverSyncCommandApi = {
  syncExecuteCommand?: (commandId: string, params?: object) => unknown
} | null

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
): { ok: true; result: unknown } | { ok: false; reason: 'missing_sync_execute_command' | 'command_failed' } => {
  const syncExecuteCommand = api?.syncExecuteCommand
  if (typeof syncExecuteCommand !== 'function') {
    return { ok: false, reason: 'missing_sync_execute_command' }
  }
  try {
    const result = syncExecuteCommand.call(api, commandId, commandParams)
    if (!isSyncStructuralCommandSuccess(result)) {
      return { ok: false, reason: 'command_failed' }
    }
    return { ok: true, result }
  } catch {
    return { ok: false, reason: 'command_failed' }
  }
}
