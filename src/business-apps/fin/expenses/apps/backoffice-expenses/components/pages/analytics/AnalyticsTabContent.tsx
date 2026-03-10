import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Separator, Spinner } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { LineChartComponent, PieChartComponent } from '../../../../manager-expenses/components/modals/charts'
import { formatCurrency } from '../../../utils/currencyUtils'

const PIE_CHART_COLORS = ['var(--nw-chart-1)', 'var(--nw-chart-2)', 'var(--nw-chart-3)', 'var(--nw-chart-4)']

interface AnalyticsData {
  expenseItemsByMonth?: any[]
  expenseItemsByCategory?: any[]
  expenseItemsByStatus?: Array<{ count: number }>
  totalExpenseAmount?: number | null
  expenseRequestsByMonth?: any[]
  expenseRequestsByStatus?: Array<{ count: number }>
  totalRequestAmount?: number | null
  travelByDestinationPoint?: Array<{ location?: string; amount?: number }>
  expensePlansByMonth?: any[]
  expensePlansByStatus?: Array<{ count: number }>
  totalPlanAmount?: number | null
  advancePaymentsByMonth?: any[]
  advancePaymentsByStatus?: Array<{ count: number }>
  totalAdvanceAmount?: number | null
}

interface AnalyticsTabContentProps {
  readonly activeTab: string
  readonly data: AnalyticsData | null
  readonly isLoading: boolean
  readonly isChartTabReady: boolean
  readonly hasContentSpace: boolean
  readonly currency: string | null
  readonly primaryCurrency: string
  readonly kpiCurrencyCode: string
  readonly expenseItemsByCategoryWithNames: Array<{ name: string; value: number }>
  readonly travelByDestinationPointChartData: Array<{ name: string; value: number }>
}

const formatKpiAmount = (amount: number | null | undefined, currencyCode: string): string =>
  formatCurrency(Number(amount ?? 0), currencyCode, 2)

const SummaryStatisticsCard: React.FC<{
  readonly cardTestId: string
  readonly countTestId: string
  readonly amountTestId: string
  readonly totalCount: number
  readonly totalAmount: number
  readonly countLabelKey: string
  readonly countLabelFallback: string
  readonly amountClassName: string
  readonly kpiCurrencyCode: string
}> = ({
  cardTestId,
  countTestId,
  amountTestId,
  totalCount,
  totalAmount,
  countLabelKey,
  countLabelFallback,
  amountClassName,
  kpiCurrencyCode
}) => (
  <Card data-testid={cardTestId}>
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
          <div className="gba:text-3xl gba:font-bold gba:text-primary" data-testid={countTestId}>
            {totalCount}
          </div>
          <div className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(countLabelKey, countLabelFallback)}
          </div>
        </div>
        <Separator />
        <div className="gba:text-center">
          <div className={amountClassName} data-testid={amountTestId}>
            {formatKpiAmount(Number((totalAmount ?? 0).toFixed?.(2) ?? totalAmount ?? 0), kpiCurrencyCode)}
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
)

const buildSummaryConfig = (
  idPrefix: string,
  statuses: Array<{ count: number }>,
  totalAmount: number,
  countLabelKey: string,
  countLabelFallback: string,
  amountClassName: string
) => ({
  cardTestId: `backoffice-analytics-${idPrefix}-summary-card`,
  countTestId: `backoffice-analytics-${idPrefix}-total-count`,
  amountTestId: `backoffice-analytics-${idPrefix}-total-amount`,
  totalCount: statuses.reduce((sum, item) => sum + item.count, 0),
  totalAmount,
  countLabelKey,
  countLabelFallback,
  amountClassName
})

const AnalyticsTabContent: React.FC<AnalyticsTabContentProps> = ({
  activeTab,
  data,
  isLoading,
  isChartTabReady,
  hasContentSpace,
  currency,
  primaryCurrency,
  kpiCurrencyCode,
  expenseItemsByCategoryWithNames,
  travelByDestinationPointChartData
}) => {
  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:p-8">
        <Spinner data-testid="backoffice-loading-spinner" />
      </div>
    )
  }
  if (!hasContentSpace) {
    return <div className="gba:min-h-[320px]" data-testid="backoffice-analytics-measuring-container" />
  }
  if (!isChartTabReady) {
    return <div className="gba:min-h-[320px]" data-testid="backoffice-analytics-chart-stabilizing" />
  }

  const chartCurrency = currency || primaryCurrency
  const renderGrid = (columnsClass: string, chartCards: React.ReactNode[], summaryProps: any) => (
    <div className="gba:flex gba:flex-col gba:gap-6">
      <div className={`gba:grid gba:grid-cols-1 ${columnsClass} gba:gap-6`}>
        {chartCards}
        <SummaryStatisticsCard {...summaryProps} kpiCurrencyCode={kpiCurrencyCode} />
      </div>
    </div>
  )

  switch (activeTab) {
    case 'expense-items':
      return renderGrid(
        'lg:gba:grid-cols-2',
        [
          <Card key="monthly" data-testid="backoffice-analytics-expense-items-monthly-chart-card">
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
                currency={chartCurrency}
                dataTestId="backoffice-analytics-expense-items-monthly-chart"
              />
            </CardContent>
          </Card>,
          <Card key="category" data-testid="backoffice-analytics-expense-items-category-chart-card">
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
                currency={chartCurrency}
                colors={PIE_CHART_COLORS}
                dataTestId="backoffice-analytics-expense-items-category-chart"
              />
            </CardContent>
          </Card>
        ],
        buildSummaryConfig(
          'expense-items',
          data?.expenseItemsByStatus || [],
          data?.totalExpenseAmount ?? 0,
          'lowcoder:team_expenses_page.dashboard_tab.total_expense_items',
          'Total Items',
          'gba:text-2xl gba:font-bold gba:text-primary'
        )
      )

    case 'expense-requests':
      return renderGrid(
        'lg:gba:grid-cols-3',
        [
          <Card key="monthly" data-testid="backoffice-analytics-expense-requests-monthly-chart-card">
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
                currency={chartCurrency}
                dataTestId="backoffice-analytics-expense-requests-monthly-chart"
              />
            </CardContent>
          </Card>,
          <Card key="destination" data-testid="backoffice-analytics-expense-requests-by-destination-point-chart-card">
            <CardHeader className="gba:bg-muted">
              <CardTitle>
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:team_expenses_page.dashboard_tab.destination_spend_distribution',
                  'Destination Spend Distribution'
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PieChartComponent
                data={travelByDestinationPointChartData}
                title=""
                currency={chartCurrency}
                colors={PIE_CHART_COLORS}
                dataTestId="backoffice-analytics-expense-requests-destination-point-chart"
              />
            </CardContent>
          </Card>
        ],
        buildSummaryConfig(
          'expense-requests',
          data?.expenseRequestsByStatus || [],
          data?.totalRequestAmount ?? 0,
          'lowcoder:team_expenses_page.dashboard_tab.total_expense_requests',
          'Total Requests',
          'gba:text-2xl gba:font-bold gba:text-success'
        )
      )

    case 'expense-plans':
      return renderGrid(
        'lg:gba:grid-cols-2',
        [
          <Card key="monthly" data-testid="backoffice-analytics-expense-plans-monthly-chart-card">
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
                currency={chartCurrency}
                dataTestId="backoffice-analytics-expense-plans-monthly-chart"
              />
            </CardContent>
          </Card>
        ],
        buildSummaryConfig(
          'expense-plans',
          data?.expensePlansByStatus || [],
          data?.totalPlanAmount ?? 0,
          'lowcoder:team_expenses_page.dashboard_tab.total_expense_plans',
          'Total Plans',
          'gba:text-2xl gba:font-bold gba:text-warning'
        )
      )

    case 'advance-payments':
      return renderGrid(
        'lg:gba:grid-cols-2',
        [
          <Card key="monthly" data-testid="backoffice-analytics-advance-payments-monthly-chart-card">
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
                currency={chartCurrency}
                dataTestId="backoffice-analytics-advance-payments-monthly-chart"
              />
            </CardContent>
          </Card>
        ],
        buildSummaryConfig(
          'advance-payments',
          data?.advancePaymentsByStatus || [],
          data?.totalAdvanceAmount ?? 0,
          'lowcoder:team_expenses_page.advance_payments_tab.total_advance_payments',
          'Total Payments',
          'gba:text-2xl gba:font-bold gba:text-info'
        )
      )

    default:
      return null
  }
}

export default AnalyticsTabContent
