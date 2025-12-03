import { useCallback } from 'react'
import { InvestmentDocument } from '@/common/data/investment/types/investmentDocumentTypes'
import { DocumentItem } from '@/components/document-section'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { toInvestmentDocument } from '@/common/data/investment/mappers/investmentRelatedEntityMappers'
import { INVESTMENT_DOCUMENT } from '@/common/data/investment/queries/fragments/investmentFragments'

/**
 * Get IRM document API configuration for DocumentSection
 * All IRM entities (investment, lead, account, contact, opportunity) use the same endpoints
 */
export function getIrmDocumentApiConfig(entityFieldName: string) {
  return {
    baseEndpoint: '/investment-relations',
    entityFieldName,
    documentFieldName: 'investmentDocument',
    endpoints: {
      create: '/investment-relations/createInvestmentDocument',
      update: '/investment-relations/createInvestmentDocument',
      delete: '/investment-relations/deleteInvestmentDocument'
    }
  }
}

/**
 * Generic IRM document query builder
 * Works for all IRM entities: investment, lead, account, contact, opportunity
 * Uses GraphQL variables for security (prevents injection attacks)
 * @param entityType - The entity field name (e.g., 'lead', 'investment', 'account')
 */
export function getIrmDocumentQuery(entityType: string): string {
  return `
    query GetInvestmentDocumentsByEntity($entityId: uuid!) {
      InvestmentDocument(
        where: { 
          ${entityType}: { id: { _eq: $entityId } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_DOCUMENT}
      }
    }
  `
}

/**
 * Generic IRM document fetcher hook
 * Replaces entity-specific hooks like useGetInvestmentDocumentsByLeadId, etc.
 * @param entityType - The entity field name (e.g., 'lead', 'investment', 'account')
 * @param context - Business app context with access token
 */
export function useGetIrmDocuments(entityType: string, context: BusinessAppContextProps) {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchDocuments = useCallback(
    async (entityId: string): Promise<InvestmentDocument[]> => {
      const query = getIrmDocumentQuery(entityType)

      try {
        // Use GraphQL variables for security (prevents injection attacks)
        const result = await graphqlClient.request<{ InvestmentDocument: InvestmentDocument[] }>(query, {
          entityId
        })
        return result.InvestmentDocument.map(toInvestmentDocument)
      } catch (error) {
        // Log error for debugging without sensitive data
        console.error(`Error fetching ${entityType} documents for entity ${entityId.substring(0, 8)}...`, {
          entityType,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.constructor.name : typeof error
        })

        // Provide meaningful error message to users
        const userFriendlyMessage = `Failed to load ${entityType} documents. Please try again or contact support if the issue persists.`
        throw new Error(userFriendlyMessage)
      }
    },
    [graphqlClient, entityType]
  )

  return { fetchDocuments }
}

/**
 * Transform InvestmentDocument to DocumentItem interface
 * Used by all IRM record components for DocumentSection
 */
export function transformInvestmentDocument(doc: InvestmentDocument): DocumentItem {
  return {
    id: doc.id,
    name: doc.name,
    description: doc.description,
    createdAt: doc.createdAt,
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
    fileInfo: doc.fileInfo,
    mimeType: doc.mimeType,
    fileSize: doc.fileSize,
    createdBy: doc.createdBy,
    parentDocument:
      typeof doc.parentDocument === 'object'
        ? (doc.parentDocument?.id ?? null)
        : (doc.parentDocument ?? doc.parentDocumentId ?? null),
    folder: doc.folder === true,
    version: doc.version
  }
}

/**
 * Transform array of InvestmentDocuments to DocumentItems
 */
export function transformInvestmentDocuments(docs: InvestmentDocument[]): DocumentItem[] {
  return docs.map(transformInvestmentDocument)
}
