import { useEffect, useState, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { FileManagerEntityRef, DocumentNode, getEntityGraphQlField } from '../types'

export interface UseCrmDocumentsResult {
  documents: DocumentNode[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  setDocuments: React.Dispatch<React.SetStateAction<DocumentNode[]>>
}

export const useCrmDocuments = (
  accessToken: string | undefined,
  entity: FileManagerEntityRef
): UseCrmDocumentsResult => {
  const [documents, setDocuments] = useState<DocumentNode[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const client = useGraphQLClient(accessToken || '')

  const load = useCallback(async () => {
    if (!accessToken || !entity?.id) {
      // Not ready yet; keep current state (spinner remains if still initial)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const idField = getEntityGraphQlField(entity.type)
      const query = `
        query GetCrmDocuments($entityId: uuid!) {
          CrmDocument(
            where: {
              _and: [
                { ${idField}: { _eq: $entityId } },
                { isDeleted: { _neq: true } }
              ]
            }
          ) {
            id
            version
            name
            createdAt
            expirationDate
            format
            parentDocument { id }
            documentType { id value code }
            documentGroup { id value code }
            file
            mimeType
            fileSize
            createdBy
          }
        }
      `
      const result = await client.request<{ CrmDocument: any[] }>(query, { entityId: entity.id })
      const raw = Array.isArray(result?.CrmDocument) ? result.CrmDocument : []
      const mapped: DocumentNode[] = raw.map((d: any) => ({
        id: d.id,
        version: d.version,
        name: d.name ?? 'Unnamed Document',
        createdAt: d.createdAt,
        expirationDate: d.expirationDate ?? null,
        format: d.format ?? null,
        parentDocument: d?.parentDocument?.id ?? null,
        documentType: d.documentType
          ? { id: d.documentType.id, value: d.documentType.value, code: d.documentType.code }
          : null,
        documentGroup: d.documentGroup
          ? { id: d.documentGroup.id, value: d.documentGroup.value, code: d.documentGroup.code }
          : null,
        file: d.file ?? null,
        mimeType: d.mimeType ?? null,
        fileSize: typeof d.fileSize === 'number' ? d.fileSize : null,
        createdBy: d.createdBy ?? null
      }))
      setDocuments(mapped)
    } catch (e: any) {
      console.error('useCrmDocuments error', e)
      setError(e?.message || 'Failed to load documents')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, entity?.id, entity?.type])

  useEffect(() => {
    void load()
  }, [load])

  return { documents, isLoading, error, refetch: load, setDocuments }
}
