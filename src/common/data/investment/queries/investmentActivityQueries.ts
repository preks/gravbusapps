/**
 * Investment Activity Queries (New)
 * GraphQL queries for Investment Activity entities using fields mapping
 * Uses Common Activity Queries with InvestmentActivityFields (no overrides needed)
 */

import {
  buildActivityQuery,
  buildActivityByIdQuery,
  buildActivitySearchQuery,
  buildActivityWhereCondition,
  buildActivityOrderBy,
  buildActivityByLeadIdQuery,
  buildActivityByAccountIdQuery,
  buildActivityByContactIdQuery,
  buildActivityByOpportunityIdQuery,
  type CommonActivityQueryVariables,
  type ActivityRelationBuilders,
  type ActivityRelationFields
} from '@/common/data/relations/queries/activityQueries'
import { InvestmentActivityFields, INVESTMENT_ACTIVITY_DESCRIPTORS } from '../types/investmentActivityTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import {
  buildAccountFragment,
  buildContactFragment,
  buildDocumentFragment,
  buildLeadFragment,
  buildOpportunityFragment
} from '@/common/data/relations/queries/relationFragments'

// Import Investment Fields
import { InvestmentDocumentFields } from '../types/investmentDocumentTypes'
import { InvestmentAccountFields } from '../types/investmentAccountTypes'
import { InvestmentContactFields } from '../types/investmentContactTypes'
import { InvestmentLeadFields } from '../types/investmentLeadTypes'
import { InvestmentOpportunityFields } from '../types/investmentOpportunityTypes'
import { INVESTMENT_REF } from './fragments/investmentReferenceFragments'

/**
 * Investment Activity Query Variables Interface
 * Extends CommonActivityQueryVariables (no additional fields needed)
 */
export interface InvestmentActivityQueryVariables extends CommonActivityQueryVariables {
  // Investment-specific: investmentId filter
  investmentId?: string
  investmentIds?: string[]
  /** Filter by reference entity type: 'account' | 'contact' | 'lead' | 'opportunity' | 'investment' */
  referenceTypes?: string[]
}

/**
 * Build Investment Activity query with fields mapping
 * Includes IRM-specific investment field and all reference relations
 */
export const buildInvestmentActivityQuery = (
  fields: typeof InvestmentActivityFields = InvestmentActivityFields
): string => {
  // Build relation builders for common references (account, contact, lead, opportunity)
  const relationBuilders: ActivityRelationBuilders = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: ActivityRelationFields = {
    documentFields: InvestmentDocumentFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields
  }

  // Build additional fields for IRM (investment relation)
  const additionalFields = `
    # Investment relation (IRM-specific)
    ${fields.investment} {
      ${INVESTMENT_REF}
    }
    ${fields.investmentId}
  `

  return buildActivityQuery('InvestmentActivity', fields, relationBuilders, relationFields, additionalFields)
}

/**
 * Build Investment Activity by ID query
 */
export const buildInvestmentActivityByIdQuery = (
  fields: typeof InvestmentActivityFields = InvestmentActivityFields,
  id: string
): string => {
  // Build relation builders and fields for common relations
  const relationBuilders: ActivityRelationBuilders = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: ActivityRelationFields = {
    documentFields: InvestmentDocumentFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields
  }

  return buildActivityByIdQuery('InvestmentActivity', id, fields, relationBuilders, relationFields)
}

/**
 * Build Investment Activity search query
 */
export const buildInvestmentActivitySearchQuery = (
  fields: typeof InvestmentActivityFields = InvestmentActivityFields
): string => {
  return buildActivitySearchQuery('InvestmentActivity', fields)
}

/**
 * Build WHERE condition for Investment Activity queries
 * Uses INVESTMENT_ACTIVITY_DESCRIPTORS which includes common descriptors
 */
export const buildInvestmentActivityWhereCondition = (
  variables: InvestmentActivityQueryVariables = {},
  additionalDescriptors: Descriptor[] = [],
  customConditions: Record<string, any>[] = []
): Record<string, any> => {
  // INVESTMENT_ACTIVITY_DESCRIPTORS already includes common descriptors
  const descriptors = [...INVESTMENT_ACTIVITY_DESCRIPTORS, ...additionalDescriptors]
  return buildActivityWhereCondition(variables, descriptors, customConditions)
}

/**
 * Build ORDER BY for Investment Activity queries
 * Uses INVESTMENT_ACTIVITY_DESCRIPTORS which includes common descriptors
 */
export const buildInvestmentActivityOrderBy = (
  orderBy: InvestmentActivityQueryVariables['orderBy'] = [],
  additionalDescriptors: Descriptor[] = []
): any[] => {
  // INVESTMENT_ACTIVITY_DESCRIPTORS already includes common descriptors
  const descriptors = [...INVESTMENT_ACTIVITY_DESCRIPTORS, ...additionalDescriptors]
  return buildActivityOrderBy(orderBy, descriptors)
}

// =====================================================
// INVESTMENT ACTIVITY BY ENTITY ID QUERY BUILDERS
// =====================================================

/**
 * Build Investment Activity query filtered by Lead ID
 * Uses common buildActivityByLeadIdQuery with Investment-specific fields and relations
 */
export const buildInvestmentActivityByLeadIdQuery = (): string => {
  const relationBuilders: Partial<ActivityRelationBuilders> = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: Partial<ActivityRelationFields> = {
    documentFields: InvestmentDocumentFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields
  }

  return buildActivityByLeadIdQuery('InvestmentActivity', InvestmentActivityFields, relationBuilders, relationFields)
}

/**
 * Build Investment Activity query filtered by Account ID
 */
export const buildInvestmentActivityByAccountIdQuery = (): string => {
  const relationBuilders: Partial<ActivityRelationBuilders> = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: Partial<ActivityRelationFields> = {
    documentFields: InvestmentDocumentFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields
  }

  return buildActivityByAccountIdQuery('InvestmentActivity', InvestmentActivityFields, relationBuilders, relationFields)
}

/**
 * Build Investment Activity query filtered by Contact ID
 */
export const buildInvestmentActivityByContactIdQuery = (): string => {
  const relationBuilders: Partial<ActivityRelationBuilders> = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: Partial<ActivityRelationFields> = {
    documentFields: InvestmentDocumentFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields
  }

  return buildActivityByContactIdQuery('InvestmentActivity', InvestmentActivityFields, relationBuilders, relationFields)
}

/**
 * Build Investment Activity query filtered by Opportunity ID
 */
export const buildInvestmentActivityByOpportunityIdQuery = (): string => {
  const relationBuilders: Partial<ActivityRelationBuilders> = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: Partial<ActivityRelationFields> = {
    documentFields: InvestmentDocumentFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields
  }

  return buildActivityByOpportunityIdQuery(
    'InvestmentActivity',
    InvestmentActivityFields,
    relationBuilders,
    relationFields
  )
}
