type AccessBlockedUntilRef = { current: number }

type SafeFacadeAccessOptions = {
  blockedUntilRef?: AccessBlockedUntilRef
  cooldownMs?: number
}

const DEFAULT_TRANSIENT_ACCESS_COOLDOWN_MS = 500

function shouldSkipBlockedAccess(blockedUntilRef?: AccessBlockedUntilRef): boolean {
  return Boolean(blockedUntilRef && Date.now() < blockedUntilRef.current)
}

function markBlockedAccess(
  blockedUntilRef?: AccessBlockedUntilRef,
  cooldownMs = DEFAULT_TRANSIENT_ACCESS_COOLDOWN_MS
): void {
  if (!blockedUntilRef) return
  blockedUntilRef.current = Date.now() + cooldownMs
}

export function isTransientUniverFacadeAccessError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return (
    message.includes('[redi]: Detecting cyclic dependency') ||
    message.includes('CircularDependencyError') ||
    message.includes('[redi]: Expect 1 dependency item')
  )
}

export function tryGetUniverActiveWorkbook(
  api: { getActiveWorkbook?: () => unknown } | null | undefined,
  options: SafeFacadeAccessOptions = {}
): unknown | null {
  if (!api || shouldSkipBlockedAccess(options.blockedUntilRef)) return null
  try {
    return api.getActiveWorkbook?.() ?? null
  } catch (error) {
    if (isTransientUniverFacadeAccessError(error)) {
      markBlockedAccess(options.blockedUntilRef, options.cooldownMs)
      return null
    }
    return null
  }
}

export function tryGetUniverActiveWorksheet(
  workbook: { getActiveSheet?: () => unknown } | null | undefined,
  options: SafeFacadeAccessOptions = {}
): unknown | null {
  if (!workbook || shouldSkipBlockedAccess(options.blockedUntilRef)) return null
  try {
    return workbook.getActiveSheet?.() ?? null
  } catch (error) {
    if (isTransientUniverFacadeAccessError(error)) {
      markBlockedAccess(options.blockedUntilRef, options.cooldownMs)
      return null
    }
    return null
  }
}

export function tryGetUniverWorksheetBySheetId(
  workbook: { getSheetBySheetId?: (sheetId: string) => unknown } | null | undefined,
  sheetId: string,
  options: SafeFacadeAccessOptions = {}
): unknown | null {
  if (!workbook || !sheetId || shouldSkipBlockedAccess(options.blockedUntilRef)) return null
  try {
    return workbook.getSheetBySheetId?.(sheetId) ?? null
  } catch (error) {
    if (isTransientUniverFacadeAccessError(error)) {
      markBlockedAccess(options.blockedUntilRef, options.cooldownMs)
      return null
    }
    return null
  }
}
