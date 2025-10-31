import { useState, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InvestmentDocument } from '@/common/data/investment/types'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { transformInvestmentDocuments } from '../utils/documentUtils'
import { DocumentItem } from '@/common/components/common-relations/record-sections/document-section/DocumentSection'

interface UseInvestmentDocumentsParams {
  entityId: string
  context: BusinessAppContextProps
  fetchDocuments: (entityId: string) => Promise<InvestmentDocument[]>
  errorMessage?: string
}

interface UseInvestmentDocumentsReturn {
  documents: DocumentItem[]
  rawDocuments: InvestmentDocument[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Generic hook for managing investment documents across all IRM entities
 * Handles loading, transformation, error states, and auto-refresh on process completion
 */
export function useInvestmentDocuments({
  entityId,
  context,
  fetchDocuments,
  errorMessage = 'Failed to load documents'
}: UseInvestmentDocumentsParams): UseInvestmentDocumentsReturn {
  const [rawDocuments, setRawDocuments] = useState<InvestmentDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDocuments = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const documentsData = await fetchDocuments(entityId)
      setRawDocuments(documentsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Transform documents to match DocumentItem interface
  const transformedDocuments = useMemo(() => {
    return transformInvestmentDocuments(rawDocuments)
  }, [rawDocuments])

  // Load documents on mount and when entityId or accessToken changes
  useEffect(() => {
    if (entityId && context.accessToken) {
      loadDocuments()
    }
  }, [entityId, context.accessToken])

  // Auto-refresh documents on process completion
  useProcessCompletion({
    onSuccess: () => {
      loadDocuments()
    }
  })

  return {
    documents: transformedDocuments,
    rawDocuments,
    isLoading,
    error,
    refetch: loadDocuments
  }
}
