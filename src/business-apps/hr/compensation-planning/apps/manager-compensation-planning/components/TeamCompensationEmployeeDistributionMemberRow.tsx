import React from 'react'
import { formatCurrency } from '@/common/utils/numberFormatter'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import { BUDGET_DISTRIBUTION_STANDARD_ROW_GRID_CLASS } from '../../compensation-planning/components/views/budgetDistributionDepartmentGrid'
import { BudgetDistributionCustomOrgUnitInputs } from '../../compensation-planning/components/views/BudgetDistributionCustomOrgUnitInputs'
import type {
  CustomBudgetInputMode,
  OrgUnitCustomBudgetInput
} from '../../compensation-planning/components/views/budgetDistributionCustomTypes'
import { formatPercentOfPool, formatPerformanceScoreValue, formatShareOfTotal } from './managerTeamDistributionFormat'

type TranslateBudget = (id: string, args?: Record<string, string | number>) => string

export interface TeamCompensationEmployeeDistributionMemberRowProps {
  member: TeamMemberCompensationData
  isCustom: boolean
  isSalaryCostMethod: boolean
  isPerformanceMethod: boolean
  performanceFallbackToEqual: boolean
  currencyCode: string
  amount: number
  distributionPool: number | null
  totalSalaryCostAcrossEmployees: number
  grandTotalPositivePerformanceScores: number
  customPoolUnallocatedGlobal: number | null
  customBudgetByEmployeeId: Record<string, OrgUnitCustomBudgetInput>
  onCustomAmountRawChange: (employeeId: string, value: string) => void
  onCustomPercentRawChange: (employeeId: string, value: string) => void
  onCustomModeChange: (employeeId: string, mode: CustomBudgetInputMode) => void
  tBudget: TranslateBudget
  inputsDisabled: boolean
}

export function TeamCompensationEmployeeDistributionMemberRow({
  member,
  isCustom,
  isSalaryCostMethod,
  isPerformanceMethod,
  performanceFallbackToEqual,
  currencyCode,
  amount,
  distributionPool,
  totalSalaryCostAcrossEmployees,
  grandTotalPositivePerformanceScores,
  customPoolUnallocatedGlobal,
  customBudgetByEmployeeId,
  onCustomAmountRawChange,
  onCustomPercentRawChange,
  onCustomModeChange,
  tBudget,
  inputsDisabled
}: Readonly<TeamCompensationEmployeeDistributionMemberRowProps>) {
  const poolPercentPoints = formatPercentOfPool(amount, distributionPool)
  const annual = member.currentAnnualSalary ?? 0
  const score = member.performanceOverallScore ?? 0

  return (
    <li
      className={
        isCustom
          ? 'gba:grid gba:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gba:items-start gba:gap-x-4 gba:gap-y-2 gba:px-4 gba:py-3'
          : `${BUDGET_DISTRIBUTION_STANDARD_ROW_GRID_CLASS} gba:px-4 gba:py-3`
      }
      data-testid={`manager-team-distribution-row-${member.employeeId}`}
    >
      <div className="gba:min-w-0">
        <div className="gba:font-medium gba:text-foreground">{member.displayName}</div>
        {member.jobPosition ? (
          <div className="gba:mt-0.5 gba:text-sm gba:text-muted-foreground">{member.jobPosition}</div>
        ) : null}
        {isSalaryCostMethod && !isCustom ? (
          <div
            className="gba:mt-0.5 gba:text-sm gba:text-muted-foreground"
            data-testid={`manager-team-distribution-salary-${member.employeeId}`}
          >
            {tBudget('budget-distribution-salary-cost-row-detail', {
              salary: formatCurrency(annual, currencyCode),
              share: formatShareOfTotal(annual, totalSalaryCostAcrossEmployees)
            })}
          </div>
        ) : null}
        {isPerformanceMethod && !isCustom && !performanceFallbackToEqual ? (
          <div
            className="gba:mt-0.5 gba:text-sm gba:text-muted-foreground"
            data-testid={`manager-team-distribution-performance-${member.employeeId}`}
          >
            {tBudget('budget-distribution-performance-row-detail', {
              sum: formatPerformanceScoreValue(score),
              share: formatShareOfTotal(score, grandTotalPositivePerformanceScores)
            })}
          </div>
        ) : null}
      </div>
      {isCustom ? (
        <BudgetDistributionCustomOrgUnitInputs
          orgUnitId={member.employeeId}
          currencyCode={currencyCode}
          amount={amount}
          distributionPool={distributionPool}
          customPoolUnallocatedGlobal={customPoolUnallocatedGlobal}
          customBudget={customBudgetByEmployeeId[member.employeeId]}
          onAmountRawChange={onCustomAmountRawChange}
          onPercentRawChange={onCustomPercentRawChange}
          onModeChange={onCustomModeChange}
          t={tBudget}
          disabled={inputsDisabled}
        />
      ) : (
        <>
          <div
            className="gba:pt-0.5 gba:text-right gba:tabular-nums gba:font-medium gba:text-foreground"
            data-testid={`manager-team-distribution-allocation-${member.employeeId}`}
          >
            {formatCurrency(amount, currencyCode)}
          </div>
          <div
            className="gba:pt-0.5 gba:text-right gba:tabular-nums gba:text-sm gba:text-muted-foreground"
            data-testid={`manager-team-distribution-pool-percent-${member.employeeId}`}
          >
            {poolPercentPoints == null
              ? '—'
              : tBudget('budget-distribution-allocation-pool-percent', {
                  percent: poolPercentPoints
                })}
          </div>
        </>
      )}
    </li>
  )
}
