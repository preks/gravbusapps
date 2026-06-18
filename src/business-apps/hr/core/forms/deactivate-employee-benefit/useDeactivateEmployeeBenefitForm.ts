import { useCallback, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { extractEmployeeId } from '@/business-apps/hr/core/utils/employeeIdUtils'
import { useTaskCancellation } from '../../hooks/useTaskCancellation'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { FETCH_BENEFIT_VERSION_QUERY } from './DeactivateEmployeeBenefitQueries'
import { getDefaultEndDate } from './utils'
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
  blockerMessages: string[]
  isVersionLoading: boolean
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
  const employeeBenefitId = selectedBenefit?.employeeBenefitId

  // IDs
  const employeeId = useMemo(
    () => extractEmployeeId(additionalData, userInfo, employeeProfile),
    [additionalData, userInfo, employeeProfile]
  )

  // Task cancellation handling
  const { markAsSubmitted, markAsCancelled } = useTaskCancellation('pse_abort')

  // Form state
  const [endDate, setEndDate] = useState<string>('')
  const [benefitVersion, setBenefitVersion] = useState<number | null>(null)
  const [versionError, setVersionError] = useState<string | null>(null)
  const [isVersionLoading, setIsVersionLoading] = useState(false)

  // Calculate minimum allowed end date (later of today or benefit start date)
  const minEndDate = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    if (!selectedBenefit?.startDate) {
      return today
    }
    const benefitStart = selectedBenefit.startDate.split('T')[0]
    return new Date(Math.max(Date.parse(benefitStart), Date.parse(today))).toISOString().split('T')[0]
  }, [selectedBenefit])

  // Initialize end date to the earliest valid date so submit is not silently disabled.
  useEffect(() => {
    const defaultEndDate = getDefaultEndDate()
    const nextEndDate = defaultEndDate > minEndDate ? defaultEndDate : minEndDate

    if (!endDate || endDate < minEndDate) {
      setEndDate(nextEndDate)
    }
  }, [endDate, minEndDate])

  useEffect(() => {
    if (!employeeBenefitId || !accessToken) {
      setBenefitVersion(null)
      setVersionError(null)
      setIsVersionLoading(false)
      return
    }

    let isMounted = true

    const fetchBenefitVersion = async () => {
      setIsVersionLoading(true)
      setVersionError(null)

      try {
        const response = await graphqlClient.request<{
          EmployeeBenefit: Array<{ id: string; version: number }>
        }>(FETCH_BENEFIT_VERSION_QUERY, { benefitId: employeeBenefitId })
        const resolvedVersion = response.EmployeeBenefit?.[0]?.version

        if (!isMounted) return

        if (typeof resolvedVersion === 'number') {
          setBenefitVersion(resolvedVersion)
          return
        }

        setBenefitVersion(null)
        setVersionError(t('deactivate-benefit-version-missing'))
      } catch {
        if (!isMounted) return
        setBenefitVersion(null)
        setVersionError(t('deactivate-benefit-version-load-error'))
      } finally {
        if (isMounted) {
          setIsVersionLoading(false)
        }
      }
    }

    fetchBenefitVersion()

    return () => {
      isMounted = false
    }
  }, [accessToken, employeeBenefitId, graphqlClient, t])

  const dateValidationErrors = useMemo(() => {
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

    return errors
  }, [endDate, selectedBenefit, t])

  const blockerMessages = useMemo(() => {
    const messages: string[] = []

    if (!employeeId) {
      messages.push(t('deactivate-benefit-missing-employee-context'))
    }

    if (!selectedBenefit) {
      messages.push(t('deactivate-benefit-missing-benefit'))
    } else if (!employeeBenefitId) {
      messages.push(t('deactivate-benefit-missing-employee-benefit'))
    }

    if (isVersionLoading) {
      messages.push(t('deactivate-benefit-version-loading'))
    } else if (versionError) {
      messages.push(versionError)
    }

    return [...messages, ...dateValidationErrors]
  }, [dateValidationErrors, employeeBenefitId, employeeId, isVersionLoading, selectedBenefit, t, versionError])

  const validateForm = useCallback(() => {
    return blockerMessages.length > 0 ? blockerMessages : null
  }, [blockerMessages])

  const isFormValid = useMemo(() => {
    if (blockerMessages.length > 0) {
      return false
    }

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

    return typeof benefitVersion === 'number'
  }, [benefitVersion, blockerMessages.length, endDate, selectedBenefit])

  const buildSubmitPayload = useCallback(async () => {
    if (!selectedBenefit) {
      throw new Error('No benefit selected')
    }

    if (!selectedBenefit.employeeBenefitId) {
      throw new Error('Employee benefit ID is missing')
    }

    if (typeof benefitVersion !== 'number') {
      throw new TypeError('Benefit version is invalid or missing')
    }

    // Build and return payload for Kogito process
    // Format endDate to YYYY-MM-DD (remove time component if present)
    const formattedEndDate = endDate.includes('T') ? endDate.split('T')[0] : endDate

    return {
      event: 'pse_submit',
      employeeBenefit: {
        id: selectedBenefit.employeeBenefitId,
        employee: employeeId,
        version: benefitVersion,
        endDate: formattedEndDate
      }
    }
  }, [benefitVersion, employeeId, selectedBenefit, endDate])

  return {
    employeeProfile,
    employeePosition,
    selectedBenefit,
    employeeId,
    endDate,
    setEndDate,
    minEndDate,
    blockerMessages,
    isVersionLoading,
    isFormValid,
    validateForm,
    buildSubmitPayload,
    markAsCancelled,
    markAsSubmitted
  }
}
