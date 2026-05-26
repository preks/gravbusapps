import type { MutableRefObject } from 'react'

/** Mirrors Univer {@link AUTO_FILL_APPLY_TYPE} dropdown values. */
export type SpreadsheetAutofillApplyType = 'COPY' | 'SERIES' | 'ONLY_FORMAT' | 'NO_FORMAT'

export type SpreadsheetAutofillIntent = {
  sheetId: string
  applyType: SpreadsheetAutofillApplyType
  markedAt: number
}

export const UNIVER_AUTOFILL_COMMAND_ID = 'sheet.command.auto-fill'
export const UNIVER_REFILL_COMMAND_ID = 'sheet.command.refill'

const AUTOFILL_INTENT_TTL_MS = 3_000

const AUTOFILL_APPLY_TYPES = new Set<SpreadsheetAutofillApplyType>(['COPY', 'SERIES', 'ONLY_FORMAT', 'NO_FORMAT'])

export function parseSpreadsheetAutofillApplyType(value: unknown): SpreadsheetAutofillApplyType | null {
  if (typeof value !== 'string') return null
  const normalized = value.toUpperCase()
  return AUTOFILL_APPLY_TYPES.has(normalized as SpreadsheetAutofillApplyType)
    ? (normalized as SpreadsheetAutofillApplyType)
    : null
}

export function autofillApplyTypeKeepsValueWrites(applyType: SpreadsheetAutofillApplyType | null | undefined): boolean {
  return applyType === 'COPY' || applyType === 'SERIES' || applyType === 'NO_FORMAT'
}

export function markSpreadsheetAutofillIntent(
  ref: MutableRefObject<SpreadsheetAutofillIntent | null>,
  sheetId: string,
  applyType: SpreadsheetAutofillApplyType,
  now = Date.now()
): void {
  if (!sheetId) return
  ref.current = { sheetId, applyType, markedAt: now }
}

export function peekSpreadsheetAutofillIntent(
  ref: MutableRefObject<SpreadsheetAutofillIntent | null>,
  sheetId: string,
  now = Date.now()
): SpreadsheetAutofillApplyType | null {
  const pending = ref.current
  if (!pending || pending.sheetId !== sheetId) return null
  if (now - pending.markedAt > AUTOFILL_INTENT_TTL_MS) {
    ref.current = null
    return null
  }
  return pending.applyType
}

export function clearSpreadsheetAutofillIntent(
  ref: MutableRefObject<SpreadsheetAutofillIntent | null>,
  sheetId?: string
): void {
  const pending = ref.current
  if (!pending) return
  if (sheetId && pending.sheetId !== sheetId) return
  ref.current = null
}

export function resolveAutofillApplyTypeFromCommandParams(params: unknown): SpreadsheetAutofillApplyType {
  if (!params || typeof params !== 'object') return 'SERIES'
  const record = params as Record<string, unknown>
  const fromType = parseSpreadsheetAutofillApplyType(record.type)
  if (fromType) return fromType
  const fromApplyType = parseSpreadsheetAutofillApplyType(record.applyType)
  if (fromApplyType) return fromApplyType
  return 'SERIES'
}
