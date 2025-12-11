import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface LeadSourceData {
  source: string
  count: number
  convertedCount: number
  conversionRate: number
  percentage: number
}

export interface LeadRatingData {
  rating: string
  count: number
  percentage: number
}

export interface LeadStatusData {
  status: string
  count: number
}

export interface LeadVelocityDataPoint {
  month: string
  date: string
  leadsCreated: number
  leadsConverted: number
  conversionVelocity: number
}

export interface LeadOwnerData {
  employeeId: string
  employeeName: string
  leadCount: number
  conversionRate: number
}

export interface LeadCatalogEntry {
  code: string
  value: string
  id: string
}

export interface GenericLeadsStaticData {
  totalLeads: number
  convertedLeads: number
  conversionRate: number
  highQualityLeads: number
  highQualityPercentage: number
  avgTimeToConversion: number
  leadsBySource: LeadSourceData[]
  leadsByRating: LeadRatingData[]
  leadsByStatus: LeadStatusData[]
  velocityData: LeadVelocityDataPoint[]
  topOwners?: LeadOwnerData[] // Optional
  sourceCatalogCodes: LeadCatalogEntry[]
  ratingCatalogCodes: LeadCatalogEntry[]
  statusCatalogCodes: LeadCatalogEntry[]
}

export interface LeadsEntityConfig {
  entityName: string // "Lead" or "InvestmentLead"
  entityAggregate: string // "LeadAggregate" or "InvestmentLeadAggregate"
  includeTopOwners?: boolean // Optional: fetch top owners (default: false)
}

export const useGenericLeadsStaticData = (accessToken: string, config: LeadsEntityConfig) => {
  const [data, setData] = useState<GenericLeadsStaticData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchAllLeadsData = async () => {
      try {
        setIsLoading(true)
        setError(null)

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

        const monthlyVelocityAggregates = months
          .map(
            (month, index) => `
          createdMonth${index}: ${config.entityAggregate}(
            where: {isDeleted: {_eq: false}, createdAt: {_gte: "${month.start}", _lt: "${month.end}"}}
          ) { aggregate { count } }
          convertedMonth${index}: ${config.entityAggregate}(
            where: {isDeleted: {_eq: false}, createdAt: {_gte: "${month.start}", _lt: "${month.end}"}, leadStatus: {code: {_eq: "CONVERTED"}}}
          ) { aggregate { count } }
        `
          )
          .join('\n')

        // === STEP 1: MEGA QUERY - Combine KPIs + distinct catalogs + velocity (like accounts) ===
        const megaQuery = `
          query GetLeadsStaticDataMega {
            # === Basic KPIs ===
            totalLeads: ${config.entityAggregate}(where: {isDeleted: {_eq: false}}) {
              aggregate { count }
            }
            
            # Overall converted leads
            convertedLeads: ${config.entityAggregate}(
              where: {isDeleted: {_eq: false}, leadStatus: {code: {_eq: "CONVERTED"}}}
            ) { aggregate { count } }
            
            # Sample for avg time to conversion (limited to 1000)
            convertedLeadsSample: ${config.entityName}(
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
            
            # === Monthly velocity data ===
            ${monthlyVelocityAggregates}
            
            # === Distinct Sources, Ratings, and Statuses (like accounts) ===
            distinctSources: ${config.entityName}(
              where: {isDeleted: {_eq: false}, leadSource: {id: {_isNull: false}}}
              distinctOn: [leadSourceRef]
            ) {
              leadSource {
                id
                code
                value
              }
            }
            
            distinctRatings: ${config.entityName}(
              where: {isDeleted: {_eq: false}, leadRating: {id: {_isNull: false}}}
              distinctOn: [leadRatingRef]
            ) {
              leadRating {
                id
                code
                value
              }
            }
            
            distinctStatuses: ${config.entityName}(
              where: {isDeleted: {_eq: false}, leadStatus: {id: {_isNull: false}}}
              distinctOn: [leadStatusRef]
            ) {
              leadStatus {
                id
                code
                value
              }
            }
          }
        `

        const megaResult = await graphqlClient.request(megaQuery)

        // Extract distinct catalogs from mega query
        const allSources = (megaResult.distinctSources || []).map((item: any) => ({
          code: item.leadSource.code,
          value: item.leadSource.value,
          id: item.leadSource.id
        }))

        const allRatings = (megaResult.distinctRatings || []).map((item: any) => ({
          code: item.leadRating.code,
          value: item.leadRating.value,
          id: item.leadRating.id
        }))

        const allStatuses = (megaResult.distinctStatuses || []).map((item: any) => ({
          code: item.leadStatus.code,
          value: item.leadStatus.value,
          id: item.leadStatus.id
        }))

        // Identify high-quality ratings
        const highQualityRatingCodes = allRatings
          .filter(
            (r: LeadCatalogEntry) =>
              r.code.toUpperCase().includes('HOT') ||
              r.code.toUpperCase().includes('WARM') ||
              r.value.toUpperCase().includes('HOT') ||
              r.value.toUpperCase().includes('WARM')
          )
          .map((r: LeadCatalogEntry) => r.code)

        // === STEP 2: Build aggregate queries for sources, ratings, and statuses ===
        const sourceAggregates = allSources
          .map((source: LeadCatalogEntry) => {
            const safeCode = source.code.replace(/\W/g, '_')
            return `
            source_${safeCode}_total: ${config.entityAggregate}(
              where: {isDeleted: {_eq: false}, leadSource: {code: {_eq: "${source.code}"}}}
            ) { aggregate { count } }
            source_${safeCode}_converted: ${config.entityAggregate}(
              where: {isDeleted: {_eq: false}, leadSource: {code: {_eq: "${source.code}"}}, leadStatus: {code: {_eq: "CONVERTED"}}}
            ) { aggregate { count } }
          `
          })
          .join('\n')

        const ratingAggregates = allRatings
          .map((rating: LeadCatalogEntry) => {
            const safeCode = rating.code.replace(/\W/g, '_')
            return `
            rating_${safeCode}_total: ${config.entityAggregate}(
              where: {isDeleted: {_eq: false}, leadRating: {code: {_eq: "${rating.code}"}}}
            ) { aggregate { count } }
          `
          })
          .join('\n')

        const statusAggregates = allStatuses
          .map((status: LeadCatalogEntry) => {
            const safeCode = status.code.replace(/\W/g, '_')
            return `
            status_${safeCode}_total: ${config.entityAggregate}(
              where: {isDeleted: {_eq: false}, leadStatus: {code: {_eq: "${status.code}"}}}
            ) { aggregate { count } }
          `
          })
          .join('\n')

        const highQualityQuery =
          highQualityRatingCodes.length > 0
            ? `
            highQualityLeads: ${config.entityAggregate}(
              where: {
                isDeleted: {_eq: false}
                leadRating: {code: {_in: [${highQualityRatingCodes.map((c: string) => `"${c}"`).join(', ')}]}}
              }
            ) { aggregate { count } }
          `
            : ''

        const aggregatesQuery = `
          query GetLeadsAggregates {
            # High-quality leads (if applicable)
            ${highQualityQuery}
            
            # Source aggregates
            ${sourceAggregates}
            
            # Rating aggregates
            ${ratingAggregates}
            
            # Status aggregates
            ${statusAggregates}
          }
        `

        const result = await graphqlClient.request(aggregatesQuery)

        // Extract KPIs from mega query
        const totalLeads = megaResult.totalLeads?.aggregate?.count || 0
        const convertedLeads = megaResult.convertedLeads?.aggregate?.count || 0
        const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0

        // Optional: Fetch top owners if requested
        let topOwners: LeadOwnerData[] | undefined = undefined
        if (config.includeTopOwners) {
          const employeeQuery = `
            query GetLeadOwnerEmployees {
              ${config.entityName}(
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
          const employees = employeeResult[config.entityName] || []

          if (employees.length > 0) {
            const employeeAggregatesQuery = employees
              .map((emp: any) => {
                const safeId = emp.ownerEmployeeId.replace(/[^a-zA-Z0-9]/g, '_')
                return `
              emp_${safeId}_total: ${config.entityAggregate}(
                where: {isDeleted: {_eq: false}, ownerEmployeeId: {_eq: "${emp.ownerEmployeeId}"}}
              ) { aggregate { count } }
              emp_${safeId}_converted: ${config.entityAggregate}(
                where: {isDeleted: {_eq: false}, ownerEmployeeId: {_eq: "${emp.ownerEmployeeId}"}, leadStatus: {code: {_eq: "CONVERTED"}}}
              ) { aggregate { count } }
            `
              })
              .join('\n')

            const employeeAggQuery = `
              query GetEmployeeLeadAggregates {
                ${employeeAggregatesQuery}
              }
            `

            const empAggResult = await graphqlClient.request(employeeAggQuery)

            topOwners = employees
              .map((emp: any) => {
                const safeId = emp.ownerEmployeeId.replace(/[^a-zA-Z0-9]/g, '_')
                const total = empAggResult[`emp_${safeId}_total`]?.aggregate?.count || 0
                const converted = empAggResult[`emp_${safeId}_converted`]?.aggregate?.count || 0
                const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0

                return {
                  employeeId: emp.ownerEmployeeId,
                  employeeName:
                    emp.ownerEmployee?.displayName ||
                    `${emp.ownerEmployee?.firstName || ''} ${emp.ownerEmployee?.lastName || ''}`.trim(),
                  leadCount: total,
                  conversionRate
                }
              })
              .filter((owner: LeadOwnerData) => owner.leadCount > 0)
              .sort((a: LeadOwnerData, b: LeadOwnerData) => b.leadCount - a.leadCount)
              .slice(0, 5)
          }
        }

        // Calculate avg time to conversion from sample
        const convertedSample = megaResult.convertedLeadsSample || []
        let avgTimeToConversion = 0
        if (convertedSample.length > 0) {
          const totalDays = convertedSample.reduce((sum: number, lead: any) => {
            const created = new Date(lead.createdAt)
            const converted = new Date(lead.conversionDate)
            const days = Math.floor((converted.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
            return sum + days
          }, 0)
          avgTimeToConversion = Math.round(totalDays / convertedSample.length)
        }

        // Process source aggregates
        const leadsBySource: LeadSourceData[] = allSources
          .map((source: LeadCatalogEntry) => {
            const safeCode = source.code.replace(/\W/g, '_')
            const count = result[`source_${safeCode}_total`]?.aggregate?.count || 0
            const convertedCount = result[`source_${safeCode}_converted`]?.aggregate?.count || 0
            const conversionRate = count > 0 ? Math.round((convertedCount / count) * 100) : 0
            const percentage = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0

            return {
              source: source.value,
              count,
              convertedCount,
              conversionRate,
              percentage
            }
          })
          .filter((item: LeadSourceData) => item.count > 0)
          .sort((a: LeadSourceData, b: LeadSourceData) => b.count - a.count)

        // Process rating aggregates
        const leadsByRating: LeadRatingData[] = allRatings
          .map((rating: LeadCatalogEntry) => {
            const safeCode = rating.code.replace(/\W/g, '_')
            const count = result[`rating_${safeCode}_total`]?.aggregate?.count || 0
            const percentage = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0

            return {
              rating: rating.value,
              count,
              percentage
            }
          })
          .filter((item: LeadRatingData) => item.count > 0)
          .sort((a: LeadRatingData, b: LeadRatingData) => b.count - a.count)

        // Process status aggregates
        const leadsByStatus: LeadStatusData[] = allStatuses
          .map((status: LeadCatalogEntry) => {
            const safeCode = status.code.replace(/\W/g, '_')
            const count = result[`status_${safeCode}_total`]?.aggregate?.count || 0

            return {
              status: status.value,
              count
            }
          })
          .filter((item: LeadStatusData) => item.count > 0)
          .sort((a: LeadStatusData, b: LeadStatusData) => b.count - a.count)

        // Process velocity data from mega query
        const velocityData: LeadVelocityDataPoint[] = months.map((month, index) => {
          const leadsCreated = megaResult[`createdMonth${index}`]?.aggregate?.count || 0
          const leadsConverted = megaResult[`convertedMonth${index}`]?.aggregate?.count || 0
          const conversionVelocity = leadsCreated > 0 ? Math.round((leadsConverted / leadsCreated) * 100) : 0

          return {
            month: month.label,
            date: month.start,
            leadsCreated,
            leadsConverted,
            conversionVelocity
          }
        })

        // High quality leads from aggregates query
        const highQualityLeads = result.highQualityLeads?.aggregate?.count || 0
        const highQualityPercentage = totalLeads > 0 ? Math.round((highQualityLeads / totalLeads) * 100) : 0

        setData({
          totalLeads,
          convertedLeads,
          conversionRate,
          highQualityLeads,
          highQualityPercentage,
          avgTimeToConversion,
          leadsBySource,
          leadsByRating,
          leadsByStatus,
          velocityData,
          topOwners,
          sourceCatalogCodes: allSources,
          ratingCatalogCodes: allRatings,
          statusCatalogCodes: allStatuses
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leads static data')
      } finally {
        setIsLoading(false)
      }
    }

    if (accessToken) {
      fetchAllLeadsData()
    }
  }, [accessToken, config.entityName, config.entityAggregate, config.includeTopOwners])

  return { data, isLoading, error }
}
