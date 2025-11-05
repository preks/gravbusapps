/**
 * Investment Note Queries
 */

import { INVESTMENT_NOTE } from './fragments/investmentRelationFragments'

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
}

// Get investment note by ID
export const GET_INVESTMENT_NOTE_BY_ID = (id: string): string => `
  query GetInvestmentNoteById {
    InvestmentNote(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
      ${INVESTMENT_NOTE}
    }
  }
`

// Get investment notes with filtering
export const GET_INVESTMENT_NOTES = (variables: InvestmentNoteQueryVariables = {}): string => {
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
        { title: { _ilike: "${searchPattern}" } }
        { text: { _ilike: "${searchPattern}" } }
      ]
    `)
  }

  const whereClause = `where: { ${whereConditions.join(', ')} }`

  return `
    query GetInvestmentNotes(
      $offset: Int = ${variables.offset || 0}
      $limit: Int = ${variables.limit || 20}
    ) {
      InvestmentNote(
        ${whereClause}
        offset: $offset
        limit: $limit
        order_by: { createdAt: desc }
      ) {
        ${INVESTMENT_NOTE}
      }
      InvestmentNoteAggregate(${whereClause}) {
        aggregate {
          count
        }
      }
    }
  `
}

// Get investment notes by account ID (alias for backward compatibility)
export const GET_INVESTMENT_NOTES_BY_ACCOUNT_ID = (accountId: string): string => {
  return GET_INVESTMENT_NOTES({ accountId })
}

// Get investment notes by investment ID
export const GET_INVESTMENT_NOTES_BY_INVESTMENT_ID = (investmentId: string): string => {
  return GET_INVESTMENT_NOTES({ investmentId })
}
