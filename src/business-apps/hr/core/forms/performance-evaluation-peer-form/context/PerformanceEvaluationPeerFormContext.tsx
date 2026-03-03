import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PerformanceEvaluationPeerFormValues, EmployeeOption } from '../types'
import { useStructureEmployees } from '../hooks/useStructureEmployees'
import { useEmployeeById } from '@/common/data/employee/hooks/useEmployeeById'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'

export interface EmployeeForHeader {
  firstName: string
  lastName: string
  pictureThumbnail?: string
  jobTitle?: string
}

interface PerformanceEvaluationPeerFormContextType {
  formValues: PerformanceEvaluationPeerFormValues
  setFormValues: (values: Partial<PerformanceEvaluationPeerFormValues>) => void
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
  /** Employee being evaluated (from task payload) for header display */
  employeeForHeader: EmployeeForHeader | null
  employeeForHeaderLoading: boolean
}

const PerformanceEvaluationPeerFormContext = createContext<PerformanceEvaluationPeerFormContextType | undefined>(
  undefined
)

interface PerformanceEvaluationPeerFormProviderProps {
  children: ReactNode
  businessAppContext: BusinessAppContextProps
  initialValues?: Partial<PerformanceEvaluationPeerFormValues>
  onSubmit?: (values: PerformanceEvaluationPeerFormValues) => Promise<void>
  onCancel?: () => Promise<void>
}

export const PerformanceEvaluationPeerFormProvider: React.FC<PerformanceEvaluationPeerFormProviderProps> = ({
  children,
  businessAppContext,
  initialValues = {},
  onSubmit = async () => {},
  onCancel = async () => {}
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<PerformanceEvaluationPeerFormValues>({
    peerEmployeeIds: [],
    peerEmployeeNames: [],
    ...initialValues
  })

  const currentUserEmployeeId = businessAppContext.userInfo?.employeeDetails?.employeeId
  const {
    employees,
    isLoading: employeesLoading,
    error: employeesError,
    fetchStructureEmployees,
    getEmployeeById
  } = useStructureEmployees(businessAppContext.accessToken, true, currentUserEmployeeId)

  const ad = businessAppContext?.additionalData as Record<string, unknown> | undefined
  const taskPayload = ad?.psi_taskPayload as Record<string, unknown> | undefined
  const processInputs = (ad?.psi_processMetadata as Record<string, unknown> | undefined)?.inputs as
    | Record<string, unknown>
    | undefined
  const empEvalFromTask = taskPayload?.employeePerformanceEvaluation as Record<string, unknown> | undefined
  const empEvalFromInputs = processInputs?.employeePerformanceEvaluation as Record<string, unknown> | undefined
  const initialParams = taskPayload?.psi_initialParameters as Record<string, unknown> | undefined
  // Employee being evaluated: from task/process payload, or current user (Select Peers is assigned to the employee)
  const employeeIdFromPayload =
    (empEvalFromTask?.employee as string | undefined) ??
    (empEvalFromInputs?.employee as string | undefined) ??
    (initialParams?.employeeId as string | undefined) ??
    (taskPayload?.employeeId as string | undefined) ??
    (ad?.employeeId as string | undefined) ??
    ((ad?.flowContext as Record<string, unknown> | undefined)?.employeeId as string | undefined) ??
    ((ad?.contextData as Record<string, unknown> | undefined)?.employeeId as string | undefined) ??
    currentUserEmployeeId
  const { employee: employeeById, loading: employeeForHeaderLoading } = useEmployeeById({
    accessToken: businessAppContext.accessToken ?? '',
    employeeId: employeeIdFromPayload ?? undefined
  })
  const employeeForHeader = useMemo((): EmployeeForHeader | null => {
    if (!employeeById) return null
    return {
      firstName: employeeById.firstName ?? '',
      lastName: employeeById.lastName ?? '',
      pictureThumbnail: employeeById.employee?.pictureThumbnail ?? undefined,
      jobTitle: employeeById.jobPosition?.name ?? undefined
    }
  }, [employeeById])

  const searchEmployees = useCallback(
    async (search: string) => {
      await fetchStructureEmployees(search)
    },
    [fetchStructureEmployees]
  )

  const updateFormValues = useCallback((values: Partial<PerformanceEvaluationPeerFormValues>) => {
    setFormValues(prev => ({ ...prev, ...values }))
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const handleSubmit = useCallback(async () => {
    try {
      setIsLoading(true)

      const payload = {
        peerNominationRequest: {
          nominatedEmployeeIds: formValues.peerEmployeeIds ?? []
        }
      }
      dispatchProcessContinueEvent('pse_submit', payload)
      await onSubmit(formValues)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setIsLoading(false)
    }
  }, [formValues, onSubmit, businessAppContext?.additionalData])

  const handleCancel = useCallback(async () => {
    try {
      dispatchProcessContinueEvent('pse_abort', {})
      await onCancel()
    } catch {
      // ignore
    }
  }, [onCancel])

  const value = useMemo<PerformanceEvaluationPeerFormContextType>(
    () => ({
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
      employeeForHeader,
      employeeForHeaderLoading
    }),
    [
      formValues,
      updateFormValues,
      isLoading,
      error,
      clearError,
      handleSubmit,
      handleCancel,
      businessAppContext,
      employees,
      employeesLoading,
      employeesError,
      searchEmployees,
      getEmployeeById,
      employeeForHeader,
      employeeForHeaderLoading
    ]
  )

  return (
    <PerformanceEvaluationPeerFormContext.Provider value={value}>
      {children}
    </PerformanceEvaluationPeerFormContext.Provider>
  )
}

export const usePerformanceEvaluationPeerForm = (): PerformanceEvaluationPeerFormContextType => {
  const context = useContext(PerformanceEvaluationPeerFormContext)
  if (!context) {
    throw new Error('usePerformanceEvaluationPeerForm must be used within PerformanceEvaluationPeerFormProvider')
  }
  return context
}
