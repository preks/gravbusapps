/**
 * Investment Lead Queries (New)
 * GraphQL queries for Investment Lead entities using fields mapping
 * Uses Common Lead Queries with LeadFields (no overrides needed)
 */

import {
  buildLeadQuery,
  buildLeadByIdQuery,
  buildLeadSearchQuery,
  buildLeadWhereCondition,
  buildLeadOrderBy,
  type CommonLeadQueryVariables,
  type LeadRelationBuilders,
  type LeadRelationFields
} from '@/common/data/relations/queries/leadQueries'
import { LeadFields } from '@/common/data/relations/types/leadTypes'
import { INVESTMENT_LEAD_DESCRIPTORS } from '../types/investmentLeadTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import {
  buildActivityFragment,
  buildAccountFragment,
  buildContactFragment,
  buildDocumentFragment,
  buildNoteFragment,
  buildOpportunityFragment,
  buildTaskFragment
} from '@/common/data/relations/queries/relationFragments'

// Import Investment Fields
import { InvestmentActivityFields } from '../types/investmentActivityTypes'
import { InvestmentAccountFields } from '../types/investmentAccountTypes'
import { InvestmentContactFields } from '../types/investmentContactTypes'
import { InvestmentDocumentFields } from '../types/investmentDocumentTypes'
import { InvestmentNoteFields } from '../types/investmentNoteTypes'
import { InvestmentOpportunityFields } from '../types/investmentOpportunityTypes'
import { InvestmentTaskFields } from '../types/investmentTaskTypes'

/**
 * Investment Lead Query Variables Interface
 * Extends CommonLeadQueryVariables (no additional fields needed)
 */
export type InvestmentLeadQueryVariables = CommonLeadQueryVariables

/**
 * Build Investment Lead query with fields mapping
 */
export const buildInvestmentLeadQuery = (fields: typeof LeadFields = LeadFields): string => {
  return buildLeadQuery(fields, 'InvestmentLead')
}

/**
 * Build Investment Lead by ID query
 */
export const buildInvestmentLeadByIdQuery = (fields: typeof LeadFields = LeadFields, id: string): string => {
  // Build relation builders and fields for common relations
  const relationBuilders: LeadRelationBuilders = {
    buildActivityFragment,
    buildDocumentFragment,
    buildNoteFragment,
    buildTaskFragment,
    buildAccountFragment,
    buildContactFragment,
    buildOpportunityFragment
  }

  const relationFields: LeadRelationFields = {
    activityFields: InvestmentActivityFields,
    documentFields: InvestmentDocumentFields,
    noteFields: InvestmentNoteFields,
    taskFields: InvestmentTaskFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    opportunityFields: InvestmentOpportunityFields
  }

  return buildLeadByIdQuery(fields, id, 'InvestmentLead', relationBuilders, relationFields)
}

/**
 * Build Investment Lead search query
 */
export const buildInvestmentLeadSearchQuery = (fields: typeof LeadFields = LeadFields): string => {
  return buildLeadSearchQuery(fields, 'InvestmentLead')
}

/**
 * Build WHERE condition for Investment Lead queries
 * Uses INVESTMENT_LEAD_DESCRIPTORS which may have IRM-specific additions
 */
export const buildInvestmentLeadWhereCondition = (
  variables: InvestmentLeadQueryVariables = {},
  additionalDescriptors: Descriptor[] = [],
  customConditions: Record<string, any>[] = []
): Record<string, any> => {
  // INVESTMENT_LEAD_DESCRIPTORS already includes common descriptors + any IRM-specific ones
  const descriptors = [...INVESTMENT_LEAD_DESCRIPTORS, ...additionalDescriptors]
  return buildLeadWhereCondition(variables, descriptors, customConditions)
}

/**
 * Build ORDER BY for Investment Lead queries
 */
export const buildInvestmentLeadOrderBy = (
  orderBy: InvestmentLeadQueryVariables['orderBy'] = [],
  additionalDescriptors: Descriptor[] = []
): any[] => {
  const descriptors = [...INVESTMENT_LEAD_DESCRIPTORS, ...additionalDescriptors]
  return buildLeadOrderBy(orderBy, descriptors)
}

// =====================================================
// INVESTMENT LEAD RELATED ENTITIES QUERIES
// =====================================================

/**
 * Build Investment Tasks by Lead ID query (using GraphQL variables)
 */
export const buildInvestmentTasksByLeadIdQuery = (): string => {
  const fragment = `
    ${buildTaskFragment(InvestmentTaskFields)}
    
    # Entity references
    lead {
      id
      code
      firstName
      lastName
    }
  `

  return `
    query GetInvestmentTasksByLeadId(
      $where: InvestmentTaskBoolExp
      $orderBy: [InvestmentTaskOrderBy!]
    ) {
      InvestmentTask(
        where: $where
        orderBy: $orderBy
      ) {
        ${fragment}
      }
    }
  `
}

/**
 * Build Investment Activities by Lead ID query (using GraphQL variables)
 */
export const buildInvestmentActivitiesByLeadIdQuery = (): string => {
  const fragment = `
    ${buildActivityFragment(InvestmentActivityFields)}
    
    # Entity references
    lead {
      id
      code
      firstName
      lastName
    }
  `

  return `
    query GetInvestmentActivitiesByLeadId(
      $where: InvestmentActivityBoolExp
      $orderBy: [InvestmentActivityOrderBy!]
    ) {
      InvestmentActivity(
        where: $where
        orderBy: $orderBy
      ) {
        ${fragment}
      }
    }
  `
}

/**
 * Build Investment Notes by Lead ID query (using GraphQL variables)
 */
export const buildInvestmentNotesByLeadIdQuery = (): string => {
  const fragment = `
    ${buildNoteFragment(InvestmentNoteFields)}
    
    # Entity references
    lead {
      id
      code
      firstName
      lastName
    }
  `

  return `
    query GetInvestmentNotesByLeadId(
      $where: InvestmentNoteBoolExp
      $orderBy: [InvestmentNoteOrderBy!]
    ) {
      InvestmentNote(
        where: $where
        orderBy: $orderBy
      ) {
        ${fragment}
      }
    }
  `
}

/**
 * Build Investment Documents by Lead ID query (using GraphQL variables)
 */
export const buildInvestmentDocumentsByLeadIdQuery = (): string => {
  const fragment = `
    ${buildDocumentFragment(InvestmentDocumentFields)}
    
    # Entity references
    lead {
      id
      code
      firstName
      lastName
    }
  `

  return `
    query GetInvestmentDocumentsByLeadId(
      $where: InvestmentDocumentBoolExp
      $orderBy: [InvestmentDocumentOrderBy!]
    ) {
      InvestmentDocument(
        where: $where
        orderBy: $orderBy
      ) {
        ${fragment}
      }
    }
  `
}

// Legacy exports for backward compatibility (deprecated - use builder functions above)
// Note: These now return query strings that require variables to be passed separately
export const GET_INVESTMENT_TASKS_BY_LEAD_ID = buildInvestmentTasksByLeadIdQuery
export const GET_INVESTMENT_ACTIVITIES_BY_LEAD_ID = buildInvestmentActivitiesByLeadIdQuery
export const GET_INVESTMENT_NOTES_BY_LEAD_ID = buildInvestmentNotesByLeadIdQuery
export const GET_INVESTMENT_DOCUMENTS_BY_LEAD_ID = buildInvestmentDocumentsByLeadIdQuery
