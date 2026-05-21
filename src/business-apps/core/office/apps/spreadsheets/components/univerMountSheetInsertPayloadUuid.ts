import type { MutableRefObject } from 'react'

/** Backend / Postgres uuid shape for `spreadsheet_sheets.id`. */
export const SHEET_PAYLOAD_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function generateUniverSheetUuid(): string {
  const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (cryptoRef?.randomUUID) return cryptoRef.randomUUID()
  return `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, ch => {
    const r = (Math.random() * 16) | 0
    const v = ch === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function rewriteWorksheetIdReferencesInParams(
  rewrittenWorksheetIdsRef: MutableRefObject<Map<string, string>>,
  params: unknown
): void {
  if (!params || typeof params !== 'object') return
  const aliases = rewrittenWorksheetIdsRef.current
  if (aliases.size === 0) return
  const target = params as Record<string, unknown>
  for (const key of ['sheetId', 'subUnitId', 'targetSubUnitId']) {
    const current = target[key]
    if (typeof current === 'string') {
      const rewritten = aliases.get(current)
      if (rewritten) target[key] = rewritten
    }
  }
}

/** Mutates `params.sheet.id` when missing or non-uuid; records alias rewrites. */
export function ensureInsertSheetPayloadHasUuid(
  rewrittenWorksheetIdsRef: MutableRefObject<Map<string, string>>,
  params: unknown
): string | undefined {
  if (!params || typeof params !== 'object') return undefined
  const target = params as { sheet?: { id?: unknown } }
  if (!target.sheet) {
    const nextId = generateUniverSheetUuid()
    target.sheet = { id: nextId }
    return nextId
  }
  const existing = target.sheet.id
  if (typeof existing === 'string' && SHEET_PAYLOAD_UUID_REGEX.test(existing)) return existing
  const nextId = generateUniverSheetUuid()
  if (typeof existing === 'string' && existing.length > 0) {
    rewrittenWorksheetIdsRef.current.set(existing, nextId)
  }
  target.sheet.id = nextId
  return nextId
}
