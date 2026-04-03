import { useEffect, useState } from 'react'
import { flowbotClient } from '@/common/network/flowbot/FlowbotClient'
import { useFlowbotClient } from '@/common/network/flowbot/useFlowbotClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface DocumentClassificationSuggestion {
  group?: string
  type?: string
}

export interface UseDocumentClassificationArgs {
  /**
   * Access token used for authenticating against FlowBot
   */
  accessToken?: string | null
  /**
   * Logical domain of the document for catalog lookup (e.g. "crm" | "irm" | "hr").
   */
  entity?: string
  /**
   * Optional catalog identifier for document groups in Hasura CatalogEntry.catalog.identifier.
   * Examples: "SalesDocumentGroup", "InvestmentDocumentGroup", "DocumentGroup".
   * This allows the backend to build a generic GraphQL query instead of branching by entity.
   */
  groupCatalogIdentifier?: string
  /**
   * Optional catalog identifier for document types in Hasura CatalogEntry.catalog.identifier.
   * Examples: "SalesDocumentType", "InvestmentDocumentType", "DocumentType".
   */
  typeCatalogIdentifier?: string
  /**
   * First file selected for upload. When this changes and `enabled` is true,
   * the hook will trigger a new classification request.
   */
  file?: File | null
  /**
   * Optional override for the FlowBot classification endpoint path (relative to FLOWBOT_API_URL).
   * Defaults to `/document-autoclassify/classify`.
   */
  endpoint?: string
  /**
   * When false, the hook is disabled and will not trigger any network calls.
   */
  enabled?: boolean
}

export interface UseDocumentClassificationResult {
  suggestion: DocumentClassificationSuggestion | null
  loading: boolean
  error: string | null
}

export const useDocumentClassification = ({
  accessToken,
  entity,
  groupCatalogIdentifier,
  typeCatalogIdentifier,
  file,
  endpoint,
  enabled = true
}: UseDocumentClassificationArgs): UseDocumentClassificationResult => {
  const [suggestion, setSuggestion] = useState<DocumentClassificationSuggestion | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useFlowbotClient(accessToken ?? undefined)

  useEffect(() => {
    if (!enabled || !file || !accessToken) {
      setSuggestion(null)
      setLoading(false)
      setError(null)
      return
    }

    let isCancelled = false
    const controller = new AbortController()

    const run = async () => {
      setLoading(true)
      setError(null)
      setSuggestion(null)

      try {
        const fd = new FormData()
        fd.append('file', file as unknown as Blob)

        const domain = (entity || '').toLowerCase()
        if (domain === 'crm' || domain === 'irm' || domain === 'hr') {
          fd.append('entity', domain)
        }

        if (groupCatalogIdentifier) {
          fd.append('groupCatalogIdentifier', groupCatalogIdentifier)
        }
        if (typeCatalogIdentifier) {
          fd.append('typeCatalogIdentifier', typeCatalogIdentifier)
        }

        const classifyPath = endpoint || '/document-autoclassify/classify'
        const resp = await flowbotClient.post<Record<string, unknown>>(classifyPath, fd, {
          signal: controller.signal
        })

        const dataObj = (resp ?? {}) as Record<string, unknown>
        const rawType = dataObj['type']
        const rawGroup = dataObj['group']
        const type = typeof rawType === 'string' ? (rawType as string) : undefined
        const group = typeof rawGroup === 'string' ? (rawGroup as string) : undefined

        if (isCancelled) return

        setSuggestion({
          type,
          group
        })
      } catch (err) {
        if (isCancelled) return
        console.error('AI classification failed', err)
        setError(getTranslationFromI18nKeyAndLabel('document.ai.failed', 'Failed to auto-classify'))
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    void run()

    return () => {
      isCancelled = true
      controller.abort()
    }
  }, [accessToken, entity, groupCatalogIdentifier, typeCatalogIdentifier, file, endpoint, enabled])

  return {
    suggestion,
    loading,
    error
  }
}
