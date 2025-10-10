import { useEffect, useState, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { FileManagerEntityRef, DocumentNode, getEntityGraphQlField } from '../types'

export type DocumentApp = 'crm' | 'irm'

export interface UseDocumentsResult {
  documents: DocumentNode[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  setDocuments: React.Dispatch<React.SetStateAction<DocumentNode[]>>
}

export const useDocuments = (
  accessToken: string | undefined,
  entity: FileManagerEntityRef,
  app: DocumentApp = 'crm'
): UseDocumentsResult => {
  const [documents, setDocuments] = useState<DocumentNode[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const client = useGraphQLClient(accessToken || '')

  const load = useCallback(async () => {
    if (!accessToken || !entity?.id) {
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const idField = getEntityGraphQlField(entity.type)
      const whereBlock =
        app === 'crm'
          ? `{ ${idField}: { _eq: $entityId }, isDeleted: { _neq: true } }`
          : `{ ${idField.replace('Id', '')}: { id: { _eq: $entityId } }, isDeleted: { _eq: false } }`

      const entityName = app === 'crm' ? 'CrmDocument' : 'InvestmentDocument'
      const query = `
        query GetDocuments($entityId: uuid!) {
          ${entityName}(
            where: ${whereBlock}
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
      const result = await client.request<{ [key: string]: any[] }>(query, { entityId: entity.id })
      const raw = Array.isArray(result?.[entityName]) ? result[entityName] : []
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
      console.error('useDocuments error', e)
      setError(e?.message || 'Failed to load documents')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, entity?.id, entity?.type, app])

  useEffect(() => {
    void load()
  }, [load])

  return { documents, isLoading, error, refetch: load, setDocuments }
}
