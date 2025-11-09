/**
 * Investment Opportunity Queries (New)
 * GraphQL queries for Investment Opportunity entities using fields mapping
 * Extends Common Opportunity Queries with InvestmentOpportunityFields (with overrides + IRM-specific fields)
 */

import {
  buildOpportunityQuery,
  buildOpportunityByIdQuery,
  buildOpportunitySearchQuery,
  buildOpportunityWhereCondition,
  buildOpportunityOrderBy,
  type CommonOpportunityQueryVariables,
  type OpportunityRelationBuilders,
  type OpportunityRelationFields
} from '@/common/data/relations/queries/opportunityQueries'
import { InvestmentOpportunityFields, INVESTMENT_OPPORTUNITY_DESCRIPTORS } from '../types/investmentOpportunityTypes'
import { INVESTMENT_ADDRESS_FRAGMENT } from '../types/investmentAddressTypes'
// OpportunityFields type is used implicitly through Record<keyof typeof OpportunityFields, string>
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import {
  buildAccountFragment,
  buildContactFragment,
  buildLeadFragment,
  buildTaskFragment,
  buildActivityFragment,
  buildNoteFragment,
  buildDocumentFragment
} from '@/common/data/relations/queries/relationFragments'

// Import Investment Fields
import { InvestmentActivityFields } from '../types/investmentActivityTypes'
import { InvestmentAccountFields } from '../types/investmentAccountTypes'
import { InvestmentContactFields } from '../types/investmentContactTypes'
import { InvestmentDocumentFields } from '../types/investmentDocumentTypes'
import { InvestmentLeadFields } from '../types/investmentLeadTypes'
import { InvestmentNoteFields } from '../types/investmentNoteTypes'
import { InvestmentTaskFields } from '../types/investmentTaskTypes'

/**
 * Investment Opportunity Query Variables Interface
 * Extends CommonOpportunityQueryVariables with IRM-specific filters
 */
export interface InvestmentOpportunityQueryVariables extends CommonOpportunityQueryVariables {
  // IRM-specific filters
  dealType?: string
  divestmentIds?: string[]
  investmentIds?: string[]
  investmentGroupIds?: string[]
  investmentRoleIds?: string[]
  investmentStakeTypeIds?: string[]
  investmentTypeIds?: string[]
  sizeMeasurementUnitIds?: string[]
  forecastedProfitBetween?: [number, number]
  estimatedAmountRanges?: Array<{ min?: number; max?: number }>
  accountSearch?: string // Search account by name
}

/**
 * Build Investment Opportunity query with fields mapping
 */
export const buildInvestmentOpportunityQuery = (
  fields: typeof InvestmentOpportunityFields = InvestmentOpportunityFields
): string => {
  const entityFields = `
    # Addresses relation (IRM uses "locality")
    ${fields.addresses}(where: { isDeleted: { _eq: false } }) {
      ${INVESTMENT_ADDRESS_FRAGMENT}
    }
    
    # Leads relation (IRM uses "investmentLead" as array, with where clause)
    ${fields.leads}(where: { isDeleted: { _eq: false } }) {
      ${buildLeadFragment(InvestmentLeadFields)}
    }
  `
  return buildOpportunityQuery(fields, 'InvestmentOpportunity', entityFields)
}

/**
 * Build Investment Opportunity by ID query
 */
export const buildInvestmentOpportunityByIdQuery = (
  fields: typeof InvestmentOpportunityFields = InvestmentOpportunityFields,
  id: string
): string => {
  // Build relation builders and fields for common relations
  const relationBuilders: OpportunityRelationBuilders = {
    buildActivityFragment,
    buildAccountFragment,
    buildContactFragment,
    buildDocumentFragment,
    buildLeadFragment,
    buildNoteFragment,
    buildTaskFragment
  }

  const relationFields: OpportunityRelationFields = {
    activityFields: InvestmentActivityFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    documentFields: InvestmentDocumentFields,
    leadFields: InvestmentLeadFields,
    noteFields: InvestmentNoteFields,
    taskFields: InvestmentTaskFields
  }

  // Domain-specific entity fields (addresses, leads)
  const entityFields = `
    # Addresses relation (IRM uses "locality")
    ${fields.addresses}(where: { isDeleted: { _eq: false } }) {
      ${INVESTMENT_ADDRESS_FRAGMENT}
    }
    
    # Leads relation (IRM uses "investmentLead" as array, with where clause)
    ${fields.leads}(where: { isDeleted: { _eq: false } }) {
      ${buildLeadFragment(InvestmentLeadFields)}
    }
  `

  return buildOpportunityByIdQuery(fields, id, 'InvestmentOpportunity', relationBuilders, relationFields, entityFields)
}

/**
 * Build Investment Opportunity search query
 */
export const buildInvestmentOpportunitySearchQuery = (
  fields: typeof InvestmentOpportunityFields = InvestmentOpportunityFields
): string => {
  return buildOpportunitySearchQuery(fields, 'InvestmentOpportunity')
}

/**
 * Build WHERE condition for Investment Opportunity queries
 * Includes IRM-specific descriptors from INVESTMENT_OPPORTUNITY_DESCRIPTORS
 */
export const buildInvestmentOpportunityWhereCondition = (
  variables: InvestmentOpportunityQueryVariables = {},
  additionalDescriptors: Descriptor[] = [],
  customConditions: Record<string, any>[] = []
): Record<string, any> => {
  // INVESTMENT_OPPORTUNITY_DESCRIPTORS already includes common descriptors + IRM-specific ones
  const descriptors = [...INVESTMENT_OPPORTUNITY_DESCRIPTORS, ...additionalDescriptors]
  return buildOpportunityWhereCondition(variables, descriptors, customConditions)
}

/**
 * Build ORDER BY for Investment Opportunity queries
 * Includes IRM-specific descriptors
 */
export const buildInvestmentOpportunityOrderBy = (
  orderBy: InvestmentOpportunityQueryVariables['orderBy'] = [],
  additionalDescriptors: Descriptor[] = []
): any[] => {
  const descriptors = [...INVESTMENT_OPPORTUNITY_DESCRIPTORS, ...additionalDescriptors]
  return buildOpportunityOrderBy(orderBy, descriptors)
}

// =====================================================
// INVESTMENT OPPORTUNITY RELATED ENTITIES QUERIES
// =====================================================

/**
 * Build Investment Tasks by Opportunity ID query (using GraphQL variables)
 */
export const buildInvestmentTasksByOpportunityIdQuery = (): string => {
  const fragment = `
    ${buildTaskFragment(InvestmentTaskFields)}
    
    # Entity references
    opportunity {
      id
      code
      name
    }
  `

  return `
    query GetInvestmentTasksByOpportunityId(
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
 * Build Investment Activities by Opportunity ID query (using GraphQL variables)
 */
export const buildInvestmentActivitiesByOpportunityIdQuery = (): string => {
  const fragment = `
    ${buildActivityFragment(InvestmentActivityFields)}
    
    # Entity references
    opportunity {
      id
      code
      name
    }
  `

  return `
    query GetInvestmentActivitiesByOpportunityId(
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
 * Build Investment Notes by Opportunity ID query (using GraphQL variables)
 */
export const buildInvestmentNotesByOpportunityIdQuery = (): string => {
  const fragment = `
    ${buildNoteFragment(InvestmentNoteFields)}
    
    # Entity references
    opportunity {
      id
      code
      name
    }
  `

  return `
    query GetInvestmentNotesByOpportunityId(
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
 * Build Investment Documents by Opportunity ID query (using GraphQL variables)
 */
export const buildInvestmentDocumentsByOpportunityIdQuery = (): string => {
  const fragment = `
    ${buildDocumentFragment(InvestmentDocumentFields)}
    
    # Entity references
    opportunity {
      id
      code
      name
    }
  `

  return `
    query GetInvestmentDocumentsByOpportunityId(
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
export const GET_INVESTMENT_TASKS_BY_OPPORTUNITY_ID = buildInvestmentTasksByOpportunityIdQuery
export const GET_INVESTMENT_ACTIVITIES_BY_OPPORTUNITY_ID = buildInvestmentActivitiesByOpportunityIdQuery
export const GET_INVESTMENT_NOTES_BY_OPPORTUNITY_ID = buildInvestmentNotesByOpportunityIdQuery
export const GET_INVESTMENT_DOCUMENTS_BY_OPPORTUNITY_ID = buildInvestmentDocumentsByOpportunityIdQuery

// Investment Opportunity Queries - Complete queries using shared fragments
// NOTE: Related-entity queries have been moved to investmentOpportunityQueries.new.ts
import { INVESTMENT_OPPORTUNITY } from './fragments/investmentFragments'

// Get Investment Opportunity by ID
export const GET_INVESTMENT_OPPORTUNITY_BY_ID = (id: string): string => {
  return `
    query GetInvestmentOpportunityById {
      InvestmentOpportunity(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
        ${INVESTMENT_OPPORTUNITY}
      }
    }
  `
}

// =====================================================
// INVESTMENT OPPORTUNITY RELATED ENTITIES QUERIES
// =====================================================
// NOTE: Related-entity queries have been moved to investmentOpportunityQueries.new.ts
// Import them from there: GET_INVESTMENT_TASKS_BY_OPPORTUNITY_ID, etc.

// Get Investment Opportunity Aggregates - for metrics calculation
export const GET_INVESTMENT_OPPORTUNITY_AGGREGATES = (): string => {
  return `
    query GetInvestmentOpportunityAggregates(
      $where: InvestmentOpportunityBoolExp
      $wonWhere: InvestmentOpportunityBoolExp
    ) {
      # All opportunities aggregate
      InvestmentOpportunityAggregate(where: $where) {
        aggregate {
          count
          sum {
            estimatedAmount
          }
          avg {
            estimatedAmount
          }
        }
      }
      
      # Won opportunities aggregate
      InvestmentOpportunityWonAggregate: InvestmentOpportunityAggregate(where: $wonWhere) {
        aggregate {
          count
          sum {
            estimatedAmount
          }
        }
      }
    }
  `
}

// Get Investment Opportunity Stage Condition by ID
export const GET_INVESTMENT_OPPORTUNITY_STAGE_CONDITION_BY_ID = (id: string): string => {
  return `
    query GetInvestmentOpportunityStageConditionById {
      InvestmentOpportunityStageConditionByPk(id: "${id}") {
        id
        completed
        completedAt
        deadlineAt
        version
        opportunityPipelineStageCondition {
          id
          value
          code
          parentEntryId
        }
        configSnapshot
      }
    }
  `
}
