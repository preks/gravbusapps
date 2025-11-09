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
  type CommonTaskQueryVariables
} from '@/common/data/relations/queries/commonTaskQueries'
import {
  buildTaskFragmentWithRelations,
  type TaskRelationBuilders,
  type TaskRelationFields
} from '@/common/data/relations/queries/commonTaskQueries'
import { InvestmentTaskFields, INVESTMENT_TASK_DESCRIPTORS } from '../types/investmentTaskTypes'
// TaskFields type is used implicitly through Record<keyof typeof TaskFields, string>
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import { buildAccountFragment } from '@/common/data/relations/queries/commonAccountFragments.new'
import { buildContactFragment } from '@/common/data/relations/queries/commonContactFragments.new'
import { buildDocumentFragment } from '@/common/data/relations/queries/commonDocumentFragments.new'
import { buildLeadFragment } from '@/common/data/relations/queries/commonLeadFragments.new'
import { buildOpportunityFragment } from '@/common/data/relations/queries/commonOpportunityFragments.new'
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
 * Build Investment Task fragment using fields mapping
 * Includes Common Task fields + common entity relations
 */
export const buildInvestmentTaskFragment = (fields: typeof InvestmentTaskFields = InvestmentTaskFields): string => {
  // Build common fragment with relations using REF fragments (no relations) to avoid circular dependencies
  const relationBuilders: TaskRelationBuilders = {
    buildDocumentFragment, // REF fragment (no relations)
    buildAccountFragment, // REF fragment (no relations) - NOT buildInvestmentAccountFragment!
    buildContactFragment, // REF fragment (no relations) - NOT buildInvestmentContactFragment!
    buildLeadFragment, // REF fragment (no relations) - NOT buildInvestmentLeadFragment!
    buildOpportunityFragment // REF fragment (no relations) - NOT buildInvestmentOpportunityFragment!
  }

  const relationFields: TaskRelationFields = {
    documentFields: InvestmentDocumentFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields
  }

  const commonFragmentWithRelations = buildTaskFragmentWithRelations(fields, relationBuilders, relationFields)

  return `
  ${commonFragmentWithRelations}
  
  # Investment relation (only in IRM, not in CRM)
  # Required for reference column mapping (investment.name)
  investment{
    ${INVESTMENT_REF}
  }
  investmentId
`
}

/**
 * Build Investment Task query with fields mapping
 */
export const buildInvestmentTaskQuery = (
  fields: typeof InvestmentTaskFields = InvestmentTaskFields,
  fragment: string = buildInvestmentTaskFragment(fields)
): string => {
  return buildTaskQuery(fields, fragment, 'InvestmentTask')
}

/**
 * Build Investment Task by ID query
 */
export const buildInvestmentTaskByIdQuery = (
  fields: typeof InvestmentTaskFields = InvestmentTaskFields,
  fragment: string = buildInvestmentTaskFragment(fields),
  id: string
): string => {
  return buildTaskByIdQuery(fields, fragment, id, 'InvestmentTask')
}

/**
 * Build Investment Task search query
 */
export const buildInvestmentTaskSearchQuery = (fields: typeof InvestmentTaskFields = InvestmentTaskFields): string => {
  return buildTaskSearchQuery(fields, 'InvestmentTask')
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
