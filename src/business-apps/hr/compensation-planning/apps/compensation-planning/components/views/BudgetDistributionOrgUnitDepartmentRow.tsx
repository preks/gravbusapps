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

type BudgetDistributionTranslate = (key: string, args?: Record<string, string | number>) => string

export interface BudgetDistributionOrgUnitDepartmentRowProps {
  unit: CompanyOrganizationalUnit
  isCustom: boolean
  isSalaryCostMethod: boolean
  isPerformanceMethod: boolean
  amount: number
  distributionPool: number | null
  poolRemainingSequential: number | null
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
  poolRemainingSequential,
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
          : 'gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3 gba:px-4 gba:py-3'
      }
      data-testid={`budget-distribution-department-row-${unit.id}`}
    >
      <div className={isCustom ? 'gba:min-w-0' : 'gba:min-w-0 gba:flex-1'}>
        <div className="gba:font-medium gba:text-foreground">{unit.name}</div>
        <div
          className="gba:mt-0.5 gba:text-sm gba:text-muted-foreground"
          data-testid={`budget-distribution-department-employees-${unit.id}`}
        >
          {t('budget-distribution-org-unit-employee-count', { count: headcount })}
        </div>
        {isSalaryCostMethod && !isCustom ? (
          <div
            className="gba:mt-0.5 gba:text-sm gba:text-muted-foreground"
            data-testid={`budget-distribution-department-salary-cost-${unit.id}`}
          >
            {t('budget-distribution-salary-cost-row-detail', {
              salary: formatCurrency(unitSalaryCost, currencyCode),
              share: formatShareOfTotalSalary(unitSalaryCost, totalSalaryCostAcrossOrgUnits)
            })}
          </div>
        ) : null}
        {isPerformanceMethod && !isCustom ? (
          <div
            className="gba:mt-0.5 gba:text-sm gba:text-muted-foreground"
            data-testid={`budget-distribution-department-performance-${unit.id}`}
          >
            {t('budget-distribution-performance-row-detail', {
              sum: formatPerformanceScoreSum(unitPerformanceSum),
              share: formatShareOfTotalSalary(unitPerformanceSum, grandTotalPerformanceScore)
            })}
          </div>
        ) : null}
      </div>
      {isCustom ? (
        <BudgetDistributionCustomOrgUnitInputs
          orgUnitId={unit.id}
          currencyCode={currencyCode}
          amount={amount}
          distributionPool={distributionPool}
          poolRemainingSequential={poolRemainingSequential}
          customBudget={customBudget}
          onAmountRawChange={onCustomAmountRawChange}
          onPercentRawChange={onCustomPercentRawChange}
          onModeChange={onCustomModeChange}
          t={t}
        />
      ) : (
        <span className="gba:flex gba:shrink-0 gba:flex-wrap gba:items-baseline gba:justify-end gba:gap-x-2 gba:text-right">
          <span
            className="gba:tabular-nums gba:text-foreground"
            data-testid={`budget-distribution-allocation-${unit.id}`}
          >
            {formatCurrency(amount, currencyCode)}
          </span>
          {typeof poolPercentPoints === 'string' ? (
            <span
              className="gba:text-sm gba:tabular-nums gba:text-muted-foreground"
              data-testid={`budget-distribution-allocation-pool-percent-${unit.id}`}
            >
              {t('budget-distribution-allocation-pool-percent', {
                percent: poolPercentPoints
              })}
            </span>
          ) : null}
        </span>
      )}
    </li>
  )
}
