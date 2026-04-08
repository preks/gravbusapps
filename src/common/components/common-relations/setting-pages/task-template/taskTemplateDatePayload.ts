/** HTML `type="date"` value; backend Kogito/Jackson often expects `java.time.Instant` (full ISO-8601). */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

function trimOrNull(value: string | undefined | null): string | null {
  const s = value?.trim()
  if (!s) {
    return null
  }
  return s
}

/** Map API / form date-only or ISO instant to `YYYY-MM-DD` for `<input type="date" />`. */
export function instantOrDateToDateInputValue(value: string | undefined | null): string {
  const s = trimOrNull(value)
  if (!s) return ''
  if (DATE_ONLY.test(s)) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

/** Start of calendar day UTC → Instant string (matches CRM CampaignManagement filter pattern). */
export function toUtcStartOfDayInstantString(value: string | undefined | null): string | null {
  const s = trimOrNull(value)
  if (!s) return null
  if (DATE_ONLY.test(s)) {
    return new Date(`${s}T00:00:00.000Z`).toISOString()
  }
  return s
}

/**
 * End of calendar day UTC → Instant string for task-template **activeTo** (and similar) in the Kogito save payload.
 *
 * For a plain `YYYY-MM-DD` from `<input type="date" />`, this is the **inclusive** end of that **UTC** calendar day
 * (`23:59:59.999Z`). If the process API expects a different rule (e.g. exclusive end, local midnight), adjust this helper.
 */
export function toUtcEndOfDayInstantString(value: string | undefined | null): string | null {
  const s = trimOrNull(value)
  if (!s) return null
  if (DATE_ONLY.test(s)) {
    return new Date(`${s}T23:59:59.999Z`).toISOString()
  }
  return s
}
