// Investment Lead Queries
import { INVESTMENT_LEAD } from './fragments/investmentFragments'
import {
  INVESTMENT_TASK_REF,
  INVESTMENT_ACTIVITY_REF,
  INVESTMENT_NOTE_REF,
  INVESTMENT_DOCUMENT_REF
} from './fragments/investmentReferenceFragments'
import { buildOrderBy, buildSearch, buildFilter } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_LEAD_DESCRIPTORS } from '@/common/data/investment/types/investmentLeadTypes'
export interface InvestmentLeadQueryVariables {
  ids?: string[]
  search?: string
  sensitive?: boolean
  academicTitleIds?: string[]
  salutationIds?: string[]
  leadStatusIds?: string[]
  leadStatusCodes?: string[]
  leadSourceIds?: string[]
  leadSourceCodes?: string[]
  leadRatingIds?: string[]
  leadRatingCodes?: string[]
  industryClassIds?: string[]
  companySizeIds?: string[]
  ownerEmployeeIds?: string[]
  conversionDateFrom?: string
  conversionDateTo?: string
  createdAtFrom?: string
  createdAtTo?: string
  countryIds?: string[]
  companyNames?: string[]
  regions?: string[]
  localities?: string[]
  contactFullNames?: string[] // stored as "First|Last" and expanded in where
  limit?: number
  offset?: number
  orderBy?: Array<{
    field: string
    direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
  }>
}

// Build where condition for Investment Lead queries
export const buildInvestmentLeadWhereCondition = (variables: InvestmentLeadQueryVariables = {}) => {
  let whereClause = 'where: { isDeleted: { _eq: false }'

  // Generic search across dot-paths from descriptors
  const searchOr = buildSearch(variables.search || '', INVESTMENT_LEAD_DESCRIPTORS)
  if (searchOr) whereClause += `, ${searchOr}`

  // Generic AND filters from descriptors
  const andFilters = buildFilter(variables as any, INVESTMENT_LEAD_DESCRIPTORS)
  if (andFilters) whereClause += `, ${andFilters}`

  whereClause += ' }'
  return whereClause
}

// Get Investment Leads with full details
export const GET_INVESTMENT_LEADS = (variables: InvestmentLeadQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100)
  const offset = variables.offset || 0
  const where = buildInvestmentLeadWhereCondition(variables)

  const orderByBuilt = buildOrderBy(variables.orderBy || [], INVESTMENT_LEAD_DESCRIPTORS)
  const orderByClause = orderByBuilt || 'orderBy: [{ createdAt: DESC }]'

  return `
    query GetInvestmentLeads {
      InvestmentLead(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        ${INVESTMENT_LEAD}
      }
      
      InvestmentLeadAggregate(${where}) {
        aggregate {
          count
        }
      }
    }
  `
}

// Get Investment Lead by ID
export const GET_INVESTMENT_LEAD_BY_ID = (id: string): string => {
  return `
    query GetInvestmentLeadById {
      InvestmentLead(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
        ${INVESTMENT_LEAD}
      }
    }
  `
}

// =====================================================
// INVESTMENT LEAD RELATED ENTITIES QUERIES
// =====================================================

// Get Investment Tasks by Lead ID
export const GET_INVESTMENT_TASKS_BY_LEAD_ID = (leadId: string): string => {
  return `
    query GetInvestmentTasksByLeadId {
      InvestmentTask(
        where: { 
          lead: { id: { _eq: "${leadId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_TASK_REF}
        
        # Entity references
        lead {
          id
          code
          firstName
          lastName
        }
      }
    }
  `
}

// Get Investment Activities by Lead ID
export const GET_INVESTMENT_ACTIVITIES_BY_LEAD_ID = (leadId: string): string => {
  return `
    query GetInvestmentActivitiesByLeadId {
      InvestmentActivity(
        where: { 
          lead: { id: { _eq: "${leadId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ occurredAt: DESC }]
      ) {
        ${INVESTMENT_ACTIVITY_REF}
        
        # Entity references
        lead {
          id
          code
          firstName
          lastName
        }
      }
    }
  `
}

// Get Investment Notes by Lead ID
export const GET_INVESTMENT_NOTES_BY_LEAD_ID = (leadId: string): string => {
  return `
    query GetInvestmentNotesByLeadId {
      InvestmentNote(
        where: { 
          lead: { id: { _eq: "${leadId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_NOTE_REF}
        
        # Entity references
        lead {
          id
          code
          firstName
          lastName
        }
      }
    }
  `
}

// Get Investment Documents by Lead ID
export const GET_INVESTMENT_DOCUMENTS_BY_LEAD_ID = (leadId: string): string => {
  return `
    query GetInvestmentDocumentsByLeadId {
      InvestmentDocument(
        where: { 
          lead: { id: { _eq: "${leadId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_DOCUMENT_REF}
        lead {
          id
          code
          firstName
          lastName
        }
      }
    }
  `
}
