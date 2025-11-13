import { useState, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_INVESTMENT_DOCUMENTS_BY_INVESTMENT_ID } from '@/common/data/investment/queries/'
import type { InvestmentDocument } from '@/common/data/investment/types'

interface UseGetInvestmentDocumentsByInvestmentIdResult {
  documents: InvestmentDocument[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  fetchInvestmentDocumentsByInvestmentId: (investmentId: string) => Promise<InvestmentDocument[]>
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
    async (investmentId: string): Promise<InvestmentDocument[]> => {
      if (!investmentId || !context.accessToken) {
        throw new Error('Investment ID and access token are required')
      }

      setIsLoading(true)
      setError(null)

      try {
        const query = GET_INVESTMENT_DOCUMENTS_BY_INVESTMENT_ID(investmentId)
        const result = await graphqlClient.request<{ InvestmentDocument: InvestmentDocument[] }>(query)

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
