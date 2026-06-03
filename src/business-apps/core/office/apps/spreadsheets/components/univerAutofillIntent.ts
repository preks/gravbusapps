import type { MutableRefObject } from 'react'
import type { SheetRangeShape } from './cellMatrixUtils'

/** Mirrors Univer {@link AUTO_FILL_APPLY_TYPE} dropdown values. */
export type SpreadsheetAutofillApplyType = 'COPY' | 'SERIES' | 'ONLY_FORMAT' | 'NO_FORMAT'

export type SpreadsheetAutofillIntent = {
  sheetId: string
  applyType: SpreadsheetAutofillApplyType
  markedAt: number
  sourceRanges: SheetRangeShape[]
  targetRanges: SheetRangeShape[]
}

export const UNIVER_AUTOFILL_COMMAND_ID = 'sheet.command.auto-fill'
export const UNIVER_REFILL_COMMAND_ID = 'sheet.command.refill'

const AUTOFILL_INTENT_TTL_MS = 3_000

const AUTOFILL_APPLY_TYPES = new Set<SpreadsheetAutofillApplyType>(['COPY', 'SERIES', 'ONLY_FORMAT', 'NO_FORMAT'])

type SpreadsheetAutofillIntentMarkOptions = {
  now?: number
  sourceRanges?: SheetRangeShape[]
  targetRanges?: SheetRangeShape[]
}

type SpreadsheetAutofillIntentLookupOptions = {
  now?: number
  ranges?: SheetRangeShape[]
}

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

function normalizeRangeCandidate(candidate: unknown): SheetRangeShape | null {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null
  const record = candidate as Record<string, unknown>
  const startRow = Number(record.startRow)
  const endRow = Number(record.endRow)
  const startColumn = Number(record.startColumn)
  const endColumn = Number(record.endColumn)
  if (
    !Number.isFinite(startRow) ||
    !Number.isFinite(endRow) ||
    !Number.isFinite(startColumn) ||
    !Number.isFinite(endColumn)
  ) {
    return null
  }
  if (endRow < startRow || endColumn < startColumn) return null
  return {
    startRow: Math.max(0, Math.trunc(startRow)),
    endRow: Math.max(0, Math.trunc(endRow)),
    startColumn: Math.max(0, Math.trunc(startColumn)),
    endColumn: Math.max(0, Math.trunc(endColumn))
  }
}

function normalizeRangeCandidates(value: unknown): SheetRangeShape[] {
  if (Array.isArray(value)) {
    return value.map(normalizeRangeCandidate).filter((range): range is SheetRangeShape => range != null)
  }
  const range = normalizeRangeCandidate(value)
  return range ? [range] : []
}

function rangesOverlap(left: SheetRangeShape, right: SheetRangeShape): boolean {
  return !(
    left.endRow < right.startRow ||
    right.endRow < left.startRow ||
    left.endColumn < right.startColumn ||
    right.endColumn < left.startColumn
  )
}

function mutationRangesMatchAutofillTarget(
  targetRanges: SheetRangeShape[],
  mutationRanges: SheetRangeShape[] | undefined
): boolean {
  if (targetRanges.length === 0 || !mutationRanges || mutationRanges.length === 0) {
    return true
  }
  return mutationRanges.every(mutationRange =>
    targetRanges.some(targetRange => rangesOverlap(targetRange, mutationRange))
  )
}

function resolveMarkOptions(
  optionsOrNow: SpreadsheetAutofillIntentMarkOptions | number | undefined
): Required<SpreadsheetAutofillIntentMarkOptions> {
  if (typeof optionsOrNow === 'number') {
    return { now: optionsOrNow, sourceRanges: [], targetRanges: [] }
  }
  return {
    now: optionsOrNow?.now ?? Date.now(),
    sourceRanges: optionsOrNow?.sourceRanges ?? [],
    targetRanges: optionsOrNow?.targetRanges ?? []
  }
}

function resolveLookupOptions(
  optionsOrNow: SpreadsheetAutofillIntentLookupOptions | number | undefined
): Required<SpreadsheetAutofillIntentLookupOptions> {
  if (typeof optionsOrNow === 'number') {
    return { now: optionsOrNow, ranges: [] }
  }
  return {
    now: optionsOrNow?.now ?? Date.now(),
    ranges: optionsOrNow?.ranges ?? []
  }
}

function readSpreadsheetAutofillIntent(
  ref: MutableRefObject<SpreadsheetAutofillIntent | null>,
  sheetId: string,
  optionsOrNow: SpreadsheetAutofillIntentLookupOptions | number | undefined,
  consume: boolean
): SpreadsheetAutofillApplyType | null {
  const pending = ref.current
  if (!pending || pending.sheetId !== sheetId) return null
  const { now, ranges } = resolveLookupOptions(optionsOrNow)
  if (now - pending.markedAt > AUTOFILL_INTENT_TTL_MS) {
    ref.current = null
    return null
  }
  if (!mutationRangesMatchAutofillTarget(pending.targetRanges, ranges)) {
    return null
  }
  if (consume) {
    ref.current = null
  }
  return pending.applyType
}

export function markSpreadsheetAutofillIntent(
  ref: MutableRefObject<SpreadsheetAutofillIntent | null>,
  sheetId: string,
  applyType: SpreadsheetAutofillApplyType,
  optionsOrNow: SpreadsheetAutofillIntentMarkOptions | number = Date.now()
): void {
  if (!sheetId) return
  const { now, sourceRanges, targetRanges } = resolveMarkOptions(optionsOrNow)
  ref.current = { sheetId, applyType, markedAt: now, sourceRanges, targetRanges }
}

export function peekSpreadsheetAutofillIntent(
  ref: MutableRefObject<SpreadsheetAutofillIntent | null>,
  sheetId: string,
  optionsOrNow: SpreadsheetAutofillIntentLookupOptions | number = Date.now()
): SpreadsheetAutofillApplyType | null {
  return readSpreadsheetAutofillIntent(ref, sheetId, optionsOrNow, false)
}

export function consumeSpreadsheetAutofillIntent(
  ref: MutableRefObject<SpreadsheetAutofillIntent | null>,
  sheetId: string,
  optionsOrNow: SpreadsheetAutofillIntentLookupOptions | number = Date.now()
): SpreadsheetAutofillApplyType | null {
  return readSpreadsheetAutofillIntent(ref, sheetId, optionsOrNow, true)
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

export function resolveAutofillCommandRangesFromParams(params: unknown): {
  sourceRanges: SheetRangeShape[]
  targetRanges: SheetRangeShape[]
} {
  if (!params || typeof params !== 'object') {
    return { sourceRanges: [], targetRanges: [] }
  }
  const record = params as Record<string, unknown>
  const sourceRanges = normalizeRangeCandidates(record.sourceRange ?? record.sourceRanges)
  const targetRanges = normalizeRangeCandidates(record.targetRange ?? record.range ?? record.ranges)
  return { sourceRanges, targetRanges }
}
