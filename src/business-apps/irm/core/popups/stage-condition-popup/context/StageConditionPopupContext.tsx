import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { StageConditionPopupValues, StageConditionContextState } from '../types'
import { useInvestmentStageConditionData } from '../hooks/useInvestmentStageConditionData'

// Create context
const StageConditionPopupContext = createContext<StageConditionContextState | null>(null)

// Custom hook to use the context
export const useStageConditionPopupContext = (): StageConditionContextState => {
  const context = useContext(StageConditionPopupContext)
  if (!context) {
    throw new Error('useStageConditionPopupContext must be used within a StageConditionPopupProvider')
  }
  return context
}

interface StageConditionPopupProviderProps {
  children: React.ReactNode
  businessAppContext: BusinessAppContextProps
  initialValues?: Partial<StageConditionPopupValues>
}

export const StageConditionPopupProvider: React.FC<StageConditionPopupProviderProps> = ({
  children,
  businessAppContext,
  initialValues = {}
}) => {
  // Stage condition data loading hook (investment-specific)
  const {
    stageConditionData,
    isLoading: stageConditionDataLoading,
    error: stageConditionDataError,
    mapStageConditionToFormValues
  } = useInvestmentStageConditionData({ businessAppContext })

  // Form state
  const [formValues, setFormValuesState] = useState<StageConditionPopupValues>({
    id: '',
    version: undefined,
    completed: false,
    conditionTitle: '',
    currentStatus: '',
    ...initialValues
  })

  // Global state
  const [error, setError] = useState<string | null>(null)
  const [hasLoadedData, setHasLoadedData] = useState(false)

  // Memoize initialValues to prevent infinite re-renders
  const memoizedInitialValues = useMemo(() => initialValues, [])

  // Initialize form values when stage condition data is loaded
  useEffect(() => {
    if (stageConditionData && !error) {
      const mappedValues = mapStageConditionToFormValues(stageConditionData)
      setFormValuesState(prev => ({ ...prev, ...mappedValues, ...memoizedInitialValues }))
      setHasLoadedData(true)
    }
  }, [stageConditionData, error, mapStageConditionToFormValues, memoizedInitialValues])

  // Set error from data loading hook and mark as "loaded" even if error
  useEffect(() => {
    if (stageConditionDataError) {
      setError(stageConditionDataError)
      setHasLoadedData(true)
    }
  }, [stageConditionDataError])

  // Set form values with validation
  const setFormValues = useCallback((values: StageConditionPopupValues) => {
    setFormValuesState(values)
  }, [])

  // Context value - include business app context for access to user info
  const contextValue: StageConditionContextState = {
    formValues,
    isLoading: stageConditionDataLoading || !hasLoadedData,
    error: error || stageConditionDataError,
    setFormValues,
    businessAppContext
  }

  return <StageConditionPopupContext.Provider value={contextValue}>{children}</StageConditionPopupContext.Provider>
}
