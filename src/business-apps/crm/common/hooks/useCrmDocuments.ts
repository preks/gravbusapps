import { useState, useEffect, useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { transformCrmDocuments, CrmDocument } from '../utils/documentUtils'
import { DocumentItem } from '@/components/document-section'

interface UseCrmDocumentsParams {
  entityId: string
  context: BusinessAppContextProps
  fetchDocuments: (entityId: string) => Promise<CrmDocument[]>
  errorMessage?: string
}

interface UseCrmDocumentsReturn {
  documents: DocumentItem[]
  rawDocuments: CrmDocument[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Generic hook for managing CRM documents across all CRM entities
 * Handles loading, transformation, error states, and auto-refresh on process completion
 */
export function useCrmDocuments({
  entityId,
  context,
  fetchDocuments,
  errorMessage = 'Failed to load documents'
}: UseCrmDocumentsParams): UseCrmDocumentsReturn {
  const [rawDocuments, setRawDocuments] = useState<CrmDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Memoize loadDocuments to prevent unnecessary re-renders and fix useEffect dependency
  const loadDocuments = useCallback(async () => {
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
  }, [entityId, fetchDocuments, errorMessage])

  const transformedDocuments = useMemo(() => {
    return transformCrmDocuments(rawDocuments)
  }, [rawDocuments])

  // Include all dependencies to prevent stale closures
  useEffect(() => {
    if (entityId && context.accessToken) {
      loadDocuments()
    }
  }, [entityId, context.accessToken, loadDocuments])

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
