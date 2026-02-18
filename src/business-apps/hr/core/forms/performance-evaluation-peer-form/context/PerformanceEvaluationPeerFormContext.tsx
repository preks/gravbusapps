import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PerformanceEvaluationPeerFormValues, EmployeeOption } from '../types'
import { useStructureEmployees } from '../hooks/useStructureEmployees'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'

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
      const ad = businessAppContext?.additionalData as Record<string, unknown> | undefined
      const evaluationId = (ad?.psi_taskId as string) ?? ''

      const payload = {
        peerNominationRequest: {
          evaluationId,
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

  const value: PerformanceEvaluationPeerFormContextType = {
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
    getEmployeeById
  }

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
