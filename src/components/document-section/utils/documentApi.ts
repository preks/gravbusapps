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
  /**
   * Optional company data for MDM move operations
   * Required when using MDM domain to fetch structureId and code
   */
  companyData?: { structureId: string; code: string }
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
  onRefresh,
  companyData
}: UpdateDocumentLocationParams): Promise<void> {
  if (!apiConfig.endpoints?.update) {
    throw new Error('Update endpoint not configured')
  }

  // MDM uses updateCompany endpoint with changeMode: 'UPSERT'
  // Move operation uses minimal payload: only id, companyId, parentDocumentId, changeMode
  if (apiConfig.baseEndpoint === '/mdm' && companyData) {
    const payload = {
      structureId: companyData.structureId,
      code: companyData.code,
      documents: [
        {
          ...(document.fileInfo && { fileInfo: document.fileInfo }),
          ...(document.documentType?.id && { documentType: document.documentType.id }),
          ...(document.documentGroup?.id && { documentGroup: document.documentGroup.id }),
          id: documentId,
          companyId: entityId,
          parentDocumentId: parentDocument || null,
          changeMode: 'UPSERT'
        }
      ]
    }

    await restClient.put(`/companies/${entityId}`, payload, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  } else {
    // Other domains use the standard process-based approach
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
  }

  // Trigger refresh after delay
  setTimeout(() => {
    if (onRefresh) {
      onRefresh()
    }
  }, DOCUMENT_REFRESH_DELAY_MS)
}

export interface DeleteDocumentParams {
  documentId: string
  document: DocumentItem
  entityId: string
  apiConfig: ApiConfig
  accessToken: string
  restClient: RestClient
}

/**
 * Deletes a document or folder via the configured delete endpoint.
 * Used by the organize cleanup to remove empty folders after reorganization.
 */
export async function deleteDocument({
  documentId,
  document,
  entityId,
  apiConfig,
  accessToken,
  restClient
}: DeleteDocumentParams): Promise<void> {
  if (!apiConfig.endpoints?.delete) {
    throw new Error('Delete endpoint not configured')
  }

  await restClient.post(
    apiConfig.endpoints.delete,
    {
      [apiConfig.documentFieldName]: {
        id: documentId,
        version: document.version,
        [apiConfig.entityFieldName]: entityId
      }
    },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
}
