import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export interface LeadSourceData {
  source: string
  sourceId: string
  count: number
  convertedCount: number
  percentage: number
  conversionRate: number
}

export interface LeadRatingData {
  rating: string
  ratingId: string
  count: number
  percentage: number
}

export interface LeadStatusData {
  status: string
  statusId: string
  count: number
  percentage: number
}

export interface LeadVelocityMonthlyData {
  month: string
  date: string
  leadsCreated: number
  leadsConverted: number
  conversionVelocity: number
}

export interface LeadStatusCatalogEntry {
  code: string
  value: string
  id: string
}

export interface TopLeadOwnerData {
  employeeId: string
  employeeName: string
  leadCount: number
  conversionRate: number
}

export interface LeadsStaticData {
  // Basic metrics
  totalLeads: number

  // Lead Velocity metrics
  avgTimeToConversion: number
  conversionRate: number
  volumeTrend: number
  velocityTrendData: LeadVelocityMonthlyData[]

  // Lead Quality/Rating data
  leadsByRating: LeadRatingData[]
  highQualityPercentage: number

  // Lead Source data
  leadsBySource: LeadSourceData[]

  // Lead Status data
  leadsByStatus: LeadStatusData[]

  // Top Lead Owners
  topOwners: TopLeadOwnerData[]

  // Catalog data for sharing with other hooks
  statusCatalogCodes: LeadStatusCatalogEntry[]
}

export const useLeadsStaticData = (accessToken: string) => {
  const [data, setData] = useState<LeadsStaticData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)

  useEffect(() => {
    const fetchAllLeadsData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch all catalogs in parallel
        const [sourceCatalog, ratingCatalog, statusCatalog] = await Promise.all([
          catalogClient.getCatalogEntriesList(
            { catalogIdentifier: 'SalesLeadSource', version: 'v1' },
            { limit: 100, offset: 0, returnTotalRecords: true, includeChildCatalogEntries: true }
          ),
          catalogClient.getCatalogEntriesList(
            { catalogIdentifier: 'SalesLeadRating', version: 'v1' },
            { limit: 100, offset: 0, returnTotalRecords: true, includeChildCatalogEntries: true }
          ),
          catalogClient.getCatalogEntriesList(
            { catalogIdentifier: 'SalesLeadStatus', version: 'v1' },
            { limit: 100, offset: 0, returnTotalRecords: true, includeChildCatalogEntries: true }
          )
        ])

        const allSources = (sourceCatalog.data || []).map((s: any) => ({
          code: s.code,
          value: s.value || s.label || s.name,
          id: s.id
        }))

        const allRatings = (ratingCatalog.data || []).map((r: any) => ({
          code: r.code,
          value: r.value || r.label || r.name,
          id: r.id
        }))

        const allStatuses = (statusCatalog.data || []).map((s: any) => ({
          code: s.code,
          value: s.value || s.label || s.name,
          id: s.id
        }))

        // Identify high-quality ratings
        const highQualityRatingCodes = allRatings
          .filter(
            r =>
              r.code.toUpperCase().includes('HOT') ||
              r.code.toUpperCase().includes('WARM') ||
              r.value.toUpperCase().includes('HOT') ||
              r.value.toUpperCase().includes('WARM')
          )
          .map(r => r.code)

        // Generate time periods for velocity (last 12 months)
        const now = new Date()
        const months = []
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const monthStart = date
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1)
          months.push({
            start: monthStart.toISOString(),
            end: monthEnd.toISOString(),
            label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          })
        }

        // Build comprehensive GraphQL query
        const sourceAggregates = allSources
          .map(source => {
            const safeCode = source.code.replace(/\W/g, '_')
            return `
            source_${safeCode}_total: LeadAggregate(
              where: {isDeleted: {_eq: false}, leadSource: {code: {_eq: "${source.code}"}}}
            ) { aggregate { count } }
            source_${safeCode}_converted: LeadAggregate(
              where: {isDeleted: {_eq: false}, leadSource: {code: {_eq: "${source.code}"}}, leadStatus: {code: {_eq: "CONVERTED"}}}
            ) { aggregate { count } }
          `
          })
          .join('\n')

        const ratingAggregates = allRatings
          .map(rating => {
            const safeCode = rating.code.replace(/\W/g, '_')
            return `
            rating_${safeCode}_total: LeadAggregate(
              where: {isDeleted: {_eq: false}, leadRating: {code: {_eq: "${rating.code}"}}}
            ) { aggregate { count } }
          `
          })
          .join('\n')

        const statusAggregates = allStatuses
          .map(status => {
            const safeCode = status.code.replace(/\W/g, '_')
            return `
            status_${safeCode}_total: LeadAggregate(
              where: {isDeleted: {_eq: false}, leadStatus: {code: {_eq: "${status.code}"}}}
            ) { aggregate { count } }
          `
          })
          .join('\n')

        const monthlyVelocityAggregates = months
          .map(
            (month, index) => `
          createdMonth${index}: LeadAggregate(
            where: {isDeleted: {_eq: false}, createdAt: {_gte: "${month.start}", _lt: "${month.end}"}}
          ) { aggregate { count } }
          convertedMonth${index}: LeadAggregate(
            where: {isDeleted: {_eq: false}, createdAt: {_gte: "${month.start}", _lt: "${month.end}"}, leadStatus: {code: {_eq: "CONVERTED"}}}
          ) { aggregate { count } }
        `
          )
          .join('\n')

        const highQualityQuery =
          highQualityRatingCodes.length > 0
            ? `
            highQualityLeads: LeadAggregate(
              where: {
                isDeleted: {_eq: false}
                leadRating: {code: {_in: [${highQualityRatingCodes.map(c => `"${c}"`).join(', ')}]}}
              }
            ) { aggregate { count } }
          `
            : ''

        const query = `
          query GetAllLeadsStaticData {
            # Total leads
            totalLeads: LeadAggregate(where: {isDeleted: {_eq: false}}) {
              aggregate { count }
            }
            
            # Overall converted leads
            convertedLeads: LeadAggregate(
              where: {isDeleted: {_eq: false}, leadStatus: {code: {_eq: "CONVERTED"}}}
            ) { aggregate { count } }
            
            # High-quality leads
            ${highQualityQuery}
            
            # Sample for avg time to conversion
            convertedLeadsSample: Lead(
              where: {
                isDeleted: {_eq: false}
                leadStatus: {code: {_eq: "CONVERTED"}}
                conversionDate: {_isNull: false}
              }
              limit: 1000
            ) {
              createdAt
              conversionDate
            }
            
            # Monthly velocity data
            ${monthlyVelocityAggregates}
            
            # Source aggregates
            ${sourceAggregates}
            
            # Rating aggregates
            ${ratingAggregates}
            
            # Status aggregates
            ${statusAggregates}
          }
        `

        const result = await graphqlClient.request(query)

        const totalLeads = result.totalLeads?.aggregate?.count || 0
        const convertedLeads = result.convertedLeads?.aggregate?.count || 0
        const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0

        // Step 2: Get top lead owners using 2-step approach (like useTopRevenueEarners)
        // 2.1: Get distinct employee IDs
        const employeeQuery = `
          query GetLeadOwnerEmployees {
            Lead(
              where: {isDeleted: {_eq: false}, ownerEmployeeId: {_isNull: false}}
              distinctOn: [ownerEmployeeId]
            ) {
              ownerEmployeeId
              ownerEmployee {
                id
                firstName
                lastName
                displayName
              }
            }
          }
        `

        const employeeResult = await graphqlClient.request(employeeQuery)
        const employees = employeeResult.Lead || []

        // 2.2: Build aggregate queries for each employee
        const employeeAggregates = employees
          .map((lead: any, index: number) => {
            const empId = lead.ownerEmployeeId
            return `
            emp_${index}_total: LeadAggregate(
              where: {isDeleted: {_eq: false}, ownerEmployeeId: {_eq: "${empId}"}}
            ) { aggregate { count } }
            emp_${index}_converted: LeadAggregate(
              where: {isDeleted: {_eq: false}, ownerEmployeeId: {_eq: "${empId}"}, leadStatus: {code: {_eq: "CONVERTED"}}}
            ) { aggregate { count } }
            `
          })
          .join('\n')

        const ownerAggregatesQuery = `
          query GetLeadOwnerAggregates {
            ${employeeAggregates}
          }
        `

        const ownerResult = await graphqlClient.request(ownerAggregatesQuery)

        // 2.3: Combine results and calculate conversion rates
        const topOwners: TopLeadOwnerData[] = employees
          .map((lead: any, index: number) => {
            const leadCount = ownerResult[`emp_${index}_total`]?.aggregate?.count || 0
            const convertedCount = ownerResult[`emp_${index}_converted`]?.aggregate?.count || 0
            const conversionRate = leadCount > 0 ? Math.round((convertedCount / leadCount) * 100) : 0

            return {
              employeeId: lead.ownerEmployee.id,
              employeeName:
                lead.ownerEmployee.displayName || `${lead.ownerEmployee.firstName} ${lead.ownerEmployee.lastName}`,
              leadCount,
              conversionRate
            }
          })
          .sort((a: TopLeadOwnerData, b: TopLeadOwnerData) => b.leadCount - a.leadCount) // Sort by lead count
          .slice(0, 5) // Top 5

        // Process velocity data
        const velocityTrendData: LeadVelocityMonthlyData[] = months.map((month, index) => {
          const leadsCreated = result[`createdMonth${index}`]?.aggregate?.count || 0
          const leadsConverted = result[`convertedMonth${index}`]?.aggregate?.count || 0
          const conversionVelocity = leadsCreated > 0 ? Math.round((leadsConverted / leadsCreated) * 100) : 0

          return {
            month: month.label,
            date: month.start,
            leadsCreated,
            leadsConverted,
            conversionVelocity
          }
        })

        // Calculate avg time to conversion
        const convertedSample = result.convertedLeadsSample || []
        let avgTimeToConversion = 0
        if (convertedSample.length > 0) {
          const totalDays = convertedSample.reduce((sum: number, lead: any) => {
            const days = Math.floor(
              (new Date(lead.conversionDate).getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24)
            )
            return sum + days
          }, 0)
          avgTimeToConversion = Math.round(totalDays / convertedSample.length)
        }

        // Calculate volume trend (last 3 months vs previous 3 months)
        const recentVolume = velocityTrendData.slice(-3).reduce((sum, item) => sum + item.leadsCreated, 0)
        const previousVolume = velocityTrendData.slice(-6, -3).reduce((sum, item) => sum + item.leadsCreated, 0)
        const volumeTrend =
          previousVolume > 0 ? Math.round(((recentVolume - previousVolume) / previousVolume) * 100) : 0

        // Process source data
        const leadsBySource: LeadSourceData[] = allSources
          .map(source => {
            const safeCode = source.code.replace(/\W/g, '_')
            const count = result[`source_${safeCode}_total`]?.aggregate?.count || 0
            const convertedCount = result[`source_${safeCode}_converted`]?.aggregate?.count || 0
            const percentage = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0
            const conversionRate = count > 0 ? Math.round((convertedCount / count) * 100) : 0

            return {
              source: source.value,
              sourceId: source.id,
              count,
              convertedCount,
              percentage,
              conversionRate
            }
          })
          .filter(s => s.count > 0)
          .sort((a, b) => b.count - a.count)

        // Process rating data
        const leadsByRating: LeadRatingData[] = allRatings
          .map(rating => {
            const safeCode = rating.code.replace(/\W/g, '_')
            const count = result[`rating_${safeCode}_total`]?.aggregate?.count || 0
            const percentage = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0

            return {
              rating: rating.value,
              ratingId: rating.id,
              count,
              percentage
            }
          })
          .filter(r => r.count > 0)
          .sort((a, b) => b.count - a.count)

        // Process status data
        const leadsByStatus: LeadStatusData[] = allStatuses
          .map(status => {
            const safeCode = status.code.replace(/\W/g, '_')
            const count = result[`status_${safeCode}_total`]?.aggregate?.count || 0
            const percentage = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0

            return {
              status: status.value,
              statusId: status.id,
              count,
              percentage
            }
          })
          .filter(s => s.count > 0)
          .sort((a, b) => b.count - a.count)

        // Calculate high-quality percentage
        const highQualityCount = result.highQualityLeads?.aggregate?.count || 0
        const highQualityPercentage = totalLeads > 0 ? Math.round((highQualityCount / totalLeads) * 100) : 0

        setData({
          totalLeads,
          avgTimeToConversion,
          conversionRate,
          volumeTrend,
          velocityTrendData: velocityTrendData.slice(-6), // Last 6 months for chart
          leadsByRating,
          highQualityPercentage,
          leadsBySource,
          leadsByStatus,
          topOwners,
          statusCatalogCodes: allStatuses // Share with useLeadsOverTime to avoid duplicate catalog fetch
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    if (accessToken) {
      fetchAllLeadsData()
    }
  }, [accessToken, graphqlClient, catalogClient])

  return { data, isLoading, error }
}
