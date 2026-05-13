import { assertValidCredentialFieldKey } from '@/common/utils/fncredRef'

export type KeyValueRow = { id: string; key: string; value: string }

/** New keys in edit mode: live + preview values per key. */
export type ProfileKeyValueRow = { id: string; key: string; liveValue: string; previewValue: string }

export type EditExistingRow = { key: string; liveValue: string; previewValue: string; removed: boolean }

export function newKeyValueRow(partial?: Partial<Pick<KeyValueRow, 'key' | 'value'>>): KeyValueRow {
  return {
    id: crypto.randomUUID(),
    key: partial?.key ?? '',
    value: partial?.value ?? ''
  }
}

export function newProfileKeyValueRow(
  partial?: Partial<Pick<ProfileKeyValueRow, 'key' | 'liveValue' | 'previewValue'>>
): ProfileKeyValueRow {
  return {
    id: crypto.randomUUID(),
    key: partial?.key ?? '',
    liveValue: partial?.liveValue ?? '',
    previewValue: partial?.previewValue ?? ''
  }
}

/** Live profile on create: at least one key with value. */
export function buildCreatePayload(rows: KeyValueRow[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const r of rows) {
    const k = r.key.trim()
    const v = r.value
    if (!k && !String(v).trim()) continue
    assertValidCredentialFieldKey(k)
    if (!String(v).trim()) throw new Error(`Enter a value for key “${k}”.`)
    if (out[k]) throw new Error(`Duplicate key: ${k}`)
    out[k] = v
  }
  if (Object.keys(out).length === 0) throw new Error('Add at least one key and value.')
  return out
}

/** Preview profile on create: optional; skips blank rows. */
export function buildOptionalProfilePayload(rows: KeyValueRow[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const r of rows) {
    const k = r.key.trim()
    const v = r.value
    if (!k && !String(v).trim()) continue
    assertValidCredentialFieldKey(k)
    if (!String(v).trim()) throw new Error(`Enter a value for preview key “${k}”.`)
    if (out[k]) throw new Error(`Duplicate key: ${k}`)
    out[k] = v
  }
  return out
}

/** Create credential: one row per key with live (required) and optional preview. */
export function buildCreateLivePreviewFromRows(rows: ProfileKeyValueRow[]): {
  live: Record<string, string>
  preview: Record<string, string>
} {
  const live: Record<string, string> = {}
  const preview: Record<string, string> = {}
  const seen = new Set<string>()
  for (const r of rows) {
    const k = r.key.trim()
    if (!k && !String(r.liveValue).trim() && !String(r.previewValue).trim()) continue
    assertValidCredentialFieldKey(k)
    if (seen.has(k)) throw new Error(`Duplicate key: ${k}`)
    seen.add(k)
    if (!String(r.liveValue).trim()) {
      throw new Error(`Enter a live value for key “${k}”.`)
    }
    live[k] = r.liveValue
    if (String(r.previewValue).trim()) {
      preview[k] = r.previewValue
    }
  }
  if (Object.keys(live).length === 0) throw new Error('Add at least one key with a live value.')
  return { live, preview }
}

export function computeEditPayload(
  displayName: string,
  existing: EditExistingRow[],
  newRows: ProfileKeyValueRow[]
): {
  displayName: string
  removeFieldKeys: string[]
  liveToSet: Record<string, string>
  previewToSet: Record<string, string>
} {
  const dn = displayName.trim()
  if (!dn) throw new Error('Display name is required.')

  const removeFieldKeys = existing.filter(r => r.removed).map(r => r.key)
  const keptKeys = new Set(existing.filter(r => !r.removed).map(r => r.key))

  const liveToSet: Record<string, string> = {}
  const previewToSet: Record<string, string> = {}

  for (const r of existing) {
    if (r.removed) continue
    if (String(r.liveValue).trim()) {
      liveToSet[r.key] = r.liveValue
    }
    if (String(r.previewValue).trim()) {
      previewToSet[r.key] = r.previewValue
    }
  }

  const seenNew = new Set<string>()
  for (const r of newRows) {
    const k = r.key.trim()
    if (!k && !String(r.liveValue).trim() && !String(r.previewValue).trim()) continue
    assertValidCredentialFieldKey(k)
    if (keptKeys.has(k)) throw new Error(`Key already exists: ${k}`)
    if (seenNew.has(k)) throw new Error(`Duplicate new key: ${k}`)
    seenNew.add(k)
    if (!String(r.liveValue).trim()) {
      throw new Error(`Enter a live value for new key “${k}”.`)
    }
    liveToSet[k] = r.liveValue
    if (String(r.previewValue).trim()) {
      previewToSet[k] = r.previewValue
    }
  }

  return { displayName: dn, removeFieldKeys, liveToSet, previewToSet }
}
