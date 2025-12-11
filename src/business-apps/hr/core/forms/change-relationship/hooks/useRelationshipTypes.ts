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
  relationships: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "EmployeeRelationships"}}}) {
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
  documentGroup: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "DocumentGroup"}}}) {
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
  documentType: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "DocumentType"}}}) {
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

export const useRelationshipTypes = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const [options, setOptions] = useState<SelectOption[]>([])
  const [relationships, setRelationships] = useState<EmployeeRelationship[]>([])
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

  return { options, relationships, employee, loading, error, refetch: fetchOptions }
}
