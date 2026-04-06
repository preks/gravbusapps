import React from 'react'
import { formatCurrency } from '@/common/utils/numberFormatter'
import type { CompanyOrganizationalUnit } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import type { CustomBudgetInputMode, OrgUnitCustomBudgetInput } from './budgetDistributionCustomTypes'
import { BudgetDistributionCustomOrgUnitInputs } from './BudgetDistributionCustomOrgUnitInputs'
import {
  formatPercentOfPool,
  formatPerformanceScoreSum,
  formatShareOfTotalSalary
} from './budgetDistributionOrgUnitListFormatters'
import { BUDGET_DISTRIBUTION_STANDARD_ROW_GRID_CLASS } from './budgetDistributionDepartmentGrid'

type BudgetDistributionTranslate = (key: string, args?: Record<string, string | number>) => string

export interface BudgetDistributionOrgUnitDepartmentRowProps {
  unit: CompanyOrganizationalUnit
  isCustom: boolean
  isSalaryCostMethod: boolean
  isPerformanceMethod: boolean
  amount: number
  distributionPool: number | null
  customPoolUnallocatedGlobal: number | null
  headcount: number
  unitSalaryCost: number
  unitPerformanceSum: number
  totalSalaryCostAcrossOrgUnits: number
  grandTotalPerformanceScore: number
  currencyCode: string
  customBudget: OrgUnitCustomBudgetInput | undefined
  onCustomAmountRawChange: (orgUnitId: string, value: string) => void
  onCustomPercentRawChange: (orgUnitId: string, value: string) => void
  onCustomModeChange: (orgUnitId: string, mode: CustomBudgetInputMode) => void
  t: BudgetDistributionTranslate
}

export function BudgetDistributionOrgUnitDepartmentRow({
  unit,
  isCustom,
  isSalaryCostMethod,
  isPerformanceMethod,
  amount,
  distributionPool,
  customPoolUnallocatedGlobal,
  headcount,
  unitSalaryCost,
  unitPerformanceSum,
  totalSalaryCostAcrossOrgUnits,
  grandTotalPerformanceScore,
  currencyCode,
  customBudget,
  onCustomAmountRawChange,
  onCustomPercentRawChange,
  onCustomModeChange,
  t
}: Readonly<BudgetDistributionOrgUnitDepartmentRowProps>) {
  const poolPercentPoints = formatPercentOfPool(amount, distributionPool)

  return (
    <li
      className={
        isCustom
          ? 'gba:grid gba:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gba:items-start gba:gap-x-4 gba:gap-y-2 gba:px-4 gba:py-3'
          : `${BUDGET_DISTRIBUTION_STANDARD_ROW_GRID_CLASS} gba:px-4 gba:py-3`
      }
      data-testid={`budget-distribution-department-row-${unit.id}`}
    >
      <div className="gba:min-w-0">
        <div className="gba:truncate gba:font-medium gba:text-foreground" title={unit.name}>
          {unit.name}
        </div>
        <p
          className="gba:mt-1 gba:text-xs gba:leading-snug gba:text-muted-foreground"
          data-testid={`budget-distribution-department-employees-${unit.id}`}
        >
          {t('budget-distribution-org-unit-employee-count', { count: headcount })}
        </p>
        {isSalaryCostMethod && !isCustom ? (
          <p
            className="gba:mt-1 gba:text-xs gba:leading-snug gba:text-muted-foreground"
            data-testid={`budget-distribution-department-salary-cost-${unit.id}`}
          >
            {t('budget-distribution-salary-cost-row-detail', {
              salary: formatCurrency(unitSalaryCost, currencyCode),
              share: formatShareOfTotalSalary(unitSalaryCost, totalSalaryCostAcrossOrgUnits)
            })}
          </p>
        ) : null}
        {isPerformanceMethod && !isCustom ? (
          <p
            className="gba:mt-1 gba:text-xs gba:leading-snug gba:text-muted-foreground"
            data-testid={`budget-distribution-department-performance-${unit.id}`}
          >
            {t('budget-distribution-performance-row-detail', {
              sum: formatPerformanceScoreSum(unitPerformanceSum),
              share: formatShareOfTotalSalary(unitPerformanceSum, grandTotalPerformanceScore)
            })}
          </p>
        ) : null}
      </div>
      {isCustom ? (
        <BudgetDistributionCustomOrgUnitInputs
          orgUnitId={unit.id}
          currencyCode={currencyCode}
          amount={amount}
          distributionPool={distributionPool}
          customPoolUnallocatedGlobal={customPoolUnallocatedGlobal}
          customBudget={customBudget}
          onAmountRawChange={onCustomAmountRawChange}
          onPercentRawChange={onCustomPercentRawChange}
          onModeChange={onCustomModeChange}
          t={t}
        />
      ) : (
        <>
          <div
            className="gba:pt-0.5 gba:text-right gba:tabular-nums gba:font-medium gba:text-foreground"
            data-testid={`budget-distribution-allocation-${unit.id}`}
          >
            {formatCurrency(amount, currencyCode)}
          </div>
          <div
            className="gba:pt-0.5 gba:text-right gba:tabular-nums gba:text-sm gba:text-muted-foreground"
            data-testid={`budget-distribution-allocation-pool-percent-${unit.id}`}
          >
            {typeof poolPercentPoints === 'string' ? `${poolPercentPoints}%` : '—'}
          </div>
        </>
      )}
    </li>
  )
}
