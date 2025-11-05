/**
 * Investment Document Queries
 */

import { INVESTMENT_DOCUMENT } from './fragments/investmentRelationFragments'

// Query variables interface
export interface InvestmentDocumentQueryVariables {
  id?: string
  offset?: number
  limit?: number
  search?: string
  accountId?: string
  contactId?: string
  opportunityId?: string
  leadId?: string
  investmentId?: string
}

// Get investment document by ID
export const GET_INVESTMENT_DOCUMENT_BY_ID = (id: string): string => `
  query GetInvestmentDocumentById {
    InvestmentDocument(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
      ${INVESTMENT_DOCUMENT}
    }
  }
`

// Get investment documents with filtering
export const GET_INVESTMENT_DOCUMENTS = (variables: InvestmentDocumentQueryVariables = {}): string => {
  const whereConditions = [`isDeleted: { _eq: false }`]

  if (variables.id) {
    whereConditions.push(`id: { _eq: "${variables.id}" }`)
  }

  if (variables.accountId) {
    whereConditions.push(`account: { id: { _eq: "${variables.accountId}" } }`)
  }

  if (variables.contactId) {
    whereConditions.push(`contact: { id: { _eq: "${variables.contactId}" } }`)
  }

  if (variables.opportunityId) {
    whereConditions.push(`opportunity: { id: { _eq: "${variables.opportunityId}" } }`)
  }

  if (variables.leadId) {
    whereConditions.push(`lead: { id: { _eq: "${variables.leadId}" } }`)
  }

  if (variables.investmentId) {
    whereConditions.push(`investment: { id: { _eq: "${variables.investmentId}" } }`)
  }

  if (variables.search?.trim()) {
    const searchPattern = `%${variables.search.trim()}%`
    whereConditions.push(`
      _or: [
        { name: { _ilike: "${searchPattern}" } }
        { description: { _ilike: "${searchPattern}" } }
      ]
    `)
  }

  const whereClause = `where: { ${whereConditions.join(', ')} }`

  return `
    query GetInvestmentDocuments(
      $offset: Int = ${variables.offset || 0}
      $limit: Int = ${variables.limit || 20}
    ) {
      InvestmentDocument(
        ${whereClause}
        offset: $offset
        limit: $limit
        order_by: { createdAt: desc }
      ) {
        ${INVESTMENT_DOCUMENT}
      }
      InvestmentDocumentAggregate(${whereClause}) {
        aggregate {
          count
        }
      }
    }
  `
}

// Get investment documents by account ID (alias for backward compatibility)
export const GET_INVESTMENT_DOCUMENTS_BY_ACCOUNT_ID = (accountId: string): string => {
  return GET_INVESTMENT_DOCUMENTS({ accountId })
}

// Get investment documents by investment ID
export const GET_INVESTMENT_DOCUMENTS_BY_INVESTMENT_ID = (investmentId: string): string => {
  return GET_INVESTMENT_DOCUMENTS({ investmentId })
}
