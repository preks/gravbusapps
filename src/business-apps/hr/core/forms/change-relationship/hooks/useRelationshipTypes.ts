import { useCallback, useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export interface SelectOption {
  id: string
  label: string
  value: string
}

export interface EmployeeRelationship {
  id: string
  version?: number
  birthDate?: string | null
  email?: string | null
  employeeId?: string
  firstName?: string | null
  isEmergencyContact?: boolean | null
  phoneNumber?: string | null
  lastName?: string | null
  relationshipDocumentId?: string | null
  typeRef?: string | null
  notes?: string | null
}

export interface EmployeeCommunication {
  id: string
  channelRef?: string
  purpose?: string
  typeRef?: string
  value?: string
}

// GraphQL query to fetch relationship types from CatalogEntry (EmployeeRelationships)
export const GET_RELATIONSHIP_TYPES = `
 query fetchEmployee($idEmployee: uuid!, $activeUserLocale: String!) {
 EmployeeByPk(id: $idEmployee) {    
   id
   firstName
   lastName
   pictureThumbnail
   relationship {
    id
    version
    birthDate
    email
    employeeId
    firstName
    isEmergencyContact
    phoneNumber
    lastName
    relationshipDocumentId
    typeRef
    notes
   }
   communication {
    id
    channelRef
    purpose
    typeRef
    value
   }
 }
 EmployeePosition(where: {employeeId: {_eq: $idEmployee}}) {
    siteLocation{
      name
    }
    structureId
    jobPosition{
      name
    }
    organizationalUnit{
      id
      name
    }
  }
  relationships: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "EmployeeRelationships"}}, isDeleted: {_eq: false}}) {
    id
    value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
    code
  }
  documentGroup: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "DocumentGroup"}}, isDeleted: {_eq: false}}) {
    id
    value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
    code
  }
  documentType: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "DocumentType"}}, isDeleted: {_eq: false}}) {
    id
    value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
    code
  }
}
`

/**
 * Extracts the private phone number from employee communications.
 * Looks for a communication with channelRef containing "Phone" and purpose "Private".
 */
const getPrivatePhoneNumber = (communications: EmployeeCommunication[]): string | null => {
  if (!communications || communications.length === 0) return null

  // Find private phone communication (channelRef contains "Phone", purpose is "Private")
  const privatePhone = communications.find(comm => {
    const channelLower = (comm.channelRef || '').toLowerCase()
    const purposeLower = (comm.purpose || '').toLowerCase()
    const isPhone = channelLower.includes('phone') || channelLower.includes('mobile')
    const isPrivate = purposeLower === 'private'
    return isPhone && isPrivate
  })

  return privatePhone?.value || null
}

export const useRelationshipTypes = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const [options, setOptions] = useState<SelectOption[]>([])
  const [relationships, setRelationships] = useState<EmployeeRelationship[]>([])
  const [privatePhoneNumber, setPrivatePhoneNumber] = useState<string | null>(null)
  const [employee, setEmployee] = useState<{
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
    jobTitle?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOptions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const employeeId =
        (context as any)?.additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId ||
        context.userInfo?.employeeDetails?.employeeId
      if (!employeeId) {
        setOptions([])
        setRelationships([])
        setPrivatePhoneNumber(null)
        setLoading(false)
        return
      }
      const activeUserLocale = getCurrentActiveUserLocale() || 'en-US'
      const res = await graphqlClient.request<any>(GET_RELATIONSHIP_TYPES, {
        idEmployee: employeeId,
        activeUserLocale
      })
      const employeeRelationships = res?.EmployeeByPk?.relationship || []
      setRelationships(employeeRelationships)

      // Extract private phone number from communications
      const communications = res?.EmployeeByPk?.communication || []
      setPrivatePhoneNumber(getPrivatePhoneNumber(communications))

      const entries = res?.relationships || []
      setOptions(
        entries.map((e: any) => ({
          id: e.id,
          label: e.translations?.[0]?.value || e.value || e.code || '—',
          value: e.id
        }))
      )
      setEmployee({
        firstName: res?.EmployeeByPk?.firstName,
        lastName: res?.EmployeeByPk?.lastName,
        pictureThumbnail: res?.EmployeeByPk?.pictureThumbnail,
        jobTitle: res?.EmployeePosition?.[0]?.jobPosition?.name
      })
    } catch (e: any) {
      setError(e?.message || 'Failed to load relationship types')
    } finally {
      setLoading(false)
    }
  }, [
    context.userInfo?.employeeDetails?.employeeId,
    (context as any)?.additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId,
    graphqlClient
  ])

  useEffect(() => {
    if (context.accessToken) fetchOptions()
  }, [context.accessToken, fetchOptions])

  return { options, relationships, employee, privatePhoneNumber, loading, error, refetch: fetchOptions }
}
