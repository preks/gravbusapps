import { fncredRefFor } from '@/common/utils/fncredRef'

/** Row for binding a config value to a stored credential field. */
export type CredentialBindOption = {
  credentialId: string
  fieldKey: string
  /** Full `fncred:<uuid>:<fieldKey>` string. */
  ref: string
  label: string
}

export type CredentialListItemForBind = {
  id: string
  displayName: string
  fieldKeys?: string[]
}

/**
 * Flat list for pickers: one entry per credential field.
 */
export function buildCredentialBindOptionsFromList(credentials: CredentialListItemForBind[]): CredentialBindOption[] {
  const out: CredentialBindOption[] = []
  for (const c of credentials || []) {
    if (!c?.id) continue
    const keys = [...new Set((c.fieldKeys || []).map(k => String(k || '').trim()).filter(Boolean))].sort()
    for (const fieldKey of keys) {
      try {
        out.push({
          credentialId: c.id,
          fieldKey,
          ref: fncredRefFor(c.id, fieldKey),
          label: `${c.displayName || c.id} — ${fieldKey}`
        })
      } catch {
        // skip invalid keys
      }
    }
  }
  return out
}
