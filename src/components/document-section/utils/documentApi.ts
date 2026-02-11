import { DocumentItem, RestClient, ApiConfig } from '../types'
import { DOCUMENT_REFRESH_DELAY_MS } from '../constants'

export interface UpdateDocumentLocationParams {
  documentId: string
  document: DocumentItem
  parentDocument: string | null
  entityId: string
  apiConfig: ApiConfig
  accessToken: string
  restClient: RestClient
  onRefresh?: () => void
}

/**
 * Updates document location (moves to folder or root)
 * Shared utility for drag-drop operations
 */
export async function updateDocumentLocation({
  documentId,
  document,
  parentDocument,
  entityId,
  apiConfig,
  accessToken,
  restClient,
  onRefresh
}: UpdateDocumentLocationParams): Promise<void> {
  if (!apiConfig.endpoints?.update) {
    throw new Error('Update endpoint not configured')
  }

  const documentPayload = {
    id: documentId,
    version: document.version,
    parentDocument: parentDocument || '',
    folder: document.folder || false,
    [apiConfig.entityFieldName]: entityId
  }

  await restClient.post(
    apiConfig.endpoints.update,
    {
      changeMode: 'UPDATE',
      [apiConfig.documentFieldName]: documentPayload
    },
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  )

  // Trigger refresh after delay
  setTimeout(() => {
    if (onRefresh) {
      onRefresh()
    }
  }, DOCUMENT_REFRESH_DELAY_MS)
}
