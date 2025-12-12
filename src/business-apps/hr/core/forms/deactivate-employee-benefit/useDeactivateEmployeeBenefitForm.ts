import { useCallback, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getDefaultEndDate } from '@/business-apps/hr/core/apps/employee-record/utils/utils'
import { extractEmployeeId } from '@/business-apps/hr/core/utils/employeeIdUtils'
import { useTaskCancellation } from '../../hooks/useTaskCancellation'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { FETCH_BENEFIT_VERSION_QUERY } from './DeactivateEmployeeBenefitQueries'
import type { DeactivateEmployeeBenefitContextData, EmployeeDataResponse } from './types'
import type { BenefitCatalogItem } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/types/benefitCatalogTypes'

type EmployeePositionType = { jobPosition?: { name?: string } } | undefined

interface UseDeactivateEmployeeBenefitFormParams {
  data: DeactivateEmployeeBenefitContextData | null
  additionalData: BusinessAppContextProps['additionalData']
  userInfo?: BusinessAppContextProps['userInfo']
  accessToken: string
  t: (key: string, params?: any) => string
}

interface UseDeactivateEmployeeBenefitFormReturn {
  employeeProfile: EmployeeDataResponse['EmployeeByPk'] | null
  employeePosition?: EmployeePositionType
  selectedBenefit: BenefitCatalogItem | null
  employeeId: string
  endDate: string
  setEndDate: (value: string) => void
  minEndDate: string
  isFormValid: boolean
  validateForm: () => string[] | null
  buildSubmitPayload: () => Promise<any>
  markAsCancelled: () => void
  markAsSubmitted: () => void
}

export const useDeactivateEmployeeBenefitForm = ({
  data,
  additionalData,
  userInfo,
  accessToken,
  t
}: UseDeactivateEmployeeBenefitFormParams): UseDeactivateEmployeeBenefitFormReturn => {
  // Validate accessToken before initializing GraphQL client
  if (!accessToken || accessToken.trim().length === 0) {
    throw new Error('Access token is required for form initialization')
  }

  const graphqlClient = useGraphQLClient(accessToken)
  const employeeProfile = useMemo(() => data?.employee?.EmployeeByPk ?? null, [data])
  const employeePosition = useMemo(() => data?.employee?.EmployeePosition?.[0], [data])
  const selectedBenefit = useMemo(() => data?.selectedBenefit ?? null, [data])

  // IDs
  const employeeId = useMemo(
    () => extractEmployeeId(additionalData, userInfo, employeeProfile),
    [additionalData, userInfo, employeeProfile]
  )

  // Task cancellation handling
  const { markAsSubmitted, markAsCancelled } = useTaskCancellation('pse_abort')

  // Form state
  const [endDate, setEndDate] = useState<string>('')

  // Calculate minimum allowed end date (later of today or benefit start date)
  const minEndDate = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    if (!selectedBenefit?.startDate) {
      return today
    }
    const benefitStart = selectedBenefit.startDate
    return benefitStart > today ? benefitStart : today
  }, [selectedBenefit])

  // Initialize end date on mount
  useEffect(() => {
    if (!endDate) {
      setEndDate(getDefaultEndDate())
    }
  }, [endDate])

  const validateForm = useCallback(() => {
    const errors: string[] = []

    // Check end date
    if (!endDate || endDate.length === 0) {
      errors.push(t('error-end-date-required'))
    } else {
      const selectedDate = new Date(endDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Validate end date is not before today
      if (selectedDate < today) {
        errors.push(t('error-end-date-today-or-later'))
      }

      // Validate end date is not before benefit start date
      if (selectedBenefit?.startDate) {
        const benefitStartDate = new Date(selectedBenefit.startDate)
        benefitStartDate.setHours(0, 0, 0, 0)
        if (selectedDate < benefitStartDate) {
          errors.push(t('error-end-date-after-start-date'))
        }
      }
    }

    return errors.length > 0 ? errors : null
  }, [endDate, selectedBenefit, t])

  const isFormValid = useMemo(() => {
    if (!endDate || endDate.length === 0) {
      return false
    }

    const selectedDate = new Date(endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Validate date is today or later
    if (selectedDate < today) {
      return false
    }

    // Validate date is not before benefit start date
    if (selectedBenefit?.startDate) {
      const benefitStartDate = new Date(selectedBenefit.startDate)
      benefitStartDate.setHours(0, 0, 0, 0)
      if (selectedDate < benefitStartDate) {
        return false
      }
    }

    return true
  }, [endDate, selectedBenefit])

  const buildSubmitPayload = useCallback(async () => {
    if (!selectedBenefit) {
      throw new Error('No benefit selected')
    }

    if (!selectedBenefit.employeeBenefitId) {
      throw new Error('Employee benefit ID is missing')
    }

    // Fetch current version from database for optimistic locking
    let benefitVersion: number
    try {
      const response = await graphqlClient.request<{
        EmployeeBenefit: Array<{ id: string; version: number }>
      }>(FETCH_BENEFIT_VERSION_QUERY, { benefitId: selectedBenefit.employeeBenefitId })

      if (!response.EmployeeBenefit || response.EmployeeBenefit.length === 0) {
        throw new Error(`Employee benefit with ID ${selectedBenefit.employeeBenefitId} not found`)
      }

      benefitVersion = response.EmployeeBenefit[0].version

      if (typeof benefitVersion !== 'number') {
        throw new TypeError('Benefit version is invalid or missing')
      }
    } catch (error) {
      console.error('Error fetching benefit version: ' + (error instanceof Error ? error.message : 'Unknown error'))
      throw new Error(
        `Failed to fetch current benefit version: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }

    // Build and return payload for Kogito process
    return {
      employeeBenefit: {
        id: selectedBenefit.employeeBenefitId,
        employee: employeeId,
        version: benefitVersion,
        endDate: endDate
      }
    }
  }, [employeeId, selectedBenefit, endDate, graphqlClient])

  return {
    employeeProfile,
    employeePosition,
    selectedBenefit,
    employeeId,
    endDate,
    setEndDate,
    minEndDate,
    isFormValid,
    validateForm,
    buildSubmitPayload,
    markAsCancelled,
    markAsSubmitted
  }
}
