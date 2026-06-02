import { CONTENT_DOCUMENT_FRAGMENT } from './fragments/contentFragments'

export interface ContentDocumentQueryParams {
  contentEntryId?: string
  parentDocumentId?: string | null
  folder?: boolean | null
  search?: string
  offset?: number
  limit?: number
}

export const buildContentDocumentsVariables = (params: ContentDocumentQueryParams): Record<string, any> => {
  const where: Record<string, any> = {}

  if (params.contentEntryId) {
    where.contentEntryId = { _eq: params.contentEntryId }
  }

  if (params.parentDocumentId !== undefined) {
    if (params.parentDocumentId !== null) {
      where.parentDocumentId = { _eq: params.parentDocumentId }
    }
  }

  if (params.folder !== undefined) {
    where.folder = { _eq: params.folder }
  }

  if (params.search) {
    const searchPattern = `%${params.search}%`
    where._or = [{ name: { _ilike: searchPattern } }, { description: { _ilike: searchPattern } }]
  }

  where.isDeleted = { _eq: false }

  return {
    where,
    limit: params.limit || 50,
    offset: params.offset || 0
  }
}

export const buildContentDocumentsQuery = (): string => {
  return `
    query getContentDocuments($where: ContentDocumentBoolExp!, $limit: Int!, $offset: Int!) {
      ContentDocument(
        where: $where
        orderBy: { createdAt: DESC }
        limit: $limit
        offset: $offset
      ) {
        ${CONTENT_DOCUMENT_FRAGMENT}
      }
      ContentDocumentAggregate(where: $where) {
        aggregate {
          count
        }
      }
    }
  `
}
