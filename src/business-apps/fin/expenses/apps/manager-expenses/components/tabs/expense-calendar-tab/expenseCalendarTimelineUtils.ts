import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ExpenseStatus, getExpensePlanStatusDisplay, getExpenseRequestStatusDisplay } from '../../../utils'
import type { ExpenseTimelineEvent, ExpenseTimelineItem, TeamEmployee } from './expenseCalendarTypes'

export function mapToCalendarTimelineType(pillType: string): string {
  switch (pillType) {
    case 'draft':
      return 'cancelled'
    case 'waiting':
      return 'pending'
    case 'task':
      return 'pending'
    case 'completed':
      return 'approved'
    case 'error':
      return 'rejected'
    default:
      return 'cancelled'
  }
}

export function getColorForPillType(pillType: string): string {
  switch (pillType) {
    case 'draft':
      return 'var(--nw-muted-foreground)'
    case 'waiting':
      return 'var(--nw-info)'
    case 'task':
      return 'var(--nw-warning)'
    case 'completed':
      return 'var(--nw-success)'
    case 'error':
      return 'var(--nw-destructive)'
    default:
      return 'var(--nw-muted-foreground)'
  }
}

export function buildTimelineItems(params: {
  allTeamMembers: TeamEmployee[]
  expensePlans: any[]
  expenseRequests: any[]
}): ExpenseTimelineItem[] {
  const { allTeamMembers, expensePlans, expenseRequests } = params
  const employeesMap = new Map<string, ExpenseTimelineItem>()

  for (const member of allTeamMembers) {
    if (!member.id) continue
    employeesMap.set(member.id, {
      id: member.id,
      name:
        member.fullName ||
        member.displayName ||
        `${member.firstName} ${member.lastName}` ||
        getTranslationFromI18nKeyAndLabel('lowcoder:common.unknown_employee', 'Unknown Employee'),
      detail: member.employeePosition?.organizationalUnit?.name || member.department || ''
    })
  }

  for (const item of expensePlans || []) {
    const emp = item.employee
    if (emp?.id && !employeesMap.has(emp.id)) {
      employeesMap.set(emp.id, {
        id: emp.id,
        name:
          emp.fullName ??
          emp.displayName ??
          getTranslationFromI18nKeyAndLabel('lowcoder:common.unknown_employee', 'Unknown Employee'),
        detail: emp.employeePosition?.organizationalUnit?.name ?? ''
      })
    }
  }

  for (const item of expenseRequests || []) {
    const emp = item.employee
    if (emp?.id && !employeesMap.has(emp.id)) {
      employeesMap.set(emp.id, {
        id: emp.id,
        name:
          emp.fullName ??
          emp.displayName ??
          getTranslationFromI18nKeyAndLabel('lowcoder:common.unknown_employee', 'Unknown Employee'),
        detail: emp.employeePosition?.organizationalUnit?.name ?? ''
      })
    }
  }

  return Array.from(employeesMap.values())
}

export function buildTimelineEvents(params: {
  expensePlans: any[]
  expenseRequests: any[]
  userLocale: string
}): ExpenseTimelineEvent[] {
  const { expensePlans, expenseRequests, userLocale } = params
  const events: ExpenseTimelineEvent[] = []

  for (const plan of expensePlans || []) {
    const fallbackDate = plan.planDate
    const eventStartDate = plan.startDate || fallbackDate
    const eventEndDate = plan.endDate || fallbackDate
    if (!eventStartDate || !eventEndDate) continue

    const statusDisplay = getExpensePlanStatusDisplay(plan.status as ExpenseStatus)
    events.push({
      id: `plan-${plan.id}`,
      itemId: plan.employee?.id || 'unknown',
      startDate: new Date(eventStartDate).toISOString(),
      endDate: new Date(eventEndDate).toISOString(),
      type: mapToCalendarTimelineType(statusDisplay.type),
      color: getColorForPillType(statusDisplay.type),
      note: `${plan.title || 'Expense Plan'} - ${statusDisplay.label} (${new Date(eventStartDate).toLocaleDateString(
        userLocale
      )} - ${new Date(eventEndDate).toLocaleDateString(userLocale)})`,
      status: statusDisplay.label,
      title: plan.title || 'Expense Plan',
      eventType: 'Plan'
    })
  }

  for (const request of expenseRequests || []) {
    const fallbackDate = request.requestDate
    const eventStartDate = request.startDate || fallbackDate
    const eventEndDate = request.endDate || fallbackDate
    if (!eventStartDate || !eventEndDate) continue
    if (!request.employee?.id) continue

    const statusDisplay = getExpenseRequestStatusDisplay(request.status as ExpenseStatus)
    events.push({
      id: `request-${request.id}`,
      itemId: request.employee.id,
      startDate: new Date(eventStartDate).toISOString(),
      endDate: new Date(eventEndDate).toISOString(),
      type: mapToCalendarTimelineType(statusDisplay.type),
      color: getColorForPillType(statusDisplay.type),
      note: `${request.title || 'Expense Request'} - ${statusDisplay.label} (${new Date(
        eventStartDate
      ).toLocaleDateString(userLocale)} - ${new Date(eventEndDate).toLocaleDateString(userLocale)})`,
      status: statusDisplay.label,
      title: request.title || 'Expense Request',
      eventType: 'Request'
    })
  }

  return events
}

export function buildAllStatusesLegendItems(): Array<{ label: string; color: string }> {
  const allStatusesInOrder: string[] = [
    ExpenseStatus.CREATED,
    ExpenseStatus.PREPARED,
    ExpenseStatus.ASSIGNED,
    ExpenseStatus.PENDING,
    ExpenseStatus.APPROVED,
    ExpenseStatus.REJECTED,
    ExpenseStatus.VERIFIED,
    ExpenseStatus.BOOKED,
    ExpenseStatus.TRANSFERRED,
    ExpenseStatus.PAID,
    ExpenseStatus.CLOSED,
    ExpenseStatus.DISCARDED,
    'IN_APPROVAL',
    'VERIFICATION_REQUIRED'
  ]

  const uniqueByLabel = new Map<string, { label: string; type: string }>()
  for (const status of allStatusesInOrder) {
    const requestDisplay = getExpenseRequestStatusDisplay(status)
    uniqueByLabel.set(requestDisplay.label, { label: requestDisplay.label, type: requestDisplay.type })

    const planDisplay = getExpensePlanStatusDisplay(status)
    uniqueByLabel.set(planDisplay.label, { label: planDisplay.label, type: planDisplay.type })
  }

  return Array.from(uniqueByLabel.values()).map(s => ({ label: s.label, color: getColorForPillType(s.type) }))
}
