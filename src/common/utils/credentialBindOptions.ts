/** Row for binding a config value to a stored credential (same secret may appear under multiple labels). */
export type CredentialBindOption = {
  secretId: string
  label: string
}

export type CredentialBundleListItemForBind = {
  id: string
  displayName: string
  slots?: Array<{ slotKey: string; secretId: string }>
}

export type StoredCredentialForBind = { id: string; displayName: string }

/**
 * Flat list for pickers: standalone credentials first, then each bundle slot as "Bundle — SLOT_KEY".
 */
export function buildCredentialBindOptions(
  credentials: StoredCredentialForBind[],
  bundles: CredentialBundleListItemForBind[]
): CredentialBindOption[] {
  const out: CredentialBindOption[] = []
  for (const c of credentials || []) {
    if (!c?.id) continue
    out.push({ secretId: c.id, label: c.displayName || c.id })
  }
  for (const b of bundles || []) {
    for (const slot of b.slots || []) {
      if (!slot?.secretId) continue
      out.push({
        secretId: slot.secretId,
        label: `${b.displayName} — ${slot.slotKey}`
      })
    }
  }
  return out
}
