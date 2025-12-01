import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { calculateTrend, getCurrentAndPreviousMonthDates } from '../../../utils/trendCalculations'

export type TrendDirection = 'up' | 'down' | 'stable'

export interface EmployeeTrendData {
  currentValue: number
  previousValue: number
  trend: TrendDirection
  trendPercentage: number
}

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
  trends: {
    leadsWorked: EmployeeTrendData
    contactsWorked: EmployeeTrendData
    opportunitiesManaged: EmployeeTrendData
    activitiesCompleted: EmployeeTrendData
  }
  headerData: EmployeeHeaderData | null
  isLoading: boolean
  error: string | null
}

export const useEmployeePerformanceData = (accessToken: string, employeeId: string) => {
  const [data, setData] = useState<EmployeePerformanceData>({
    trends: {
      leadsWorked: {
        currentValue: 0,
        previousValue: 0,
        trend: 'stable',
        trendPercentage: 0
      },
      contactsWorked: {
        currentValue: 0,
        previousValue: 0,
        trend: 'stable',
        trendPercentage: 0
      },
      opportunitiesManaged: {
        currentValue: 0,
        previousValue: 0,
        trend: 'stable',
        trendPercentage: 0
      },
      activitiesCompleted: {
        currentValue: 0,
        previousValue: 0,
        trend: 'stable',
        trendPercentage: 0
      }
    },
    headerData: null,
    isLoading: true,
    error: null
  })

  const graphqlClient = useGraphQLClient(accessToken)

  const extractCommunicationData = (communication: any[] = []) => {
    let email: string | undefined = undefined
    let phone: string | undefined = undefined
    let mobile: string | undefined = undefined

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

  const fetchAllEmployeeData = useCallback(async () => {
    if (!accessToken || !employeeId) return

    setData(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const { currentStart, previousStart, previousEnd } = getCurrentAndPreviousMonthDates()

      // Single combined query that fetches ALL employee data (KPIs + Header + Sales Totals)
      const combinedQuery = `
        query GetCompleteEmployeePerformanceData(
          $employeeId: uuid!
          $currentStart: timestamptz!
          $previousStart: timestamptz!
          $previousEnd: timestamptz!
        ) {
          # ============ KPI TRENDS DATA ============
          # Current Month Data
          currentLeads: Lead(
            where: {
              ownerEmployeeId: { _eq: $employeeId }
              createdAt: { _gte: $currentStart }
              isDeleted: { _eq: false }
            }
          ) {
            id
          }
          
          currentContacts: Contact(
            where: {
              ownerEmployeeId: { _eq: $employeeId }
              createdAt: { _gte: $currentStart }
              isDeleted: { _eq: false }
            }
          ) {
            id
          }
          
          currentOpportunities: Opportunity(
            where: {
              ownerEmployeeId: { _eq: $employeeId }
              createdAt: { _gte: $currentStart }
              isDeleted: { _eq: false }
            }
          ) {
            id
          }
          
          currentActivities: SalesActivity(
            where: {
              ownerEmployeeId: { _eq: $employeeId }
              completedAt: { _gte: $currentStart }
              isDeleted: { _eq: false }
            }
          ) {
            id
          }
          
          # Previous Month Data
          previousLeads: Lead(
            where: {
              ownerEmployeeId: { _eq: $employeeId }
              createdAt: { _gte: $previousStart, _lte: $previousEnd }
              isDeleted: { _eq: false }
            }
          ) {
            id
          }
          
          previousContacts: Contact(
            where: {
              ownerEmployeeId: { _eq: $employeeId }
              createdAt: { _gte: $previousStart, _lte: $previousEnd }
              isDeleted: { _eq: false }
            }
          ) {
            id
          }
          
          previousOpportunities: Opportunity(
            where: {
              ownerEmployeeId: { _eq: $employeeId }
              createdAt: { _gte: $previousStart, _lte: $previousEnd }
              isDeleted: { _eq: false }
            }
          ) {
            id
          }
          
          previousActivities: SalesActivity(
            where: {
              ownerEmployeeId: { _eq: $employeeId }
              completedAt: { _gte: $previousStart, _lte: $previousEnd }
              isDeleted: { _eq: false }
            }
          ) {
            id
          }
          
          # ============ HEADER DATA ============
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
          
          # ============ SALES TOTALS (WON OPPORTUNITIES) ============
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

      const variables = {
        employeeId,
        currentStart,
        previousStart,
        previousEnd
      }

      const result = await graphqlClient.request<{
        currentLeads: Array<{ id: string }>
        previousLeads: Array<{ id: string }>
        currentContacts: Array<{ id: string }>
        previousContacts: Array<{ id: string }>
        currentOpportunities: Array<{ id: string }>
        previousOpportunities: Array<{ id: string }>
        currentActivities: Array<{ id: string }>
        previousActivities: Array<{ id: string }>
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
      }>(combinedQuery, variables)

      // Calculate trends for each metric
      const leadsTrend = calculateTrend(result.currentLeads.length, result.previousLeads.length)
      const contactsTrend = calculateTrend(result.currentContacts.length, result.previousContacts.length)
      const opportunitiesTrend = calculateTrend(result.currentOpportunities.length, result.previousOpportunities.length)
      const activitiesTrend = calculateTrend(result.currentActivities.length, result.previousActivities.length)

      // Process header data
      let headerData: EmployeeHeaderData | null = null
      if (result.EmployeePosition?.[0]?.employee) {
        const employeePosition = result.EmployeePosition[0]
        const { email, phone, mobile } = extractCommunicationData(employeePosition.employee.communication)

        // Calculate total sales from won opportunities
        const totalSales = result.wonOpportunities.reduce((sum, opp) => sum + (opp.estimatedAmount || 0), 0)
        const currencyId = result.wonOpportunities[0]?.currencyRef || 'EUR'

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
        trends: {
          leadsWorked: {
            currentValue: result.currentLeads.length,
            previousValue: result.previousLeads.length,
            trend: leadsTrend.trend,
            trendPercentage: leadsTrend.percentage
          },
          contactsWorked: {
            currentValue: result.currentContacts.length,
            previousValue: result.previousContacts.length,
            trend: contactsTrend.trend,
            trendPercentage: contactsTrend.percentage
          },
          opportunitiesManaged: {
            currentValue: result.currentOpportunities.length,
            previousValue: result.previousOpportunities.length,
            trend: opportunitiesTrend.trend,
            trendPercentage: opportunitiesTrend.percentage
          },
          activitiesCompleted: {
            currentValue: result.currentActivities.length,
            previousValue: result.previousActivities.length,
            trend: activitiesTrend.trend,
            trendPercentage: activitiesTrend.percentage
          }
        },
        headerData,
        isLoading: false,
        error: null
      })
    } catch (error) {
      console.error('Error fetching employee performance data:', error)
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch employee performance data'
      }))
    }
  }, [accessToken, employeeId, graphqlClient])

  useEffect(() => {
    fetchAllEmployeeData()
  }, [fetchAllEmployeeData])

  return {
    ...data,
    refetch: fetchAllEmployeeData
  }
}
