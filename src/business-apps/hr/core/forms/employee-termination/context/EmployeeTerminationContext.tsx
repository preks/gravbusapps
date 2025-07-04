import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useEmployeeTerminationData, EmployeeTerminationData } from '../hooks/useEmployeeTerminationData';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import dayjs, { Dayjs } from 'dayjs';

export interface EmployeeTerminationFormValues {
  employeeId: string;
  terminationDate: Dayjs;
  terminateJobPosition: boolean;
}

export interface EmployeeTerminationContextState {
  formValues: EmployeeTerminationFormValues;
  setFormValues: (values: Partial<EmployeeTerminationFormValues>) => void;
  employee: EmployeeTerminationData | null;
  loading: boolean;
  error: string | null;
  submit: () => void;
  cancel: () => void;
}

const EmployeeTerminationContext = createContext<EmployeeTerminationContextState | undefined>(undefined);

export const useEmployeeTerminationContext = () => {
  const context = useContext(EmployeeTerminationContext);
  if (!context) {
    throw new Error('useEmployeeTerminationContext must be used within an EmployeeTerminationProvider');
  }
  return context;
};

export const EmployeeTerminationProvider: React.FC<{
  employeeId: string;
  accessToken: string;
  userInfo?: BusinessAppContextProps['userInfo'];
  additionalData?: BusinessAppContextProps['additionalData'];
  children: React.ReactNode;
}> = ({ employeeId, accessToken, userInfo, additionalData, children }) => {
  // Form state
  const [formValuesState, setFormValuesState] = useState<EmployeeTerminationFormValues>({
    employeeId,
    terminationDate: dayjs(),
    terminateJobPosition: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Log the employeeId detection (like job-position form)
  useEffect(() => {
    if (employeeId) {
      console.log('🔍 Employee ID found in additionalData:', employeeId);
      console.log('📝 Loading employee for termination:', employeeId);
    } else {
      console.log('❌ No employee ID provided for termination');
    }
  }, [employeeId]);

  // Load employee data
  const { employee, loading: employeeLoading, error: employeeError } = useEmployeeTerminationData({
    employeeId,
    accessToken,
  });

  // Update form values
  const setFormValues = useCallback((values: Partial<EmployeeTerminationFormValues>) => {
    setFormValuesState((prev) => ({ ...prev, ...values }));
  }, []);

  // Submit handler
  const submit = useCallback(() => {
    setLoading(true);
    setError(null);
    
    // Dispatch process continue event
    const payload = {
      employeeId: formValuesState.employeeId,
      terminationDate: formValuesState.terminationDate?.isValid() ? formValuesState.terminationDate : undefined,
      terminateJobPosition: formValuesState.terminateJobPosition,
    };
    
    // Import and use the process event dispatch
    const { dispatchProcessContinueEvent } = require('@/common/utils/processEventUtils');
    dispatchProcessContinueEvent("pse_submit", payload);
    
    console.log("Employee termination payload:", payload);
    setLoading(false);
  }, [formValuesState]);

  // Cancel handler
  const cancel = useCallback(() => {
    // Reset form to initial state
    setFormValuesState({
      employeeId,
      terminationDate: dayjs(),
      terminateJobPosition: false,
    });
    
    // Dispatch cancel event
    const { dispatchProcessContinueEvent } = require('@/common/utils/processEventUtils');
    dispatchProcessContinueEvent("pse_cancel", {});
  }, [employeeId]);

  // Combine errors
  const combinedError = error || employeeError;
  const combinedLoading = loading || employeeLoading;

  return (
    <EmployeeTerminationContext.Provider
      value={{
        formValues: formValuesState,
        setFormValues,
        employee,
        loading: combinedLoading,
        error: combinedError,
        submit,
        cancel,
      }}
    >
      {children}
    </EmployeeTerminationContext.Provider>
  );
}; 