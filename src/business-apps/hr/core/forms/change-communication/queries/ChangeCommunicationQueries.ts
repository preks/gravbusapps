import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export const GET_COMMUNICATION_LOOKUPS = `
  query fetchEmployee($idEmployee: uuid!, $activeUserLocale: String!) {
    EmployeeByPk(id: $idEmployee) {
      id
      firstName
      lastName
      pictureThumbnail
      communication(where: { isDeleted: { _eq: false } }) {
        id
        version
        channelRef
        purpose
        typeRef
        value
      }
    }
    EmployeePosition(where: { employeeId: { _eq: $idEmployee } }) {
      siteLocation { name }
      structureId
      jobPosition { name }
      organizationalUnit { id name }
    }
    commType: CatalogEntry(where: { catalog: { version: { _eq: "v1" }, identifier: { _eq: "CommunicationType" } }, isDeleted: { _eq: false } }) {
      id
      value
      displayOrder
      translations(where: { localeCode: { _eq: $activeUserLocale } }) {
        localeCode
        value
      }
      catalog { defaultLocale }
    }
    commChannel: CatalogEntry(where: { catalog: { version: { _eq: "v1" }, identifier: { _eq: "CommunicationChannel" } }, isDeleted: { _eq: false } }) {
      id
      value
      objectValue
      displayOrder
      translations(where: { localeCode: { _eq: $activeUserLocale } }) {
        localeCode
        value
      }
      catalog { defaultLocale }
    }
    documentGroup: CatalogEntry(where: { catalog: { version: { _eq: "v1" }, identifier: { _eq: "DocumentGroup" } }, isDeleted: { _eq: false } }) {
      id
      value
      code
    }
    documentType: CatalogEntry(where: { catalog: { version: { _eq: "v1" }, identifier: { _eq: "DocumentType" } }, isDeleted: { _eq: false } }) {
      id
      value
      code
    }
  }
`

export interface CatalogOption {
  id: string
  label: string
  value: string
}
export interface EmployeeCommunicationRecord {
  id?: string
  version?: number
  channelRef?: string
  purpose?: string
  typeRef?: string
  value?: string
}

/**
 * Map a CatalogEntry GraphQL row to a {@link CatalogOption} used by the dropdowns.
 * Exported for unit-testing.
 */
export function mapCatalogEntry(entry: {
  id: string
  value?: string
  displayOrder?: number | string | null
  translations?: Array<{ value?: string }>
}): CatalogOption & { displayOrder: number } {
  const raw = entry.displayOrder
  const displayOrder =
    typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : Number.POSITIVE_INFINITY
  return {
    id: entry.id,
    value: entry.value || '',
    label: entry.translations?.[0]?.value || entry.value || '',
    displayOrder: Number.isFinite(displayOrder) ? displayOrder : Number.POSITIVE_INFINITY
  }
}

/**
 * Map and order a list of CatalogEntry rows by their `displayOrder` field so that
 * dropdown options show in the order defined by the catalog maintainer (1, 2, 3, …).
 * Ties fall back to the localized label for a stable, predictable order.
 * Exported for unit-testing.
 */
export function mapAndSortCatalogEntries(
  entries: Array<{
    id: string
    value?: string
    displayOrder?: number | string | null
    translations?: Array<{ value?: string }>
  }> | null | undefined
): CatalogOption[] {
  if (!entries) return []
  return [...entries]
    .map(mapCatalogEntry)
    .sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder
      return (a.label || '').localeCompare(b.label || '')
    })
    .map(({ id, value, label }) => ({ id, value, label }))
}

export const useCommunicationLookups = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const [channels, setChannels] = useState<CatalogOption[]>([])
  const [types, setTypes] = useState<CatalogOption[]>([])
  const [communications, setCommunications] = useState<EmployeeCommunicationRecord[]>([])
  const [employee, setEmployee] = useState<{
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
    jobTitle?: string
  } | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const employeeId =
      (context as any)?.additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId ||
      context.userInfo?.employeeDetails?.employeeId
    const locale = getCurrentActiveUserLocale()
    if (!employeeId) return
    setLoading(true)
    setError(null)
    try {
      const res = await graphqlClient.request<any>(GET_COMMUNICATION_LOOKUPS, {
        idEmployee: employeeId,
        activeUserLocale: locale || 'en-US'
      })

      const hrChannels = res?.commChannel?.filter(
        (e: any) => e.objectValue && typeof e.objectValue === 'object' && e.objectValue.hr === true
      )
      setChannels(mapAndSortCatalogEntries(hrChannels))
      setTypes(mapAndSortCatalogEntries(res?.commType))
      setCommunications(Array.isArray(res?.EmployeeByPk?.communication) ? res.EmployeeByPk.communication : [])
      setEmployee({
        firstName: res?.EmployeeByPk?.firstName,
        lastName: res?.EmployeeByPk?.lastName,
        pictureThumbnail: res?.EmployeeByPk?.pictureThumbnail,
        jobTitle: res?.EmployeePosition?.[0]?.jobPosition?.name
      })
    } catch (e: any) {
      setError(e?.message || 'Failed to load communication lookups')
    } finally {
      setLoading(false)
    }
  }, [
    context.accessToken,
    context.userInfo?.employeeDetails?.employeeId,
    (context as any)?.additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId,
    graphqlClient
  ])

  useEffect(() => {
    load()
  }, [load])

  return { channels, types, communications, employee, loading, error, refetch: load }
}
