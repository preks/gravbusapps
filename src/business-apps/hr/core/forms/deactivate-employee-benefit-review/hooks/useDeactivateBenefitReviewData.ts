import { useState, useMemo, useCallback } from 'react'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import {
  GET_EMPLOYEE_NAME,
  GET_INITIATOR_EMPLOYEE_NAME,
  BENEFIT_TYPE_CATALOG_QUERY,
  BENEFIT_PROVIDER_CATALOG_QUERY
} from '../DeactivateEmployeeBenefitReviewQueries'
import { buildBenefitDisplayItems, buildDeactivationDetails } from '../buildRows'
import type { DeactivateBenefitReviewPayload, BenefitDisplayItem, DeactivationDetails } from '../types'
import { useGraphQLFetch } from './useGraphQLFetch'

interface CatalogEntry {
  id: string
  code: string
  value: string
  displayOrder?: number | null
  translations?: Array<{
    localeCode: string
    value: string
  }>
  catalog?: {
    identifier: string
    version: string
    defaultLocale: string
  }
}

interface UseDeactivateBenefitReviewDataParams {
  accessToken: string | undefined
  additionalData: unknown
  userInfo: { employeeDetails?: { employeeId?: string } } | undefined
  t: (key: string, options?: { defaultValue?: string }) => string
}

interface UseDeactivateBenefitReviewDataReturn {
  employeeName: string
  initiatorName: string
  displayItems: BenefitDisplayItem[]
  deactivationDetails: DeactivationDetails | null
  employee?: {
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
    jobTitle?: string
  }
  isLoading: boolean
  error: string | null
}

export const useDeactivateBenefitReviewData = ({
  accessToken,
  additionalData,
  userInfo,
  t
}: UseDeactivateBenefitReviewDataParams): UseDeactivateBenefitReviewDataReturn => {
  const [employeeName, setEmployeeName] = useState<string>('')
  const [initiatorName, setInitiatorName] = useState<string>('')
  const [benefitTypeEntry, setBenefitTypeEntry] = useState<CatalogEntry | null>(null)
  const [providerEntry, setProviderEntry] = useState<CatalogEntry | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [employee, setEmployee] = useState<
    | {
        firstName?: string
        lastName?: string
        pictureThumbnail?: string
        jobTitle?: string
      }
    | undefined
  >(undefined)
  const locale = useMemo(() => getCurrentActiveUserLocale(), [])

  // Extract payload data - memoized to prevent infinite re-renders
  const payload: DeactivateBenefitReviewPayload = useMemo(
    () => (additionalData as any)?.psi_taskPayload || {},
    [additionalData]
  )

  const benefitData = useMemo(() => payload?.employeeBenefit || {}, [payload])

  // Determine employee ID with fallback priority - memoized to stabilize
  const employeeIdFromPayload: string | undefined = useMemo(
    () => payload?.employeeId || benefitData?.employee || userInfo?.employeeDetails?.employeeId,
    [payload?.employeeId, benefitData?.employee, userInfo?.employeeDetails?.employeeId]
  )

  // Initiator employee ID (employee who requested deactivation) - memoized
  const initiatorEmployeeId: string | undefined = useMemo(() => payload?.initiatorEmployeeId, [payload])

  // Fetch affected employee name
  const handleEmployeeSuccess = useCallback(
    (result: {
      employee: { firstName: string; lastName: string; pictureThumbnail?: string }
      EmployeePosition?: Array<{ jobPosition?: { name?: string } }>
    }) => {
      const emp = result?.employee
      if (emp) {
        setEmployeeName(`${emp.firstName || ''} ${emp.lastName || ''}`.trim())
        setEmployee({
          firstName: emp.firstName,
          lastName: emp.lastName,
          pictureThumbnail: emp.pictureThumbnail,
          jobTitle: result?.EmployeePosition?.[0]?.jobPosition?.name
        })
      }
    },
    []
  )

  const handleEmployeeError = useCallback(() => {
    setError('Failed to load employee data')
  }, [])

  const employeeVariables = useMemo(() => ({ employeeId: employeeIdFromPayload }), [employeeIdFromPayload])

  const { isLoading: isLoadingEmployee, error: employeeError } = useGraphQLFetch({
    accessToken,
    query: GET_EMPLOYEE_NAME,
    variables: employeeVariables,
    enabled: !!employeeIdFromPayload,
    onSuccess: handleEmployeeSuccess,
    onError: handleEmployeeError
  })

  // Fetch initiator employee name (employee who requested deactivation)
  const handleInitiatorSuccess = useCallback((result: { initiator: { firstName: string; lastName: string } }) => {
    const initiator = result?.initiator
    if (initiator) {
      setInitiatorName(`${initiator.firstName || ''} ${initiator.lastName || ''}`.trim())
    }
  }, [])

  const initiatorVariables = useMemo(() => ({ initiatorEmployeeId }), [initiatorEmployeeId])

  useGraphQLFetch({
    accessToken,
    query: GET_INITIATOR_EMPLOYEE_NAME,
    variables: initiatorVariables,
    enabled: !!initiatorEmployeeId,
    onSuccess: handleInitiatorSuccess
  })

  // Fetch benefit type catalog entry
  const handleBenefitTypeSuccess = useCallback((result: { CatalogEntry: CatalogEntry[] }) => {
    setBenefitTypeEntry(result?.CatalogEntry?.[0] || null)
  }, [])

  const benefitTypeVariables = useMemo(
    () => ({ benefitTypeRef: benefitData?.benefitTypeRef }),
    [benefitData?.benefitTypeRef]
  )

  useGraphQLFetch({
    accessToken,
    query: BENEFIT_TYPE_CATALOG_QUERY,
    variables: benefitTypeVariables,
    enabled: !!benefitData?.benefitTypeRef,
    onSuccess: handleBenefitTypeSuccess
  })

  // Fetch provider catalog entry
  const handleProviderSuccess = useCallback((result: { CatalogEntry: CatalogEntry[] }) => {
    setProviderEntry(result?.CatalogEntry?.[0] || null)
  }, [])

  const providerVariables = useMemo(
    () => ({ benefitProviderRef: benefitData?.benefitProviderRef }),
    [benefitData?.benefitProviderRef]
  )

  useGraphQLFetch({
    accessToken,
    query: BENEFIT_PROVIDER_CATALOG_QUERY,
    variables: providerVariables,
    enabled: !!benefitData?.benefitProviderRef,
    onSuccess: handleProviderSuccess
  })

  // Build benefit display items
  const displayItems = useMemo(() => {
    if (!benefitData) return []
    return buildBenefitDisplayItems({
      benefitData: benefitData as any,
      locale,
      benefitTypeEntry,
      providerEntry,
      t
    })
  }, [benefitData, locale, benefitTypeEntry, providerEntry, t])

  // Build deactivation details
  const deactivationDetails = useMemo(() => {
    if (!benefitData) return null
    return buildDeactivationDetails({
      benefitData: benefitData as any,
      t
    })
  }, [benefitData, t])

  return {
    employeeName,
    initiatorName,
    displayItems,
    deactivationDetails,
    employee,
    isLoading: isLoadingEmployee,
    error: error || (employeeError ? 'Failed to load employee data' : null)
  }
}
