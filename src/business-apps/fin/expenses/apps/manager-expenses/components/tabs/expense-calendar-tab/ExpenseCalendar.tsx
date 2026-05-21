import React, { useMemo } from 'react'
import { Spinner, Alert, AlertDescription, Label, useTranslation } from '@newwork/nw-design-system'
import { CalendarTimeline } from '@newwork/gravity-ui-catalog'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useManagerExpensesOverview } from '../../../hooks/useManagerExpensesOverview'
import type { ExpenseTimelineEvent, ExpenseTimelineItem } from './expenseCalendarTypes'
import { useTeamMembersByManager } from './useTeamMembersByManager'
import { buildAllStatusesLegendItems, buildTimelineEvents, buildTimelineItems } from './expenseCalendarTimelineUtils'
import { useExpenseCalendarI18n } from './useExpenseCalendarI18n'
import translations from '../../../_i18n'
import './expense-calendar-tooltip.css'

// Step 5: Overview limits for calendar. Review with product; a lower cap (e.g. 500) can reduce payload if acceptable for UX.
const CALENDAR_OVERVIEW_REQUESTS_LIMIT = 1000
const CALENDAR_OVERVIEW_PLANS_LIMIT = 1000

export type ExpenseCalendarProps = BusinessAppContextProps

export const ExpenseCalendar: React.FC<ExpenseCalendarProps> = props => {
  const { userInfo, accessToken } = props
  const { t } = useTranslation(translations)
  const userLocale = useMemo(() => getCurrentActiveUserLocale(), [])
  useExpenseCalendarI18n(t, userLocale)

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
    return buildTimelineItems({ allTeamMembers, expensePlans, expenseRequests, t })
  }, [allTeamMembers, expensePlans, expenseRequests, t])

  const timelineEvents = useMemo((): ExpenseTimelineEvent[] => {
    return buildTimelineEvents({ expensePlans, expenseRequests, userLocale, t })
  }, [expensePlans, expenseRequests, userLocale, t])

  const legendItems = useMemo(() => {
    return buildAllStatusesLegendItems(t)
  }, [t])

  const renderDataBody = () => {
    if (overview.isLoading || loadingTeamMembers)
      return (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-full" data-testid="expense-calendar-loading">
          <Spinner size="lg" data-testid="expense-calendar-loading-spinner" />
        </div>
      )

    const errorMessages = []
    if (overview.error) errorMessages.push(`${t('expense-calendar-error-loading')} ${overview.error}`)
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
          title={t('team-expenses-tab-expense-calendar')}
          items={timelineItems}
          events={timelineEvents}
          itemLabel={t('expense-plans-column-employee')}
          itemDetailLabel={t('expense-plans-detail-department')}
          searchPlaceholder={t('expense-calendar-search-placeholder')}
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
