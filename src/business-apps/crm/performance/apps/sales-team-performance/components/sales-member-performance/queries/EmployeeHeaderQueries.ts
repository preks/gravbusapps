import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface EmployeeHeaderData {
  id: string
  firstName: string
  lastName: string
  displayName: string
  email?: string
  phone?: string
  mobile?: string
  jobPosition?: string
  businessUnit?: string
  managerName?: string
  managerPicture?: string
  managerId?: string
  startDate?: string
  country?: string
  totalSales: number
  currencyId: string
  pictureThumbnail?: string
}

export interface EmployeeHeaderQueryResult {
  id: string
  employeeId: string
  hireDate?: string
  firstName: string
  lastName: string
  jobPosition?: {
    name: string
  }
  organizationalUnit?: {
    name: string
  }
  siteLocation?: {
    name: string
    country?: {
      value: string
    }
  }
  supervisor?: {
    id: string
    firstName: string
    lastName: string
    displayName: string
    pictureThumbnail?: string
  }
  employee: {
    id: string
    firstName: string
    lastName: string
    displayName: string
    pictureThumbnail?: string
    communication?: Array<{
      value: string
      channel?: {
        code: string
        value: string
      }
      type?: {
        value: string
      }
    }>
    workingCondition?: Array<{
      hireDate?: string
    }>
  }
}

export interface OpportunityHeaderData {
  id: string
  estimatedAmount?: number
  currencyRef?: string
  opportunityStatus?: {
    value?: string
  }
  ownerEmployeeId?: string
}

// Query to get employee header data for a specific employee
export const GET_EMPLOYEE_HEADER_DATA = `
  query GetEmployeeHeaderData($employeeId: uuid!) {
    EmployeePosition(
      where: { 
        employeeId: { _eq: $employeeId }
      }
      limit: 1
    ) {
      id
      employeeId
      hireDate
      firstName
      lastName
      jobPosition {
        name
      }
      organizationalUnit {
        name
      }
      siteLocation {
        name
        country {
          value
        }
      }
      supervisor {
        id
        firstName
        lastName
        displayName
        pictureThumbnail
      }
      employee {
        id
        firstName
        lastName
        displayName
        pictureThumbnail
        communication(where: { isDeleted: { _eq: false } }) {
          value
          channel {
            code
            value
          }
          type {
            value
          }
        }
        workingCondition {
          hireDate
        }
      }
    }
  }
`

// Query to get opportunity totals for a specific employee (reused from team list)
export const GET_EMPLOYEE_OPPORTUNITY_TOTALS = `
  query GetEmployeeOpportunityTotals($employeeId: uuid!) {
    Opportunity(
      where: {
        isDeleted: { _eq: false }
        ownerEmployeeId: { _eq: $employeeId }
        estimatedAmount: { _isNull: false }
        opportunityStatus: { code: { _eq: "WON" } }
      }
    ) {
      id
      estimatedAmount
      currencyRef
      opportunityStatus {
        code
        value
      }
      ownerEmployeeId
    }
  }
`

export const useEmployeeHeaderQueries = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  // Helper function to extract communication data
  const extractCommunicationData = (employee: EmployeeHeaderQueryResult['employee']) => {
    // Add null check for employee
    if (!employee) {
      return { email: undefined, phone: undefined, mobile: undefined }
    }

    const communication = employee.communication || []
    let email: string | undefined = undefined
    let phone: string | undefined = undefined
    let mobile: string | undefined = undefined

    // Extract from communication array ONLY (structured data)
    communication.forEach(comm => {
      const channelValue = comm.channel?.value?.toLowerCase() || comm.channel?.code?.toLowerCase()
      const value = comm.value

      if (!channelValue || !value) return

      if (channelValue === 'email' || channelValue === 'e-mail') {
        email = value
      } else if (channelValue === 'phone' || channelValue === 'telephone') {
        phone = value
      } else if (channelValue === 'mobile' || channelValue === 'cell' || channelValue === 'cellular') {
        mobile = value
      }
    })

    return { email, phone, mobile }
  }

  // Helper function to transform query result to EmployeeHeaderData
  const transformEmployeeHeaderData = (
    queryResult: EmployeeHeaderQueryResult,
    totalSales: number = 0,
    currencyId: string = 'EUR'
  ): EmployeeHeaderData => {
    // Add null check for queryResult.employee
    if (!queryResult.employee) {
      throw new Error('Employee data is missing from query result')
    }

    const { email, phone, mobile } = extractCommunicationData(queryResult.employee)

    return {
      id: queryResult.employee.id,
      firstName: queryResult.employee.firstName,
      lastName: queryResult.employee.lastName,
      displayName: queryResult.employee.displayName,
      email,
      phone,
      mobile,
      jobPosition: queryResult.jobPosition?.name,
      businessUnit: queryResult.organizationalUnit?.name,
      managerName: queryResult.supervisor?.displayName,
      managerPicture: queryResult.supervisor?.pictureThumbnail,
      managerId: queryResult.supervisor?.id,
      startDate: queryResult.hireDate || queryResult.employee.workingCondition?.[0]?.hireDate,
      country: queryResult.siteLocation?.country?.value,
      totalSales,
      currencyId,
      pictureThumbnail: queryResult.employee.pictureThumbnail
    }
  }

  const fetchEmployeeOpportunityTotals = useCallback(
    async (employeeId: string) => {
      try {
        const result = await graphqlClient.request<{
          Opportunity: OpportunityHeaderData[]
        }>(GET_EMPLOYEE_OPPORTUNITY_TOTALS, { employeeId })
        return result.Opportunity || []
      } catch (error) {
        console.error('Error fetching employee opportunity totals:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchEmployeeHeaderData = useCallback(
    async (employeeId: string) => {
      try {
        const result = await graphqlClient.request<{
          EmployeePosition: EmployeeHeaderQueryResult[]
        }>(GET_EMPLOYEE_HEADER_DATA, { employeeId })

        if (!result.EmployeePosition?.[0]) {
          return null
        }

        // Also fetch opportunity totals to calculate total sales
        const opportunities = await fetchEmployeeOpportunityTotals(employeeId)
        const totalSales = opportunities.reduce((sum, opp) => sum + (opp.estimatedAmount || 0), 0)
        const currencyId = opportunities[0]?.currencyRef || 'EUR'

        return transformEmployeeHeaderData(result.EmployeePosition[0], totalSales, currencyId)
      } catch (error) {
        console.error('Error fetching employee header data:', error)
        throw error
      }
    },
    [graphqlClient, fetchEmployeeOpportunityTotals]
  )

  return {
    fetchEmployeeHeaderData,
    fetchEmployeeOpportunityTotals
  }
}
