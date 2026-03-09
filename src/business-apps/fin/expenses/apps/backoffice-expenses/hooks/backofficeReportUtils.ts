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

export const buildEmployeeDisplayName = (
  employee: { fullName?: string; firstName?: string; lastName?: string } | null | undefined
): string => {
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

const toPrimitiveString = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  return ''
}

const parseDateOrNull = (value: unknown): Date | null => {
  if (!value) return null
  const parsed = new Date(toPrimitiveString(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const isPaidLikeStatus = (value: unknown): boolean =>
  ['PAID', 'CLOSED'].includes(toPrimitiveString(value).toUpperCase())

export const toUpperText = (value: unknown): string => toPrimitiveString(value).toUpperCase()
const toUpperSafeText = (value: unknown): string => {
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
    .map(value => toPrimitiveString(value).trim())
    .filter(Boolean)
    .map(value => ({ raw: value, date: parseDateOrNull(value) }))
    .filter(value => value.date)
    .sort((a, b) => a.date!.getTime() - b.date!.getTime())
  return sorted[0]?.raw || ''
}

const countBusinessDays = (start: Date, end: Date): number => {
  let count = 0
  const cursor = new Date(start)
  cursor.setHours(0, 0, 0, 0)
  const target = new Date(end)
  target.setHours(0, 0, 0, 0)
  while (cursor < target) {
    const dow = cursor.getDay()
    if (dow !== 0 && dow !== 6) count++
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

export const daysDiff = (from: string, to: string): number | null => {
  const start = parseDateOrNull(from)
  const end = parseDateOrNull(to)
  if (!start || !end) return null
  return countBusinessDays(start, end)
}

const getObjectPathValue = (source: Record<string, any>, path: string): unknown => {
  return path.split('.').reduce((acc: any, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), source)
}

const parsePositiveNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'object') return null
  const normalized = Number(toPrimitiveString(value).replace(',', '.'))
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
  const mondayWindowDays = countBusinessDays(approvedDate, mondayDueDate)

  const remainingTotalWindowDays = approvalDays === null ? null : Math.max(totalCycleSlaBusinessDays - approvalDays, 0)

  const limitDays =
    remainingTotalWindowDays === null ? mondayWindowDays : Math.min(mondayWindowDays, remainingTotalWindowDays)

  const paidDate = parseDateOrNull(paidAt)
  const evaluationDate = paidDate || new Date()
  const elapsedDays = countBusinessDays(approvedDate, evaluationDate)
  const status = elapsedDays <= limitDays ? 'Within SLA' : 'Breached'
  return { limitDays, status }
}

export interface SlaKpiCounts {
  approvalBreached: number
  approvalEvaluated: number
  payoutBreached: number
  payoutEvaluated: number
  totalBreached: number
  totalEvaluated: number
  totalWithin: number
}

type CommentRow = { expenseRequestId: string; commentDate: string; comment: string }
type PaymentRow = { transactionDate?: string; decisionDate?: string; createdAt?: string; requestId: string }

export const computeSlaKpiFromFlat = (
  comments: CommentRow[],
  payments: PaymentRow[],
  slaPolicy: ExpensesSlaPolicy
): SlaKpiCounts => {
  const byRequest = new Map<string, { pendingDates: string[]; approvedDates: string[]; paidDates: string[] }>()

  const ensure = (id: string) => {
    if (!byRequest.has(id)) byRequest.set(id, { pendingDates: [], approvedDates: [], paidDates: [] })
    return byRequest.get(id)!
  }

  for (const c of comments) {
    const upper = (c.comment || '').toUpperCase()
    const entry = ensure(c.expenseRequestId)
    if (upper.includes('TO: PENDING') || upper.includes('TO PENDING')) {
      if (
        upper.includes('FROM: CREATED') ||
        upper.includes('FROM CREATED') ||
        upper.includes('FROM: DRAFT') ||
        upper.includes('FROM DRAFT')
      ) {
        entry.pendingDates.push(c.commentDate)
      }
    }
    if (
      upper.includes('TO: APPROVED') ||
      upper.includes('TO APPROVED') ||
      upper.includes('TO: APPROVAL') ||
      upper.includes('TO APPROVAL')
    ) {
      if (upper.includes('FROM: PENDING') || upper.includes('FROM PENDING')) {
        entry.approvedDates.push(c.commentDate)
      }
    }
    if (
      upper.includes('TO: PAID') ||
      upper.includes('TO PAID') ||
      upper.includes('TO: CLOSED') ||
      upper.includes('TO CLOSED')
    ) {
      entry.paidDates.push(c.commentDate)
    }
  }

  for (const p of payments) {
    const date = p.transactionDate || p.decisionDate || p.createdAt
    if (date) ensure(p.requestId).paidDates.push(date)
  }

  const counts: SlaKpiCounts = {
    approvalBreached: 0,
    approvalEvaluated: 0,
    payoutBreached: 0,
    payoutEvaluated: 0,
    totalBreached: 0,
    totalEvaluated: 0,
    totalWithin: 0
  }

  for (const entry of byRequest.values()) {
    const pendingAt = pickEarliest(entry.pendingDates)
    const approvedAt = pickEarliest(entry.approvedDates)
    const paidAt = pickEarliest(entry.paidDates) || ''

    const approvalDays = daysDiff(pendingAt, approvedAt)
    const payoutEval = evaluatePayoutSlaAgainstRunDay(
      approvedAt,
      paidAt,
      slaPolicy.payoutRunWeekday,
      approvalDays,
      slaPolicy.totalCycleSlaBusinessDays
    )
    const totalCycleDays = daysDiff(pendingAt, paidAt)
    const approvalStatus = buildSlaStatus(approvalDays, slaPolicy.approvalSlaBusinessDays)
    const totalCycleStatus = buildSlaStatus(totalCycleDays, slaPolicy.totalCycleSlaBusinessDays)

    if (approvalStatus !== '-') {
      counts.approvalEvaluated++
      if (approvalStatus === 'Breached') counts.approvalBreached++
    }
    if (payoutEval.status !== '-') {
      counts.payoutEvaluated++
      if (payoutEval.status === 'Breached') counts.payoutBreached++
    }
    if (totalCycleStatus !== '-') {
      counts.totalEvaluated++
      if (totalCycleStatus === 'Breached') counts.totalBreached++
      if (totalCycleStatus === 'Within SLA') counts.totalWithin++
    }
  }

  return counts
}
