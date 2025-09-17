import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { FeedbackRequestFormValues, EmployeeOption, FeedbackRequestPayload } from '../types';
import { useStructureEmployees } from '../hooks/useStructureEmployees';
import { useEmployeeDetails } from '../hooks/useEmployeeDetails';

import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';

interface FeedbackRequestFormContextType {
  formValues: FeedbackRequestFormValues;
  setFormValues: (values: Partial<FeedbackRequestFormValues>) => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  onSubmit: () => Promise<void>;
  onCancel: () => Promise<void>;
  businessAppContext: BusinessAppContextProps;
  employees: EmployeeOption[];
  employeesLoading: boolean;
  employeesError: string | null;
  searchEmployees: (search: string) => Promise<void>;
  getEmployeeById: (employeeId: string) => EmployeeOption | undefined;
  preSelectedEmployee: EmployeeOption | null;
  preSelectedEmployeeLoading: boolean;
  preSelectedEmployeeError: string | null;
  hasPreSelectedEmployee: boolean;
  isPreSelectedEmployeeCurrentUser: boolean;
}

const FeedbackRequestFormContext = createContext<FeedbackRequestFormContextType | undefined>(undefined);

interface FeedbackRequestFormProviderProps {
  children: ReactNode;
  businessAppContext: BusinessAppContextProps;
  initialValues?: Partial<FeedbackRequestFormValues>;
  onSubmit?: (values: FeedbackRequestFormValues) => Promise<void>;
  onCancel?: () => Promise<void>;
  preSelectedEmployeeId?: string;
}

export const FeedbackRequestFormProvider: React.FC<FeedbackRequestFormProviderProps> = ({
  children,
  businessAppContext,
  initialValues = {},
  onSubmit = async () => {},
  onCancel = async () => {},
  preSelectedEmployeeId,
}) => {
  const [formValues, setFormValues] = useState<FeedbackRequestFormValues>({
    employeeId: undefined,
    employeeName: undefined,
    requestMessage: '',
    ...initialValues
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);



  // Use the existing useEmployeeById hook for pre-selected employee
  const { 
    employee: preSelectedEmployee, 
    loading: preSelectedEmployeeLoading, 
    error: preSelectedEmployeeError 
  } = useEmployeeDetails(businessAppContext.accessToken, preSelectedEmployeeId);

  // Get current user's employee ID
  const currentUserEmployeeId = businessAppContext.userInfo?.employeeDetails?.employeeId;

  // Check if the pre-selected employee is the current user
  const isPreSelectedEmployeeCurrentUser = preSelectedEmployee?.id === currentUserEmployeeId;

  // Only fetch all employees if no pre-selected employee is provided OR if pre-selected employee is current user
  const hasPreSelectedEmployee = !!preSelectedEmployeeId && !isPreSelectedEmployeeCurrentUser;
  const { 
    employees, 
    isLoading: employeesLoading, 
    error: employeesError, 
    fetchStructureEmployees, 
    getEmployeeById 
  } = useStructureEmployees(
    businessAppContext.accessToken, 
    !hasPreSelectedEmployee, 
    currentUserEmployeeId
  );

  const updateFormValues = useCallback((values: Partial<FeedbackRequestFormValues>) => {
    setFormValues(prev => ({ ...prev, ...values }));
  }, []);

  // Handle pre-selected employee
  useEffect(() => {
    if (preSelectedEmployee && !formValues.employeeId && !isPreSelectedEmployeeCurrentUser) {
      updateFormValues({
        employeeId: preSelectedEmployee.id,
        employeeName: preSelectedEmployee.name
      });
    }
  }, [preSelectedEmployee, formValues.employeeId, updateFormValues, isPreSelectedEmployeeCurrentUser]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const searchEmployees = useCallback(async (search: string) => {
    if (!hasPreSelectedEmployee) {
      await fetchStructureEmployees(search);
    }
  }, [hasPreSelectedEmployee, fetchStructureEmployees]);

  const handleSubmit = useCallback(async () => {
    if (!formValues.employeeId) {
      setError(getTranslationFromI18nKeyAndLabel('feedback.request.noEmployee', 'Please select an employee to request feedback from'));
      return;
    }

    if (!currentUserEmployeeId) {
      setError(getTranslationFromI18nKeyAndLabel('feedback.request.noCurrentUser', 'Unable to identify current user'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get the selected employee to access their user ID
      const selectedEmployee = formValues.employeeId ? 
        (preSelectedEmployee?.id === formValues.employeeId ? preSelectedEmployee : getEmployeeById(formValues.employeeId)) : 
        null;

      if (!selectedEmployee) {
        throw new Error(getTranslationFromI18nKeyAndLabel('feedback.request.employeeNotFound', 'Selected employee not found'));
      }

             // Create payload for the request feedback endpoint
       const payload: FeedbackRequestPayload = {
         requestedFrom: selectedEmployee.userId || selectedEmployee.id, // userId of the person to request feedback from (fallback to employeeId if userId not available)
         creatorUserId: currentUserEmployeeId, // employeeId of the logged in person (creator)
         requestMessage: formValues.requestMessage // optional message to include with the request
       };

      // Dispatch submit event to close the modal and continue the process
      // The actual API call will be handled by the Kogito process
      dispatchProcessContinueEvent('pse_submit', payload);

      
    } catch (err) {
      setError(err instanceof Error ? err.message : getTranslationFromI18nKeyAndLabel('feedback.request.error', 'Failed to send feedback request'));
    } finally {
      setIsLoading(false);
    }
  }, [formValues, currentUserEmployeeId, preSelectedEmployee, getEmployeeById, businessAppContext.accessToken]);

  const handleCancel = useCallback(async () => {
    try {
      // Call the original onCancel if provided (for backward compatibility)
      if (onCancel) {
        await onCancel();
      }
      
      // Dispatch cancel event to close the modal
      dispatchProcessContinueEvent('pse_cancel', {});
    } catch (err) {
      // Silent error handling for cancellation
    }
  }, [onCancel]);

  const contextValue: FeedbackRequestFormContextType = {
    formValues,
    setFormValues: updateFormValues,
    isLoading,
    error,
    clearError,
    onSubmit: handleSubmit,
    onCancel: handleCancel,
    businessAppContext,
    employees,
    employeesLoading,
    employeesError,
    searchEmployees,
    getEmployeeById,
    preSelectedEmployee,
    preSelectedEmployeeLoading,
    preSelectedEmployeeError,
    hasPreSelectedEmployee,
    isPreSelectedEmployeeCurrentUser
  };

  return (
    <FeedbackRequestFormContext.Provider value={contextValue}>
      {children}
    </FeedbackRequestFormContext.Provider>
  );
};

export const useFeedbackRequestForm = (): FeedbackRequestFormContextType => {
  const context = useContext(FeedbackRequestFormContext);
  if (!context) {
    throw new Error('useFeedbackRequestForm must be used within a FeedbackRequestFormProvider');
  }
  return context;
};
