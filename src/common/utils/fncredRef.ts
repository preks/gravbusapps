/** Credential field keys: letters, digits, '-', '_', '.' (aligned with functions-service credential-field-key.util). */
const CREDENTIAL_FIELD_KEY_REGEX = /^[A-Za-z0-9._-]+$/

/** Full-string fncred ref: fncred:<uuid>:<fieldKey> — field key cannot contain ':'. */
export const FNCRED_REF_REGEX =
  /^fncred:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}):(.+)$/i

export function assertValidCredentialFieldKey(key: string): void {
  const k = String(key || '').trim()
  if (!k) throw new Error('Field key is required')
  if (k.length > 253) throw new Error('Field key exceeds max length 253')
  if (!CREDENTIAL_FIELD_KEY_REGEX.test(k)) {
    throw new Error(`Invalid field key: use only letters, numbers, '-', '_', or '.' (no spaces)`)
  }
}

export function parseFncredRef(value: string): { credentialId: string; fieldKey: string } | null {
  const s = String(value || '').trim()
  const m = s.match(FNCRED_REF_REGEX)
  if (!m) return null
  const credentialId = m[1].toLowerCase()
  const fieldKey = m[2]
  try {
    assertValidCredentialFieldKey(fieldKey)
  } catch {
    return null
  }
  return { credentialId, fieldKey }
}

export function fncredRefFor(credentialId: string, fieldKey: string): string {
  const id = String(credentialId || '').trim().toLowerCase()
  assertValidCredentialFieldKey(fieldKey)
  return `fncred:${id}:${fieldKey}`
}

export function isFncredRef(value: string): boolean {
  return parseFncredRef(value) !== null
}
