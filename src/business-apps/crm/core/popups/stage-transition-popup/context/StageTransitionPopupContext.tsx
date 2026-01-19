import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { StageTransitionContextState, StageTransitionPopupValues } from '../types'
import { useStageTransitionData } from '../hooks/useStageTransitionData'

const StageTransitionPopupContext = createContext<StageTransitionContextState | undefined>(undefined)

export const useStageTransitionPopupContext = (): StageTransitionContextState => {
  const context = useContext(StageTransitionPopupContext)
  if (context === undefined) {
    throw new Error('useStageTransitionPopupContext must be used within a StageTransitionPopupProvider')
  }
  return context
}

export const StageTransitionPopupProvider: React.FC<{
  children: React.ReactNode
  businessAppContext: BusinessAppContextProps
  initialValues?: Partial<StageTransitionPopupValues>
}> = ({ children, businessAppContext, initialValues = {} }) => {
  // Initialize form values with defaults
  const [formValues, setFormValuesState] = useState<StageTransitionPopupValues>({
    opportunityId: '',
    opportunityName: '',
    sourceStageRef: '',
    sourceStage: undefined,
    targetStageRef: '',
    targetStage: undefined,
    ...initialValues
  })

  // Global state
  const [error, setError] = useState<string | null>(null)
  const [hasLoadedData, setHasLoadedData] = useState(false)

  // Load opportunity and stage data
  const {
    opportunityData,
    targetStageData,
    currentStageConditions,
    incompleteConditionIds,
    isLoading: dataLoading,
    error: dataError,
    mapToFormValues
  } = useStageTransitionData(businessAppContext)

  // Memoize initialValues to prevent infinite re-renders
  const memoizedInitialValues = useMemo(() => initialValues, [])

  // Initialize form values when data is loaded
  useEffect(() => {
    if (opportunityData && targetStageData && !error) {
      const mappedValues = mapToFormValues(opportunityData, targetStageData)
      setFormValuesState(prev => ({ ...prev, ...mappedValues, ...memoizedInitialValues }))
      setHasLoadedData(true)
    }
  }, [opportunityData, targetStageData, error, mapToFormValues, memoizedInitialValues])

  // Set error from data loading hook and mark as "loaded" even if error
  useEffect(() => {
    if (dataError) {
      setError(dataError)
      setHasLoadedData(true) // Consider error state as "loaded" to exit loading
    }
  }, [dataError])

  // Set form values with validation
  const setFormValues = useCallback((values: StageTransitionPopupValues) => {
    setFormValuesState(values)
  }, [])

  // Context value - include business app context for access to user info
  const contextValue: StageTransitionContextState = {
    formValues,
    isLoading: dataLoading || !hasLoadedData,
    error: error || dataError,
    setFormValues,
    businessAppContext,
    // expose for UI validation
    currentStageConditions,
    incompleteConditionIds
  }

  return <StageTransitionPopupContext.Provider value={contextValue}>{children}</StageTransitionPopupContext.Provider>
}
