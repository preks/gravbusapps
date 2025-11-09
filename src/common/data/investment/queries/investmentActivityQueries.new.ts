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
  type CommonActivityQueryVariables
} from '@/common/data/relations/queries/commonActivityQueries'
import {
  buildActivityFragmentWithRelations,
  type ActivityRelationBuilders,
  type ActivityRelationFields
} from '@/common/data/relations/queries/commonActivityQueries'
import { InvestmentActivityFields, INVESTMENT_ACTIVITY_DESCRIPTORS } from '../types/investmentActivityTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import { buildAccountFragment } from '@/common/data/relations/queries/commonAccountFragments.new'
import { buildContactFragment } from '@/common/data/relations/queries/commonContactFragments.new'
import { buildDocumentFragment } from '@/common/data/relations/queries/commonDocumentFragments.new'
import { buildLeadFragment } from '@/common/data/relations/queries/commonLeadFragments.new'
import { buildOpportunityFragment } from '@/common/data/relations/queries/commonOpportunityFragments.new'

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
 * Build Investment Activity fragment using fields mapping
 * Includes Common Activity fields + common entity relations
 */
export const buildInvestmentActivityFragment = (
  fields: typeof InvestmentActivityFields = InvestmentActivityFields
): string => {
  // Build common fragment with relations using REF fragments (no relations) to avoid circular dependencies
  const relationBuilders: ActivityRelationBuilders = {
    buildDocumentFragment, // REF fragment (no relations)
    buildAccountFragment, // REF fragment (no relations) - NOT buildInvestmentAccountFragment!
    buildContactFragment, // REF fragment (no relations) - NOT buildInvestmentContactFragment!
    buildLeadFragment, // REF fragment (no relations) - NOT buildInvestmentLeadFragment!
    buildOpportunityFragment // REF fragment (no relations) - NOT buildInvestmentOpportunityFragment!
  }

  const relationFields: ActivityRelationFields = {
    documentFields: InvestmentDocumentFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields
  }

  return buildActivityFragmentWithRelations(fields, relationBuilders, relationFields)
}

/**
 * Build Investment Activity query with fields mapping
 */
export const buildInvestmentActivityQuery = (
  fields: typeof InvestmentActivityFields = InvestmentActivityFields,
  fragment: string = buildInvestmentActivityFragment(fields)
): string => {
  return buildActivityQuery(fields, fragment, 'InvestmentActivity')
}

/**
 * Build Investment Activity by ID query
 */
export const buildInvestmentActivityByIdQuery = (
  fields: typeof InvestmentActivityFields = InvestmentActivityFields,
  fragment: string = buildInvestmentActivityFragment(fields),
  id: string
): string => {
  return buildActivityByIdQuery(fields, fragment, id, 'InvestmentActivity')
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
