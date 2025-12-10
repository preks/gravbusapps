import { useEffect, useState, useMemo } from 'react'
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
  const graphqlClient = useGraphQLClient(accessToken)
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
  useEffect(() => {
    let cancelled = false
    const fetchName = async () => {
      setIsLoading(true)
      try {
        if (!accessToken || !employeeIdFromPayload) {
          setIsLoading(false)
          return
        }
        const result = await graphqlClient.request<{
          employee: { firstName: string; lastName: string; pictureThumbnail?: string }
          EmployeePosition?: Array<{ jobPosition?: { name?: string } }>
        }>(GET_EMPLOYEE_NAME, { employeeId: employeeIdFromPayload })
        if (cancelled) return
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
        setIsLoading(false)
      } catch {
        if (!cancelled) {
          setError('Failed to load employee data')
          setIsLoading(false)
        }
      }
    }
    fetchName()
    return () => {
      cancelled = true
    }
  }, [accessToken, employeeIdFromPayload, graphqlClient])

  // Fetch initiator employee name (who created the request)
  useEffect(() => {
    let cancelled = false
    const fetchInitiatorName = async () => {
      try {
        if (!accessToken || !initiatorEmployeeId) return
        const result = await graphqlClient.request<{ initiator: { firstName: string; lastName: string } }>(
          GET_INITIATOR_EMPLOYEE_NAME,
          { initiatorEmployeeId }
        )
        if (cancelled) return
        const initiator = result?.initiator
        if (initiator) {
          setInitiatorName(`${initiator.firstName || ''} ${initiator.lastName || ''}`.trim())
        }
      } catch {
        // ignore
      }
    }
    fetchInitiatorName()
    return () => {
      cancelled = true
    }
  }, [accessToken, initiatorEmployeeId, graphqlClient])

  // Fetch benefit type catalog entry
  useEffect(() => {
    let cancelled = false
    const fetchBenefitType = async () => {
      try {
        if (!accessToken || !benefitData?.benefitTypeRef) return
        const result = await graphqlClient.request<{ CatalogEntry: CatalogEntry[] }>(BENEFIT_TYPE_CATALOG_QUERY, {
          benefitTypeRef: benefitData.benefitTypeRef
        })
        if (cancelled) return
        setBenefitTypeEntry(result?.CatalogEntry?.[0] || null)
      } catch {
        // ignore
      }
    }
    fetchBenefitType()
    return () => {
      cancelled = true
    }
  }, [accessToken, benefitData?.benefitTypeRef, graphqlClient])

  // Fetch provider catalog entry
  useEffect(() => {
    let cancelled = false
    const fetchProvider = async () => {
      try {
        if (!accessToken || !benefitData?.benefitProviderRef) return
        const result = await graphqlClient.request<{ CatalogEntry: CatalogEntry[] }>(BENEFIT_PROVIDER_CATALOG_QUERY, {
          benefitProviderRef: benefitData.benefitProviderRef
        })
        if (cancelled) return
        setProviderEntry(result?.CatalogEntry?.[0] || null)
      } catch {
        // ignore
      }
    }
    fetchProvider()
    return () => {
      cancelled = true
    }
  }, [accessToken, benefitData?.benefitProviderRef, graphqlClient])

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
