import { formatNumberFunction, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

const STATUS_MAP: Record<string, string> = {
  active: 'active',
  inactive: 'inactive',
  approved: 'approved',
  pending: 'pending',
  rejected: 'rejected',
  cancelled: 'cancelled',
  unknown: 'unknown',
  APPROVED_SALARY_ADJUSTMENT: 'Approved',
  PENDING_SALARY_ADJUSTMENT: 'Pending',
  REJECTED_SALARY_ADJUSTMENT: 'Rejected',
  APPROVED_COMPENSATION: 'Approved',
  PENDING_COMPENSATION: 'Pending',
  CANCELLED_COMPENSATION: 'Cancelled',
  UNKNOWN_COMPENSATION: 'Unknown',
  ACTIVE_BENEFIT: 'Active',
  INACTIVE_BENEFIT: 'Inactive',
  UNKNOWN_BENEFIT: 'Unknown'
}

export function humanizeStatus(raw: string | null | undefined): string {
  if (!raw) return '-'
  if (STATUS_MAP[raw]) return STATUS_MAP[raw]
  return raw
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

const STATUS_TRANSLATION_KEYS: Record<string, string> = {
  approved: 'status-approved',
  pending: 'status-pending',
  activation: 'status-activation',
  deactivation: 'status-deactivation',
  active: 'status-active',
  inactive: 'status-inactive',
  rejected: 'status-rejected',
  cancelled: 'status-cancelled',
  unknown: 'status-unknown'
}

export function translateStatusLabel(statusLabel: string, t: (key: string) => string): string {
  const key = STATUS_TRANSLATION_KEYS[statusLabel.toLowerCase()]
  if (!key) {
    return statusLabel
  }
  return t(key)
}

export function humanizeCatalogRef(ref: string | null | undefined): string {
  if (!ref) return '-'
  const parts = ref.split(':')
  const code = parts[parts.length - 1]
  return code
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

export function getCatalogDisplayValue(
  entry: { value?: string | null; translations?: Array<{ localeCode: string; value: string }> } | null | undefined
): string {
  if (!entry) return '-'
  const locale = getCurrentActiveUserLocale()
  const translatedValue = entry.translations?.find(translation => translation.localeCode === locale)?.value?.trim()
  return translatedValue || entry.value || '-'
}

export function statusBadgeVariant(label: string): 'success' | 'warning' | 'destructive' | 'default' {
  const l = label.toLowerCase()
  if (l === 'approved' || l === 'active' || l === 'paid' || l === 'completed') return 'success'
  if (l === 'pending') return 'warning'
  if (l === 'rejected' || l === 'cancelled' || l === 'inactive' || l === 'deactivation') return 'destructive'
  return 'default'
}

function normalizeLocale(locale?: string): string | undefined {
  if (!locale) return getCurrentActiveUserLocale()
  if (locale.includes('-')) return locale
  if (locale.length === 4) return `${locale.slice(0, 2)}-${locale.slice(2)}`
  return locale
}

export function formatDateShort(dateStr: string | null | undefined, locale?: string): string {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return dateStr
    return new Intl.DateTimeFormat(normalizeLocale(locale), {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date)
  } catch {
    return dateStr
  }
}

export function formatMonthYear(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(normalizeLocale(locale), {
    month: 'long',
    year: 'numeric'
  }).format(date)
}

export function formatCurrencyValue(amount: number | null, currencyCode: string): string {
  if (amount == null) return '-'
  const formattedByPlatform = formatNumberFunction(amount, '0.00[,]00')
  const fallback = amount.toLocaleString(getCurrentActiveUserLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  const formattedNumber = formattedByPlatform === String(amount) ? fallback : formattedByPlatform
  return `${formattedNumber} ${currencyCode}`.trim()
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

export function getEmployeeDepartment(
  employee: { employeePositions?: Array<{ organizationalUnit?: { name: string } | null }> } | null
): string {
  return employee?.employeePositions?.[0]?.organizationalUnit?.name ?? '-'
}
