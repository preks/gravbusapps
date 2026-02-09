import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, IconAvatar } from '@newwork/nw-design-system'
import { PiListChecks, PiChartLineUp, PiFileText, PiCalendar, PiClockAfternoon } from 'react-icons/pi'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import { standardizeCurrencyRef } from '../../../utils/currencyUtils'
import { useCurrencyData } from '../../../hooks/useCurrencyData'
import { useManagerExpensesOverview } from '../../../hooks/useManagerExpensesOverview'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import CurrencyFilter from '../../../components/currency-filter'

import ExpenseTrendsChart from './components/ExpenseTrendsChart'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'
import { getExpenseRequestStatusDisplay, getNormalizedErrorMessage } from '../../../utils'

// Enable localized date formatting
dayjs.extend(localizedFormat)

export interface ExpenseDashboardTabProps extends BusinessAppContextProps {
  onNavigateToApprovals?: () => void
  onNavigateToReports?: () => void
  onNavigateToAnalytics?: () => void
  moduleColor?: string
}

// Define a type for recent requests if not already available from the hook
interface RecentRequestItem {
  id: string
  title: string
  totalAmount: number | string
  requestDate: string
  status: string
  employeeName: string
  currency?: string // Add currency field for display purposes
}

const getErrorMessage = getNormalizedErrorMessage

const ExpenseDashboardTab: React.FC<ExpenseDashboardTabProps> = props => {
  const { moduleColor } = props
  // Get manager ID from props
  const managerId = props.userInfo?.employeeDetails?.employeeId || props.userInfo?.id || ''
  const accessToken = props.accessToken || ''

  // Fetch dashboard-specific currency data
  const {
    availableCurrencies,
    mostUsedCurrency,
    isLoading: currenciesLoading
  } = useCurrencyData(accessToken, managerId)

  // Local currency state for dashboard (independent from other pages)
  const [dashboardCurrency, setDashboardCurrency] = useState<string>('')

  // Initialize dashboard currency with most used currency
  useEffect(() => {
    if (!dashboardCurrency && mostUsedCurrency) {
      setDashboardCurrency(mostUsedCurrency)
    }
  }, [mostUsedCurrency, dashboardCurrency])

  // Stabilize CurrencyFilter onChange handler
  const handleCurrencyChange = useCallback(
    (value: string | null) => {
      setDashboardCurrency(value || mostUsedCurrency || 'EUR')
    },
    [mostUsedCurrency]
  )

  // Windows for aggregates/trends (memoized so overview params stay stable)
  const { monthStart, monthEnd, yearStart } = useMemo(
    () => ({
      monthStart: dayjs().startOf('month').toISOString(),
      monthEnd: dayjs().add(1, 'month').startOf('month').toISOString(),
      yearStart: dayjs().startOf('year').toISOString()
    }),
    []
  )

  // Page currency: use dashboard's own currency selection (memoized to prevent unnecessary recalculations)
  const pageCurrency = useMemo(
    () => dashboardCurrency || mostUsedCurrency || 'EUR',
    [dashboardCurrency, mostUsedCurrency]
  )

  // Consolidated overview with dashboard's currency filter (memoized to prevent duplicate queries)
  const selectedCurrencyRef = useMemo(
    () => (pageCurrency ? standardizeCurrencyRef(pageCurrency) : undefined),
    [pageCurrency]
  )

  // Stable nested objects to prevent unnecessary re-renders
  const requestsParams = useMemo(() => ({ limit: 5, offset: 0 }), [])
  const plansParams = useMemo(() => ({ limit: 1, offset: 0 }), [])
  const paymentsParams = useMemo(() => ({ limit: 1, offset: 0 }), [])

  const overviewParams = useMemo(
    () => ({
      managerId,
      currencyRef: selectedCurrencyRef,
      searchTerm: undefined as string | undefined,
      requests: requestsParams,
      plans: plansParams,
      payments: paymentsParams,
      monthStart,
      monthEnd,
      yearStart
    }),
    [managerId, selectedCurrencyRef, requestsParams, plansParams, paymentsParams, monthStart, monthEnd, yearStart]
  )
  const overview = useManagerExpensesOverview(props, overviewParams)

  // Use the dashboard's currency for display
  const displayCurrency = pageCurrency

  // For chart display, use the same currency as display
  const chartCurrency = displayCurrency

  // Get user locale for date formatting (memoized once)
  const userLocale = useMemo(() => getCurrentActiveUserLocale(), [])

  // Stabilize WidgetGroup onRetry handler
  const handleRetry = useCallback(() => {
    globalThis.location?.reload?.()
  }, [])

  // Memoize chart data to prevent unnecessary re-renders
  const chartData = useMemo(() => overview.data?.monthlyExpenseTrends ?? [], [overview.data?.monthlyExpenseTrends])

  // Memoize chart title (translation is stable)
  const chartTitle = useMemo(
    () =>
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.monthly_expense_trends',
        'Monthly Expense Trends'
      ),
    []
  )

  // Quick actions data (memoized with stable nav callbacks)
  const quickActions = useMemo(
    () => [
      {
        key: 'approvals',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.review_approvals',
          'Approvals Review'
        ),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.review_pending_expense_approvals',
          'Review pending expense approvals.'
        ),
        icon: PiListChecks,
        onClick: props.onNavigateToApprovals,
        testId: 'review-approvals-action',
        iconColor: 'gba:text-primary'
      },
      {
        key: 'analysis',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.team_spending_analysis',
          'Team Spending Analysis'
        ),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.view_spending_trends_and_reports',
          'View spending trends and reports.'
        ),
        icon: PiChartLineUp,
        onClick: props.onNavigateToAnalytics,
        testId: 'team-spending-analysis-action',
        iconColor: 'gba:text-success'
      },
      {
        key: 'reports',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_request_list.modal_list_or_flow_button.absence_same_location_btn',
          'Expense Reports'
        ),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.generate_or_view_team_expense_reports',
          'Generate or view team expense reports.'
        ),
        icon: PiFileText,
        onClick: props.onNavigateToReports,
        testId: 'expense-reports-action',
        iconColor: 'gba:text-accent'
      }
    ],
    [props.onNavigateToApprovals, props.onNavigateToReports, props.onNavigateToAnalytics]
  )

  // Transform dashboard data into widgets format (memoized depending on overview data and display currency)
  const widgets: WidgetItem[] = useMemo(() => {
    // Compute pending sum only when overview data changes
    const pendingApprovalsCount = (() => {
      const pendingRequestsCount = overview.data?.pendingRequestsAll ?? 0
      const pendingPlansCount = overview.data?.pendingPlansAll ?? 0
      const pendingPaymentsCount = overview.data?.pendingPaymentsAll ?? 0
      return pendingRequestsCount + pendingPlansCount + pendingPaymentsCount
    })()

    return [
      {
        key: 'team-members',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.team_members',
          'Team Members'
        ),
        value: overview.data?.teamMembersCount ?? 0,
        prefix: <PiListChecks />,
        color: 'var(--nw-primary)',

        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.total_team_members',
          'Total team members'
        )
      },
      {
        key: 'pending-approvals',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.pending_approvals',
          'Pending Approvals'
        ),
        // Unfiltered: sum pending across requests, plans, and payments
        value: pendingApprovalsCount,
        prefix: <PiClockAfternoon />,
        color: 'var(--nw-warning)',

        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.pending_requests_plans_payments',
          'Requests, Plans and Advance Payments pending'
        )
      },
      {
        key: 'monthly-expenses',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.monthly_expenses',
          'Monthly Expenses'
        ),
        value: overview.data?.monthlyExpensesAmount
          ? formatCurrencyDisplay(overview.data.monthlyExpensesAmount, displayCurrency)
          : formatCurrencyDisplay(0, displayCurrency),
        prefix: (
          <span className="gba:font-medium" data-testid="dashboard-monthly-expenses-currency-code">
            {displayCurrency}
          </span>
        ),
        color: 'var(--nw-success)',
        valueIsString: true,

        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.current_month',
          'Current month'
        )
      },
      // Removed legacy dashboardData usage; keep placeholder with zero until categories are added to overview
      {
        key: 'expense-categories',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.expense_categories',
          'Expense Categories'
        ),
        value: 0,
        prefix: <PiCalendar />,
        color: 'var(--nw-accent)',
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.categories_used',
          'Categories used'
        )
      }
    ]
  }, [
    overview.data?.teamMembersCount,
    overview.data?.pendingRequestsAll,
    overview.data?.pendingPlansAll,
    overview.data?.pendingPaymentsAll,
    overview.data?.monthlyExpensesAmount,
    displayCurrency
  ])

  // Recent requests list (memoized - data only, no JSX)
  const recentRequestsForDisplay = useMemo(() => {
    if (!Array.isArray(overview.data?.expenseRequests) || overview.data.expenseRequests.length === 0) {
      return []
    }

    return overview.data.expenseRequests
      .filter((req: any) => {
        const code = req?.currencyRef ? String(req.currencyRef).split(':').pop() : undefined
        return !pageCurrency || code === pageCurrency
      })
      .slice(0, 5)
      .map(
        (req: any): RecentRequestItem => ({
          id: req.id,
          title: req.title,
          totalAmount: Number(req.totalAmount ?? 0),
          requestDate: req.requestDate || req.createdAt,
          status: req.status,
          employeeName: req.employee?.fullName || req.employee?.displayName || '',
          currency: req.currencyRef ? String(req.currencyRef).split(':').pop() : undefined
        })
      )
  }, [overview.data?.expenseRequests, pageCurrency])

  return (
    <div className="gba:h-full gba:flex gba:flex-col" data-testid="expense-dashboard-tab-container">
      {/* Currency Filter */}
      <div className="gba:flex gba:justify-start gba:mb-4" data-testid="expense-dashboard-currency-filter-container">
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-sm gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.currency_filter', 'Currency:')}
          </span>
          <CurrencyFilter
            value={pageCurrency}
            onChange={handleCurrencyChange}
            isLoading={currenciesLoading}
            currencies={availableCurrencies}
            showAllOption={false}
            data-testid="expense-dashboard-currency-select"
          />
        </div>
      </div>
      {/* Statistics Cards using WidgetGroup */}
      <div className="gba:mb-6">
        <WidgetGroup
          widgets={widgets}
          isLoading={overview.isLoading}
          error={overview.error ? getErrorMessage(overview.error) : null}
          onRetry={handleRetry}
          skeletonCount={4}
          emptyText={undefined}
          data-testid="expense-dashboard-statistics"
        />
      </div>

      {/* Main Content Area */}
      <div className="gba:flex-1 gba:space-y-6">
        {/* Quick Actions Section */}
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:mb-4">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:team_expenses_page.dashboard_tab.quick_actions',
              'Quick Actions'
            )}
          </h3>
          <div className="gba:grid gba:grid-cols-3 gba:gap-4">
            {quickActions.map(action => {
              return (
                <Card
                  key={action.key}
                  className="gba:cursor-pointer gba:transition-colors"
                  onClick={action.onClick}
                  data-testid={`quick-action-${action.key}`}
                >
                  <CardContent className="gba:p-6">
                    <div className="gba:flex gba:items-center gba:mb-3">
                      <IconAvatar
                        icon={action.icon as any}
                        className={`gba:text-2xl ${action.iconColor} gba:mr-3`}
                        variant="default"
                        size="md"
                        data-testid={`quick-action-icon-${action.key}`}
                      />
                      <h4 className="gba:text-base gba:font-semibold gba:m-0">{action.title}</h4>
                    </div>
                    <p className="gba:text-sm gba:text-muted-foreground gba:m-0">{action.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Recent Requests and Budget Status */}
        <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
          {/* Recent Expense Requests */}
          <Card data-testid="recent-expense-requests-card">
            <CardHeader>
              <CardTitle>
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:team_expenses_page.dashboard_tab.recent_expense_requests',
                  'Recent Expense Requests'
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentRequestsForDisplay.length > 0 ? (
                <div className="gba:space-y-4">
                  {recentRequestsForDisplay.map(request => (
                    <div
                      key={request.id}
                      className="gba:flex gba:justify-between gba:items-start gba:pb-4 gba:border-b gba:border-border gba:last:border-0"
                    >
                      <div className="gba:flex-1">
                        <p className="gba:font-medium gba:text-sm gba:mb-1">{request.title}</p>
                        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                          <p className="gba:text-sm gba:text-muted-foreground">{request.employeeName}</p>
                          <span className="gba:text-xs gba:px-2 gba:py-1 gba:rounded-full gba:bg-secondary gba:text-secondary-foreground">
                            {getExpenseRequestStatusDisplay(request.status).label}
                          </span>
                        </div>
                      </div>
                      <div className="gba:text-right gba:ml-4">
                        <p className="gba:font-medium gba:text-sm">
                          {typeof request.totalAmount === 'number'
                            ? formatCurrencyDisplay(request.totalAmount, request.currency || displayCurrency)
                            : formatCurrencyDisplay(request.totalAmount || 0, request.currency || displayCurrency)}
                        </p>
                        <p className="gba:text-sm gba:text-muted-foreground">
                          {request.requestDate && request.requestDate !== 'N/A'
                            ? dayjs(request.requestDate).locale(userLocale).format('L')
                            : getTranslationFromI18nKeyAndLabel('lowcoder:common.not_available', 'N/A')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="gba:py-8 gba:text-center">
                  <p className="gba:text-muted-foreground">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:team_expenses_page.dashboard_tab.no_recent_expense_requests',
                      'No recent expense requests'
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Budget Status */}
          <Card>
            <CardHeader>
              <CardTitle>
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:team_expenses_page.dashboard_tab.team_budget_status',
                  'Team Budget Status'
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:team_expenses_page.dashboard_tab.no_budget_data_available',
                  'No budget data available'
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Expense Trends Chart */}
        <div>
          <ExpenseTrendsChart
            data={chartData}
            title={chartTitle}
            currencyFilter={chartCurrency}
            moduleColor={moduleColor}
          />
        </div>
      </div>

      {/* Modals */}
    </div>
  )
}

export default ExpenseDashboardTab
