import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface EmployeeAddress {
  id: string
  addressLine: any
  locality: string | null
  postalCode: string | null
  countryRef: string | null
}

export interface EmployeeEducation {
  id: string
  name: string | null
  institution: string | null
  degree: string | null
  description: string | null
  locality: string | null
  countryRef: string | null
  endDate: string | null
}

export interface EmployeeCertificate {
  id: string
  name: string | null
  institute: string | null
  validFrom: string | null
  validTo: string | null
}

export interface EmployeeData {
  id: string
  firstName: string
  lastName: string
  displayName: string | null
  birthDate: string | null
  birthName: string | null
  birthPlace: string | null
  children: number | null
  genderRef: string | null
  nationalityRef: string | null
  maritalStatusRef: string | null
  ethnicityRef: string | null
  academicTitleRef: string | null
  userId: string | null
  addresses: EmployeeAddress[]
  education: EmployeeEducation[]
  certificates: EmployeeCertificate[]
}

export interface EmployeeResponse {
  Employee: EmployeeData[]
}

export interface UseEmployeeByUserIdProps {
  accessToken: string
  userId?: string
}

export interface UseEmployeeByUserIdReturn {
  employee: EmployeeData | null
  employeeId: string | null
  loading: boolean
  error: string | null
  refetch: () => void
}

const GET_EMPLOYEE_BY_USER_ID = `
  query GetEmployeeByUserId($userId: String!) {
    Employee(
      where: { userId: { _eq: $userId }, isDeleted: { _eq: false } }
      limit: 1
    ) {
      id
      firstName
      lastName
      displayName
      birthDate
      birthName
      birthPlace
      children
      genderRef
      nationalityRef
      maritalStatusRef
      ethnicityRef
      academicTitleRef
      userId
      addresses(where: { isDeleted: { _eq: false } }) {
        id
        addressLine
        locality
        postalCode
        countryRef
      }
      education(where: { isDeleted: { _eq: false } }) {
        id
        name
        institution
        degree
        description
        locality
        countryRef
        endDate
      }
      certificates(where: { isDeleted: { _eq: false } }) {
        id
        name
        institute
        validFrom
        validTo
      }
    }
  }
`

/**
 * Custom hook for fetching a single employee by userId
 */
export const useEmployeeByUserId = ({ accessToken, userId }: UseEmployeeByUserIdProps): UseEmployeeByUserIdReturn => {
  const [employee, setEmployee] = useState<EmployeeData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchEmployeeByUserId = useCallback(async () => {
    if (!accessToken || !userId) {
      setEmployee(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<EmployeeResponse>(GET_EMPLOYEE_BY_USER_ID, {
        userId
      })

      if (result.Employee && result.Employee.length > 0) {
        setEmployee(result.Employee[0])
      } else {
        setEmployee(null)
      }
    } catch (err) {
      console.error('Error fetching employee by userId:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch employee')
      setEmployee(null)
    } finally {
      setLoading(false)
    }
  }, [accessToken, userId, graphqlClient])

  useEffect(() => {
    fetchEmployeeByUserId()
  }, [fetchEmployeeByUserId])

  return {
    employee,
    employeeId: employee?.id || null,
    loading,
    error,
    refetch: () => {
      void fetchEmployeeByUserId()
    }
  }
}
