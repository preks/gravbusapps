// Investment Report hooks - Core investment report entities and their specializations
// This mirrors useInvestments.ts but targets InvestmentReport tables instead of Investment tables
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Use the investment report query imports
import {
  GET_INVESTMENT_REPORTS,
  GET_INVESTMENT_REPORT_BY_ID,
  SEARCH_INVESTMENT_REPORTS,
  type InvestmentReportQueryVariables
} from '../queries/investmentReportQueries'

// Import centralized types and mappers
import { BaseInvestmentReport, InvestmentReport } from '@/common/data/investment/types/investmentTypes'
import { toInvestmentReport } from '@/common/data/investment/mappers/investmentReportMappers'

// Response interfaces
export interface InvestmentReportQueryResponse {
  InvestmentReport: BaseInvestmentReport[]
  InvestmentReportAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface InvestmentReportByIdData {
  investmentReport: InvestmentReport | null
}

// =============================================================================
// CORE INVESTMENT REPORT HOOKS
// =============================================================================

// Hook for getting investment reports with full details
export const useGetInvestmentReports = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentReports = useCallback(
    async (variables: InvestmentReportQueryVariables = {}) => {
      const query = GET_INVESTMENT_REPORTS(variables)

      try {
        const result = await graphqlClient.request<InvestmentReportQueryResponse>(query)

        // Transform base types to enhanced types using mapper
        const enhancedReports = result.InvestmentReport.map(toInvestmentReport)

        // Return cleaner API: { reports, total } instead of raw GraphQL shape
        return {
          reports: enhancedReports,
          total: result.InvestmentReportAggregate?.aggregate?.count ?? 0
        }
      } catch (error) {
        console.error('Error fetching investment reports:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentReports }
}

// Hook for getting investment report by ID
export const useGetInvestmentReportById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentReportById = useCallback(
    async (id: string) => {
      const query = GET_INVESTMENT_REPORT_BY_ID(id)
      try {
        // Request raw object to preserve specialization blocks
        const result = await graphqlClient.request<any>(query)
        const rawReport = result?.InvestmentReport?.[0]

        // Handle null/undefined rawReport
        if (!rawReport) {
          return {
            investmentReport: null
          }
        }

        return {
          // Transform raw object using proper mapper instead of direct casting
          investmentReport: toInvestmentReport(rawReport)
        }
      } catch (error) {
        console.error('Error fetching investment report by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentReportById }
}

// Hook for searching investment reports
export const useSearchInvestmentReports = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const searchInvestmentReports = useCallback(
    async (variables: InvestmentReportQueryVariables) => {
      const query = SEARCH_INVESTMENT_REPORTS(variables)
      try {
        const result = await graphqlClient.request<{ InvestmentReport: BaseInvestmentReport[] }>(query)

        // Transform to enhanced reports
        const enhancedReports = result.InvestmentReport.map(toInvestmentReport)

        return enhancedReports
      } catch (error) {
        console.error('Error searching investment reports:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { searchInvestmentReports }
}
