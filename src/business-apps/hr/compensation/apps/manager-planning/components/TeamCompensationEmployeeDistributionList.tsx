import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import type { DistributionMethod, TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import type {
  CustomBudgetInputMode,
  OrgUnitCustomBudgetInput
} from '../../planning/components/views/budgetDistributionCustomTypes'
import { useTeamCompensationEmployeeDistributionListState } from '../hooks/useTeamCompensationEmployeeDistributionListState'
import { TeamCompensationEmployeeDistributionListBody } from './TeamCompensationEmployeeDistributionListBody'

type TranslateBudget = (id: string, args?: Record<string, string | number>) => string

export interface TeamCompensationEmployeeDistributionListProps {
  /** When true, omit outer Card (used inside split-panel layout next to method list). */
  embedded?: boolean
  sortedMembers: TeamMemberCompensationData[]
  distributionPool: number | null
  allocationByEmployeeId: ReadonlyMap<string, number>
  currencyCode: string
  loading: boolean
  error: string | null
  selectedMethod: DistributionMethod
  customBudgetByEmployeeId: Record<string, OrgUnitCustomBudgetInput>
  onCustomAmountRawChange: (employeeId: string, value: string) => void
  onCustomPercentRawChange: (employeeId: string, value: string) => void
  onCustomModeChange: (employeeId: string, mode: CustomBudgetInputMode) => void
  performanceFallbackToEqual: boolean
  performancePartialScores: boolean
  totalSalaryCostAcrossEmployees: number
  grandTotalPositivePerformanceScores: number
  cardTitle: string
  tBudget: TranslateBudget
  emptyMessage: string
  /** When true, custom allocation inputs are read-only (e.g. after proposals are submitted). */
  inputsDisabled?: boolean
}

export function TeamCompensationEmployeeDistributionList({
  embedded = false,
  sortedMembers,
  distributionPool,
  allocationByEmployeeId,
  currencyCode,
  loading,
  error,
  selectedMethod,
  customBudgetByEmployeeId,
  onCustomAmountRawChange,
  onCustomPercentRawChange,
  onCustomModeChange,
  performanceFallbackToEqual,
  performancePartialScores,
  totalSalaryCostAcrossEmployees,
  grandTotalPositivePerformanceScores,
  cardTitle,
  tBudget,
  emptyMessage,
  inputsDisabled = false
}: Readonly<TeamCompensationEmployeeDistributionListProps>) {
  const s = useTeamCompensationEmployeeDistributionListState({
    sortedMembers,
    distributionPool,
    allocationByEmployeeId,
    selectedMethod,
    customBudgetByEmployeeId,
    onCustomAmountRawChange,
    onCustomPercentRawChange,
    onCustomModeChange,
    performanceFallbackToEqual,
    performancePartialScores,
    totalSalaryCostAcrossEmployees,
    grandTotalPositivePerformanceScores,
    currencyCode,
    loading,
    error,
    emptyMessage,
    tBudget,
    inputsDisabled
  })

  const listBody = (
    <TeamCompensationEmployeeDistributionListBody
      loading={s.loading}
      error={s.error}
      sortedMembers={s.sortedMembers}
      emptyMessage={s.emptyMessage}
      performanceFallbackToEqual={s.performanceFallbackToEqual}
      performancePartialScores={s.performancePartialScores}
      isSalaryCostMethod={s.isSalaryCostMethod}
      isPerformanceMethod={s.isPerformanceMethod}
      isCustom={s.isCustom}
      totalSalaryCostAcrossEmployees={s.totalSalaryCostAcrossEmployees}
      currencyCode={s.currencyCode}
      grandTotalPositivePerformanceScores={s.grandTotalPositivePerformanceScores}
      distributionPool={s.distributionPool}
      poolForCustomContext={s.poolForCustomContext}
      totalCustomAllocated={s.totalCustomAllocated}
      customPoolUnallocatedGlobal={s.customPoolUnallocatedGlobal}
      pagedMembers={s.pagedMembers}
      showPagination={s.showPagination}
      pageIndex={s.pageIndex}
      totalPages={s.totalPages}
      goPrev={s.goPrev}
      goNext={s.goNext}
      allocationByEmployeeId={s.allocationByEmployeeId}
      customBudgetByEmployeeId={s.customBudgetByEmployeeId}
      onCustomAmountRawChange={s.onCustomAmountRawChange}
      onCustomPercentRawChange={s.onCustomPercentRawChange}
      onCustomModeChange={s.onCustomModeChange}
      tBudget={s.tBudget}
      inputsDisabled={s.inputsDisabled}
    />
  )

  if (embedded) {
    return (
      <div className="gba:min-w-0" data-testid="manager-team-distribution-employee-list">
        {listBody}
      </div>
    )
  }

  return (
    <Card className="gba:w-full" data-testid="manager-team-distribution-employee-list">
      <CardHeader className="gba:flex gba:flex-row gba:flex-wrap gba:items-start gba:justify-between gba:gap-3 gba:space-y-0">
        <CardTitle className="gba:text-base">{cardTitle}</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-4">{listBody}</CardContent>
    </Card>
  )
}
