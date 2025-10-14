// Investment Lead Queries - using shared fragments and generic query helpers
import { CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import {
  INVESTMENT_LEAD,
  INVESTMENT_CONTACT_REF,
  INVESTMENT_TASK,
  INVESTMENT_ACTIVITY,
  INVESTMENT_NOTE,
  INVESTMENT_DOCUMENT
} from './fragments/investmentRelationFragments'
import { buildOrderBy, buildSearch, buildFilter } from '@/common/network/graphql/queryHelpers'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Unified descriptors for InvestmentLead (search, sort, filters, and option metadata)
export const INVESTMENT_LEAD_DESCRIPTORS: Descriptor[] = [
  // Search/sort
  { key: 'firstName', searchPaths: ['firstName'], type: 'text' },
  { key: 'lastName', searchPaths: ['lastName'], type: 'text' },
  { key: 'email', searchPaths: ['email'], type: 'text' },
  { key: 'companyName', searchPaths: ['companyName'], type: 'text' },
  { key: 'city', searchPaths: ['locality'], sortPath: 'locality', type: 'text' },
  {
    key: 'leadStatus',
    searchPaths: ['leadStatus.value', 'leadStatus.code'],
    sortPath: 'leadStatus.code',
    type: 'text'
  },
  {
    key: 'leadRating',
    searchPaths: ['leadRating.value', 'leadRating.code'],
    sortPath: 'leadRating.code',
    type: 'text'
  },
  {
    key: 'leadSource',
    searchPaths: ['leadSource.value', 'leadSource.code'],
    sortPath: 'leadSource.code',
    type: 'text'
  },
  {
    key: 'ownerEmployee',
    searchPaths: ['ownerEmployee.displayName'],
    sortPath: 'ownerEmployee.displayName',
    type: 'text'
  },
  { key: 'createdAt', searchPaths: ['createdAt'], type: 'date' },

  // Filters (IDs, strings, booleans, dates, custom)
  { key: 'academicTitleIds', path: 'academicTitle.id', kind: 'inIds' },
  { key: 'salutationIds', path: 'salutation.id', kind: 'inIds' },
  { key: 'leadStatusIds', path: 'leadStatus.id', kind: 'inIds' },
  { key: 'leadStatusCodes', path: 'leadStatus.code', kind: 'inStrings' },
  { key: 'leadSourceIds', path: 'leadSource.id', kind: 'inIds' },
  { key: 'leadSourceCodes', path: 'leadSource.code', kind: 'inStrings' },
  { key: 'leadRatingIds', path: 'leadRating.id', kind: 'inIds' },
  { key: 'leadRatingCodes', path: 'leadRating.code', kind: 'inStrings' },
  { key: 'industryClassIds', path: 'industryClass.id', kind: 'inIds' },
  { key: 'companySizeIds', path: 'companySize.id', kind: 'inIds' },
  {
    key: 'ownerEmployeeIds',
    path: 'ownerEmployee.id',
    kind: 'inIds',
    optionSelectPaths: [
      'ownerEmployee.id',
      'ownerEmployee.displayName',
      'ownerEmployee.firstName',
      'ownerEmployee.lastName'
    ],
    optionSearchPaths: ['ownerEmployee.firstName', 'ownerEmployee.lastName', 'ownerEmployee.displayName'],
    optionDistinctOn: ['ownerEmployeeId']
  },
  {
    key: 'countryIds',
    path: 'country.id',
    kind: 'inIds',
    optionSelectPaths: ['country.id', 'country.code', 'country.value'],
    optionSearchPaths: ['country.code', 'country.value']
  },
  {
    key: 'companyNames',
    path: 'companyName',
    kind: 'inStrings',
    optionSelectPaths: ['companyName'],
    optionSearchPaths: ['companyName']
  },
  {
    key: 'regions',
    path: 'region.value',
    kind: 'inStrings',
    optionSelectPaths: ['region.id', 'region.code', 'region.value'],
    optionSearchPaths: ['region.value', 'region.code']
  },
  {
    key: 'localities',
    path: 'locality',
    kind: 'inStrings',
    optionSelectPaths: ['locality'],
    optionSearchPaths: ['locality']
  },
  { key: 'conversionDateFrom', path: 'conversionDate', kind: 'dateFrom' },
  { key: 'conversionDateTo', path: 'conversionDate', kind: 'dateTo' },
  { key: 'createdAtFrom', path: 'createdAt', kind: 'dateFrom' },
  { key: 'createdAtTo', path: 'createdAt', kind: 'dateTo' },
  { key: 'sensitive', path: 'sensitive', kind: 'eqBool' },
  {
    key: 'contactFullNames',
    kind: 'custom',
    optionSelectPaths: ['firstName', 'lastName'],
    optionSearchPaths: ['firstName', 'lastName'],
    build: (values: string[]) => {
      if (!Array.isArray(values) || !values.length) return ''
      const parts: string[] = []
      for (const n of values) {
        const [first, last] = String(n).split('|')
        const f = (first || '').trim()
        const l = (last || '').trim()
        if (f && l) {
          parts.push(`{ _and: [ { firstName: { _ilike: "%${f}%" } }, { lastName: { _ilike: "%${l}%" } } ] }`)
        } else if (f) {
          parts.push(`{ firstName: { _ilike: "%${f}%" } }`)
        } else if (l) {
          parts.push(`{ lastName: { _ilike: "%${l}%" } }`)
        }
      }
      return parts.length ? `{ _or: [${parts.join(', ')}] }` : ''
    }
  }
]
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
        
        # Entity relationships
        convertedAccount {
          id
          code
          name
          email
          geographicPresence
          accountAnnualRevenueBand {
            ${CATALOG_ENTRY}
          }
          companySize {
            ${CATALOG_ENTRY}
          }
        }
        convertedContact {
          ${INVESTMENT_CONTACT_REF}
        }
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
        # Entity relationships
        convertedAccount {
          id
          code
          name
          email
          geographicPresence
          industryClass {
            ${CATALOG_ENTRY}
          }
        }
        convertedContact {
          ${INVESTMENT_CONTACT_REF}
        }
      }
    }
  `
}

// Search Investment Leads (lightweight for autocomplete)
export const SEARCH_INVESTMENT_LEADS = (variables: InvestmentLeadQueryVariables): string => {
  const { search = '', limit = 10 } = variables

  return `
    query SearchInvestmentLeads {
      InvestmentLead(
        where: {
          isDeleted: { _eq: false }
          _and: [
            {
              _or: [
                { firstName: { _ilike: "%${search}%" } },
                { lastName: { _ilike: "%${search}%" } },
                { email: { _ilike: "%${search}%" } },
                { companyName: { _ilike: "%${search}%" } },
                { code: { _ilike: "%${search}%" } }
              ]
            }
          ]
        }
        limit: ${limit}
        orderBy: [{ firstName: ASC }]
      ) {
        id
        code
        firstName
        lastName
        sensitive
        email
        companyName
        leadStatus {
          id
          code
          value
        }
        leadSource {
          id
          code
          value
        }
        ownerEmployee {
          id
          displayName
        }
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
        ${INVESTMENT_TASK}
        
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
        ${INVESTMENT_ACTIVITY}
        
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
        ${INVESTMENT_NOTE}
        
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
        ${INVESTMENT_DOCUMENT}
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
