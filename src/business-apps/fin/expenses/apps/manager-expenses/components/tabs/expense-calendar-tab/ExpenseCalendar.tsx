import React, { useMemo } from 'react'
import { Typography, Spin, Alert } from 'antd'
import { CalendarTimeline } from '@newwork/gravity-ui-catalog'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useManagerExpensesOverview } from '../../../hooks/useManagerExpensesOverview'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import type { ExpenseTimelineEvent, ExpenseTimelineItem } from './expenseCalendarTypes'
import { useTeamMembersByManager } from './useTeamMembersByManager'
import { buildAllStatusesLegendItems, buildTimelineEvents, buildTimelineItems } from './expenseCalendarTimelineUtils'

const { Text } = Typography

export type ExpenseCalendarProps = BusinessAppContextProps

export const ExpenseCalendar: React.FC<ExpenseCalendarProps> = props => {
  const { userInfo, accessToken } = props
  const userLocale = getCurrentActiveUserLocale()

  const managerId = userInfo?.employeeDetails?.employeeId || userInfo?.id || ''

  const { allTeamMembers, loadingTeamMembers, teamMembersError } = useTeamMembersByManager({ managerId, accessToken })

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
