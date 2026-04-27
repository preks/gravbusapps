import React from 'react'
import { Alert, AlertDescription } from '@newwork/nw-design-system'
import { formatCurrency } from '@/common/utils/numberFormatter'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import {
  BUDGET_DISTRIBUTION_STANDARD_ROW_GRID_CLASS,
  MANAGER_TEAM_DISTRIBUTION_PERFORMANCE_ROW_GRID_CLASS
} from '../../compensation-planning/components/views/budgetDistributionDepartmentGrid'
import type {
  CustomBudgetInputMode,
  OrgUnitCustomBudgetInput
} from '../../compensation-planning/components/views/budgetDistributionCustomTypes'
import { BudgetDistributionDepartmentsPagination } from '../../compensation-planning/components/views/BudgetDistributionDepartmentsPagination'
import { TeamCompensationEmployeeDistributionMemberRow } from './TeamCompensationEmployeeDistributionMemberRow'

type TranslateBudget = (id: string, args?: Record<string, string | number>) => string

export interface TeamCompensationDistributionListPagedTableProps {
  show: boolean
  isCustom: boolean
  isSalaryCostMethod: boolean
  isPerformanceMethod: boolean
  currencyCode: string
  totalSalaryCostAcrossEmployees: number
  grandTotalPositivePerformanceScores: number
  distributionPool: number | null
  poolForCustomContext: number | null
  totalCustomAllocated: number
  customPoolUnallocatedGlobal: number | null
  pagedMembers: TeamMemberCompensationData[]
  showPagination: boolean
  pageIndex: number
  totalPages: number
  goPrev: () => void
  goNext: () => void
  allocationByEmployeeId: ReadonlyMap<string, number>
  customBudgetByEmployeeId: Record<string, OrgUnitCustomBudgetInput>
  onCustomAmountRawChange: (employeeId: string, value: string) => void
  onCustomPercentRawChange: (employeeId: string, value: string) => void
  onCustomModeChange: (employeeId: string, mode: CustomBudgetInputMode) => void
  tBudget: TranslateBudget
  inputsDisabled: boolean
}

export function TeamCompensationDistributionListPagedTable({
  show,
  isCustom,
  isSalaryCostMethod,
  isPerformanceMethod,
  currencyCode,
  totalSalaryCostAcrossEmployees,
  grandTotalPositivePerformanceScores,
  distributionPool,
  poolForCustomContext,
  totalCustomAllocated,
  customPoolUnallocatedGlobal,
  pagedMembers,
  showPagination,
  pageIndex,
  totalPages,
  goPrev,
  goNext,
  allocationByEmployeeId,
  customBudgetByEmployeeId,
  onCustomAmountRawChange,
  onCustomPercentRawChange,
  onCustomModeChange,
  tBudget,
  inputsDisabled
}: Readonly<TeamCompensationDistributionListPagedTableProps>) {
  if (!show) {
    return null
  }

  const standardHeaderGridClass =
    isPerformanceMethod && !isCustom
      ? MANAGER_TEAM_DISTRIBUTION_PERFORMANCE_ROW_GRID_CLASS
      : BUDGET_DISTRIBUTION_STANDARD_ROW_GRID_CLASS

  return (
    <>
      <div
        className="gba:min-w-0 gba:overflow-x-auto gba:rounded-md gba:border gba:border-border"
        data-testid="manager-team-distribution-table-scroll"
      >
        <ul className="gba:min-w-[28rem] gba:divide-y gba:divide-border">
          {isCustom ? null : (
            <li
              className={`${standardHeaderGridClass} gba:sticky gba:top-0 gba:z-10 gba:border-b gba:border-border gba:bg-background/95 gba:px-4 gba:py-2 gba:backdrop-blur-sm gba:text-xs gba:font-medium gba:text-muted-foreground`}
              data-testid="manager-team-distribution-standard-column-headers"
            >
              <span>{tBudget('manager-team-distribution-col-employee')}</span>
              {isPerformanceMethod ? (
                <span className="gba:text-right">{tBudget('manager-team-distribution-col-overall-score')}</span>
              ) : null}
              <span className="gba:text-right">{tBudget('budget-distribution-col-allocation')}</span>
              <span className="gba:text-right">{tBudget('budget-distribution-col-pool-share')}</span>
            </li>
          )}
          {isCustom ? (
            <li
              className="gba:grid gba:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gba:items-center gba:gap-x-4 gba:border-b gba:border-border gba:bg-muted/40 gba:px-4 gba:py-2 gba:text-xs gba:font-medium gba:text-muted-foreground"
              data-testid="manager-team-distribution-custom-column-headers"
            >
              <span>{tBudget('manager-team-distribution-col-employee')}</span>
              <span>{tBudget('budget-distribution-custom-column-amount')}</span>
              <span>{tBudget('budget-distribution-custom-column-details')}</span>
            </li>
          ) : null}
          {pagedMembers.map(member => (
            <TeamCompensationEmployeeDistributionMemberRow
              key={member.employeeId}
              member={member}
              isCustom={isCustom}
              isSalaryCostMethod={isSalaryCostMethod}
              isPerformanceMethod={isPerformanceMethod}
              currencyCode={currencyCode}
              amount={allocationByEmployeeId.get(member.employeeId) ?? 0}
              distributionPool={distributionPool}
              totalSalaryCostAcrossEmployees={totalSalaryCostAcrossEmployees}
              grandTotalPositivePerformanceScores={grandTotalPositivePerformanceScores}
              customPoolUnallocatedGlobal={customPoolUnallocatedGlobal}
              customBudgetByEmployeeId={customBudgetByEmployeeId}
              onCustomAmountRawChange={onCustomAmountRawChange}
              onCustomPercentRawChange={onCustomPercentRawChange}
              onCustomModeChange={onCustomModeChange}
              tBudget={tBudget}
              inputsDisabled={inputsDisabled}
            />
          ))}
        </ul>
      </div>
      {showPagination ? (
        <BudgetDistributionDepartmentsPagination
          pageIndex={pageIndex}
          totalPages={totalPages}
          onPrev={goPrev}
          onNext={goNext}
          t={tBudget as (key: string, args?: Record<string, unknown>) => string}
        />
      ) : null}
      {isCustom && poolForCustomContext != null && totalCustomAllocated > poolForCustomContext + 0.01 ? (
        <div className="gba:pt-2" data-testid="manager-team-distribution-custom-exceeds">
          <Alert data-testid="manager-team-distribution-custom-exceeds-pool-alert">
            <AlertDescription>
              {tBudget('budget-distribution-custom-exceeds-pool', {
                total: formatCurrency(totalCustomAllocated, currencyCode),
                pool: formatCurrency(poolForCustomContext, currencyCode),
                diff: formatCurrency(totalCustomAllocated - poolForCustomContext, currencyCode)
              })}
            </AlertDescription>
          </Alert>
        </div>
      ) : null}
    </>
  )
}
