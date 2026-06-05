import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InvestmentDocument } from '@/common/data/investment/types/investmentDocumentTypes'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { transformInvestmentDocuments } from '../../../../business-apps/irm/common/utils/documentUtils'
import { DocumentItem } from '@/components/document-section'

interface FetchOptions {
  createdBy?: string // Filter by document creator
  // Future filters can be added here without breaking changes
}

interface UseInvestmentDocumentsParams {
  entityId: string
  context: BusinessAppContextProps
  fetchDocuments: (entityId: string, options?: FetchOptions) => Promise<InvestmentDocument[]>
  fetchOptions?: FetchOptions
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
  fetchOptions,
  errorMessage = 'Failed to load documents'
}: UseInvestmentDocumentsParams): UseInvestmentDocumentsReturn {
  const [rawDocuments, setRawDocuments] = useState<InvestmentDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const hasLoadedRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  const loadDocuments = useCallback(async () => {
    try {
      if (!hasLoadedRef.current) {
        setIsLoading(true)
      }
      setError(null)
      const documentsData = await fetchDocuments(entityId, fetchOptions)
      setRawDocuments(documentsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : errorMessage)
    } finally {
      hasLoadedRef.current = true
      setIsLoading(false)
    }
  }, [entityId, fetchDocuments, fetchOptions?.createdBy, errorMessage])

  // Transform documents to match DocumentItem interface
  const transformedDocuments = useMemo(() => {
    return transformInvestmentDocuments(rawDocuments)
  }, [rawDocuments])

  useEffect(() => {
    hasLoadedRef.current = false
  }, [entityId, context.accessToken, fetchOptions?.createdBy])

  // Load documents on mount and when entityId, accessToken, or filter options change
  useEffect(() => {
    if (entityId && context.accessToken) {
      loadDocuments()
    }
  }, [entityId, context.accessToken, fetchOptions?.createdBy, loadDocuments])

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
