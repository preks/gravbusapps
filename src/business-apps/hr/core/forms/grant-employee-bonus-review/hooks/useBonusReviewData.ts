import { useEffect, useState, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import {
  GET_EMPLOYEE_NAME,
  GET_INITIATOR_EMPLOYEE_NAME,
  BONUS_TYPE_CATALOG_QUERY
} from '../GrantEmployeeBonusReviewQueries'
import { buildBonusDisplayItems, buildBonusDetails } from '../buildRows'
import type { BonusGrantPayload, BonusDisplayItem } from '../types'

interface BonusTypeEntry {
  id: string
  code: string
  value: string
  displayOrder: number | null
  translations: Array<{
    localeCode: string
    value: string
  }>
  catalog: {
    identifier: string
    version: string
    defaultLocale: string
  }
}

interface UseBonusReviewDataParams {
  accessToken: string | undefined
  additionalData: unknown
  userInfo: { employeeDetails?: { employeeId?: string } } | undefined
  t: (key: string, options?: { defaultValue?: string }) => string
}

interface UseBonusReviewDataReturn {
  employeeName: string
  initiatorName: string
  displayItems: BonusDisplayItem[]
  bonusDetails: { description?: string; notes?: string } | null
  employee?: {
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
    jobTitle?: string
  }
}

export const useBonusReviewData = ({
  accessToken,
  additionalData,
  userInfo,
  t
}: UseBonusReviewDataParams): UseBonusReviewDataReturn => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [employeeName, setEmployeeName] = useState<string>('')
  const [initiatorName, setInitiatorName] = useState<string>('')
  const [bonusTypeEntries, setBonusTypeEntries] = useState<BonusTypeEntry[]>([])
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
  const payload: BonusGrantPayload = (additionalData as any)?.psi_taskPayload || {}
  const bonusData = payload?.employeeBonus || {}

  // Determine employee ID with fallback priority
  const employeeIdFromPayload: string | undefined =
    payload?.employeeId || bonusData?.employee || userInfo?.employeeDetails?.employeeId

  // Initiator employee ID
  const initiatorEmployeeId: string | undefined = payload?.initiatorEmployeeId

  // Fetch affected employee name
  useEffect(() => {
    let cancelled = false
    const fetchName = async () => {
      try {
        if (!accessToken || !employeeIdFromPayload) return
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
        // ignore
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

  // Fetch bonus type catalog
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        if (!accessToken) return
        const result = await graphqlClient.request<{ CatalogEntry: BonusTypeEntry[] }>(BONUS_TYPE_CATALOG_QUERY)
        setBonusTypeEntries(result?.CatalogEntry || [])
      } catch {
        // ignore
      }
    }
    fetchCatalog()
  }, [accessToken, graphqlClient])

  // Build bonus display items (simple list, not comparison)
  const displayItems = useMemo(() => {
    if (!bonusData) return []
    return buildBonusDisplayItems({
      bonusData: bonusData as any,
      locale,
      bonusTypeEntries,
      t
    })
  }, [bonusData, locale, bonusTypeEntries, t])

  // Build bonus details (for description/notes)
  const bonusDetails = useMemo(() => {
    if (!bonusData) return null
    return buildBonusDetails({
      bonusData: bonusData as any,
      locale,
      bonusTypeEntries,
      t
    })
  }, [bonusData, locale, bonusTypeEntries, t])

  return {
    employeeName,
    initiatorName,
    displayItems,
    bonusDetails,
    employee
  }
}
