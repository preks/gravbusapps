import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FeedbackRequestFormValues, EmployeeOption, FeedbackRequestPayload } from '../types'
import { useStructureEmployees } from '../hooks/useStructureEmployees'
import { useEmployeeDetails } from '../hooks/useEmployeeDetails'

import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { FeedbackRequestClient } from '@/common/network/feedback-request/FeedbackRequestClient'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'

interface FeedbackRequestFormContextType {
  formValues: FeedbackRequestFormValues
  setFormValues: (values: Partial<FeedbackRequestFormValues>) => void
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
}

const FeedbackRequestFormContext = createContext<FeedbackRequestFormContextType | undefined>(undefined)

interface FeedbackRequestFormProviderProps {
  children: ReactNode
  businessAppContext: BusinessAppContextProps
  initialValues?: Partial<FeedbackRequestFormValues>
  onSubmit?: (values: FeedbackRequestFormValues) => Promise<void>
  onCancel?: () => Promise<void>
  preSelectedEmployeeId?: string
}

export const FeedbackRequestFormProvider: React.FC<FeedbackRequestFormProviderProps> = ({
  children,
  businessAppContext,
  initialValues = {},
  onCancel = async () => {},
  preSelectedEmployeeId
}) => {
  const { t } = useTranslation(translations)
  const [formValues, setFormValues] = useState<FeedbackRequestFormValues>({
    employeeId: undefined,
    employeeName: undefined,
    employeeIds: [],
    employeeNames: [],
    requestMessage: '',
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
  const {
    employees,
    isLoading: employeesLoading,
    error: employeesError,
    fetchStructureEmployees,
    getEmployeeById
  } = useStructureEmployees(businessAppContext.accessToken, !hasPreSelectedEmployee, currentUserEmployeeId)

  // Keep a map of all employees we've seen across searches so we can resolve
  // selected IDs even if they are not in the latest search result list
  const [knownEmployees, setKnownEmployees] = useState<Map<string, EmployeeOption>>(new Map())

  useEffect(() => {
    if (employees && employees.length > 0) {
      setKnownEmployees(prev => {
        const next = new Map(prev)
        employees.forEach(emp => next.set(emp.id, emp))
        return next
      })
    }
  }, [employees])

  useEffect(() => {
    if (preSelectedEmployee) {
      setKnownEmployees(prev => {
        const next = new Map(prev)
        next.set(preSelectedEmployee.id, preSelectedEmployee)
        return next
      })
    }
  }, [preSelectedEmployee])

  const updateFormValues = useCallback((values: Partial<FeedbackRequestFormValues>) => {
    setFormValues(prev => ({ ...prev, ...values }))
  }, [])

  // Handle pre-selected employee
  useEffect(() => {
    if (preSelectedEmployee && !isPreSelectedEmployeeCurrentUser) {
      // Set both single and multi-select values for compatibility
      updateFormValues({
        employeeId: preSelectedEmployee.id,
        employeeName: preSelectedEmployee.name,
        employeeIds: [preSelectedEmployee.id],
        employeeNames: [preSelectedEmployee.name]
      })
    }
  }, [preSelectedEmployee, updateFormValues, isPreSelectedEmployeeCurrentUser])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const searchEmployees = useCallback(
    async (search: string) => {
      if (!hasPreSelectedEmployee) {
        await fetchStructureEmployees(search)
      }
    },
    [hasPreSelectedEmployee, fetchStructureEmployees]
  )

  const handleSubmit = useCallback(async () => {
    const selectedIds =
      formValues.employeeIds && formValues.employeeIds.length > 0
        ? formValues.employeeIds
        : formValues.employeeId
          ? [formValues.employeeId]
          : []

    console.log(selectedIds, 'selectedIds')

    if (selectedIds.length === 0) {
      setError(
        getTranslationFromI18nKeyAndLabel(
          'feedback.request.noEmployee',
          'Please select at least one employee to request feedback from'
        )
      )
      return
    }

    if (!currentUserEmployeeId) {
      setError(getTranslationFromI18nKeyAndLabel('feedback.request.noCurrentUser', 'Unable to identify current user'))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Resolve employees and collect userIds (fallback to employeeId)
      const resolvedEmployees = selectedIds
        .map(id => {
          if (preSelectedEmployee?.id === id) return preSelectedEmployee
          return knownEmployees.get(id) || getEmployeeById(id)
        })
        .filter(Boolean) as EmployeeOption[]

      if (resolvedEmployees.length === 0) {
        throw new Error(
          getTranslationFromI18nKeyAndLabel('feedback.request.employeeNotFound', 'Selected employee not found')
        )
      }

      console.log(resolvedEmployees, 'resolvedEmployees')

      const requestedFromList = resolvedEmployees.map(emp => emp.userId || emp.id)

      console.log(requestedFromList, 'requestedFromList')

      // If multiple selections, send first via process event and the rest via bulk endpoint
      if (requestedFromList.length > 1) {
        const client = new FeedbackRequestClient()
        client.setAccessToken(businessAppContext.accessToken)

        const [firstRequested, ...remainingRequested] = requestedFromList

        await client.bulkRequestFeedback({
          requestedFromList: remainingRequested,
          creatorUserId: currentUserEmployeeId,
          requestMessage: formValues.requestMessage
        })

        // Dispatch the first request through the process event to keep compatibility
        const payload: FeedbackRequestPayload = {
          requestedFrom: firstRequested,
          requestedFromList,
          creatorUserId: currentUserEmployeeId,
          requestMessage: formValues.requestMessage,
          completeNotification: {
            type: 'success',
            message: t('notification-feedback-request-sent-success')
          }
        }
        dispatchProcessContinueEvent('pse_submit', payload)
      } else {
        // Single selection - preserve original behavior
        const payload: FeedbackRequestPayload = {
          requestedFrom: requestedFromList[0],
          requestedFromList,
          creatorUserId: currentUserEmployeeId,
          requestMessage: formValues.requestMessage,
          completeNotification: {
            type: 'success',
            message: t('notification-feedback-request-sent-success')
          }
        }
        dispatchProcessContinueEvent('pse_submit', payload)
      }
      // Do not reset isLoading here; allow host to close the screen
      return
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : getTranslationFromI18nKeyAndLabel('feedback.request.error', 'Failed to send feedback request')
      )
      setIsLoading(false)
    }
  }, [formValues, currentUserEmployeeId, preSelectedEmployee, getEmployeeById, businessAppContext.accessToken])

  const handleCancel = useCallback(async () => {
    try {
      // Call the original onCancel if provided (for backward compatibility)
      if (onCancel) {
        await onCancel()
      }

      // Dispatch abort event to close the modal
      dispatchProcessContinueEvent('pse_abort', {})
    } catch (err) {
      // Silent error handling for cancellation
      console.error('Error :', err)
    }
  }, [onCancel])

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
  }

  return <FeedbackRequestFormContext.Provider value={contextValue}>{children}</FeedbackRequestFormContext.Provider>
}

export const useFeedbackRequestForm = (): FeedbackRequestFormContextType => {
  const context = useContext(FeedbackRequestFormContext)
  if (!context) {
    throw new Error('useFeedbackRequestForm must be used within a FeedbackRequestFormProvider')
  }
  return context
}
