import { useCallback, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getDefaultEndDate } from '@/business-apps/hr/core/apps/employee-record/utils/utils'
import { extractEmployeeId } from '@/business-apps/hr/core/utils/employeeIdUtils'
import { useTaskCancellation } from '../../hooks/useTaskCancellation'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
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
      if (selectedDate < today) {
        errors.push(t('error-end-date-today-or-later'))
      }
    }

    return errors.length > 0 ? errors : null
  }, [endDate, t])

  const isFormValid = useMemo(() => {
    if (!endDate || endDate.length === 0) {
      return false
    }

    // Validate date is today or later
    const selectedDate = new Date(endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return selectedDate >= today
  }, [endDate])

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
      const FETCH_BENEFIT_VERSION_QUERY = `
        query FetchBenefitVersion($benefitId: uuid!) {
          EmployeeBenefit(where: { id: { _eq: $benefitId } }) {
            id
            version
          }
        }
      `
      const response = await graphqlClient.request<{
        EmployeeBenefit: Array<{ id: string; version: number }>
      }>(FETCH_BENEFIT_VERSION_QUERY, { benefitId: selectedBenefit.employeeBenefitId })

      if (!response.EmployeeBenefit || response.EmployeeBenefit.length === 0) {
        throw new Error(`Employee benefit with ID ${selectedBenefit.employeeBenefitId} not found`)
      }

      benefitVersion = response.EmployeeBenefit[0].version

      if (typeof benefitVersion !== 'number') {
        throw new Error('Benefit version is invalid or missing')
      }
    } catch (error) {
      console.error('Error fetching benefit version:', error)
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
    isFormValid,
    validateForm,
    buildSubmitPayload,
    markAsCancelled,
    markAsSubmitted
  }
}
