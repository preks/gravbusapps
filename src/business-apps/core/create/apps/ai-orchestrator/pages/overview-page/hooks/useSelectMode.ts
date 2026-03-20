/**
 * Hook for managing plan selection mode state
 * Handles multi-select functionality for bulk operations
 */

import { useState } from 'react'

export interface UseSelectModeReturn {
  isSelectMode: boolean
  selectedPlanIds: Set<string>
  toggleSelectMode: () => void
  togglePlanSelection: (jobId: string) => void
  selectAllPlans: (planIds: string[]) => void
  clearSelection: () => void
}

export function useSelectMode(): UseSelectModeReturn {
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(new Set())

  const toggleSelectMode = () => {
    setIsSelectMode(prev => !prev)
    if (isSelectMode) {
      setSelectedPlanIds(new Set())
    }
  }

  const togglePlanSelection = (jobId: string) => {
    setSelectedPlanIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(jobId)) {
        newSet.delete(jobId)
      } else {
        newSet.add(jobId)
      }
      return newSet
    })
  }

  const selectAllPlans = (planIds: string[]) => {
    setSelectedPlanIds(new Set(planIds))
  }

  const clearSelection = () => {
    setSelectedPlanIds(new Set())
  }

  return {
    isSelectMode,
    selectedPlanIds,
    toggleSelectMode,
    togglePlanSelection,
    selectAllPlans,
    clearSelection
  }
}
