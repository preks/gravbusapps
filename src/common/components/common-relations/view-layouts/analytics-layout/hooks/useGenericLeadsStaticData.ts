import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface LeadSourceData {
  source: string
  count: number
  convertedCount: number
  conversionRate: number
  percentage: number
}

export interface LeadStatusData {
  status: string
  count: number
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
  leadsBySource: LeadSourceData[]
  leadsByStatus: LeadStatusData[]
  sourceCatalogCodes: LeadCatalogEntry[]
  statusCatalogCodes: LeadCatalogEntry[]
}

export interface LeadsEntityConfig {
  entityName: string // "Lead" or "InvestmentLead"
  entityAggregate: string // "LeadAggregate" or "InvestmentLeadAggregate"
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

        // === STEP 1: MEGA QUERY - Combine KPIs + distinct catalogs ===
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

            # === Distinct Sources and Statuses (like accounts) ===
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

        const allStatuses = (megaResult.distinctStatuses || []).map((item: any) => ({
          code: item.leadStatus.code,
          value: item.leadStatus.value,
          id: item.leadStatus.id
        }))

        // === STEP 2: Build aggregate queries for sources and statuses ===
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

        const aggregatesQuery = `
          query GetLeadsAggregates {
            # Source aggregates
            ${sourceAggregates}

            # Status aggregates
            ${statusAggregates}
          }
        `

        const result = await graphqlClient.request(aggregatesQuery)

        // Extract KPIs from mega query
        const totalLeads = megaResult.totalLeads?.aggregate?.count || 0
        const convertedLeads = megaResult.convertedLeads?.aggregate?.count || 0
        const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0

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

        setData({
          totalLeads,
          convertedLeads,
          conversionRate,
          leadsBySource,
          leadsByStatus,
          sourceCatalogCodes: allSources,
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
  }, [accessToken, config.entityName, config.entityAggregate])

  return { data, isLoading, error }
}
