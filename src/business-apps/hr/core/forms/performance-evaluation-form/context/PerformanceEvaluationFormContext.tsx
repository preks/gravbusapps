import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PerformanceEvaluationFormValues, EmployeeOption, EvaluationTopic } from '../types'
import { useStructureEmployees } from '../hooks/useStructureEmployees'
import { useEmployeeDetails } from '../hooks/useEmployeeDetails'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'

interface PerformanceEvaluationFormContextType {
  formValues: PerformanceEvaluationFormValues
  setFormValues: (values: Partial<PerformanceEvaluationFormValues>) => void
  updateTopic: (topicId: string, updates: Partial<EvaluationTopic>) => void
  isLoading: boolean
  error: string | null
  clearError: () => void
  onSubmit: () => Promise<void>
  onCancel: () => Promise<void>
  businessAppContext: BusinessAppContextProps
  employees: EmployeeOption[]
  employeesLoading: boolean
  employeesError: string | null
  searchEmployees: (search: string) => Promise<void>
  getEmployeeById: (employeeId: string) => EmployeeOption | undefined
  preSelectedEmployee: EmployeeOption | null
  preSelectedEmployeeLoading: boolean
  preSelectedEmployeeError: string | null
  hasPreSelectedEmployee: boolean
  isPreSelectedEmployeeCurrentUser: boolean
  isRequestedEvaluationFlow: boolean
}

const PerformanceEvaluationFormContext = createContext<PerformanceEvaluationFormContextType | undefined>(undefined)

interface PerformanceEvaluationFormProviderProps {
  children: ReactNode
  businessAppContext: BusinessAppContextProps
  initialValues?: Partial<PerformanceEvaluationFormValues>
  onSubmit?: (values: PerformanceEvaluationFormValues) => Promise<void>
  onCancel?: () => Promise<void>
  preSelectedEmployeeId?: string
}

export const PerformanceEvaluationFormProvider: React.FC<PerformanceEvaluationFormProviderProps> = ({
  children,
  businessAppContext,
  initialValues = {},
  onSubmit = async () => {},
  onCancel = async () => {},
  preSelectedEmployeeId
}) => {
  // Initialize with hardcoded topics
  const defaultTopics: EvaluationTopic[] = [
    { id: 'skill-javascript', name: 'JavaScript', category: 'skill', rating: undefined, comment: '' },
    { id: 'value-respect', name: 'Respect', category: 'value', rating: undefined, comment: '' }
  ]

  const [formValues, setFormValues] = useState<PerformanceEvaluationFormValues>({
    employeeId: undefined,
    employeeName: undefined,
    topics: defaultTopics,
    ...initialValues
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use the existing useEmployeeById hook for pre-selected employee
  const {
    employee: preSelectedEmployee,
    loading: preSelectedEmployeeLoading,
    error: preSelectedEmployeeError
  } = useEmployeeDetails(businessAppContext.accessToken, preSelectedEmployeeId)

  // Get current user's employee ID
  const currentUserEmployeeId = businessAppContext.userInfo?.employeeDetails?.employeeId

  // Check if the pre-selected employee is the current user
  const isPreSelectedEmployeeCurrentUser = preSelectedEmployee?.id === currentUserEmployeeId

  // Only fetch all employees if no pre-selected employee is provided OR if pre-selected employee is current user
  const hasPreSelectedEmployee = !!preSelectedEmployeeId && !isPreSelectedEmployeeCurrentUser

  // Detect "Enter Requested Performance Evaluation" flow from process metadata
  const flowTaskName = (businessAppContext?.additionalData as any)?.psi_processMetadata?.lastOpenedTask?.name || ''
  const screenKey =
    (businessAppContext?.additionalData as any)?.psi_processMetadata?.lastOpenedTask?.screenKey ||
    (businessAppContext?.additionalData as any)?.psi_processMetadata?.lastOpenedTask?.screen?.screenComponents
      ?.screenKey ||
    ''
  const receiverId = (businessAppContext?.additionalData as any)?.psi_taskPayload?.receiverId

  const isRequestedEvaluationFlow =
    String(flowTaskName).toLowerCase() === 'enterrequestedperformanceevaluation' ||
    String(screenKey).toLowerCase().includes('enterrequestedperformanceevaluation') ||
    !!receiverId

  const {
    employees,
    isLoading: employeesLoading,
    error: employeesError,
    fetchStructureEmployees,
    getEmployeeById
  } = useStructureEmployees(businessAppContext.accessToken, !hasPreSelectedEmployee, currentUserEmployeeId)

  const updateFormValues = useCallback((values: Partial<PerformanceEvaluationFormValues>) => {
    setFormValues(prev => ({ ...prev, ...values }))
  }, [])

  const updateTopic = useCallback((topicId: string, updates: Partial<EvaluationTopic>) => {
    setFormValues(prev => ({
      ...prev,
      topics: prev.topics.map(topic => (topic.id === topicId ? { ...topic, ...updates } : topic))
    }))
  }, [])

  // Handle pre-selected employee
  useEffect(() => {
    if (preSelectedEmployee && !formValues.employeeId && !isPreSelectedEmployeeCurrentUser) {
      updateFormValues({
        employeeId: preSelectedEmployee.id,
        employeeName: preSelectedEmployee.name
      })
    }
  }, [preSelectedEmployee, formValues.employeeId, updateFormValues, isPreSelectedEmployeeCurrentUser])

  const clearError = useCallback(() => {
    setError(null)
  }, [setError])

  const searchEmployees = useCallback(
    async (search: string) => {
      if (!hasPreSelectedEmployee) {
        await fetchStructureEmployees(search)
      }
    },
    [hasPreSelectedEmployee, fetchStructureEmployees]
  )

  const handleSubmit = useCallback(async () => {
    try {
      setIsLoading(true)

      // Get the selected employee to access their user ID
      const selectedEmployee = formValues.employeeId
        ? preSelectedEmployee?.id === formValues.employeeId
          ? preSelectedEmployee
          : getEmployeeById(formValues.employeeId)
        : null

      // Create payload for Kogito process with correct structure
      const payload = {
        performanceEvaluation: {
          id: undefined, // Will be generated by the process
          businessKey: undefined, // Will be generated by the process
          evaluationDate: new Date().toISOString(),
          employeeId: formValues.employeeId,
          evaluatorEmployeeId: businessAppContext.userInfo?.employeeDetails?.employeeId, // Current user
          topics: formValues.topics.map(topic => ({
            topicId: topic.id,
            topicName: topic.name,
            category: topic.category,
            rating: topic.rating,
            comment: topic.comment
          }))
        },
        receiverId: selectedEmployee?.userId, // The user ID of the employee receiving the evaluation
        event: 'pse_submit'
      }

      // Dispatch the process continue event
      dispatchProcessContinueEvent('pse_submit', payload)

      // Also call the original onSubmit if provided (for backward compatibility)
      if (onSubmit) {
        await onSubmit(formValues)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit performance evaluation')
    } finally {
      setIsLoading(false)
    }
  }, [formValues, onSubmit, setError, businessAppContext.userInfo, preSelectedEmployee, getEmployeeById])

  const handleCancel = useCallback(async () => {
    try {
      // Dispatch the process pause event
      dispatchProcessContinueEvent('pse_abort', {})

      // Also call the original onCancel if provided (for backward compatibility)
      if (onCancel) {
        await onCancel()
      }
    } catch (err) {
      console.error('Error :', err)
    }
  }, [onCancel])

  const contextValue: PerformanceEvaluationFormContextType = {
    formValues,
    setFormValues: updateFormValues,
    updateTopic,
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
    isPreSelectedEmployeeCurrentUser,
    isRequestedEvaluationFlow
  }

  return (
    <PerformanceEvaluationFormContext.Provider value={contextValue}>
      {children}
    </PerformanceEvaluationFormContext.Provider>
  )
}

export const usePerformanceEvaluationForm = (): PerformanceEvaluationFormContextType => {
  const context = useContext(PerformanceEvaluationFormContext)
  if (!context) {
    throw new Error('usePerformanceEvaluationForm must be used within a PerformanceEvaluationFormProvider')
  }
  return context
}
