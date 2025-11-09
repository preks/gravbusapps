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
  type CommonLeadQueryVariables
} from '@/common/data/relations/queries/commonLeadQueries'
import {
  buildLeadFragmentWithRelations,
  type LeadRelationBuilders,
  type LeadRelationFields
} from '@/common/data/relations/queries/commonLeadQueries'
import { LeadFields } from '@/common/data/relations/types/commonLeadTypes'
import { INVESTMENT_LEAD_DESCRIPTORS } from '../types/investmentLeadTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import { buildActivityFragment } from '@/common/data/relations/queries/commonActivityFragments.new'
import { buildAccountFragment } from '@/common/data/relations/queries/commonAccountFragments.new'
import { buildContactFragment } from '@/common/data/relations/queries/commonContactFragments.new'
import { buildDocumentFragment } from '@/common/data/relations/queries/commonDocumentFragments.new'
import { buildNoteFragment } from '@/common/data/relations/queries/commonNoteFragments.new'
import { buildOpportunityFragment } from '@/common/data/relations/queries/commonOpportunityFragments.new'
import { buildTaskFragment } from '@/common/data/relations/queries/commonTaskFragments.new'

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
 * Build Investment Lead fragment using fields mapping
 * Includes Common Lead fields + common entity relations
 */
export const buildInvestmentLeadFragment = (fields: typeof LeadFields = LeadFields): string => {
  // Build common fragment with relations using REF fragments (no relations) to avoid circular dependencies
  const relationBuilders: LeadRelationBuilders = {
    buildActivityFragment, // REF fragment (no relations)
    buildDocumentFragment, // REF fragment (no relations)
    buildNoteFragment, // REF fragment (no relations)
    buildTaskFragment, // REF fragment (no relations)
    buildAccountFragment, // REF fragment (no relations) - NOT buildInvestmentAccountFragment!
    buildContactFragment, // REF fragment (no relations) - NOT buildInvestmentContactFragment!
    buildOpportunityFragment // REF fragment (no relations) - NOT buildInvestmentOpportunityFragment!
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

  return buildLeadFragmentWithRelations(fields, relationBuilders, relationFields)
}

/**
 * Build Investment Lead query with fields mapping
 */
export const buildInvestmentLeadQuery = (
  fields: typeof LeadFields = LeadFields,
  fragment: string = buildInvestmentLeadFragment(fields)
): string => {
  return buildLeadQuery(fields, fragment, 'InvestmentLead')
}

/**
 * Build Investment Lead by ID query
 */
export const buildInvestmentLeadByIdQuery = (
  fields: typeof LeadFields = LeadFields,
  fragment: string = buildInvestmentLeadFragment(fields),
  id: string
): string => {
  return buildLeadByIdQuery(fields, fragment, id, 'InvestmentLead')
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
