import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { StageConditionFormValues, StageConditionContextState } from '../types';
import { useStageConditionData } from '../hooks/useStageConditionData';

// Create context
const StageConditionFormContext = createContext<StageConditionContextState | null>(null);

// Custom hook to use the context
export const useStageConditionFormContext = (): StageConditionContextState => {
  const context = useContext(StageConditionFormContext);
  if (!context) {
    throw new Error('useStageConditionFormContext must be used within a StageConditionFormProvider');
  }
  return context;
};

interface StageConditionFormProviderProps {
  children: React.ReactNode;
  businessAppContext: BusinessAppContextProps;
  initialValues?: Partial<StageConditionFormValues>;
}

export const StageConditionFormProvider: React.FC<StageConditionFormProviderProps> = ({
  children,
  businessAppContext,
  initialValues = {},
}) => {
  // Stage condition data loading hook (following lead form pattern)
  const {
    stageConditionData,
    isLoading: stageConditionDataLoading,
    error: stageConditionDataError,
    mapStageConditionToFormValues,
  } = useStageConditionData({
    businessAppContext,
  });

  // Form state
  const [formValues, setFormValuesState] = useState<StageConditionFormValues>({
    id: '',
    version: undefined,
    completed: false,
    conditionTitle: '',
    currentStatus: '',
    ...initialValues,
  });

  // Global state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form values when stage condition data is loaded
  useEffect(() => {
    if (stageConditionData && !error) {
      const mappedValues = mapStageConditionToFormValues(stageConditionData);
      setFormValuesState(prev => ({ ...prev, ...mappedValues, ...initialValues }));
    }
  }, [stageConditionData, mapStageConditionToFormValues, initialValues, error]);

  // Set error from data loading hook
  useEffect(() => {
    if (stageConditionDataError) {
      setError(stageConditionDataError);
    }
  }, [stageConditionDataError]);

  // Set form values with validation
  const setFormValues = useCallback((values: StageConditionFormValues) => {
    setFormValuesState(values);
  }, []);

  // Simplified: no default handlers needed, context just manages data

  // Context value - simplified to just data management
  const contextValue: StageConditionContextState = {
    formValues,
    isLoading: isLoading || stageConditionDataLoading,
    error: error || stageConditionDataError,
    setFormValues,
  };

  return (
    <StageConditionFormContext.Provider value={contextValue}>
      {children}
    </StageConditionFormContext.Provider>
  );
};
