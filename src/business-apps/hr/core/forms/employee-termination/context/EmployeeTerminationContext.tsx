import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useEmployeeTerminationData, EmployeeTerminationData } from '../hooks/useEmployeeTerminationData'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import dayjs, { Dayjs } from 'dayjs'

export interface EmployeeTerminationFormValues {
  employeeId: string
  terminationDate: Dayjs
  terminateJobPosition: boolean
}

export interface EmployeeTerminationContextState {
  formValues: EmployeeTerminationFormValues
  setFormValues: (values: Partial<EmployeeTerminationFormValues>) => void
  employee: EmployeeTerminationData | null
  loading: boolean
  error: string | null
  hasJobPosition: boolean
}

const EmployeeTerminationContext = createContext<EmployeeTerminationContextState | undefined>(undefined)

export const useEmployeeTerminationContext = () => {
  const context = useContext(EmployeeTerminationContext)
  if (!context) {
    throw new Error('useEmployeeTerminationContext must be used within an EmployeeTerminationProvider')
  }
  return context
}

export const EmployeeTerminationProvider: React.FC<{
  employeeId: string
  accessToken: string
  userInfo?: BusinessAppContextProps['userInfo']
  additionalData?: BusinessAppContextProps['additionalData']
  children: React.ReactNode
}> = ({ employeeId, accessToken, children }) => {
  // Form state
  const [formValuesState, setFormValuesState] = useState<EmployeeTerminationFormValues>({
    employeeId,
    terminationDate: dayjs(),
    terminateJobPosition: false
  })

  // Log the employeeId detection (like job-position form)
  useEffect(() => {
    if (employeeId) {
      console.log('🔍 Employee ID found in additionalData:', employeeId)
      console.log('📝 Loading employee for termination:', employeeId)
    } else {
      console.log('❌ No employee ID provided for termination')
    }
  }, [employeeId])

  // Load employee data
  const {
    employee,
    loading: employeeLoading,
    error: employeeError
  } = useEmployeeTerminationData({
    employeeId,
    accessToken
  })

  // Update form values
  const setFormValues = useCallback((values: Partial<EmployeeTerminationFormValues>) => {
    setFormValuesState(prev => ({ ...prev, ...values }))
  }, [])

  // Check if employee has a job position
  const hasJobPosition = Boolean(employee?.employeePosition?.jobPosition?.name)

  // Initialize form from employee data: exitDate -> terminationDate, activeTo -> terminateJobPosition
  useEffect(() => {
    if (!employee) return
    const exitDate = employee.employeePosition?.exitDate
    const activeTo = employee.employeePosition?.activeTo ?? employee.employeePosition?.jobPosition?.activeTo
    const employeeHasJobPosition = Boolean(employee.employeePosition?.jobPosition?.name)

    setFormValuesState(prev => ({
      ...prev,
      terminationDate: exitDate ? dayjs(exitDate) : prev.terminationDate,
      // Only allow terminateJobPosition if employee actually has a job position
      terminateJobPosition: employeeHasJobPosition && activeTo != null ? true : false
    }))
  }, [employee])

  // Combine errors
  const combinedError = employeeError
  const combinedLoading = employeeLoading

  return (
    <EmployeeTerminationContext.Provider
      value={{
        formValues: formValuesState,
        setFormValues,
        employee,
        loading: combinedLoading,
        error: combinedError,
        hasJobPosition
      }}
    >
      {children}
    </EmployeeTerminationContext.Provider>
  )
}
