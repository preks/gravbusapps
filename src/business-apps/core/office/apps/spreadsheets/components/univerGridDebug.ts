import { SPREADSHEET_BULK_REMOTE_APPLY_DEBUG_SAMPLE } from '../utils/spreadsheetBulkRemoteConstants'

export const isSpreadsheetGridRemoteApplyDebug = (): boolean => {
  try {
    return (
      globalThis.localStorage?.getItem('debug:spreadsheet-apps') === '1' ||
      globalThis.localStorage?.getItem('spreadsheetAppsDebug') === '1'
    )
  } catch {
    return false
  }
}

export const isSpreadsheetInitDebug = (): boolean => {
  try {
    return (
      globalThis.localStorage?.getItem('debug:spreadsheet-univer-init') === '1' ||
      globalThis.localStorage?.getItem('spreadsheetAppsDebug') === '1' ||
      globalThis.localStorage?.getItem('debug:spreadsheet-apps') === '1'
    )
  } catch {
    return false
  }
}

let remoteApplyDebugHighVolumeSeq = 0

/** Gated remote-apply tracing: indices / A1 only — never log cell values. */
export const debugRemoteApply = (phase: string, detail: Record<string, number | string | boolean | undefined>) => {
  if (!isSpreadsheetGridRemoteApplyDebug()) return
  const highVolume =
    phase === 'setValue_call' || phase === 'setValue_done' || phase === 'microtask_begin' || phase === 'sync_path'
  if (highVolume) {
    remoteApplyDebugHighVolumeSeq += 1
    if (remoteApplyDebugHighVolumeSeq % SPREADSHEET_BULK_REMOTE_APPLY_DEBUG_SAMPLE !== 0) return
  }
  console.debug('[UniverSheetGrid][remote-apply]', phase, detail)
}

export const debugMutationTrace = (phase: string, detail: Record<string, unknown>) => {
  if (!isSpreadsheetGridRemoteApplyDebug()) return
  console.debug('[UniverSheetGrid][mutation-trace]', phase, detail)
}

export const debugUniverDimensionSnapshot = (phase: string, detail: Record<string, unknown>) => {
  if (!isSpreadsheetGridRemoteApplyDebug()) return
  if (phase === 'coalesced' || phase === 'coalesced_deferred') return
  console.debug('[UniverSheetGrid][dimension-snapshot]', phase, detail)
}

export const debugUniverInit = (phase: string, detail: Record<string, unknown>) => {
  if (!isSpreadsheetInitDebug()) return
  console.debug('[UniverSheetGrid][init]', phase, detail)
}

export const isJSDOMRuntime = (): boolean =>
  typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('jsdom')
