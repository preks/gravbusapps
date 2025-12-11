import { useState, useEffect, useMemo, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import {
  GET_EMPLOYEE_NAME,
  GET_INITIATOR_EMPLOYEE_NAME,
  BENEFIT_TYPE_CATALOG_QUERY,
  BENEFIT_PROVIDER_CATALOG_QUERY
} from '../RequestEmployeeBenefitReviewQueries'
import { buildBenefitDisplayItems, buildBenefitDetails } from '../buildRows'
import type { BenefitReviewPayload, BenefitDisplayItem } from '../types'

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
  const [isLoading, setIsLoading] = useState(true)
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

  const graphqlClient = useGraphQLClient(accessToken)
  const locale = useMemo(() => getCurrentActiveUserLocale(), [])

  // Extract payload data
  const payload: BenefitReviewPayload = (additionalData as any)?.psi_taskPayload || {}
  const benefitData = payload?.employeeBenefit || {}

  // Determine employee ID with fallback priority
  const employeeIdFromPayload: string | undefined =
    payload?.employeeId || benefitData?.employee || userInfo?.employeeDetails?.employeeId

  // Initiator employee ID
  const initiatorEmployeeId: string | undefined = payload?.initiatorEmployeeId

  // Fetch affected employee data
  const fetchEmployeeData = useCallback(async () => {
    if (!employeeIdFromPayload) return
    try {
      const result = await graphqlClient.request<{
        employee: { firstName: string; lastName: string; pictureThumbnail?: string }
        EmployeePosition?: Array<{ jobPosition?: { name?: string } }>
      }>(GET_EMPLOYEE_NAME, { employeeId: employeeIdFromPayload })

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
    } catch (err) {
      console.error('Error fetching employee:', err)
    }
  }, [employeeIdFromPayload, graphqlClient])

  // Fetch initiator employee name
  const fetchInitiatorData = useCallback(async () => {
    if (!initiatorEmployeeId) return
    try {
      const result = await graphqlClient.request<{
        initiator: { firstName: string; lastName: string }
      }>(GET_INITIATOR_EMPLOYEE_NAME, { initiatorEmployeeId })

      const initiator = result?.initiator
      if (initiator) {
        setInitiatorName(`${initiator.firstName || ''} ${initiator.lastName || ''}`.trim())
      }
    } catch (err) {
      console.error('Error fetching initiator:', err)
    }
  }, [initiatorEmployeeId, graphqlClient])

  // Fetch benefit type catalog entry
  const fetchBenefitTypeData = useCallback(async () => {
    if (!benefitData?.benefitTypeRef) return
    try {
      const result = await graphqlClient.request<{ CatalogEntry: CatalogEntry[] }>(BENEFIT_TYPE_CATALOG_QUERY, {
        benefitTypeRef: benefitData.benefitTypeRef
      })
      setBenefitTypeEntry(result?.CatalogEntry?.[0] || null)
    } catch (err) {
      console.error('Error fetching benefit type:', err)
    }
  }, [graphqlClient, benefitData?.benefitTypeRef])

  // Fetch provider catalog entry
  const fetchProviderData = useCallback(async () => {
    if (!benefitData?.benefitProviderRef) return
    try {
      const result = await graphqlClient.request<{ CatalogEntry: CatalogEntry[] }>(BENEFIT_PROVIDER_CATALOG_QUERY, {
        benefitProviderRef: benefitData.benefitProviderRef
      })
      setProviderEntry(result?.CatalogEntry?.[0] || null)
    } catch (err) {
      console.error('Error fetching provider:', err)
    }
  }, [graphqlClient, benefitData?.benefitProviderRef])

  // Fetch all data
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      await Promise.all([fetchEmployeeData(), fetchInitiatorData(), fetchBenefitTypeData(), fetchProviderData()])
    } catch (err) {
      console.error('Error in useBenefitReviewData:', err)
      setError(err instanceof Error ? err.message : 'Failed to load benefit review data')
    } finally {
      setIsLoading(false)
    }
  }, [fetchEmployeeData, fetchInitiatorData, fetchBenefitTypeData, fetchProviderData])

  useEffect(() => {
    if (accessToken) {
      fetchData()
    }
  }, [accessToken, fetchData])

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
    isLoading,
    error
  }
}
