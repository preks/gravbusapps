export interface ExpensesSlaPolicy {
  approvalSlaBusinessDays: number
  payoutRunWeekday: number
  totalCycleSlaBusinessDays: number
}

export const DEFAULT_EXPENSES_SLA_POLICY: ExpensesSlaPolicy = {
  approvalSlaBusinessDays: 2,
  payoutRunWeekday: 1,
  totalCycleSlaBusinessDays: 5
}

export const FORMER_EMPLOYEE_LABEL = 'Former employee'

export const buildEmployeeDisplayName = (employee: any): string => {
  if (!employee) return ''
  const fullName = (employee.fullName || '').trim()
  if (fullName) return fullName
  return `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
}

export const getSettledAdvancePaidAmount = (advancePayments: any[]): number => {
  return (Array.isArray(advancePayments) ? advancePayments : [])
    .filter((payment: any) => ['PAID', 'CLOSED', 'TRANSFERRED'].includes(String(payment?.status || '').toUpperCase()))
    .reduce((sum: number, payment: any) => sum + Number(payment?.amount || 0), 0)
}

export const parseDateOrNull = (value: unknown): Date | null => {
  if (!value) return null
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const isPaidLikeStatus = (value: unknown): boolean =>
  ['PAID', 'CLOSED'].includes(String(value || '').toUpperCase())

export const toUpperText = (value: unknown): string => String(value || '').toUpperCase()
export const toUpperSafeText = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.toUpperCase()
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value).toUpperCase()
  }
  return ''
}

const normalizeStatusToken = (value: string): string => {
  const token = toUpperSafeText(value).replaceAll(/[^A-Z]/g, '')
  if (token === 'APPROVAL') return 'APPROVED'
  if (token === 'DRAFT') return 'CREATED'
  return token
}

export const hasStatusTransition = (text: string, statuses: string[]): boolean => {
  const normalized = toUpperText(text)
  return statuses.some(status => {
    if (!status) return false
    return (
      normalized.includes(`TO: ${status}`) ||
      normalized.includes(`TO ${status}`) ||
      normalized.includes(`STATUS: ${status}`) ||
      normalized.includes(`STATUS ${status}`) ||
      normalized.includes(status)
    )
  })
}

export const hasFromToTransition = (text: string, fromStatuses: string[], toStatuses: string[]): boolean => {
  const normalized = toUpperText(text)
  const fromNormalized = fromStatuses.map(normalizeStatusToken)
  const toNormalized = toStatuses.map(normalizeStatusToken)

  const fromMatch = fromNormalized.some(
    from => normalized.includes(`FROM ${from}`) || normalized.includes(`FROM: ${from}`)
  )
  const toMatch = toNormalized.some(to => normalized.includes(`TO ${to}`) || normalized.includes(`TO: ${to}`))
  if (fromMatch && toMatch) return true

  const compact = normalized.replaceAll(/\s+/g, ' ')
  return fromNormalized.some(from =>
    toNormalized.some(to => compact.includes(`FROM ${from} TO ${to}`) || compact.includes(`${from} TO ${to}`))
  )
}

export const pickEarliest = (values: Array<unknown>): string => {
  const sorted = values
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .map(value => ({ raw: value, date: parseDateOrNull(value) }))
    .filter(value => value.date)
    .sort((a, b) => a.date!.getTime() - b.date!.getTime())
  return sorted[0]?.raw || ''
}

export const daysDiff = (from: string, to: string): number | null => {
  const start = parseDateOrNull(from)
  const end = parseDateOrNull(to)
  if (!start || !end) return null
  return Number(((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)).toFixed(2))
}

const getObjectPathValue = (source: Record<string, any>, path: string): unknown => {
  return path.split('.').reduce((acc: any, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), source)
}

export const parsePositiveNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'object') return null
  const normalized = Number(String(value).replace(',', '.'))
  if (!Number.isFinite(normalized)) return null
  return normalized >= 0 ? normalized : null
}

export const getFirstNumberAtPaths = (source: Record<string, any>, paths: string[]): number | null => {
  for (const path of paths) {
    const value = parsePositiveNumber(getObjectPathValue(source, path))
    if (value !== null) return value
  }
  return null
}

export const parseAdditionalProperties = (raw: unknown): Record<string, any> => {
  if (!raw) return {}
  if (typeof raw === 'object') return raw as Record<string, any>
  if (typeof raw !== 'string') return {}
  try {
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed ? (parsed as Record<string, any>) : {}
  } catch {
    return {}
  }
}

export const extractBusinessDaysByLabel = (content: string, label: string): number | null => {
  const normalizedContent = String(content || '')
  const regex = new RegExp(String.raw`${label}[\s\S]{0,140}?(\d+(?:[.,]\d+)?)\s*business\s*days`, 'i')
  const match = regex.exec(normalizedContent)
  if (!match) return null
  return parsePositiveNumber(match[1])
}

export const buildSlaStatus = (durationDays: number | null, thresholdDays: number): string => {
  if (durationDays === null) return '-'
  return durationDays > thresholdDays ? 'Breached' : 'Within SLA'
}

const getNextOrSameWeekday = (fromDate: Date, targetWeekday: number): Date => {
  const result = new Date(fromDate)
  const current = result.getDay()
  const delta = (targetWeekday - current + 7) % 7
  result.setDate(result.getDate() + delta)
  return result
}

export const evaluatePayoutSlaAgainstRunDay = (
  approvedAt: string,
  paidAt: string,
  payoutRunWeekday: number,
  approvalDays: number | null,
  totalCycleSlaBusinessDays: number
): { limitDays: number | null; status: string } => {
  const approvedDate = parseDateOrNull(approvedAt)
  if (!approvedDate) return { limitDays: null, status: '-' }

  const mondayDueDate = getNextOrSameWeekday(approvedDate, payoutRunWeekday)
  const mondayWindowDays = Number(
    ((mondayDueDate.getTime() - approvedDate.getTime()) / (1000 * 60 * 60 * 24)).toFixed(2)
  )

  const remainingTotalWindowDays =
    approvalDays === null ? null : Math.max(Number((totalCycleSlaBusinessDays - approvalDays).toFixed(2)), 0)

  const limitDays =
    remainingTotalWindowDays === null ? mondayWindowDays : Math.min(mondayWindowDays, remainingTotalWindowDays)

  const paidDate = parseDateOrNull(paidAt)
  const evaluationDate = paidDate || new Date()
  const elapsedDays = Number(((evaluationDate.getTime() - approvedDate.getTime()) / (1000 * 60 * 60 * 24)).toFixed(2))
  const status = elapsedDays <= limitDays ? 'Within SLA' : 'Breached'
  return { limitDays, status }
}
