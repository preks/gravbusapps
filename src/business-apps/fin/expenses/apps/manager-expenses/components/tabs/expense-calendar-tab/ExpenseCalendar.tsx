import React, { useMemo, useState, useEffect } from 'react'
import { Typography, Spin, Alert } from 'antd'
import { CalendarTimeline } from '@newwork/gravity-ui-catalog'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useManagerExpensesOverview } from '../../../hooks/useManagerExpensesOverview'
import { ExpenseStatus, getExpensePlanStatusDisplay, getExpenseRequestStatusDisplay } from '../../../utils'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_TEAM_MEMBERS_BY_MANAGER } from '../../../queries/expenseRequests'

const { Text } = Typography

interface TeamEmployee {
  id: string
  userId?: string
  firstName: string
  lastName: string
  fullName?: string
  displayName?: string
  department?: string
  jobTitle?: string
  employeePosition?: {
    organizationalUnit?: {
      name: string
    }
  }
}

interface ExpenseTimelineItem {
  id: string
  name: string
  detail?: string
}

interface ExpenseTimelineEvent {
  id: string
  itemId: string
  startDate: string
  endDate: string
  type: string
  color?: string
  note: string
  status: string
  title: string
  eventType: 'Plan' | 'Request'
}

export type ExpenseCalendarProps = BusinessAppContextProps

export const ExpenseCalendar: React.FC<ExpenseCalendarProps> = props => {
  const { userInfo, accessToken } = props
  const userLocale = getCurrentActiveUserLocale()
  const graphqlClient = useGraphQLClient(accessToken || '')

  const managerId = userInfo?.employeeDetails?.employeeId || userInfo?.id || ''

  // State for all team members
  const [allTeamMembers, setAllTeamMembers] = useState<TeamEmployee[]>([])
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false)
  const [teamMembersError, setTeamMembersError] = useState<string | null>(null)

  // Fetch all team members under the manager
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!managerId || !accessToken) return

      setLoadingTeamMembers(true)
      setTeamMembersError(null)

      try {
        const result = await graphqlClient.request<{ Employee: TeamEmployee[] }>(GET_TEAM_MEMBERS_BY_MANAGER, {
          managerId
        })
        setAllTeamMembers(result.Employee || [])
      } catch (err) {
        console.error('Error fetching team members:', err)
        setTeamMembersError(getTranslationFromI18nKeyAndLabel('lowcoder:common.error', 'Error loading team members'))
      } finally {
        setLoadingTeamMembers(false)
      }
    }

    fetchTeamMembers()
  }, [managerId, accessToken, graphqlClient])

  // Use consolidated overview to load plans/requests once (high limit for calendar)
  // Note: currencyRef is intentionally undefined to show all expenses regardless of currency
  const overview = useManagerExpensesOverview(props, {
    managerId,
    currencyRef: undefined,
    searchTerm: undefined,
    requests: { limit: 1000, offset: 0 },
    plans: { limit: 1000, offset: 0 },
    payments: { limit: 0, offset: 0 }
  })

  const expensePlans = overview.data?.expensePlans || []
  const expenseRequests = overview.data?.expenseRequests || []

  const mapToCalendarTimelineType = (type: string): string => {
    switch (type) {
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

  const getColorForType = (type: string): string => {
    switch (type) {
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

  const timelineItems = useMemo((): ExpenseTimelineItem[] => {
    const employeesMap = new Map<string, ExpenseTimelineItem>()

    // First, add ALL team members (so they appear even without expenses)
    for (const member of allTeamMembers) {
      if (member.id) {
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
    }

    // Then, add employees from expenses (in case they're not in the direct team but have expenses)
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
  }, [allTeamMembers, expensePlans, expenseRequests])

  const timelineEvents = useMemo((): ExpenseTimelineEvent[] => {
    const events: ExpenseTimelineEvent[] = []

    for (const plan of expensePlans || []) {
      let eventStartDate = plan.startDate
      let eventEndDate = plan.endDate

      if (!eventStartDate || !eventEndDate) {
        eventStartDate = plan.planDate
        eventEndDate = plan.planDate
      }

      // Skip if no valid date can be determined
      if (!eventStartDate || !eventEndDate) continue

      // Get proper status display
      const statusDisplay = getExpensePlanStatusDisplay(plan.status as ExpenseStatus)

      events.push({
        id: `plan-${plan.id}`,
        itemId: plan.employee?.id || 'unknown',
        startDate: new Date(eventStartDate).toISOString(),
        endDate: new Date(eventEndDate).toISOString(),
        type: mapToCalendarTimelineType(statusDisplay.type), // Map to CalendarTimeline recognized types
        color: getColorForType(statusDisplay.type), // Add color matching legend
        note: `${plan.title || 'Expense Plan'} - ${statusDisplay.label} (${new Date(eventStartDate).toLocaleDateString(
          userLocale
        )} - ${new Date(eventEndDate).toLocaleDateString(userLocale)})`,
        status: statusDisplay.label,
        title: plan.title || 'Expense Plan',
        eventType: 'Plan'
      })
    }

    for (const request of expenseRequests || []) {
      let eventStartDate = request.startDate
      let eventEndDate = request.endDate

      if (!eventStartDate || !eventEndDate) {
        eventStartDate = request.requestDate
        eventEndDate = request.requestDate
      }

      if (!eventStartDate || !eventEndDate) continue

      if (!request.employee?.id) continue

      const statusDisplay = getExpenseRequestStatusDisplay(request.status as ExpenseStatus)

      events.push({
        id: `request-${request.id}`,
        itemId: request.employee.id,
        startDate: new Date(eventStartDate).toISOString(),
        endDate: new Date(eventEndDate).toISOString(),
        type: mapToCalendarTimelineType(statusDisplay.type), // Map to CalendarTimeline recognized types
        color: getColorForType(statusDisplay.type), // Add color matching legend
        note: `${request.title || 'Expense Request'} - ${statusDisplay.label} (${new Date(
          eventStartDate
        ).toLocaleDateString(userLocale)} - ${new Date(eventEndDate).toLocaleDateString(userLocale)})`,
        status: statusDisplay.label,
        title: request.title || 'Expense Request',
        eventType: 'Request'
      })
    }

    return events
  }, [expensePlans, expenseRequests, userLocale])

  const legendItems = useMemo(() => {
    const uniqueStatusTypes = new Map<string, { label: string; type: string }>()

    for (const plan of expensePlans || []) {
      const statusDisplay = getExpensePlanStatusDisplay(plan.status as ExpenseStatus)
      uniqueStatusTypes.set(statusDisplay.type, {
        label: statusDisplay.label,
        type: statusDisplay.type
      })
    }

    for (const request of expenseRequests || []) {
      const statusDisplay = getExpenseRequestStatusDisplay(request.status as ExpenseStatus)
      uniqueStatusTypes.set(statusDisplay.type, {
        label: statusDisplay.label,
        type: statusDisplay.type
      })
    }

    const legendItems = Array.from(uniqueStatusTypes.values()).map(status => ({
      label: status.label,
      color: getColorForType(status.type)
    }))

    return legendItems
  }, [expensePlans, expenseRequests])

  const renderDataBody = () => {
    if (overview.isLoading || loadingTeamMembers)
      return (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-full" data-testid="expense-calendar-loading">
          <Spin size="large" data-testid="expense-calendar-loading-spinner" />
        </div>
      )

    const errorMessages = []
    if (overview.error) errorMessages.push(`Error loading calendar data: ${overview.error}`)
    if (teamMembersError) errorMessages.push(teamMembersError)
    if (errorMessages.length > 0)
      return (
        <Alert message={errorMessages.join('\n')} type="error" showIcon data-testid="expense-calendar-error-alert" />
      )

    // Always show calendar with all team members, even if there are no expense events
    return (
      <div data-testid="expense-calendar-timeline">
        <CalendarTimeline<ExpenseTimelineItem, ExpenseTimelineEvent>
          title={getTranslationFromI18nKeyAndLabel(
            'lowcoder:team_expenses_page.dashboard_tab.expense_calendar',
            'Expense Calendar'
          )}
          items={timelineItems}
          events={timelineEvents}
          itemLabel={getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')}
          itemDetailLabel={getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_list.search_employee_list.recent_employees_table.department',
            'Department'
          )}
          searchPlaceholder={getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_table.employee_search_filter',
            'Search Employee...'
          )}
          renderItemContent={item => (
            <div className="gba:p-2">
              <Text strong>{item.name}</Text>
              {item.detail && (
                <Text type="secondary" className="gba:text-xs gba:block">
                  {item.detail}
                </Text>
              )}
            </div>
          )}
          legendItems={legendItems}
        />
      </div>
    )
  }

  return <div data-testid="expense-calendar-container">{renderDataBody()}</div>
}

export default ExpenseCalendar
