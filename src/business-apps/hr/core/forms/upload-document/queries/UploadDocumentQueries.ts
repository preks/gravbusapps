import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import type { EmployeeDetailsData } from '@/business-apps/hr/core/details/employee-details/types'

// Special UUID used only when form is opened without a concrete employeeId.
// We still need a non-null uuid! for the GraphQL variable, but Employee will
// simply not be found while documentGroup/documentType lookups still work.
const FALLBACK_EMPLOYEE_ID_FOR_LOOKUPS = '11111111-1111-1111-1111-111111111111'

export const GET_UPLOAD_DOCUMENT_LOOKUPS = `
  query MyQuery($id: uuid!, $activeUserLocale: String!) {
    Employee(where: {id: {_eq: $id}, isDeleted: {_eq: false}}) {
      id
      firstName
      lastName
      pictureThumbnail
      employeePosition {
        jobPosition {
          name
        }
      }
      businessPartnerPerson { id lastName firstName userId }
    }
    documentGroup: CatalogEntry(
      where: {
        catalog: { version: { _eq: "v1" }, identifier: { _eq: "DocumentGroup" } }
        additionalValue1: { _eq: "HRM" }
      }
    ) {
      id
      value
      translations(where: { localeCode: { _eq: $activeUserLocale } }) { localeCode value }
      catalog { defaultLocale }
    }
    documentType: CatalogEntry(
      where: { catalog: { version: { _eq: "v1" }, identifier: { _eq: "DocumentType" } } }
    ) {
      id
      value
      translations(where: { localeCode: { _eq: $activeUserLocale } }) { localeCode value }
      catalog { defaultLocale }
      parentEntryId
    }
  }
`

export interface CatalogOption {
  id: string
  label: string
  value: string
}

export interface CatalogTypeOption extends CatalogOption {
  parentEntryId?: string | null
}

export const useUploadDocumentLookups = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const [groups, setGroups] = useState<CatalogOption[]>([])
  const [types, setTypes] = useState<CatalogTypeOption[]>([])
  const [employee, setEmployee] = useState<Pick<
    EmployeeDetailsData,
    'id' | 'firstName' | 'lastName' | 'pictureThumbnail' | 'employeePosition'
  > | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const employeeId = useMemo(() => {
    const fromFlow =
      (context as any)?.additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId ||
      (context as any)?.additionalData?.employeeId ||
      ''
    return fromFlow || context.userInfo?.employeeDetails?.employeeId || ''
  }, [context.userInfo?.employeeDetails?.employeeId, context.additionalData])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const locale = getCurrentActiveUserLocale() || 'en-US'
      const effectiveEmployeeId =
        employeeId && employeeId.trim().length > 0 ? employeeId : FALLBACK_EMPLOYEE_ID_FOR_LOOKUPS

      const res = await graphqlClient.request<any>(GET_UPLOAD_DOCUMENT_LOOKUPS, {
        id: effectiveEmployeeId,
        activeUserLocale: locale
      })

      const toLabel = (entry: any): string => entry?.translations?.[0]?.value || entry?.value || ''

      const mappedGroups: CatalogOption[] = (res?.documentGroup || []).map((g: any) => ({
        id: g.id,
        value: g.value,
        label: toLabel(g)
      }))
      const mappedTypes: CatalogTypeOption[] = (res?.documentType || []).map((t: any) => ({
        id: t.id,
        value: t.value,
        label: toLabel(t),
        parentEntryId: t.parentEntryId || null
      }))

      const employeeData = (res?.Employee || [])[0]
      if (employeeData) {
        setEmployee({
          id: employeeData.id,
          firstName: employeeData.firstName,
          lastName: employeeData.lastName,
          pictureThumbnail: employeeData.pictureThumbnail,
          employeePosition: employeeData.employeePosition
        })
      }

      setGroups(mappedGroups)
      setTypes(mappedTypes)
    } catch (e: any) {
      setError(e?.message || 'Failed to load lookups')
    } finally {
      setLoading(false)
    }
  }, [employeeId, graphqlClient])

  useEffect(() => {
    load()
  }, [load])

  return { groups, types, employee, loading, error, refetch: load }
}
