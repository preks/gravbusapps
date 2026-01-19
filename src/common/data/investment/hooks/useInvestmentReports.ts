// Investment Report hooks - MIGRATION NOTE
// This hook has been simplified during migration to centralized investment-report approach
// For full investment report functionality, use @/common/data/investment-report/hooks/

import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
// Types are now defined locally as shared interfaces

// Shared interfaces for investment report structure
interface InvestmentReportInvestment {
  id: string
  name: string
}

interface InvestmentReportTag {
  id: string
  name: string
}

interface InvestmentReportItem {
  id: string
  title?: string
  date?: string
  fileUrl?: string
  fileName?: string
  mimeType?: string
  size?: number
  investment?: InvestmentReportInvestment
  tags?: Array<InvestmentReportTag>
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
  version: number
}

// GraphQL response interfaces
interface InvestmentReportResponse {
  InvestmentReport?: Array<InvestmentReportItem>
  InvestmentReportAggregate?: {
    aggregate?: {
      count?: number
    }
  }
}

interface InvestmentReportByIdResponse {
  InvestmentReport?: Array<InvestmentReportItem>
}

// MIGRATION NOTE: This hook now uses the centralized investment-report queries
import {
  GET_INVESTMENT_REPORTS,
  GET_INVESTMENT_REPORT_BY_ID,
  type InvestmentReportQueryVariables
} from '@/common/data/investment-report/queries'

// Use the mapper functions
import { toInvestmentReport } from '../mappers/investmentReportMappers'

// =============================================================================
// INVESTMENT REPORT HOOKS (MIGRATED TO CENTRALIZED APPROACH)
// =============================================================================

// Hook for getting investment reports (migrated to use centralized queries)
export const useGetInvestmentReports = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentReports = useCallback(
    async (variables: InvestmentReportQueryVariables = {}) => {
      const query = GET_INVESTMENT_REPORTS(variables)

      try {
        const result = await graphqlClient.request<InvestmentReportResponse>(query)

        // Map the results using the existing mapper
        const reports = (result.InvestmentReport || []).map(report => toInvestmentReport(report))

        return {
          reports,
          total: result.InvestmentReportAggregate?.aggregate?.count || reports.length
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

// Hook for getting investment report by ID (migrated to use centralized queries)
export const useGetInvestmentReportById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentReportById = useCallback(
    async (id: string) => {
      const query = GET_INVESTMENT_REPORT_BY_ID(id)

      try {
        const result = await graphqlClient.request<InvestmentReportByIdResponse>(query)
        const reportData = result?.InvestmentReport?.[0]

        if (!reportData) {
          return null
        }

        return {
          report: toInvestmentReport(reportData)
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

// =============================================================================
// MIGRATION NOTES
// =============================================================================

/*
 * IMPORTANT: This file has been simplified during migration to the centralized approach.
 *
 * For full investment report functionality, use:
 * @/common/data/investment-report/hooks/useInvestmentReports
 *
 * The following functions have been removed and need to be reimplemented
 * in the centralized approach if still needed:
 * - useGetInvestmentTransactions
 * - useGetInvestmentTransactionById
 * - useGetEquityInvestmentRounds
 * - useGetRealEstateInvestmentRentalUnits
 *
 * These were removed because their query dependencies were in the old
 * investmentReportQueries.ts file that has been migrated.
 */
