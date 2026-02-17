// Shared helpers for Absences UI to keep transition to canonical TIME_* statuses non-breaking

// Return TIME_* code if present, otherwise legacy status, otherwise empty string
export function getCanonicalStatus(rec: { statusCode?: string; status?: string } | null | undefined): string {
  if (!rec) return ''
  return (rec.statusCode as string | undefined) ?? (rec.status as string | undefined) ?? ''
}

// Prefer effectiveDays over workingDays to represent business duration
export function getBusinessDays(
  rec: { effectiveDays?: number | string; workingDays?: number | string } | null | undefined
): number {
  if (!rec) return 0
  const eff = rec?.effectiveDays
  const work = rec?.workingDays
  const parseNum = (v: any) => (typeof v === 'number' ? v : v ? Number(v) : 0)
  return eff !== undefined && eff !== null ? parseNum(eff) : parseNum(work)
}
