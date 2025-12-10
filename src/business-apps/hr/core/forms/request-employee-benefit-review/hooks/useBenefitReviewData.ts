import { useState, useMemo, useCallback } from 'react'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import {
  GET_EMPLOYEE_NAME,
  GET_INITIATOR_EMPLOYEE_NAME,
  BENEFIT_TYPE_CATALOG_QUERY,
  BENEFIT_PROVIDER_CATALOG_QUERY
} from '../RequestEmployeeBenefitReviewQueries'
import { buildBenefitDisplayItems, buildBenefitDetails } from '../buildRows'
import type { BenefitReviewPayload, BenefitDisplayItem } from '../types'
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

interface UseBenefitReviewDataParams {
  accessToken: string | undefined
  additionalData: unknown
  userInfo: { employeeDetails?: { employeeId?: string } } | undefined
  t: (key: string, options?: { defaultValue?: string }) => string
}

interface UseBenefitReviewDataReturn {
  employeeName: string
  initiatorName: string
  displayItems: BenefitDisplayItem[]
  benefitDetails: { justification?: string } | null
  employee?: {
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
    jobTitle?: string
  }
  isLoading: boolean
  error: string | null
}

export const useBenefitReviewData = ({
  accessToken,
  additionalData,
  userInfo,
  t
}: UseBenefitReviewDataParams): UseBenefitReviewDataReturn => {
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

  // Extract payload data
  const payload: BenefitReviewPayload = (additionalData as any)?.psi_taskPayload || {}
  const benefitData = payload?.employeeBenefit || {}

  // Determine employee ID with fallback priority
  const employeeIdFromPayload: string | undefined =
    payload?.employeeId || benefitData?.employee || userInfo?.employeeDetails?.employeeId

  // Initiator employee ID
  const initiatorEmployeeId: string | undefined = payload?.initiatorEmployeeId

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

  const { isLoading: isLoadingEmployee, error: employeeError } = useGraphQLFetch({
    accessToken,
    query: GET_EMPLOYEE_NAME,
    variables: { employeeId: employeeIdFromPayload },
    enabled: !!employeeIdFromPayload,
    onSuccess: handleEmployeeSuccess,
    onError: () => setError('Failed to load employee data')
  })

  // Fetch initiator employee name (who created the request)
  const handleInitiatorSuccess = useCallback((result: { initiator: { firstName: string; lastName: string } }) => {
    const initiator = result?.initiator
    if (initiator) {
      setInitiatorName(`${initiator.firstName || ''} ${initiator.lastName || ''}`.trim())
    }
  }, [])

  useGraphQLFetch({
    accessToken,
    query: GET_INITIATOR_EMPLOYEE_NAME,
    variables: { initiatorEmployeeId },
    enabled: !!initiatorEmployeeId,
    onSuccess: handleInitiatorSuccess
  })

  // Fetch benefit type catalog entry
  const handleBenefitTypeSuccess = useCallback((result: { CatalogEntry: CatalogEntry[] }) => {
    setBenefitTypeEntry(result?.CatalogEntry?.[0] || null)
  }, [])

  useGraphQLFetch({
    accessToken,
    query: BENEFIT_TYPE_CATALOG_QUERY,
    variables: { benefitTypeRef: benefitData?.benefitTypeRef },
    enabled: !!benefitData?.benefitTypeRef,
    onSuccess: handleBenefitTypeSuccess
  })

  // Fetch provider catalog entry
  const handleProviderSuccess = useCallback((result: { CatalogEntry: CatalogEntry[] }) => {
    setProviderEntry(result?.CatalogEntry?.[0] || null)
  }, [])

  useGraphQLFetch({
    accessToken,
    query: BENEFIT_PROVIDER_CATALOG_QUERY,
    variables: { benefitProviderRef: benefitData?.benefitProviderRef },
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

  // Build benefit details (for justification)
  const benefitDetails = useMemo(() => {
    if (!benefitData) return null
    return buildBenefitDetails({
      benefitData: benefitData as any,
      locale,
      benefitTypeEntry,
      providerEntry,
      t
    })
  }, [benefitData, locale, benefitTypeEntry, providerEntry, t])

  return {
    employeeName,
    initiatorName,
    displayItems,
    benefitDetails,
    employee,
    isLoading: isLoadingEmployee,
    error: error || (employeeError ? 'Failed to load employee data' : null)
  }
}
