import { useState, useMemo, useEffect } from 'react'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_EMPLOYEE_NAME,
  GET_INITIATOR_EMPLOYEE_NAME,
  BENEFIT_TYPE_CATALOG_QUERY,
  BENEFIT_PROVIDER_CATALOG_QUERY
} from '../DeactivateEmployeeBenefitReviewQueries'
import { buildBenefitDisplayItems, buildDeactivationDetails } from '../buildRows'
import type { DeactivateBenefitReviewPayload, BenefitDisplayItem, DeactivationDetails } from '../types'

interface CatalogEntry {
  id: string
  code: string
  value: string
  displayOrder?: number | null
  objectValue?: unknown
  translations?: Array<{
    localeCode: string
    value: string
    objectValue?: unknown
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
  const graphqlClient = useGraphQLClient(accessToken)
  const [employeeName, setEmployeeName] = useState<string>('')
  const [initiatorName, setInitiatorName] = useState<string>('')
  const [benefitTypeEntry, setBenefitTypeEntry] = useState<CatalogEntry | null>(null)
  const [providerEntry, setProviderEntry] = useState<CatalogEntry | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(false)
  const [isLoadingBenefitType, setIsLoadingBenefitType] = useState(false)
  const [isLoadingProvider, setIsLoadingProvider] = useState(false)
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
  useEffect(() => {
    let cancelled = false

    const fetchEmployeeData = async () => {
      if (!accessToken || !employeeIdFromPayload) {
        return
      }

      setIsLoadingEmployee(true)
      setError(null)

      try {
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
      } catch {
        if (cancelled) return
        setError('Failed to load employee data')
      } finally {
        if (!cancelled) {
          setIsLoadingEmployee(false)
        }
      }
    }

    fetchEmployeeData()

    return () => {
      cancelled = true
    }
  }, [accessToken, employeeIdFromPayload])

  // Fetch initiator employee name (employee who requested deactivation)
  useEffect(() => {
    let cancelled = false

    const fetchInitiatorData = async () => {
      if (!initiatorEmployeeId) {
        return
      }

      try {
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
        if (cancelled) return
        // Silently fail for initiator - not critical
      }
    }

    fetchInitiatorData()

    return () => {
      cancelled = true
    }
  }, [initiatorEmployeeId])

  // Fetch benefit type catalog entry
  useEffect(() => {
    let cancelled = false

    const fetchBenefitTypeData = async () => {
      if (!accessToken || !benefitData?.benefitTypeRef) {
        return
      }

      setIsLoadingBenefitType(true)

      try {
        const result = await graphqlClient.request<{ CatalogEntry: CatalogEntry[] }>(BENEFIT_TYPE_CATALOG_QUERY, {
          benefitTypeRef: benefitData.benefitTypeRef
        })

        if (cancelled) return

        setBenefitTypeEntry(result?.CatalogEntry?.[0] || null)
      } catch {
        if (cancelled) return
        // Silently fail for catalog - not critical
      } finally {
        if (!cancelled) {
          setIsLoadingBenefitType(false)
        }
      }
    }

    fetchBenefitTypeData()

    return () => {
      cancelled = true
    }
  }, [accessToken, benefitData?.benefitTypeRef])

  // Fetch provider catalog entry
  useEffect(() => {
    let cancelled = false

    const fetchProviderData = async () => {
      if (!accessToken || !benefitData?.benefitProviderRef) {
        return
      }

      setIsLoadingProvider(true)

      try {
        const result = await graphqlClient.request<{ CatalogEntry: CatalogEntry[] }>(BENEFIT_PROVIDER_CATALOG_QUERY, {
          benefitProviderRef: benefitData.benefitProviderRef
        })

        if (cancelled) return

        setProviderEntry(result?.CatalogEntry?.[0] || null)
      } catch {
        if (cancelled) return
        // Silently fail for catalog - not critical
      } finally {
        if (!cancelled) {
          setIsLoadingProvider(false)
        }
      }
    }

    fetchProviderData()

    return () => {
      cancelled = true
    }
  }, [accessToken, benefitData?.benefitProviderRef])

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
    isLoading: isLoadingEmployee || isLoadingBenefitType || isLoadingProvider,
    error
  }
}
