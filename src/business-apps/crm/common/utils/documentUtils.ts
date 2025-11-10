import { useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { DocumentItem } from '@/components/document-section'

/**
 * CRM Document interface matching the GraphQL schema
 */
export interface CrmDocument {
  id: string
  version?: number
  name: string
  description?: string
  file?: string
  fileInfo?: any
  mimeType?: string
  fileSize?: number
  format?: string
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
  expirationDate?: string
  documentType?: {
    id: string
    code?: string
    value?: string
  }
  documentGroup?: {
    id: string
    code?: string
    value?: string
  }
  parentDocument?: string | { id: string }
  folder?: boolean
}

/**
 * Get CRM document API configuration for DocumentSection
 * All CRM entities (lead, account, contact, opportunity) use the same endpoints
 */
export function getCrmDocumentApiConfig(entityFieldName: string) {
  return {
    baseEndpoint: '/customer-relations',
    entityFieldName,
    documentFieldName: 'crmDocument',
    endpoints: {
      create: '/customer-relations/createCrmDocument',
      update: '/customer-relations/createCrmDocument',
      delete: '/customer-relations/deleteCrmDocument'
    }
  }
}

/**
 * Generic CRM document query builder
 * Works for all CRM entities: lead, account, contact, opportunity
 * Uses GraphQL variables for security (prevents injection attacks)
 * @param entityType - The entity field name (e.g., 'lead', 'account', 'contact', 'opportunity')
 */
export function getCrmDocumentQuery(entityType: string): string {
  // CRM uses nested relationship pattern: {entity: {id: {_eq: $id}}}
  return `
    query GetCrmDocumentsByEntity($entityId: uuid!) {
      CrmDocument(
        where: { 
          ${entityType}: { id: { _eq: $entityId } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        id
        version
        name
        description
        file
        fileInfo
        mimeType
        fileSize
        createdAt
        createdBy
        updatedAt
        updatedBy
        expirationDate
        documentType {
          id
          code
          value
        }
        documentGroup {
          id
          code
          value
        }
        parentDocument {
          id
        }
        format
        folder
      }
    }
  `
}

/**
 * Generic CRM document fetcher hook
 * Replaces entity-specific hooks
 * @param entityType - The entity field name (e.g., 'lead', 'account', 'contact', 'opportunity')
 * @param context - Business app context with access token
 */
export function useGetCrmDocuments(entityType: string, context: BusinessAppContextProps) {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchDocuments = useCallback(
    async (entityId: string): Promise<CrmDocument[]> => {
      const query = getCrmDocumentQuery(entityType)

      try {
        const result = await graphqlClient.request<{ CrmDocument: CrmDocument[] }>(query, {
          entityId
        })
        return result.CrmDocument || []
      } catch (error) {
        console.error(`Error fetching ${entityType} documents for entity ${entityId.substring(0, 8)}...`, {
          entityType,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.constructor.name : typeof error
        })

        const userFriendlyMessage = `Failed to load ${entityType} documents. Please try again or contact support if the issue persists.`
        throw new Error(userFriendlyMessage)
      }
    },
    [graphqlClient, entityType]
  )

  return { fetchDocuments }
}

/**
 * Transform CrmDocument to DocumentItem interface
 * Used by all CRM record components for DocumentSection
 */
export function transformCrmDocument(doc: CrmDocument): DocumentItem {
  // Handle both old format (doc.file) and new format (doc.fileInfo)
  const fileInfo = doc.fileInfo || (doc.file ? { fileId: doc.file } : null)

  return {
    id: doc.id,
    name: doc.name,
    description: doc.description,
    createdAt: doc.createdAt || new Date().toISOString(),
    expirationDate: doc.expirationDate,
    documentType: doc.documentType
      ? {
          id: doc.documentType.id,
          value: doc.documentType.value || '',
          code: doc.documentType.code
        }
      : null,
    documentGroup: doc.documentGroup
      ? {
          id: doc.documentGroup.id,
          value: doc.documentGroup.value || '',
          code: doc.documentGroup.code
        }
      : null,
    fileInfo: fileInfo,
    mimeType: doc.mimeType,
    fileSize: doc.fileSize,
    createdBy: doc.createdBy,
    parentDocument:
      typeof doc.parentDocument === 'object' ? (doc.parentDocument?.id ?? null) : (doc.parentDocument ?? null),
    folder: doc.folder === true,
    version: doc.version
  }
}

/**
 * Transform array of CrmDocuments to DocumentItems
 */
export function transformCrmDocuments(docs: CrmDocument[]): DocumentItem[] {
  return docs.map(transformCrmDocument)
}
