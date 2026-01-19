import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCallback } from 'react'

export interface AbsenceQueryVariables {
  structureId?: string
  limit?: number
  offset?: number
  year?: string
}

export interface AbsenceDataResponse {
  EmployeeAbsence: Array<{
    id: string
    activeFrom: string | null
    activeTo: string | null
    effectiveDays: number
    calendarDays: number
    description: string | null
    businessKey: string | null
    createdAt: string
    employee: {
      id: string
      firstName: string
      lastName: string
      businessKey?: string
    }
    employeeAbsenceRecords: Array<{
      id: string
      activeFrom: string | null
      activeTo: string | null
      effectiveDays: number
      calendarDays: number
      description: string | null
      businessKey: string | null
    }>
  }>
}

export interface AbsenceBalanceResponse {
  EmployeeAbsenceBalance: Array<{
    id: string
    absenceYear: string
    annualTotal: number
    approved: number
    pending: number
    planned: number
    remaining: number
    carryover: number
    businessKey: string | null
    employee: {
      id: string
      firstName: string
      lastName: string
      businessKey?: string
    }
  }>
}

export interface AbsenceTypesResponse {
  CatalogEntry: Array<{
    id: string
    code: string
    value: string
    parentEntryId: string | null
  }>
}

export interface AbsenceGroupsResponse {
  CatalogEntry: Array<{
    id: string
    code: string
    value: string
  }>
}

export const GET_ABSENCE_DATA = (): string => {
  return `
    query GetAbsenceData($limit: Int, $offset: Int) {
      EmployeeAbsence(
        limit: $limit
        offset: $offset
        orderBy: { createdAt: DESC }
        where: { 
          isDeleted: { _eq: false }
          effectiveDays: { _gt: 0 }
        }
      ) {
        id
        activeFrom
        activeTo
        effectiveDays
        calendarDays
        description
        businessKey
        createdAt
        employee {
          id
          firstName
          lastName
          businessKey
        }
        employeeAbsenceRecords {
          id
          activeFrom
          activeTo
          effectiveDays
          calendarDays
          description
          businessKey
        }
      }
    }
  `
}

export const GET_ABSENCE_BALANCE_DATA = (variables: AbsenceQueryVariables): string => {
  return `
    query GetAbsenceBalanceData($year: String, $limit: Int, $offset: Int) {
      EmployeeAbsenceBalance(
        limit: $limit
        offset: $offset
        orderBy: { createdAt: DESC }
        where: { 
          isDeleted: { _eq: false }
          ${variables.year ? `absenceYear: { _eq: $year }` : ''}
        }
      ) {
        id
        absenceYear
        annualTotal
        approved
        pending
        planned
        remaining
        carryover
        businessKey
        employee {
          id
          firstName
          lastName
          businessKey
        }
      }
    }
  `
}

export const GET_ABSENCE_TYPES = (): string => {
  return `
    query GetAbsenceTypes {
      CatalogEntry(
        where: { 
          catalog: { 
            identifier: { _eq: "AbsenceType" }
          }
        }
      ) {
        id
        code
        value
        parentEntryId
      }
    }
  `
}

export const GET_ABSENCE_GROUPS = (): string => {
  return `
    query GetAbsenceGroups {
      CatalogEntry(
        where: { 
          catalog: { 
            identifier: { _eq: "AbsenceGroup" }
          }
        }
      ) {
        id
        code
        value
      }
    }
  `
}

export const useGetAbsenceData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchAbsenceData = useCallback(
    async (
      variables: AbsenceQueryVariables = {
        limit: 1000,
        offset: 0
      }
    ): Promise<AbsenceDataResponse> => {
      const query = GET_ABSENCE_DATA()
      try {
        const result = await graphqlClient.request<AbsenceDataResponse>(query, variables)
        return result
      } catch (error) {
        console.error('Error fetching absence data:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchAbsenceBalanceData = useCallback(
    async (
      variables: AbsenceQueryVariables = {
        year: new Date().getFullYear().toString(),
        limit: 1000,
        offset: 0
      }
    ): Promise<AbsenceBalanceResponse> => {
      const query = GET_ABSENCE_BALANCE_DATA(variables)
      try {
        const result = await graphqlClient.request<AbsenceBalanceResponse>(query, variables)
        return result
      } catch (error) {
        console.error('Error fetching absence balance data:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchAbsenceTypes = useCallback(async (): Promise<AbsenceTypesResponse> => {
    const query = GET_ABSENCE_TYPES()
    try {
      const result = await graphqlClient.request<AbsenceTypesResponse>(query)
      return result
    } catch (error) {
      console.error('Error fetching absence types:', error)
      throw error
    }
  }, [graphqlClient])

  const fetchAbsenceGroups = useCallback(async (): Promise<AbsenceGroupsResponse> => {
    const query = GET_ABSENCE_GROUPS()
    try {
      const result = await graphqlClient.request<AbsenceGroupsResponse>(query)
      return result
    } catch (error) {
      console.error('Error fetching absence groups:', error)
      throw error
    }
  }, [graphqlClient])

  return {
    fetchAbsenceData,
    fetchAbsenceBalanceData,
    fetchAbsenceTypes,
    fetchAbsenceGroups
  }
}
