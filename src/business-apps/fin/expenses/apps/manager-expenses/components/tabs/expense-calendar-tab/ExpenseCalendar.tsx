import React, { useMemo } from 'react'
import { Spinner, Alert, AlertDescription, Label } from '@newwork/nw-design-system'
import { CalendarTimeline } from '@newwork/gravity-ui-catalog'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useManagerExpensesOverview } from '../../../hooks/useManagerExpensesOverview'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import type { ExpenseTimelineEvent, ExpenseTimelineItem } from './expenseCalendarTypes'
import { useTeamMembersByManager } from './useTeamMembersByManager'
import { buildAllStatusesLegendItems, buildTimelineEvents, buildTimelineItems } from './expenseCalendarTimelineUtils'

// Step 5: Overview limits for calendar. Review with product; a lower cap (e.g. 500) can reduce payload if acceptable for UX.
const CALENDAR_OVERVIEW_REQUESTS_LIMIT = 1000
const CALENDAR_OVERVIEW_PLANS_LIMIT = 1000

export type ExpenseCalendarProps = BusinessAppContextProps

export const ExpenseCalendar: React.FC<ExpenseCalendarProps> = props => {
  const { userInfo, accessToken } = props
  // Memoize once so timelineEvents useMemo only recomputes when plans/requests change (PERFORMANCE-IMPROVEMENT-PLAN §2.3 / Step 5).
  const userLocale = useMemo(() => getCurrentActiveUserLocale(), [])

  const managerId = userInfo?.employeeDetails?.employeeId || userInfo?.id || ''

  const { allTeamMembers, loadingTeamMembers, teamMembersError } = useTeamMembersByManager({ managerId, accessToken })

  // Step 1: Memoize overview params so the hook receives a stable reference when managerId is unchanged.
  const overviewParams = useMemo(
    () => ({
      managerId,
      currencyRef: undefined as string | undefined,
      searchTerm: undefined as string | undefined,
      requests: { limit: CALENDAR_OVERVIEW_REQUESTS_LIMIT, offset: 0 },
      plans: { limit: CALENDAR_OVERVIEW_PLANS_LIMIT, offset: 0 },
      payments: { limit: 0, offset: 0 }
    }),
    [managerId]
  )

  const overview = useManagerExpensesOverview(props, overviewParams)

  const expensePlans = overview.data?.expensePlans || []
  const expenseRequests = overview.data?.expenseRequests || []

  const timelineItems = useMemo((): ExpenseTimelineItem[] => {
    return buildTimelineItems({ allTeamMembers, expensePlans, expenseRequests })
  }, [allTeamMembers, expensePlans, expenseRequests])

  const timelineEvents = useMemo((): ExpenseTimelineEvent[] => {
    return buildTimelineEvents({ expensePlans, expenseRequests, userLocale })
  }, [expensePlans, expenseRequests, userLocale])

  const legendItems = useMemo(() => {
    return buildAllStatusesLegendItems()
  }, [])

  const renderDataBody = () => {
    if (overview.isLoading || loadingTeamMembers)
      return (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-full" data-testid="expense-calendar-loading">
          <Spinner size="lg" data-testid="expense-calendar-loading-spinner" />
        </div>
      )

    const errorMessages = []
    if (overview.error) errorMessages.push(`Error loading calendar data: ${overview.error}`)
    if (teamMembersError) errorMessages.push(teamMembersError)
    if (errorMessages.length > 0)
      return (
        <Alert variant="destructive" data-testid="expense-calendar-error-alert">
          <AlertDescription>{errorMessages.join('\n')}</AlertDescription>
        </Alert>
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
              <Label className="gba:font-semibold">{item.name}</Label>
              {item.detail && <span className="gba:text-xs gba:block gba:text-muted-foreground">{item.detail}</span>}
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
