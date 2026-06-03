type BadgeVariant = 'success' | 'secondary' | 'warning' | 'destructive' | 'outline'

const SCORE_FORMATTER = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2
})

function normalizeScoreToPercent(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null
  }

  return value <= 1 ? value * 100 : value
}

export function formatScoreValue(value: number | null | undefined): string {
  const normalized = normalizeScoreToPercent(value)
  if (normalized === null) {
    return 'N/A'
  }

  return SCORE_FORMATTER.format(normalized)
}

export function getGradeBadgeVariant(grade: string | null | undefined): BadgeVariant {
  const normalizedGrade = grade?.trim().toUpperCase()

  if (!normalizedGrade) {
    return 'outline'
  }

  if (normalizedGrade === 'A' || normalizedGrade === 'A+' || normalizedGrade === 'B' || normalizedGrade === 'HIGH') {
    return 'success'
  }

  if (normalizedGrade === 'C' || normalizedGrade === 'MEDIUM') {
    return 'warning'
  }

  if (normalizedGrade === 'D' || normalizedGrade === 'F' || normalizedGrade === 'LOW') {
    return 'destructive'
  }

  return 'secondary'
}
