import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

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

export interface EmployeePerformanceData {
  headerData: EmployeeHeaderData | null
  isLoading: boolean
  error: string | null
}

export const useEmployeePerformanceData = (accessToken: string, employeeId: string) => {
  const [data, setData] = useState<EmployeePerformanceData>({
    headerData: null,
    isLoading: true,
    error: null
  })

  const graphqlClient = useGraphQLClient(accessToken)

  const extractCommunicationData = (
    communication: Array<{
      value: string
      channel?: { code?: string; value?: string }
    }> = []
  ) => {
    let email: string | undefined
    let phone: string | undefined
    let mobile: string | undefined

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

  const fetchEmployeeHeaderData = useCallback(async () => {
    if (!accessToken || !employeeId) return

    setData(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const query = `
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

          wonOpportunities: Opportunity(
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
          }
        }
      `

      const result = await graphqlClient.request<{
        EmployeePosition: Array<{
          id: string
          employeeId: string
          hireDate?: string
          firstName: string
          lastName: string
          jobPosition?: { name: string }
          organizationalUnit?: { name: string }
          siteLocation?: { name: string; country?: { value: string } }
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
              channel?: { code: string; value: string }
              type?: { value: string }
            }>
            workingCondition?: Array<{ hireDate?: string }>
          }
        }>
        wonOpportunities: Array<{
          id: string
          estimatedAmount?: number
          currencyRef?: string
        }>
      }>(query, { employeeId })

      let headerData: EmployeeHeaderData | null = null

      if (result.EmployeePosition?.[0]?.employee) {
        const employeePosition = result.EmployeePosition[0]
        const { email, phone, mobile } = extractCommunicationData(employeePosition.employee.communication)

        const totalSales = result.wonOpportunities.reduce((sum, opp) => sum + (opp.estimatedAmount || 0), 0)
        const currencyId = result.wonOpportunities[0]?.currencyRef?.split(':').pop() || 'EUR'

        headerData = {
          id: employeePosition.employee.id,
          firstName: employeePosition.employee.firstName,
          lastName: employeePosition.employee.lastName,
          displayName: employeePosition.employee.displayName,
          email,
          phone,
          mobile,
          jobPosition: employeePosition.jobPosition?.name,
          businessUnit: employeePosition.organizationalUnit?.name,
          managerName: employeePosition.supervisor?.displayName,
          managerPicture: employeePosition.supervisor?.pictureThumbnail,
          managerId: employeePosition.supervisor?.id,
          startDate: employeePosition.hireDate || employeePosition.employee.workingCondition?.[0]?.hireDate,
          country: employeePosition.siteLocation?.country?.value,
          totalSales,
          currencyId,
          pictureThumbnail: employeePosition.employee.pictureThumbnail
        }
      }

      setData({
        headerData,
        isLoading: false,
        error: null
      })
    } catch (fetchError) {
      console.error('Error fetching employee performance data:', fetchError)
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: fetchError instanceof Error ? fetchError.message : 'Failed to fetch employee performance data'
      }))
    }
  }, [accessToken, employeeId, graphqlClient])

  useEffect(() => {
    fetchEmployeeHeaderData().catch(() => undefined)
  }, [fetchEmployeeHeaderData])

  return {
    ...data,
    refetch: fetchEmployeeHeaderData
  }
}
