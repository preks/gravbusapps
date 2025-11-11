/**
 * Investment Task Queries (New)
 * GraphQL queries for Investment Task entities using fields mapping
 * Extends Common Task Queries with InvestmentTaskFields (with override + custom reference descriptor)
 */

import {
  buildTaskQuery,
  buildTaskByIdQuery,
  buildTaskSearchQuery,
  buildTaskWhereCondition,
  buildTaskOrderBy,
  buildTaskByLeadIdQuery,
  buildTaskByAccountIdQuery,
  buildTaskByContactIdQuery,
  buildTaskByOpportunityIdQuery,
  type CommonTaskQueryVariables,
  type TaskRelationBuilders,
  type TaskRelationFields
} from '@/common/data/relations/queries/taskQueries'
import { InvestmentTaskFields, INVESTMENT_TASK_DESCRIPTORS } from '../types/investmentTaskTypes'
// TaskFields type is used implicitly through Record<keyof typeof TaskFields, string>
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import {
  buildAccountFragment,
  buildContactFragment,
  buildDocumentFragment,
  buildLeadFragment,
  buildOpportunityFragment
} from '@/common/data/relations/queries/relationFragments'
import { INVESTMENT_REF } from './fragments/investmentReferenceFragments'

// Import Investment Fields
import { InvestmentDocumentFields } from '../types/investmentDocumentTypes'
import { InvestmentAccountFields } from '../types/investmentAccountTypes'
import { InvestmentContactFields } from '../types/investmentContactTypes'
import { InvestmentLeadFields } from '../types/investmentLeadTypes'
import { InvestmentOpportunityFields } from '../types/investmentOpportunityTypes'

/**
 * Investment Task Query Variables Interface
 * Extends CommonTaskQueryVariables with investment-specific filters
 */
export interface InvestmentTaskQueryVariables extends CommonTaskQueryVariables {
  // Investment-specific filters
  investmentIds?: string[]
  referenceTypes?: string[]
}

/**
 * Build Investment Task query with fields mapping
 */
export const buildInvestmentTaskQuery = (fields: typeof InvestmentTaskFields = InvestmentTaskFields): string => {
  // Build relation builders and fields for references
  const relationBuilders: Partial<TaskRelationBuilders> = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: Partial<TaskRelationFields> = {
    documentFields: InvestmentDocumentFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields
  }

  const entityFields = `
    # Investment relation (only in IRM, not in CRM)
    # Required for reference column mapping (investment.name)
    investment{
      ${INVESTMENT_REF}
    }
    investmentId
  `
  return buildTaskQuery('InvestmentTask', fields, relationBuilders, relationFields, entityFields)
}

/**
 * Build Investment Task by ID query
 */
export const buildInvestmentTaskByIdQuery = (
  fields: typeof InvestmentTaskFields = InvestmentTaskFields,
  id: string
): string => {
  // Build relation builders and fields for common relations
  const relationBuilders: TaskRelationBuilders = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: TaskRelationFields = {
    documentFields: InvestmentDocumentFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields
  }

  // Domain-specific entity fields (investment)
  const entityFields = `
    # Investment relation (only in IRM, not in CRM)
    # Required for reference column mapping (investment.name)
    investment{
      ${INVESTMENT_REF}
    }
    investmentId
  `

  return buildTaskByIdQuery('InvestmentTask', id, fields, relationBuilders, relationFields, entityFields)
}

/**
 * Build Investment Task search query
 */
export const buildInvestmentTaskSearchQuery = (fields: typeof InvestmentTaskFields = InvestmentTaskFields): string => {
  return buildTaskSearchQuery('InvestmentTask', fields)
}

/**
 * Build WHERE condition for Investment Task queries
 * Uses INVESTMENT_TASK_DESCRIPTORS which includes common descriptors + custom reference descriptor
 */
export const buildInvestmentTaskWhereCondition = (
  variables: InvestmentTaskQueryVariables = {},
  additionalDescriptors: Descriptor[] = [],
  customConditions: Record<string, any>[] = []
): Record<string, any> => {
  // INVESTMENT_TASK_DESCRIPTORS already includes common descriptors + custom reference descriptor
  const descriptors = [...INVESTMENT_TASK_DESCRIPTORS, ...additionalDescriptors]
  return buildTaskWhereCondition(variables, descriptors, customConditions)
}

/**
 * Build ORDER BY for Investment Task queries
 * Uses INVESTMENT_TASK_DESCRIPTORS which includes common descriptors + custom reference descriptor
 */
export const buildInvestmentTaskOrderBy = (
  orderBy: InvestmentTaskQueryVariables['orderBy'] = [],
  additionalDescriptors: Descriptor[] = []
): any[] => {
  const descriptors = [...INVESTMENT_TASK_DESCRIPTORS, ...additionalDescriptors]
  return buildTaskOrderBy(orderBy, descriptors)
}

// =====================================================
// INVESTMENT TASK BY ENTITY ID QUERY BUILDERS
// =====================================================

/**
 * Build Investment Task query filtered by Lead ID
 * Uses common buildTaskByLeadIdQuery with Investment-specific fields and relations
 */
export const buildInvestmentTaskByLeadIdQuery = (): string => {
  const relationBuilders: Partial<TaskRelationBuilders> = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: Partial<TaskRelationFields> = {
    documentFields: InvestmentDocumentFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields
  }

  const entityFields = `
    # Investment relation (only in IRM, not in CRM)
    investment{
      ${INVESTMENT_REF}
    }
    investmentId
  `

  return buildTaskByLeadIdQuery('InvestmentTask', InvestmentTaskFields, relationBuilders, relationFields, entityFields)
}

/**
 * Build Investment Task query filtered by Account ID
 * Uses common buildTaskByAccountIdQuery with Investment-specific fields and relations
 */
export const buildInvestmentTaskByAccountIdQuery = (): string => {
  const relationBuilders: Partial<TaskRelationBuilders> = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: Partial<TaskRelationFields> = {
    documentFields: InvestmentDocumentFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields
  }

  const entityFields = `
    # Investment relation (only in IRM, not in CRM)
    investment{
      ${INVESTMENT_REF}
    }
    investmentId
  `

  return buildTaskByAccountIdQuery(
    'InvestmentTask',
    InvestmentTaskFields,
    relationBuilders,
    relationFields,
    entityFields
  )
}

/**
 * Build Investment Task query filtered by Contact ID
 * Uses common buildTaskByContactIdQuery with Investment-specific fields and relations
 */
export const buildInvestmentTaskByContactIdQuery = (): string => {
  const relationBuilders: Partial<TaskRelationBuilders> = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: Partial<TaskRelationFields> = {
    documentFields: InvestmentDocumentFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields
  }

  const entityFields = `
    # Investment relation (only in IRM, not in CRM)
    investment{
      ${INVESTMENT_REF}
    }
    investmentId
  `

  return buildTaskByContactIdQuery(
    'InvestmentTask',
    InvestmentTaskFields,
    relationBuilders,
    relationFields,
    entityFields
  )
}

/**
 * Build Investment Task query filtered by Opportunity ID
 * Uses common buildTaskByOpportunityIdQuery with Investment-specific fields and relations
 */
export const buildInvestmentTaskByOpportunityIdQuery = (): string => {
  const relationBuilders: Partial<TaskRelationBuilders> = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: Partial<TaskRelationFields> = {
    documentFields: InvestmentDocumentFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields
  }

  const entityFields = `
    # Investment relation (only in IRM, not in CRM)
    investment{
      ${INVESTMENT_REF}
    }
    investmentId
  `

  return buildTaskByOpportunityIdQuery(
    'InvestmentTask',
    InvestmentTaskFields,
    relationBuilders,
    relationFields,
    entityFields
  )
}

/**
 * Build Investment Task query filtered by Investment ID
 * IRM-specific query builder
 */
export const buildInvestmentTaskByInvestmentIdQuery = (): string => {
  const relationBuilders: Partial<TaskRelationBuilders> = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: Partial<TaskRelationFields> = {
    documentFields: InvestmentDocumentFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields
  }

  const entityFields = `
    # Investment relation (only in IRM, not in CRM)
    investment{
      ${INVESTMENT_REF}
    }
    investmentId
  `

  // Use buildTaskQuery directly since there's no common builder for investment
  return buildTaskQuery('InvestmentTask', InvestmentTaskFields, relationBuilders, relationFields, entityFields)
}
