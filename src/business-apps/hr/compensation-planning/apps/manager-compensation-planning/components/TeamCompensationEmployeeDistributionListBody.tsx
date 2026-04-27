import React from 'react'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import type {
  CustomBudgetInputMode,
  OrgUnitCustomBudgetInput
} from '../../compensation-planning/components/views/budgetDistributionCustomTypes'
import { TeamCompensationDistributionListLoadingAndErrors } from './TeamCompensationDistributionListLoadingAndErrors'
import { TeamCompensationDistributionListMethodAlerts } from './TeamCompensationDistributionListMethodAlerts'
import { TeamCompensationDistributionListPagedTable } from './TeamCompensationDistributionListPagedTable'

type TranslateBudget = (id: string, args?: Record<string, string | number>) => string

export interface TeamCompensationEmployeeDistributionListBodyProps {
  loading: boolean
  error: string | null
  sortedMembers: TeamMemberCompensationData[]
  emptyMessage: string
  performanceFallbackToEqual: boolean
  performancePartialScores: boolean
  isSalaryCostMethod: boolean
  isPerformanceMethod: boolean
  isCustom: boolean
  totalSalaryCostAcrossEmployees: number
  currencyCode: string
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

export function TeamCompensationEmployeeDistributionListBody({
  loading,
  error,
  sortedMembers,
  emptyMessage,
  performanceFallbackToEqual,
  performancePartialScores,
  isSalaryCostMethod,
  isPerformanceMethod,
  isCustom,
  totalSalaryCostAcrossEmployees,
  currencyCode,
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
}: Readonly<TeamCompensationEmployeeDistributionListBodyProps>) {
  const sortedMembersLength = sortedMembers.length
  const showPagedTable = sortedMembersLength > 0 && loading === false

  return (
    <div className="gba:space-y-4">
      <TeamCompensationDistributionListLoadingAndErrors
        loading={loading}
        error={error}
        sortedMembersLength={sortedMembersLength}
        emptyMessage={emptyMessage}
      />
      <TeamCompensationDistributionListMethodAlerts
        performanceFallbackToEqual={performanceFallbackToEqual}
        performancePartialScores={performancePartialScores}
        isSalaryCostMethod={isSalaryCostMethod}
        sortedMembersLength={sortedMembersLength}
        loading={loading}
        totalSalaryCostAcrossEmployees={totalSalaryCostAcrossEmployees}
        currencyCode={currencyCode}
        tBudget={tBudget}
      />
      <TeamCompensationDistributionListPagedTable
        show={showPagedTable}
        isCustom={isCustom}
        isSalaryCostMethod={isSalaryCostMethod}
        isPerformanceMethod={isPerformanceMethod}
        currencyCode={currencyCode}
        totalSalaryCostAcrossEmployees={totalSalaryCostAcrossEmployees}
        grandTotalPositivePerformanceScores={grandTotalPositivePerformanceScores}
        distributionPool={distributionPool}
        poolForCustomContext={poolForCustomContext}
        totalCustomAllocated={totalCustomAllocated}
        customPoolUnallocatedGlobal={customPoolUnallocatedGlobal}
        pagedMembers={pagedMembers}
        showPagination={showPagination}
        pageIndex={pageIndex}
        totalPages={totalPages}
        goPrev={goPrev}
        goNext={goNext}
        allocationByEmployeeId={allocationByEmployeeId}
        customBudgetByEmployeeId={customBudgetByEmployeeId}
        onCustomAmountRawChange={onCustomAmountRawChange}
        onCustomPercentRawChange={onCustomPercentRawChange}
        onCustomModeChange={onCustomModeChange}
        tBudget={tBudget}
        inputsDisabled={inputsDisabled}
      />
    </div>
  )
}
