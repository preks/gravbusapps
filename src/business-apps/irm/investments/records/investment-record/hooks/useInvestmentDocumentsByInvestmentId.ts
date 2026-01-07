import { useState, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  buildInvestmentDocumentQuery,
  buildInvestmentDocumentWhereCondition,
  type InvestmentDocumentQueryVariables
} from '@/common/data/investment/queries/investmentDocumentQueries'
import type { InvestmentDocument } from '@/common/data/investment/types/investmentDocumentTypes'

interface UseGetInvestmentDocumentsByInvestmentIdResult {
  documents: InvestmentDocument[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  fetchInvestmentDocumentsByInvestmentId: (investmentId: string, createdBy?: string) => Promise<InvestmentDocument[]>
}

export const useGetInvestmentDocumentsByInvestmentId = (
  context: BusinessAppContextProps
): UseGetInvestmentDocumentsByInvestmentIdResult => {
  const [documents, setDocuments] = useState<InvestmentDocument[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentInvestmentId, setCurrentInvestmentId] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentDocumentsByInvestmentId = useCallback(
    async (investmentId: string, createdBy?: string): Promise<InvestmentDocument[]> => {
      if (!investmentId || !context.accessToken) {
        throw new Error('Investment ID and access token are required')
      }

      setIsLoading(true)
      setError(null)

      try {
        // Use new query builder with fields mapping
        const query = buildInvestmentDocumentQuery()

        // Build query variables (no investmentIds - it's not in descriptors)
        const queryVariables: InvestmentDocumentQueryVariables = {
          limit: 100,
          offset: 0
        }

        // Build custom conditions for BOTH investmentId AND createdBy filters
        const customConditions: Record<string, any>[] = []

        // CRITICAL: Filter by investmentId (not in descriptors, must use customConditions)
        customConditions.push({ investmentId: { _eq: investmentId } })

        // Filter by createdBy if provided
        if (createdBy) {
          customConditions.push({ createdBy: { _eq: createdBy } })
        }

        // Build WHERE condition
        const whereCondition = buildInvestmentDocumentWhereCondition(queryVariables, [], customConditions)

        // Build ORDER BY
        const orderBy = [{ createdAt: 'DESC' }]

        // Prepare GraphQL variables
        const graphQLVariables = {
          limit: 100,
          offset: 0,
          where: whereCondition,
          orderBy
        }

        const result = await graphqlClient.request<{ InvestmentDocument: InvestmentDocument[] }>(
          query,
          graphQLVariables
        )

        const documentData = result.InvestmentDocument || []
        setDocuments(documentData)
        setCurrentInvestmentId(investmentId)

        return documentData
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch investment documents'
        setError(errorMessage)
        console.error('Error fetching investment documents:', err)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [graphqlClient, context.accessToken]
  )

  const refetch = useCallback(async () => {
    if (currentInvestmentId) {
      await fetchInvestmentDocumentsByInvestmentId(currentInvestmentId)
    }
  }, [currentInvestmentId, fetchInvestmentDocumentsByInvestmentId])

  return {
    documents,
    isLoading,
    error,
    refetch,
    fetchInvestmentDocumentsByInvestmentId
  }
}
