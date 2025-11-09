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

/**
 * Investment Activity Query Variables Interface
 * Extends CommonActivityQueryVariables (no additional fields needed)
 */
export interface InvestmentActivityQueryVariables extends CommonActivityQueryVariables {
  // Investment-specific: investmentId filter
  investmentId?: string
  investmentIds?: string[]
}

/**
 * Build Investment Activity query with fields mapping
 */
export const buildInvestmentActivityQuery = (
  fields: typeof InvestmentActivityFields = InvestmentActivityFields
): string => {
  return buildActivityQuery(fields, 'InvestmentActivity')
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

  return buildActivityByIdQuery(fields, id, 'InvestmentActivity', relationBuilders, relationFields)
}

/**
 * Build Investment Activity search query
 */
export const buildInvestmentActivitySearchQuery = (
  fields: typeof InvestmentActivityFields = InvestmentActivityFields
): string => {
  return buildActivitySearchQuery(fields, 'InvestmentActivity')
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
