import { formatCurrency } from '@/common/utils/numberFormatter'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import {
  MANAGER_TEAM_DISTRIBUTION_PERFORMANCE_ROW_GRID_CLASS,
  MANAGER_TEAM_DISTRIBUTION_STANDARD_ROW_GRID_CLASS
} from '../../planning/components/views/budgetDistributionDepartmentGrid'
import { BudgetDistributionCustomOrgUnitInputs } from '../../planning/components/views/BudgetDistributionCustomOrgUnitInputs'
import type {
  CustomBudgetInputMode,
  OrgUnitCustomBudgetInput
} from '../../planning/components/views/budgetDistributionCustomTypes'
import { CompaRatioBar } from './CompaRatioBar'
import { formatPercentOfPool, formatPerformanceScoreValue, formatShareOfTotal } from './managerTeamDistributionFormat'

type TranslateBudget = (id: string, args?: Record<string, string | number>) => string

function managerTeamMemberRowGridClass(isCustom: boolean, showPerformanceScoreColumn: boolean): string {
  if (isCustom) {
    return 'gba:grid gba:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gba:items-start gba:gap-x-4 gba:gap-y-2 gba:px-4 gba:py-3'
  }
  if (showPerformanceScoreColumn) {
    return `${MANAGER_TEAM_DISTRIBUTION_PERFORMANCE_ROW_GRID_CLASS} gba:px-4 gba:py-3`
  }
  return `${MANAGER_TEAM_DISTRIBUTION_STANDARD_ROW_GRID_CLASS} gba:px-4 gba:py-3`
}

function managerTeamOverallScorePrimary(
  hasResolvedPerformanceScore: boolean,
  performanceSumDisplay: string,
  performanceRatingScaleMax: number | null | undefined,
  tBudget: TranslateBudget
): string {
  if (hasResolvedPerformanceScore && performanceRatingScaleMax != null) {
    return tBudget('manager-team-distribution-overall-score-out-of', {
      score: performanceSumDisplay,
      max: String(performanceRatingScaleMax)
    })
  }
  return performanceSumDisplay
}

export interface TeamCompensationEmployeeDistributionMemberRowProps {
  member: TeamMemberCompensationData
  isCustom: boolean
  isSalaryCostMethod: boolean
  isPerformanceMethod: boolean
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

  const hasResolvedPerformanceScore =
    member.performanceOverallScore != null && Number.isFinite(member.performanceOverallScore)
  const performanceSumDisplay = hasResolvedPerformanceScore
    ? formatPerformanceScoreValue(member.performanceOverallScore as number)
    : '—'
  const performanceShareDisplay =
    hasResolvedPerformanceScore && grandTotalPositivePerformanceScores > 0
      ? formatShareOfTotal(Math.max(0, member.performanceOverallScore as number), grandTotalPositivePerformanceScores)
      : '—'

  const showPerformanceScoreColumn = isPerformanceMethod && !isCustom
  const rowGridClass = managerTeamMemberRowGridClass(isCustom, showPerformanceScoreColumn)

  const overallScorePrimary = managerTeamOverallScorePrimary(
    hasResolvedPerformanceScore,
    performanceSumDisplay,
    member.performanceRatingScaleMax,
    tBudget
  )

  return (
    <li className={rowGridClass} data-testid={`manager-team-distribution-row-${member.employeeId}`}>
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
      </div>
      {!isCustom ? (
        <div className="gba:min-w-0" data-testid={`manager-team-distribution-compensation-band-${member.employeeId}`}>
          <CompaRatioBar
            band={member.compensationBand}
            currentSalary={member.currentAnnualSalary}
            currencyCode={currencyCode}
          />
        </div>
      ) : null}
      {showPerformanceScoreColumn ? (
        <div
          className="gba:pt-0.5 gba:text-right"
          data-testid={`manager-team-distribution-performance-${member.employeeId}`}
        >
          <div className="gba:tabular-nums gba:font-medium gba:text-foreground">{overallScorePrimary}</div>
          {hasResolvedPerformanceScore && performanceShareDisplay !== '—' ? (
            <div className="gba:mt-0.5 gba:text-xs gba:tabular-nums gba:text-muted-foreground">
              {tBudget('manager-team-distribution-performance-weight-fraction', {
                share: performanceShareDisplay
              })}
            </div>
          ) : null}
        </div>
      ) : null}
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
          showGlobalPoolRemainingInDetails={false}
          useRemainingPoolForPercentSemantics
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
