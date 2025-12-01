import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FeedbackFormValues, EmployeeOption } from '../types'
import { useTextTransformation } from '../hooks/useTextTransformation'
import { useStructureEmployees } from '../hooks/useStructureEmployees'
import { useEmployeeDetails } from '../hooks/useEmployeeDetails'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'

interface FeedbackFormContextType {
  formValues: FeedbackFormValues
  setFormValues: (values: Partial<FeedbackFormValues>) => void
  transformText: (type: 'formalize' | 'translate' | 'shorten', targetLanguage?: string) => Promise<void>
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
  isRequestedFeedbackFlow: boolean
}

const FeedbackFormContext = createContext<FeedbackFormContextType | undefined>(undefined)

interface FeedbackFormProviderProps {
  children: ReactNode
  businessAppContext: BusinessAppContextProps
  initialValues?: Partial<FeedbackFormValues>
  onSubmit?: (values: FeedbackFormValues) => Promise<void>
  onCancel?: () => Promise<void>
  preSelectedEmployeeId?: string
}

export const FeedbackFormProvider: React.FC<FeedbackFormProviderProps> = ({
  children,
  businessAppContext,
  initialValues = {},
  onSubmit = async () => {},
  onCancel = async () => {},
  preSelectedEmployeeId
}) => {
  const [formValues, setFormValues] = useState<FeedbackFormValues>({
    feedbackText: '',
    transformedText: undefined,
    transformationType: undefined,
    targetLanguage: undefined,
    employeeId: undefined,
    employeeName: undefined,
    feedbackPublic: false,
    ...initialValues
  })

  const {
    transformText: apiTransformText,
    isLoading,
    error,
    setError
  } = useTextTransformation(businessAppContext.accessToken)

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

  // Detect "Enter Requested Employee Feedback" flow from process metadata
  const flowTaskName = (businessAppContext?.additionalData as any)?.psi_processMetadata?.lastOpenedTask?.name || ''
  const screenKey =
    (businessAppContext?.additionalData as any)?.psi_processMetadata?.lastOpenedTask?.screenKey ||
    (businessAppContext?.additionalData as any)?.psi_processMetadata?.lastOpenedTask?.screen?.screenComponents
      ?.screenKey ||
    ''
  const receiverId = (businessAppContext?.additionalData as any)?.psi_taskPayload?.receiverId

  const isRequestedFeedbackFlow =
    String(flowTaskName).toLowerCase() === 'enterrequestedfeedback' ||
    String(screenKey).toLowerCase().includes('enterrequestedfeedback') ||
    !!receiverId

  const {
    employees,
    isLoading: employeesLoading,
    error: employeesError,
    fetchStructureEmployees,
    getEmployeeById
  } = useStructureEmployees(businessAppContext.accessToken, !hasPreSelectedEmployee, currentUserEmployeeId)

  const updateFormValues = useCallback((values: Partial<FeedbackFormValues>) => {
    setFormValues(prev => ({ ...prev, ...values }))
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

  const transformText = useCallback(
    async (type: 'formalize' | 'translate' | 'shorten', targetLanguage?: string) => {
      if (!formValues.feedbackText.trim()) {
        setError('Please enter some text to transform')
        return
      }

      try {
        const result = await apiTransformText({
          text: formValues.feedbackText,
          transformationType: type,
          targetLanguage
        })

        if (result) {
          // Replace the original text with the transformed text
          updateFormValues({
            feedbackText: result.transformedText,
            transformedText: undefined,
            transformationType: undefined
          })
          setError(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to transform text')
      }
    },
    [formValues.feedbackText, apiTransformText, updateFormValues, setError]
  )

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
      // Get the selected employee to access their user ID
      const selectedEmployee = formValues.employeeId
        ? preSelectedEmployee?.id === formValues.employeeId
          ? preSelectedEmployee
          : getEmployeeById(formValues.employeeId)
        : null

      // Create payload for Kogito process with correct structure
      const payload = {
        feedback: {
          id: undefined, // Will be generated by the process
          businessKey: undefined, // Will be generated by the process
          feedback: formValues.feedbackText,
          feedbackDate: new Date().toISOString(),
          employeeId: formValues.employeeId,
          senderEmployeeId: businessAppContext.userInfo?.employeeDetails?.employeeId, // Current user
          feedbackPublic: !!formValues.feedbackPublic // Match API field name
        },
        receiverId: selectedEmployee?.userId, // The user ID of the employee receiving the feedback
        event: 'submit_feedback'
      }

      // Dispatch the process continue event
      dispatchProcessContinueEvent('pse_submit', payload)

      // Also call the original onSubmit if provided (for backward compatibility)
      if (onSubmit) {
        await onSubmit(formValues)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback')
    }
  }, [formValues, onSubmit, setError, businessAppContext.userInfo])

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

  const contextValue: FeedbackFormContextType = {
    formValues,
    setFormValues: updateFormValues,
    transformText,
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
    isRequestedFeedbackFlow
  }

  return <FeedbackFormContext.Provider value={contextValue}>{children}</FeedbackFormContext.Provider>
}

export const useFeedbackForm = (): FeedbackFormContextType => {
  const context = useContext(FeedbackFormContext)
  if (!context) {
    throw new Error('useFeedbackForm must be used within a FeedbackFormProvider')
  }
  return context
}
