import React, { useMemo } from 'react'
import { Button, Card, CardContent, CardTitle } from '@newwork/nw-design-system'
import { ArrowLeftIcon, ChartLineUpIcon, CurrencyCircleDollarIcon, UsersIcon } from '@phosphor-icons/react'
import type {
  CompensationBudgetPlanCompanyRow,
  CompensationBudgetPlanListItem
} from '../../hooks/useBudgetSetupForCompany'
import { formatCurrencyCell } from './budgetSetupPlanTableRows'
import { formatDateOrDash, formatCurrencyRefForDisplay } from '../../utils/displayFormatUtils'
import { BudgetPlanStatusBadge } from '../shared/BudgetPlanStatusBadge'
import type { BudgetPlanStatusApi } from '../../../../types/budgetPlanGraphqlEnums'

interface BudgetSetupCycleOverviewProps {
  selectedPlan: CompensationBudgetPlanListItem
  companyRows: CompensationBudgetPlanCompanyRow[]
  fallbackCurrencyCode: string
  onBackToCycles: () => void
  t: (key: string, args?: Record<string, string | number>) => string
}

interface CycleKpiCardProps {
  label: string
  value: React.ReactNode
  description: string
  icon: React.ReactNode
}

function CycleKpiCard({ label, value, description, icon }: Readonly<CycleKpiCardProps>) {
  return (
    <Card className="gba:border-0 gba:bg-muted gba:shadow-none">
      <CardContent className="gba:p-6">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
          <p className="gba:text-sm gba:text-muted-foreground">{label}</p>
          <span className="gba:text-muted-foreground" aria-hidden>
            {icon}
          </span>
        </div>
        <p className="gba:mt-6 gba:text-3xl gba:font-bold gba:tabular-nums gba:text-foreground">{value}</p>
        <p className="gba:mt-2 gba:text-sm gba:text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function getDisplayCurrency(rows: CompensationBudgetPlanCompanyRow[], fallbackCurrencyCode: string): string {
  return formatCurrencyRefForDisplay(rows.find(row => row.currencyRef?.trim())?.currencyRef) || fallbackCurrencyCode
}

function getDistinctDisplayCurrencies(
  rows: CompensationBudgetPlanCompanyRow[],
  fallbackCurrencyCode: string
): string[] {
  const currencies = new Set<string>()
  for (const row of rows) {
    currencies.add(formatCurrencyRefForDisplay(row.currencyRef) || fallbackCurrencyCode)
  }
  return [...currencies]
}

function formatCurrencyTotalsByCurrency(
  rows: CompensationBudgetPlanCompanyRow[],
  fallbackCurrencyCode: string,
  pickAmount: (row: CompensationBudgetPlanCompanyRow) => number
): string[] {
  const totalsByCurrency = new Map<string, number>()
  for (const row of rows) {
    const currency = formatCurrencyRefForDisplay(row.currencyRef) || fallbackCurrencyCode
    totalsByCurrency.set(currency, (totalsByCurrency.get(currency) ?? 0) + pickAmount(row))
  }
  return [...totalsByCurrency.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, total]) => formatCurrencyCell(total, currency))
}

function CurrencyTotalsValue({ values }: Readonly<{ values: string[] }>) {
  return (
    <span className="gba:block gba:space-y-1">
      {values.map(value => (
        <span key={value} className="gba:block">
          {value}
        </span>
      ))}
    </span>
  )
}

export function BudgetSetupCycleOverview({
  selectedPlan,
  companyRows,
  fallbackCurrencyCode,
  onBackToCycles,
  t
}: Readonly<BudgetSetupCycleOverviewProps>) {
  const displayCurrency = useMemo(
    () => getDisplayCurrency(companyRows, fallbackCurrencyCode),
    [companyRows, fallbackCurrencyCode]
  )
  const displayCurrencies = useMemo(
    () => getDistinctDisplayCurrencies(companyRows, fallbackCurrencyCode),
    [companyRows, fallbackCurrencyCode]
  )
  const hasMixedCurrencies = displayCurrencies.length > 1

  const totals = useMemo(
    () =>
      companyRows.reduce(
        (acc, row) => ({
          companyCount: acc.companyCount + 1,
          currentSalaryCost: acc.currentSalaryCost + row.currentTotalSalaryCost,
          salaryBudget: acc.salaryBudget + row.salaryBudgetAmount
        }),
        {
          companyCount: 0,
          currentSalaryCost: 0,
          salaryBudget: 0
        }
      ),
    [companyRows]
  )

  const currentSalaryCostValue = hasMixedCurrencies ? (
    <CurrencyTotalsValue
      values={formatCurrencyTotalsByCurrency(companyRows, fallbackCurrencyCode, row => row.currentTotalSalaryCost)}
    />
  ) : (
    formatCurrencyCell(totals.currentSalaryCost, displayCurrency)
  )
  const salaryBudgetValue = hasMixedCurrencies ? (
    <CurrencyTotalsValue
      values={formatCurrencyTotalsByCurrency(companyRows, fallbackCurrencyCode, row => row.salaryBudgetAmount)}
    />
  ) : (
    formatCurrencyCell(totals.salaryBudget, displayCurrency)
  )
  const currentSalaryCostDescription = hasMixedCurrencies
    ? t('budget-setup-cycle-mixed-currencies-desc')
    : t('budget-setup-cycle-current-salary-cost-desc')
  const salaryBudgetDescription = hasMixedCurrencies
    ? t('budget-setup-cycle-mixed-currencies-desc')
    : t('budget-setup-cycle-total-salary-budget-desc')

  return (
    <div className="gba:space-y-4" data-testid="budget-setup-cycle-overview">
      <Button
        type="button"
        variant="ghost"
        className="gba:gap-2"
        onClick={onBackToCycles}
        data-testid="budget-setup-back-to-cycles"
      >
        <ArrowLeftIcon className="gba:size-4" aria-hidden />
        {t('budget-setup-back-to-cycles')}
      </Button>

      <Card className="gba:border-0 gba:bg-muted gba:shadow-none" data-testid="budget-setup-cycle-details-card">
        <CardContent className="gba:p-6">
          <CardTitle className="gba:text-base gba:font-semibold">{t('budget-setup-plan-section-title')}</CardTitle>
          <dl className="gba:mt-6 gba:grid gba:grid-cols-1 gba:gap-x-8 gba:gap-y-5 gba:sm:grid-cols-2 gba:lg:grid-cols-5">
            <div className="gba:min-w-0">
              <dt className="gba:text-xs gba:text-muted-foreground">{t('budget-setup-field-plan-name')}</dt>
              <dd className="gba:mt-1 gba:text-sm gba:font-semibold gba:text-foreground">{selectedPlan.name}</dd>
            </div>
            <div className="gba:min-w-0">
              <dt className="gba:text-xs gba:text-muted-foreground">{t('budget-setup-field-plan-status')}</dt>
              <dd className="gba:mt-1">
                <BudgetPlanStatusBadge status={selectedPlan.budgetPlanStatus as BudgetPlanStatusApi} />
              </dd>
            </div>
            <div className="gba:min-w-0">
              <dt className="gba:text-xs gba:text-muted-foreground">{t('budget-setup-field-planning-start')}</dt>
              <dd className="gba:mt-1 gba:text-sm gba:font-semibold gba:tabular-nums gba:text-foreground">
                {formatDateOrDash(selectedPlan.startDate)}
              </dd>
            </div>
            <div className="gba:min-w-0">
              <dt className="gba:text-xs gba:text-muted-foreground">{t('budget-setup-field-planning-end')}</dt>
              <dd className="gba:mt-1 gba:text-sm gba:font-semibold gba:tabular-nums gba:text-foreground">
                {formatDateOrDash(selectedPlan.endDate)}
              </dd>
            </div>
            <div className="gba:min-w-0">
              <dt className="gba:text-xs gba:text-muted-foreground">{t('budget-setup-field-effective-date')}</dt>
              <dd className="gba:mt-1 gba:text-sm gba:font-semibold gba:tabular-nums gba:text-foreground">
                {formatDateOrDash(selectedPlan.effectiveDate)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:md:grid-cols-3">
        <CycleKpiCard
          label={t('budget-setup-cycle-companies-in-scope')}
          value={totals.companyCount}
          description={t('budget-setup-cycle-companies-in-scope-desc')}
          icon={<UsersIcon className="gba:h-5 gba:w-5" />}
        />
        <CycleKpiCard
          label={t('budget-setup-cycle-current-salary-cost')}
          value={currentSalaryCostValue}
          description={currentSalaryCostDescription}
          icon={<CurrencyCircleDollarIcon className="gba:h-5 gba:w-5" />}
        />
        <CycleKpiCard
          label={t('budget-setup-cycle-total-salary-budget')}
          value={salaryBudgetValue}
          description={salaryBudgetDescription}
          icon={<ChartLineUpIcon className="gba:h-5 gba:w-5" />}
        />
      </div>
    </div>
  )
}
