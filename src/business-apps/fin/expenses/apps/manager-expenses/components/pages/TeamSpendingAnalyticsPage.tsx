import React, { useMemo, useState, useEffect } from 'react'
import { useCurrencyStore } from '../../store/useCurrencyStore'
import { standardizeCurrencyRef } from '../../utils/currencyUtils'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Spinner,
  Alert,
  AlertDescription,
  PageLayout,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Label,
  Separator
} from '@newwork/nw-design-system'
import { ArrowLeftIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTeamSpendingAnalytics, DateRangeOption } from '../../hooks/useTeamSpendingAnalytics'
import { LineChartComponent, PieChartComponent, BarChartComponent } from '../modals/charts'
import StatusLegend from '../StatusLegend'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  formatCurrencyDisplay,
  getExpenseRequestStatusDisplay,
  getAdvancePaymentStatusDisplay,
  getExpensePlanStatusDisplay
} from '../../utils'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import CurrencyFilter from '../../components/currency-filter'
import { useManagerExpensesOverview } from '../../hooks/useManagerExpensesOverview'

interface TeamSpendingAnalyticsPageProps extends BusinessAppContextProps {
  onNavigateBack: () => void
}

// Status type → design token CSS variable mapping for charts
// Recharts requires actual color values, so these will be resolved at runtime via resolveCssVar
const STATUS_COLOR_TOKEN_MAP: Record<string, string> = {
  // Base design system colors (using actual nw-design-system variables)
  success: 'var(--nw-success)', // green (gba:bg-success)
  warning: 'var(--nw-warning)', // amber (gba:bg-warning)
  info: 'var(--nw-info)', // blue (gba:bg-info)
  destructive: 'var(--nw-destructive)', // red (gba:bg-destructive)
  offline: 'var(--nw-muted)', // gray (gba:bg-offline)
  // Domain-specific aliases
  draft: 'var(--nw-muted)', // gray (gba:bg-muted)
  completed: 'var(--nw-success)', // green (same as success)
  waiting: 'var(--nw-info)', // blue (same as info)
  task: 'var(--nw-warning)', // amber (same as warning)
  error: 'var(--nw-destructive)', // red (same as destructive)
  preparing: 'var(--nw-muted)' // gray (same as draft)
}

// Helper function to resolve CSS variables to actual color values (client-side only)
// During SSR, returns the CSS variable as-is; client resolves it after hydration
const resolveCssVar = (color: string): string => {
  if (!color?.startsWith('var(')) return color

  // During SSR, return the CSS variable as-is (client will resolve after hydration)
  if (
    globalThis.window === undefined ||
    globalThis.document === undefined ||
    globalThis.window.getComputedStyle === undefined
  ) {
    return color
  }

  // Client-side: resolve CSS variable from computed styles
  const varName = color.substring(4, color.length - 1).trim()
  const value = globalThis.window.getComputedStyle(globalThis.document.documentElement).getPropertyValue(varName).trim()
  return value || color
}

const resolveStatusColor = (type: string | undefined, fallbackColor: string): string => {
  const key = String(type || 'draft').toLowerCase()
  const token = STATUS_COLOR_TOKEN_MAP[key]
  return token ? resolveCssVar(token) : fallbackColor
}

const TeamSpendingAnalyticsPage: React.FC<TeamSpendingAnalyticsPageProps> = ({ accessToken, userInfo }) => {
  // colors resolved within StatusLegend component
  // Use the global currency store
  const { primaryCurrency } = useCurrencyStore()
  const [activeTab, setActiveTab] = React.useState<string>('expense-items')

  // Initialize currency to primaryCurrency - will be updated once data loads
  const [currencyFilter, setCurrencyFilter] = useState<string | null>(primaryCurrency || null)

  // Create a standardized currency reference for GraphQL queries
  const standardizedCurrencyRef = useMemo(() => {
    return currencyFilter ? standardizeCurrencyRef(currencyFilter) : null
  }, [currencyFilter])

  // Use the team spending analytics hook
  const {
    isLoading,
    error,
    data,
    dateRange,
    setDateRange,
    locationFilters,
    toggleLocationFilter,
    searchTerm,
    setSearchTerm,
    departmentFilters,
    toggleDepartmentFilter,
    departmentSearchTerm,
    setDepartmentSearchTerm,
    availableCurrencies
  } = useTeamSpendingAnalytics(
    accessToken,
    userInfo?.employeeDetails?.employeeId || '00000000-0000-0000-0000-000000000000',
    standardizedCurrencyRef // Use standardized currency reference instead of raw currencyFilter
  )

  // Consolidated overview (runs alongside analytics to avoid breaking charts)
  const overview = useManagerExpensesOverview(
    { accessToken, userInfo },
    {
      managerId: userInfo?.employeeDetails?.employeeId || '',
      currencyRef: standardizedCurrencyRef || undefined,
      searchTerm: undefined
    }
  )

  // Prefer overview currencies when available, otherwise fallback to analytics-derived ones
  const currenciesFromOverview = React.useMemo(() => {
    const refs = overview.data?.distinctCurrencies || []
    return refs.map(r => (r?.includes(':') ? r.split(':').pop() || r : r))
  }, [overview.data?.distinctCurrencies])

  const mergedCurrencies = React.useMemo(() => {
    // availableCurrencies is already sorted by usage (most used first)
    // Just merge and deduplicate, preserving the usage-based order from availableCurrencies
    const merged = [...availableCurrencies]
    for (const curr of currenciesFromOverview) {
      if (curr && !merged.includes(curr)) {
        merged.push(curr)
      }
    }
    return merged.filter(Boolean)
  }, [currenciesFromOverview, availableCurrencies])

  // Use the expense group catalog hook to get category names
  // catalog names are resolved in hook; no need to load here

  // If primary currency is not in list, fall back once when options load (no refetch churn)
  useEffect(() => {
    if (!currencyFilter && availableCurrencies.length > 0 && !isLoading) {
      const fallback = availableCurrencies[0]
      setCurrencyFilter(fallback || null)
    }
  }, [availableCurrencies, currencyFilter, isLoading])

  // Transform expense items by category data to use actual category names
  const expenseItemsByCategoryWithNames = useMemo(() => {
    if (!data?.expenseItemsByCategory) return []
    // Names are now computed in the hook using catalog display
    return data.expenseItemsByCategory as any
  }, [data?.expenseItemsByCategory])

  // Handle date range change
  const handleDateRangeChange = (value: string) => {
    setDateRange(value as DateRangeOption)
  }

  // Create widgets for summary statistics (use formatCurrencyDisplay for locale-aware formatting)
  const kpiCurrencyCode = (currencyFilter || primaryCurrency || 'EUR').split(':').pop() || 'EUR'
  const formatKpiAmount = (amount: number | null | undefined): string => {
    return formatCurrencyDisplay(amount, kpiCurrencyCode)
  }

  // Create widgets for summary statistics
  const widgets: WidgetItem[] = [
    {
      key: 'total-expense-items',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.total_expense_items',
        'Total Expense Items'
      ),
      value: formatKpiAmount(data?.totalExpenseAmount),
      color: 'var(--nw-primary)',
      valueIsString: true,
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.individual_expense_transactions',
        'Individual expense transactions'
      )
    },
    {
      key: 'total-expense-requests',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.total_expense_requests',
        'Total Expense Requests'
      ),
      value: formatKpiAmount(data?.totalRequestAmount),
      color: 'var(--nw-success)',
      valueIsString: true,
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.submitted_expense_requests',
        'Submitted expense requests'
      )
    },
    {
      key: 'total-expense-plans',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.total_expense_plans',
        'Total Expense Plans'
      ),
      value: formatKpiAmount(data?.totalPlanAmount),
      color: 'var(--nw-accent)',
      valueIsString: true,
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.planned_expense_budgets',
        'Planned expense budgets'
      )
    },
    {
      key: 'total-advance-payments',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.advance_payments_tab.total_advance_payments',
        'Total Advance Payments'
      ),
      value: formatKpiAmount(data?.totalAdvanceAmount),
      color: 'var(--nw-warning)',
      valueIsString: true,
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.advance_payments_to_employees',
        'Advance payments to employees'
      )
    }
  ]

  const renderExpenseItemsTab = () => (
    <div className="gba:flex gba:flex-col gba:gap-6">
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card data-testid="team-analytics-expense-items-monthly-chart-card">
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.monthly_expense_items',
                'Monthly Expense Items'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartComponent
              data={data?.expenseItemsByMonth || []}
              title=""
              lineColor="var(--nw-chart-1)"
              currency={currencyFilter || primaryCurrency}
              dataTestId="team-analytics-expense-items-monthly-chart"
            />
          </CardContent>
        </Card>
      </div>

      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card data-testid="team-analytics-expense-items-status-chart-card">
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.expense_items_by_status',
                'Expense Items by Status'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartComponent
              data={
                data?.expenseItemsByStatus?.map(item => ({
                  name: getExpenseRequestStatusDisplay(item.status).label,
                  value: item.count,
                  status: item.status
                })) ?? []
              }
              title=""
              barColor="var(--nw-chart-1)"
              valueType="count"
              countLabel={getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.items', 'items')}
              getColor={entry => {
                const code = entry.status || entry.name
                const config = getExpenseRequestStatusDisplay(code)
                const type = config?.type || 'draft'
                return resolveStatusColor(type, 'var(--nw-chart-1)')
              }}
              dataTestId="team-analytics-expense-items-status-chart"
            />
            <StatusLegend id="expense-items-by-status" />
          </CardContent>
        </Card>

        {/* Move category chart under the status chart and make it full width on large screens */}
        <div className="lg:gba:col-span-2">
          <Card data-testid="team-analytics-expense-items-category-chart-card">
            <CardHeader>
              <CardTitle>
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:team_expenses_page.dashboard_tab.expense_items_by_category',
                  'Expense Items by Category'
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PieChartComponent
                data={expenseItemsByCategoryWithNames}
                title=""
                currency={currencyFilter || primaryCurrency}
                colors={[
                  'var(--nw-chart-1)',
                  'var(--nw-chart-2)',
                  'var(--nw-chart-3)',
                  'var(--nw-chart-4)',
                  'var(--nw-chart-5)',
                  'var(--nw-chart-6)'
                ]}
                dataTestId="team-analytics-expense-items-category-chart"
              />
            </CardContent>
          </Card>
        </div>

        <Card data-testid="team-analytics-expense-items-summary-card">
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.summary_statistics',
                'Summary Statistics'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              <div className="gba:text-center">
                <div
                  className="gba:text-3xl gba:font-bold gba:text-primary"
                  data-testid="team-analytics-expense-items-total-count"
                >
                  {data?.expenseItemsByStatus?.reduce((sum, item) => sum + item.count, 0) || 0}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:team_expenses_page.dashboard_tab.total_expense_items',
                    'Total Items'
                  )}
                </div>
              </div>
              <Separator />
              <div className="gba:text-center">
                <div
                  className="gba:text-2xl gba:font-bold gba:text-primary"
                  data-testid="team-analytics-expense-items-total-amount"
                >
                  {formatKpiAmount(
                    Number((data?.totalExpenseAmount ?? 0).toFixed?.(2) ?? data?.totalExpenseAmount ?? 0)
                  )}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_request_list.expense_plan_table.total_amount',
                    'Total Amount'
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderExpenseRequestsTab = () => (
    <div className="gba:flex gba:flex-col gba:gap-6">
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card data-testid="team-analytics-expense-requests-monthly-chart-card">
          <CardHeader className="gba:bg-muted">
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.monthly_expense_requests',
                'Monthly Expense Requests'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartComponent
              data={data?.expenseRequestsByMonth || []}
              title=""
              lineColor="var(--nw-chart-2)"
              currency={currencyFilter || primaryCurrency}
              dataTestId="team-analytics-expense-requests-monthly-chart"
            />
          </CardContent>
        </Card>

        <Card data-testid="team-analytics-expense-requests-status-counts-chart-card">
          <CardHeader className="gba:bg-muted">
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.expense_requests_by_status',
                'Expense Requests by Status'
              )}{' '}
              ({getTranslationFromI18nKeyAndLabel('lowcoder:common.counts', 'Counts')})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartComponent
              data={
                data?.expenseRequestsByStatus?.map(item => ({
                  name: getExpenseRequestStatusDisplay(item.status).label,
                  value: item.count,
                  status: item.status
                })) ?? []
              }
              title=""
              barColor="var(--nw-chart-2)"
              valueType="count"
              countLabel={getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.requests',
                'Requests'
              )}
              getColor={entry => {
                const code = entry.status || entry.name
                const config = getExpenseRequestStatusDisplay(code)
                const type = config?.type || 'draft'
                return resolveStatusColor(type, 'var(--nw-chart-2)')
              }}
              dataTestId="team-analytics-expense-requests-status-counts-chart"
            />
            <StatusLegend id="expense-requests-by-status-counts" />
          </CardContent>
        </Card>
      </div>

      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card data-testid="team-analytics-expense-requests-status-amounts-chart-card">
          <CardHeader className="gba:bg-muted">
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.expense_requests_by_status',
                'Expense Requests by Status'
              )}{' '}
              ({getTranslationFromI18nKeyAndLabel('lowcoder:common.amounts', 'Amounts')})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartComponent
              data={
                data?.expenseRequestsByStatus?.map(item => ({
                  name: getExpenseRequestStatusDisplay(item.status).label,
                  value: item.amount ?? 0,
                  status: item.status
                })) ?? []
              }
              title=""
              currency={currencyFilter || primaryCurrency}
              colors={[
                'var(--nw-chart-2)',
                'var(--nw-chart-1)',
                'var(--nw-chart-3)',
                'var(--nw-chart-4)',
                'var(--nw-chart-5)'
              ]}
              getColor={entry => {
                const code = entry.status || entry.name
                const config = getExpenseRequestStatusDisplay(code)
                const type = config?.type || 'draft'
                return resolveStatusColor(type, 'var(--nw-chart-2)')
              }}
              dataTestId="team-analytics-expense-requests-status-amounts-chart"
            />
            <StatusLegend id="expense-requests-by-status-amounts" />
          </CardContent>
        </Card>

        <Card data-testid="team-analytics-expense-requests-summary-card">
          <CardHeader className="gba:bg-muted">
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.summary_statistics',
                'Summary Statistics'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              <div className="gba:text-center">
                <div
                  className="gba:text-3xl gba:font-bold gba:text-primary"
                  data-testid="team-analytics-expense-requests-total-count"
                >
                  {data?.expenseRequestsByStatus?.reduce((sum, item) => sum + item.count, 0) || 0}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:team_expenses_page.dashboard_tab.total_expense_requests',
                    'Total Requests'
                  )}
                </div>
              </div>
              <Separator />
              <div className="gba:text-center">
                <div
                  className="gba:text-2xl gba:font-bold gba:text-success"
                  data-testid="team-analytics-expense-requests-total-amount"
                >
                  {formatKpiAmount(
                    Number((data?.totalRequestAmount ?? 0).toFixed?.(2) ?? data?.totalRequestAmount ?? 0)
                  )}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:team_expenses_page.dashboard_tab.total_amount',
                    'Total Amount'
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderExpensePlansTab = () => (
    <div className="gba:flex gba:flex-col gba:gap-6">
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card data-testid="team-analytics-expense-plans-monthly-chart-card">
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.monthly_expense_plans',
                'Monthly Expense Plans'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartComponent
              data={data?.expensePlansByMonth || []}
              title=""
              lineColor="var(--nw-chart-3)"
              currency={currencyFilter || primaryCurrency}
              dataTestId="team-analytics-expense-plans-monthly-chart"
            />
          </CardContent>
        </Card>

        <Card data-testid="team-analytics-expense-plans-status-counts-chart-card">
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.expense_plans_by_status',
                'Expense Plans by Status'
              )}{' '}
              {`(${getTranslationFromI18nKeyAndLabel('lowcoder:common.counts', 'Counts')})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartComponent
              data={
                data?.expensePlansByStatus?.map(item => ({
                  name: getExpensePlanStatusDisplay(item.status).label,
                  value: item.count,
                  status: item.status
                })) ?? []
              }
              title=""
              barColor="var(--nw-chart-3)"
              valueType="count"
              countLabel={getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.plans', 'Plans')}
              getColor={entry => {
                const code = entry.status || entry.name
                const config = getExpensePlanStatusDisplay(code)
                const type = config?.type || 'draft'
                return resolveStatusColor(type, 'var(--nw-chart-3)')
              }}
              dataTestId="team-analytics-expense-plans-status-counts-chart"
            />
            <StatusLegend id="expense-plans-by-status-counts" />
          </CardContent>
        </Card>
      </div>

      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card data-testid="team-analytics-expense-plans-status-amounts-chart-card">
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.expense_plans_by_status',
                'Expense Plans by Status'
              )}{' '}
              {`(${getTranslationFromI18nKeyAndLabel('lowcoder:common.amounts', 'Amounts')})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartComponent
              data={
                data?.expensePlansByStatus?.map(item => ({
                  name: getExpensePlanStatusDisplay(item.status).label,
                  value: item.amount ?? 0,
                  status: item.status
                })) ?? []
              }
              title=""
              currency={currencyFilter || primaryCurrency}
              colors={[
                'var(--nw-chart-3)',
                'var(--nw-chart-2)',
                'var(--nw-chart-1)',
                'var(--nw-chart-4)',
                'var(--nw-chart-5)'
              ]}
              getColor={entry => {
                const code = entry.status || entry.name
                const config = getExpensePlanStatusDisplay(code)
                const type = config?.type || 'draft'
                return resolveStatusColor(type, 'var(--nw-chart-3)')
              }}
              dataTestId="team-analytics-expense-plans-status-amounts-chart"
            />
            <StatusLegend id="expense-plans-by-status-amounts" />
          </CardContent>
        </Card>

        <Card data-testid="team-analytics-expense-plans-summary-card">
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.summary_statistics',
                'Summary Statistics'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              <div className="gba:text-center">
                <div
                  className="gba:text-3xl gba:font-bold gba:text-primary"
                  data-testid="team-analytics-expense-plans-total-count"
                >
                  {data?.expensePlansByStatus?.reduce((sum, item) => sum + item.count, 0) || 0}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:team_expenses_page.dashboard_tab.total_expense_plans',
                    'Total Plans'
                  )}
                </div>
              </div>
              <Separator />
              <div className="gba:text-center">
                <div
                  className="gba:text-2xl gba:font-bold gba:text-warning"
                  data-testid="team-analytics-expense-plans-total-amount"
                >
                  {formatKpiAmount(Number((data?.totalPlanAmount ?? 0).toFixed?.(2) ?? data?.totalPlanAmount ?? 0))}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:team_expenses_page.dashboard_tab.total_amount',
                    'Total Amount'
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderAdvancePaymentsTab = () => (
    <div className="gba:flex gba:flex-col gba:gap-6">
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card data-testid="team-analytics-advance-payments-monthly-chart-card">
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.monthly_advance_payments',
                'Monthly Advance Payments'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartComponent
              data={data?.advancePaymentsByMonth || []}
              title=""
              lineColor="var(--nw-chart-5)"
              currency={currencyFilter || primaryCurrency}
              dataTestId="team-analytics-advance-payments-monthly-chart"
            />
          </CardContent>
        </Card>

        <Card data-testid="team-analytics-advance-payments-status-counts-chart-card">
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.advance_payments_by_status',
                'Advance Payments by Status'
              )}{' '}
              {`(${getTranslationFromI18nKeyAndLabel('lowcoder:common.counts', 'Counts')})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartComponent
              data={
                data?.advancePaymentsByStatus?.map((item: any) => ({
                  name: getAdvancePaymentStatusDisplay(item.status).label,
                  value: item.count ?? 0,
                  status: item.status
                })) ?? []
              }
              title=""
              barColor="var(--nw-chart-5)"
              valueType="count"
              countLabel={getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.payments',
                'Payments'
              )}
              getColor={entry => {
                const code = entry.status || entry.name
                const config = getAdvancePaymentStatusDisplay(code)
                const type = config?.type || 'draft'
                return resolveStatusColor(type, 'var(--nw-chart-5)')
              }}
              dataTestId="team-analytics-advance-payments-status-counts-chart"
            />
            <StatusLegend id="advance-payments-by-status-counts" />
          </CardContent>
        </Card>
      </div>

      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card data-testid="team-analytics-advance-payments-status-amounts-chart-card">
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.advance_payments_by_status',
                'Advance Payments by Status'
              )}{' '}
              {`(${getTranslationFromI18nKeyAndLabel('lowcoder:common.amounts', 'Amounts')})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartComponent
              data={
                data?.advancePaymentsByStatus?.map((item: any) => ({
                  name: getAdvancePaymentStatusDisplay(item.status).label,
                  value: item.amount ?? 0,
                  status: item.status
                })) ?? []
              }
              title=""
              colors={[
                'var(--nw-chart-1)',
                'var(--nw-chart-2)',
                'var(--nw-chart-3)',
                'var(--nw-chart-4)',
                'var(--nw-chart-5)'
              ]}
              currency={currencyFilter || primaryCurrency}
              getColor={entry => {
                const code = entry.status || entry.name
                const config = getAdvancePaymentStatusDisplay(code)
                const type = config?.type || 'draft'
                return resolveStatusColor(type, 'var(--nw-chart-1)')
              }}
              dataTestId="team-analytics-advance-payments-status-amounts-chart"
            />
            <StatusLegend id="advance-payments-by-status-amounts" />
          </CardContent>
        </Card>

        <Card data-testid="team-analytics-advance-payments-summary-card">
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.summary_statistics',
                'Summary Statistics'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              <div className="gba:text-center">
                <div
                  className="gba:text-3xl gba:font-bold gba:text-primary"
                  data-testid="team-analytics-advance-payments-total-count"
                >
                  {data?.advancePaymentsByStatus?.reduce((sum, item) => sum + item.count, 0) || 0}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:team_expenses_page.advance_payments_tab.total_advance_payments',
                    'Total Payments'
                  )}
                </div>
              </div>
              <Separator />
              <div className="gba:text-center">
                <div
                  className="gba:text-2xl gba:font-bold gba:text-info"
                  data-testid="team-analytics-advance-payments-total-amount"
                >
                  {formatKpiAmount(
                    Number((data?.totalAdvanceAmount ?? 0).toFixed?.(2) ?? data?.totalAdvanceAmount ?? 0)
                  )}
                </div>
                <div className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:team_expenses_page.dashboard_tab.total_amount',
                    'Total Amount'
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
  const teamAnalyticsTabs = [
    {
      value: 'expense-items',
      triggerTestId: 'team-analytics-tab-expense-items',
      contentTestId: 'team-analytics-tab-content-expense-items',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_items', 'Expense Items'),
      render: renderExpenseItemsTab
    },
    {
      value: 'expense-requests',
      triggerTestId: 'team-analytics-tab-expense-requests',
      contentTestId: 'team-analytics-tab-content-expense-requests',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_list.flows_button.expense_requests',
        'Expense Requests'
      ),
      render: renderExpenseRequestsTab
    },
    {
      value: 'expense-plans',
      triggerTestId: 'team-analytics-tab-expense-plans',
      contentTestId: 'team-analytics-tab-content-expense-plans',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.expense_plans',
        'Expense Plans'
      ),
      render: renderExpensePlansTab
    },
    {
      value: 'advance-payments',
      triggerTestId: 'team-analytics-tab-advance-payments',
      contentTestId: 'team-analytics-tab-content-advance-payments',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:backoffice_expense_landing_page.advance_title',
        'Advance Payments'
      ),
      render: renderAdvancePaymentsTab
    }
  ]
  const renderTabContent = (tabValue: string, renderTab: () => React.ReactNode) => {
    if (isLoading) {
      return (
        <div className="gba:flex gba:justify-center gba:p-8">
          <Spinner data-testid="loading-spinner" />
        </div>
      )
    }
    if (activeTab !== tabValue) {
      return null
    }
    return renderTab()
  }

  const renderFilters = () => (
    <Card className="gba:sticky gba:top-6" data-testid="team-analytics-filters-card">
      <CardHeader className="gba:pb-4">
        <CardTitle className="gba:text-lg gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:team_expenses_page.dashboard_tab.filters_settings',
            'Filters & Settings'
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-8">
        {/* Date Range Filter */}
        <div className="gba:space-y-4">
          <Label className="gba:text-sm gba:font-semibold gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.date_range', 'Date Range')}
          </Label>
          <RadioGroup
            value={dateRange}
            onValueChange={handleDateRangeChange}
            className="gba:space-y-3"
            data-testid="team-analytics-date-range-filter"
          >
            <div className="gba:flex gba:items-center gba:space-x-3 gba:py-1">
              <RadioGroupItem
                value={DateRangeOption.LAST_30_DAYS}
                id="last-30-days"
                data-testid="team-analytics-date-range-30-days"
              />
              <Label htmlFor="last-30-days" className="gba:text-sm gba:leading-relaxed gba:cursor-pointer">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:team_expenses_page.dashboard_tab.last_30_days',
                  'Last 30 Days'
                )}
              </Label>
            </div>
            <div className="gba:flex gba:items-center gba:space-x-3 gba:py-1">
              <RadioGroupItem
                value={DateRangeOption.LAST_90_DAYS}
                id="last-90-days"
                data-testid="team-analytics-date-range-90-days"
              />
              <Label htmlFor="last-90-days" className="gba:text-sm gba:leading-relaxed gba:cursor-pointer">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:team_expenses_page.dashboard_tab.last_90_days',
                  'Last 90 Days'
                )}
              </Label>
            </div>
            <div className="gba:flex gba:items-center gba:space-x-3 gba:py-1">
              <RadioGroupItem
                value={DateRangeOption.CURRENT_YEAR}
                id="current-year"
                data-testid="team-analytics-date-range-current-year"
              />
              <Label htmlFor="current-year" className="gba:text-sm gba:leading-relaxed gba:cursor-pointer">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:team_expenses_page.dashboard_tab.current_year',
                  'Current Year'
                )}
              </Label>
            </div>
            {/* Custom range option removed */}
          </RadioGroup>
        </div>

        <Separator className="gba:my-6" />

        {/* Location Filters */}
        <div className="gba:space-y-4">
          <Label className="gba:text-sm gba:font-semibold gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:team_expenses_page.dashboard_tab.location_filters',
              'Location Filters'
            )}
          </Label>
          <div className="gba:relative">
            <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:text-muted-foreground gba:w-4 gba:h-4 gba:pointer-events-none" />
            <DebouncedInput
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.search_locations',
                'Search locations...'
              )}
              value={searchTerm}
              onChange={val => setSearchTerm(val)}
              className="gba:pl-10 gba:h-10 gba:text-sm gba:border-input"
              data-testid="team-analytics-location-search-input"
            />
          </div>
          <div
            className="gba:space-y-3 gba:max-h-40 gba:overflow-y-auto gba:pr-2"
            data-testid="team-analytics-location-filters-list"
          >
            {locationFilters.map(location => (
              <div
                key={location.id}
                className="gba:flex gba:items-center gba:space-x-3 gba:py-1 gba:rounded-md gba:hover:bg-accent/50 gba:px-2 gba:-mx-2 gba:transition-colors"
              >
                <Checkbox
                  id={location.id}
                  checked={location.selected}
                  onCheckedChange={() => toggleLocationFilter(location.id)}
                  data-testid={`team-analytics-location-checkbox-${location.id}`}
                />
                <Label htmlFor={location.id} className="gba:text-sm gba:leading-relaxed gba:cursor-pointer gba:flex-1">
                  {location.name}
                </Label>
              </div>
            ))}
            {locationFilters.length === 0 && (
              <div
                className="gba:text-sm gba:text-muted-foreground gba:italic gba:py-2"
                data-testid="team-analytics-location-filters-empty"
              >
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:team_expenses_page.dashboard_tab.no_locations_available',
                  'No locations available'
                )}
              </div>
            )}
          </div>
        </div>

        <Separator className="gba:my-6" />

        {/* Currency Filter */}
        <div className="gba:space-y-4">
          <Label className="gba:text-sm gba:font-semibold gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.currency', 'Currency')}
          </Label>
          <CurrencyFilter
            data-testid="team-analytics-currency-filter"
            value={currencyFilter}
            onChange={setCurrencyFilter}
            currencies={mergedCurrencies}
            showAllOption={false}
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.currency_placeholder',
              'Select Currency'
            )}
            isLoading={isLoading || overview.isLoading}
          />
        </div>

        <Separator className="gba:my-6" />

        {/* Department Filters */}
        <div className="gba:space-y-4">
          <Label className="gba:text-sm gba:font-semibold gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:team_expenses_page.dashboard_tab.department_filters',
              'Department Filters'
            )}
          </Label>
          <div className="gba:relative">
            <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:text-muted-foreground gba:w-4 gba:h-4 gba:pointer-events-none" />
            <DebouncedInput
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.search_departments',
                'Search departments...'
              )}
              value={departmentSearchTerm}
              onChange={val => setDepartmentSearchTerm(val)}
              className="gba:pl-10 gba:h-10 gba:text-sm gba:border-input"
              data-testid="team-analytics-department-search-input"
            />
          </div>
          <div
            className="gba:space-y-3 gba:max-h-40 gba:overflow-y-auto gba:pr-2"
            data-testid="team-analytics-department-filters-list"
          >
            {departmentFilters.map(department => (
              <div
                key={department.id}
                className="gba:flex gba:items-center gba:space-x-3 gba:py-1 gba:rounded-md gba:hover:bg-accent/50 gba:px-2 gba:-mx-2 gba:transition-colors"
              >
                <Checkbox
                  id={department.id}
                  checked={department.selected}
                  onCheckedChange={() => toggleDepartmentFilter(department.id)}
                  data-testid={`team-analytics-department-checkbox-${department.id}`}
                />
                <Label
                  htmlFor={department.id}
                  className="gba:text-sm gba:leading-relaxed gba:cursor-pointer gba:flex-1"
                >
                  {department.name}
                </Label>
              </div>
            ))}
            {departmentFilters.length === 0 && (
              <div
                className="gba:text-sm gba:text-muted-foreground gba:italic gba:py-2"
                data-testid="team-analytics-department-filters-empty"
              >
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:team_expenses_page.dashboard_tab.no_departments_found',
                  'No departments found'
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div data-testid="team-spending-analytics-page-container">
      {/* Back Button Above Everything */}
      <div className="gba:px-6 gba:pt-6 gba:pb-0">
        <button
          onClick={onNavigateBack}
          className="gba:flex gba:items-center gba:text-primary gba:hover:text-primary/80 gba:transition-colors"
          data-testid="team-spending-analytics-back-button"
        >
          <ArrowLeftIcon className="gba:mr-2" />
          <span>
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:team_expenses_page.dashboard_tab.back_to_btn',
              'Back to Dashboard'
            )}
          </span>
        </button>
      </div>
      <PageLayout
        headerTitle={getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.team_spending_analysis',
          'Team Spending Analysis'
        )}
        headerDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.team_spending_analytics_description',
          'Comprehensive analysis of team spending patterns, trends, and budget allocations across all expense categories'
        )}
        className="gba:min-h-screen"
      >
        {/* Layout with consistent sidebar spacing */}
        <div className="gba:flex gba:gap-6">
          {/* Left Sidebar - Filters */}
          <div className="gba:w-80 gba:flex-shrink-0">{renderFilters()}</div>

          {/* Main Content Area */}
          <div className="gba:flex-1 gba:space-y-6">
            {/* Summary Statistics */}
            <WidgetGroup
              widgets={widgets}
              isLoading={isLoading}
              error={error || null}
              onRetry={() => globalThis.location?.reload?.()}
              skeletonCount={4}
              emptyText={getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.no_analytics_data',
                'No analytics data available.'
              )}
              data-testid="team-spending-analytics-statistics"
            />
            <div className="gba:mt-2 gba:text-sm gba:text-muted-foreground" data-testid="team-analytics-bucketing-note">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.bucketing_note',
                'Note: Trip items are attributed to the month of the trip start date; expenses-type items use their own expense date.'
              )}
            </div>

            {/* Tabs */}
            {error ? (
              <Alert data-testid="team-spending-analytics-error-alert">
                <AlertDescription>
                  <strong>{getTranslationFromI18nKeyAndLabel('lowcoder:common.error_title', 'Error')}</strong> {error}
                </AlertDescription>
              </Alert>
            ) : (
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="gba:w-full"
                data-testid="team-analytics-tabs"
              >
                <TabsList className="gba:grid gba:w-full gba:grid-cols-4" data-testid="team-analytics-tabs-list">
                  {teamAnalyticsTabs.map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value} data-testid={tab.triggerTestId}>
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {teamAnalyticsTabs.map(tab => (
                  <TabsContent
                    key={tab.value}
                    value={tab.value}
                    className="gba:space-y-6 gba:mt-6"
                    data-testid={tab.contentTestId}
                  >
                    {renderTabContent(tab.value, tab.render)}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
        </div>
      </PageLayout>
    </div>
  )
}

export default TeamSpendingAnalyticsPage
