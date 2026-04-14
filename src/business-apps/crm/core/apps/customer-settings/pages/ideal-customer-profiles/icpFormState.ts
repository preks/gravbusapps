import type { JSONValue } from '@/common/types/i18nTypes'
import { displayToJsonKey, displayToJsonValue, jsonToDisplayKey, jsonToDisplayValue } from './icpDisplayJson'
import { getLeadCriterionDefinition, isKnownLeadCriterionKey } from './icpLeadCriterionDefinitions'

/**
 * ICP catalog `objectValue` shape (per top-level key), e.g.:
 * `{ "industry": { "value": "…", "weight": 0.25 }, ... }`
 * Top-level keys are lead-field criterion ids (`icpLeadCriterionDefinitions`) or legacy custom keys.
 */

/** Keys managed by the form; users cannot add specification rows with these names. */
export const RESERVED_CRITERION_FIELD_KEYS = new Set(['value', 'weight'])

export type IcpCriterionExtraPair = {
  rowId: string
  fieldKey: string
  fieldValue: string
}

export type IcpCriterionStored = Record<string, JSONValue> & {
  value: string | number
  weight: number
}

export type IcpObjectValue = Record<string, IcpCriterionStored>

/** One row in the editor = one top-level key in `objectValue`. */
export type IcpCriterionRowState = {
  clientId: string
  /** Lead criterion field id (snake_case) or legacy free-form key. */
  key: string
  valueStr: string
  weightPct: number
  extraPairs: IcpCriterionExtraPair[]
  /** True for rows added via "Add criterion"; cleared when profile is reloaded from the catalog after save. */
  isDraft: boolean
  /** True when the stored key is not in the lead criterion allowlist (older profiles). */
  legacyUnknownKey?: boolean
}

export type IcpFormState = {
  criteria: IcpCriterionRowState[]
}

let pairIdFallbackCounter = 0
let criterionIdFallbackCounter = 0

function newPairId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  pairIdFallbackCounter += 1
  return `pair-${Date.now()}-${pairIdFallbackCounter}`
}

function newClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  criterionIdFallbackCounter += 1
  return `criterion-${Date.now()}-${criterionIdFallbackCounter}`
}

export function createEmptyCriterionRow(options?: { draft?: boolean }): IcpCriterionRowState {
  return {
    clientId: newClientId(),
    key: '',
    valueStr: '',
    weightPct: 0,
    extraPairs: [],
    isDraft: options?.draft ?? false
  }
}

export function createEmptyIcpFormState(): IcpFormState {
  return { criteria: [] }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function extraValueToString(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function rawToExtraPairs(raw: Record<string, unknown>): IcpCriterionExtraPair[] {
  const pairs: IcpCriterionExtraPair[] = []
  for (const [k, v] of Object.entries(raw)) {
    if (RESERVED_CRITERION_FIELD_KEYS.has(k.toLowerCase())) continue
    pairs.push({
      rowId: newPairId(),
      fieldKey: jsonToDisplayKey(k),
      fieldValue: jsonToDisplayValue(extraValueToString(v))
    })
  }
  return pairs
}

function parseCriterion(raw: unknown): IcpCriterionStored | null {
  if (!isRecord(raw)) return null
  const value = raw.value
  const weight = raw.weight
  if (typeof weight !== 'number' || Number.isNaN(weight)) return null
  if (typeof value !== 'string' && typeof value !== 'number') return null

  const entry: IcpCriterionStored = { value, weight }
  for (const [k, v] of Object.entries(raw)) {
    if (RESERVED_CRITERION_FIELD_KEYS.has(k.toLowerCase())) continue
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      entry[k] = v as JSONValue
    }
  }
  return entry
}

export function parseIcpObjectValue(raw: JSONValue | undefined): IcpObjectValue {
  if (!isRecord(raw)) return {}
  const result: IcpObjectValue = {}
  for (const [key, v] of Object.entries(raw)) {
    const c = parseCriterion(v)
    if (c) result[key] = c
  }
  return result
}

function weightToPct(weight: number): number {
  if (weight > 1 && weight <= 100) return Math.round(weight)
  return Math.round(weight * 100)
}

function formatLoadedValue(storageKey: string, value: string | number): string {
  const def = getLeadCriterionDefinition(storageKey)
  if (typeof value === 'number') {
    return String(value)
  }
  if (def?.valueKind === 'catalog') {
    return String(value)
  }
  return jsonToDisplayValue(String(value))
}

export function objectValueToFormState(objectValue: JSONValue | undefined): IcpFormState {
  const parsed = parseIcpObjectValue(objectValue)
  const criteria: IcpCriterionRowState[] = []

  for (const storageKey of Object.keys(parsed).sort((a, b) => a.localeCompare(b))) {
    const c = parsed[storageKey]
    const raw = c as unknown as Record<string, unknown>
    const legacyUnknownKey = !isKnownLeadCriterionKey(storageKey)
    criteria.push({
      clientId: newClientId(),
      key: storageKey,
      valueStr: formatLoadedValue(storageKey, c.value),
      weightPct: weightToPct(c.weight),
      extraPairs: rawToExtraPairs(raw),
      isDraft: false,
      legacyUnknownKey
    })
  }

  return { criteria }
}

function shouldInclude(valueStr: string, weightPct: number): boolean {
  return weightPct > 0 || valueStr.trim().length > 0
}

const FIELD_KEY_PATTERN = /^[a-z0-9_]+$/i

/** Merge user-defined key/value rows into the criterion object (last duplicate key wins). */
export function mergeExtraPairsIntoEntry(pairs: IcpCriterionExtraPair[], base: IcpCriterionStored): IcpCriterionStored {
  const out: IcpCriterionStored = { ...base }
  for (const p of pairs) {
    const k = displayToJsonKey(p.fieldKey)
    if (!k || RESERVED_CRITERION_FIELD_KEYS.has(k)) continue
    if (!FIELD_KEY_PATTERN.test(k)) continue
    const v = displayToJsonValue(p.fieldValue)
    if (v === '') continue
    out[k] = v
  }
  return out
}

function serializeCriterionValue(row: IcpCriterionRowState, storageKey: string): string | number {
  const def = getLeadCriterionDefinition(storageKey)
  if (row.legacyUnknownKey || !def) {
    return displayToJsonValue(String(row.valueStr))
  }
  if (def.valueKind === 'catalog') {
    return row.valueStr.trim()
  }
  return displayToJsonValue(String(row.valueStr))
}

export function formStateToObjectValue(form: IcpFormState): IcpObjectValue {
  const out: IcpObjectValue = {}

  for (const row of form.criteria) {
    const storageKey = row.legacyUnknownKey ? displayToJsonKey(row.key) : row.key.trim()
    if (!storageKey || !FIELD_KEY_PATTERN.test(storageKey)) continue
    if (!row.legacyUnknownKey && !isKnownLeadCriterionKey(storageKey)) continue
    if (!shouldInclude(row.valueStr, row.weightPct)) continue
    const weight = row.weightPct / 100
    const value = serializeCriterionValue(row, storageKey)
    const base: IcpCriterionStored = { value, weight }
    out[storageKey] = mergeExtraPairsIntoEntry(row.extraPairs, base)
  }

  return out
}

export function totalWeightPct(form: IcpFormState): number {
  return form.criteria.reduce((sum, row) => sum + row.weightPct, 0)
}

/** True when the sum of all weight percentages exceeds 100 (invalid for save). */
export function isWeightsTotalOverLimit(form: IcpFormState, maxPct = 100): boolean {
  return totalWeightPct(form) > maxPct
}

export function createEmptyExtraPair(): IcpCriterionExtraPair {
  return { rowId: newPairId(), fieldKey: '', fieldValue: '' }
}
