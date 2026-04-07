/** Full-string fnsecret ref (aligned with functions-service fnsecret.util). */
export const FNSECRET_REF_REGEX =
  /^fnsecret:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i

export function parseFnsecretUuid(value: string): string | null {
  const s = String(value || '').trim()
  const m = s.match(FNSECRET_REF_REGEX)
  return m ? m[1].toLowerCase() : null
}

export function fnsecretRefForId(id: string): string {
  return `fnsecret:${String(id || '').trim().toLowerCase()}`
}
