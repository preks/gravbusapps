/**
 * Investment Document Queries (New)
 * GraphQL queries for Investment Document entities using fields mapping
 * Uses Common Document Queries with InvestmentDocumentFields (no overrides needed)
 */

import {
  buildDocumentQuery,
  buildDocumentByIdQuery,
  buildDocumentSearchQuery,
  buildDocumentWhereCondition,
  buildDocumentOrderBy,
  type CommonDocumentQueryVariables
} from '@/common/data/relations/queries/commonDocumentQueries'
import {
  buildDocumentFragmentWithRelations,
  type DocumentRelationBuilders,
  type DocumentRelationFields
} from '@/common/data/relations/queries/commonDocumentQueries'
import { InvestmentDocumentFields, INVESTMENT_DOCUMENT_DESCRIPTORS } from '../types/investmentDocumentTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import { buildAccountFragment } from '@/common/data/relations/queries/commonAccountFragments.new'
import { buildContactFragment } from '@/common/data/relations/queries/commonContactFragments.new'
import { buildLeadFragment } from '@/common/data/relations/queries/commonLeadFragments.new'
import { buildOpportunityFragment } from '@/common/data/relations/queries/commonOpportunityFragments.new'
import { buildTaskFragment } from '@/common/data/relations/queries/commonTaskFragments.new'
import { buildActivityFragment } from '@/common/data/relations/queries/commonActivityFragments.new'
import { buildNoteFragment } from '@/common/data/relations/queries/commonNoteFragments.new'

// Import Investment Fields
import { InvestmentAccountFields } from '../types/investmentAccountTypes'
import { InvestmentContactFields } from '../types/investmentContactTypes'
import { InvestmentLeadFields } from '../types/investmentLeadTypes'
import { InvestmentOpportunityFields } from '../types/investmentOpportunityTypes'
import { InvestmentTaskFields } from '../types/investmentTaskTypes'
import { InvestmentActivityFields } from '../types/investmentActivityTypes'
import { InvestmentNoteFields } from '../types/investmentNoteTypes'

/**
 * Investment Document Query Variables Interface
 * Extends CommonDocumentQueryVariables with investment-specific filters
 */
export interface InvestmentDocumentQueryVariables extends CommonDocumentQueryVariables {
  // Investment-specific: investmentId filter
  investmentId?: string
  investmentIds?: string[]
}

/**
 * Build Investment Document fragment using fields mapping
 * Includes Common Document fields + common entity relations
 */
export const buildInvestmentDocumentFragment = (
  fields: typeof InvestmentDocumentFields = InvestmentDocumentFields
): string => {
  // Build common fragment with relations using REF fragments (no relations) to avoid circular dependencies
  const relationBuilders: DocumentRelationBuilders = {
    buildAccountFragment, // REF fragment (no relations) - NOT buildInvestmentAccountFragment!
    buildContactFragment, // REF fragment (no relations) - NOT buildInvestmentContactFragment!
    buildLeadFragment, // REF fragment (no relations) - NOT buildInvestmentLeadFragment!
    buildOpportunityFragment, // REF fragment (no relations) - NOT buildInvestmentOpportunityFragment!
    buildTaskFragment, // REF fragment (no relations) - NOT buildInvestmentTaskFragment!
    buildActivityFragment, // REF fragment (no relations) - NOT buildInvestmentActivityFragment!
    buildNoteFragment // REF fragment (no relations) - NOT buildInvestmentNoteFragment!
  }

  const relationFields: DocumentRelationFields = {
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields,
    taskFields: InvestmentTaskFields,
    activityFields: InvestmentActivityFields,
    noteFields: InvestmentNoteFields
  }

  return buildDocumentFragmentWithRelations(fields, relationBuilders, relationFields)
}

/**
 * Build Investment Document query with fields mapping
 */
export const buildInvestmentDocumentQuery = (
  fields: typeof InvestmentDocumentFields = InvestmentDocumentFields,
  fragment: string = buildInvestmentDocumentFragment(fields)
): string => {
  return buildDocumentQuery(fields, fragment, 'InvestmentDocument')
}

/**
 * Build Investment Document by ID query
 */
export const buildInvestmentDocumentByIdQuery = (
  fields: typeof InvestmentDocumentFields = InvestmentDocumentFields,
  fragment: string = buildInvestmentDocumentFragment(fields),
  id: string
): string => {
  return buildDocumentByIdQuery(fields, fragment, id, 'InvestmentDocument')
}

/**
 * Build Investment Document search query
 */
export const buildInvestmentDocumentSearchQuery = (
  fields: typeof InvestmentDocumentFields = InvestmentDocumentFields
): string => {
  return buildDocumentSearchQuery(fields, 'InvestmentDocument')
}

/**
 * Build WHERE condition for Investment Document queries
 * Uses INVESTMENT_DOCUMENT_DESCRIPTORS which includes common descriptors
 */
export const buildInvestmentDocumentWhereCondition = (
  variables: InvestmentDocumentQueryVariables = {},
  additionalDescriptors: Descriptor[] = [],
  customConditions: Record<string, any>[] = []
): Record<string, any> => {
  // INVESTMENT_DOCUMENT_DESCRIPTORS already includes common descriptors
  const descriptors = [...INVESTMENT_DOCUMENT_DESCRIPTORS, ...additionalDescriptors]
  return buildDocumentWhereCondition(variables, descriptors, customConditions)
}

/**
 * Build ORDER BY for Investment Document queries
 * Uses INVESTMENT_DOCUMENT_DESCRIPTORS which includes common descriptors
 */
export const buildInvestmentDocumentOrderBy = (
  orderBy: InvestmentDocumentQueryVariables['orderBy'] = [],
  additionalDescriptors: Descriptor[] = []
): any[] => {
  // INVESTMENT_DOCUMENT_DESCRIPTORS already includes common descriptors
  const descriptors = [...INVESTMENT_DOCUMENT_DESCRIPTORS, ...additionalDescriptors]
  return buildDocumentOrderBy(orderBy, descriptors)
}
