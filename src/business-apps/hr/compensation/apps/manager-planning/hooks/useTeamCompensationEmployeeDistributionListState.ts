import { useCallback, useMemo } from 'react'
import type { DistributionMethod, TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import type {
  CustomBudgetInputMode,
  OrgUnitCustomBudgetInput
} from '../../planning/components/views/budgetDistributionCustomTypes'
import { useDepartmentPagination } from '../../planning/components/views/useDepartmentPagination'

type TranslateBudget = (id: string, args?: Record<string, string | number>) => string

export interface UseTeamCompensationEmployeeDistributionListStateInput {
  sortedMembers: TeamMemberCompensationData[]
  distributionPool: number | null
  allocationByEmployeeId: ReadonlyMap<string, number>
  selectedMethod: DistributionMethod
  customBudgetByEmployeeId: Record<string, OrgUnitCustomBudgetInput>
  onCustomAmountRawChange: (employeeId: string, value: string) => void
  onCustomPercentRawChange: (employeeId: string, value: string) => void
  onCustomModeChange: (employeeId: string, mode: CustomBudgetInputMode) => void
  performanceFallbackToEqual: boolean
  performancePartialScores: boolean
  totalSalaryCostAcrossEmployees: number
  grandTotalPositivePerformanceScores: number
  currencyCode: string
  loading: boolean
  error: string | null
  emptyMessage: string
  tBudget: TranslateBudget
  inputsDisabled: boolean
}

export function useTeamCompensationEmployeeDistributionListState(
  input: UseTeamCompensationEmployeeDistributionListStateInput
) {
  const {
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
  } = input

  const isCustom = selectedMethod === 'custom'
  const isSalaryCostMethod = selectedMethod === 'proportional_salary_cost'
  const isPerformanceMethod = selectedMethod === 'performance_weighted'

  const poolForCustomContext = distributionPool != null && distributionPool > 0 ? distributionPool : null

  const totalCustomAllocated = useMemo(
    () => sortedMembers.reduce((sum, m) => sum + (allocationByEmployeeId.get(m.employeeId) ?? 0), 0),
    [sortedMembers, allocationByEmployeeId]
  )

  const customPoolUnallocatedGlobal = useMemo(() => {
    if (poolForCustomContext == null) {
      return null
    }
    return poolForCustomContext - totalCustomAllocated
  }, [poolForCustomContext, totalCustomAllocated])

  const listItems = useMemo(() => sortedMembers.map(m => ({ id: m.employeeId })), [sortedMembers])

  const {
    pagedItems: pagedIds,
    pageIndex,
    setPageIndex,
    totalPages,
    showPagination
  } = useDepartmentPagination(listItems)

  const pagedMemberSet = useMemo(() => new Set(pagedIds.map(p => p.id)), [pagedIds])

  const pagedMembers = useMemo(
    () => sortedMembers.filter(m => pagedMemberSet.has(m.employeeId)),
    [sortedMembers, pagedMemberSet]
  )

  const goPrev = useCallback(() => {
    setPageIndex(p => Math.max(0, p - 1))
  }, [setPageIndex])

  const goNext = useCallback(() => {
    setPageIndex(p => Math.min(totalPages - 1, p + 1))
  }, [setPageIndex, totalPages])

  return {
    isCustom,
    isSalaryCostMethod,
    isPerformanceMethod,
    poolForCustomContext,
    totalCustomAllocated,
    customPoolUnallocatedGlobal,
    pagedMembers,
    showPagination,
    pageIndex,
    totalPages,
    goPrev,
    goNext,
    loading,
    error,
    sortedMembers,
    emptyMessage,
    performanceFallbackToEqual,
    performancePartialScores,
    totalSalaryCostAcrossEmployees,
    currencyCode,
    grandTotalPositivePerformanceScores,
    distributionPool,
    allocationByEmployeeId,
    customBudgetByEmployeeId,
    onCustomAmountRawChange,
    onCustomPercentRawChange,
    onCustomModeChange,
    tBudget,
    inputsDisabled
  }
}
