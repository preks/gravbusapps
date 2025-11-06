/**
 * Investment Note Queries
 */

import { INVESTMENT_NOTE } from './fragments/investmentFragments'
import { buildOrderBy, buildSearch, type Descriptor } from '@/common/network/graphql/queryHelpers'

// Unified descriptors for InvestmentNote
export const INVESTMENT_NOTE_DESCRIPTORS: Descriptor[] = [
  // Search/sort
  { key: 'title', searchPaths: ['title', 'text'], sortPath: 'title', type: 'text' },
  { key: 'createdAt', searchPaths: ['createdAt'], sortPath: 'createdAt', type: 'date' },

  // Single ID filters (for backward compatibility)
  { key: 'accountId', path: 'account.id', kind: 'custom' },
  { key: 'contactId', path: 'contact.id', kind: 'custom' },
  { key: 'opportunityId', path: 'opportunity.id', kind: 'custom' },
  { key: 'leadId', path: 'lead.id', kind: 'custom' },
  { key: 'investmentId', path: 'investment.id', kind: 'custom' },

  // Multiple ID filters
  { key: 'accountIds', path: 'account.id', kind: 'inIds' },
  { key: 'contactIds', path: 'contact.id', kind: 'inIds' },
  { key: 'opportunityIds', path: 'opportunity.id', kind: 'inIds' },
  { key: 'leadIds', path: 'lead.id', kind: 'inIds' },
  { key: 'investmentIds', path: 'investment.id', kind: 'inIds' }
]

// Query variables interface
export interface InvestmentNoteQueryVariables {
  id?: string
  offset?: number
  limit?: number
  search?: string
  accountId?: string
  contactId?: string
  opportunityId?: string
  leadId?: string
  investmentId?: string
  orderBy?: Array<{
    field: string
    direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
  }>
}

// Build where condition for Investment Note queries
export const buildInvestmentNoteWhereCondition = (variables: InvestmentNoteQueryVariables = {}) => {
  let whereClause = 'where: { isDeleted: { _eq: false }'

  // ID filter
  if (variables.id) {
    whereClause += `, id: { _eq: "${variables.id}" }`
  }

  // Custom single ID filters (for backward compatibility)
  if (variables.accountId) {
    whereClause += `, account: { id: { _eq: "${variables.accountId}" } }`
  }
  if (variables.contactId) {
    whereClause += `, contact: { id: { _eq: "${variables.contactId}" } }`
  }
  if (variables.opportunityId) {
    whereClause += `, opportunity: { id: { _eq: "${variables.opportunityId}" } }`
  }
  if (variables.leadId) {
    whereClause += `, lead: { id: { _eq: "${variables.leadId}" } }`
  }
  if (variables.investmentId) {
    whereClause += `, investment: { id: { _eq: "${variables.investmentId}" } }`
  }

  // Apply search using descriptors
  if (variables.search?.trim()) {
    const searchConditions = buildSearch(variables.search, INVESTMENT_NOTE_DESCRIPTORS)
    if (searchConditions) {
      whereClause += `, ${searchConditions}`
    }
  }

  whereClause += ' }'
  return whereClause
}

// Get investment notes with filtering
export const GET_INVESTMENT_NOTES = (variables: InvestmentNoteQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100)
  const offset = variables.offset || 0
  const where = buildInvestmentNoteWhereCondition(variables)
  const orderByClause = buildOrderBy(variables.orderBy, INVESTMENT_NOTE_DESCRIPTORS)

  return `
    query GetInvestmentNotes {
      InvestmentNote(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        ${INVESTMENT_NOTE}
      }
      InvestmentNoteAggregate(${where}) {
        aggregate {
          count
        }
      }
    }
  `
}

// Get investment note by ID
export const GET_INVESTMENT_NOTE_BY_ID = (id: string): string => {
  return GET_INVESTMENT_NOTES({ id })
}

// Get investment notes by account ID (alias for backward compatibility)
export const GET_INVESTMENT_NOTES_BY_ACCOUNT_ID = (accountId: string): string => {
  return GET_INVESTMENT_NOTES({ accountId })
}

// Get investment notes by investment ID
export const GET_INVESTMENT_NOTES_BY_INVESTMENT_ID = (investmentId: string): string => {
  return GET_INVESTMENT_NOTES({ investmentId })
}
