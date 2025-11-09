/**
 * Investment Note Queries (New)
 * GraphQL queries for Investment Note entities using fields mapping
 * Uses Common Note Queries with InvestmentNoteFields (no overrides needed)
 */

import {
  buildNoteQuery,
  buildNoteByIdQuery,
  buildNoteSearchQuery,
  buildNoteWhereCondition,
  buildNoteOrderBy,
  type CommonNoteQueryVariables
} from '@/common/data/relations/queries/commonNoteQueries'
import {
  buildNoteFragmentWithRelations,
  type NoteRelationBuilders,
  type NoteRelationFields
} from '@/common/data/relations/queries/commonNoteQueries'
import { InvestmentNoteFields, INVESTMENT_NOTE_DESCRIPTORS } from '../types/investmentNoteTypes'
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
 * Investment Note Query Variables Interface
 * Extends CommonNoteQueryVariables with investment-specific filters
 */
export interface InvestmentNoteQueryVariables extends CommonNoteQueryVariables {
  // Investment-specific: investmentId filter
  investmentId?: string
  investmentIds?: string[]
}

/**
 * Build Investment Note fragment using fields mapping
 * Includes Common Note fields + common entity relations
 */
export const buildInvestmentNoteFragment = (fields: typeof InvestmentNoteFields = InvestmentNoteFields): string => {
  // Build common fragment with relations using REF fragments (no relations) to avoid circular dependencies
  const relationBuilders: NoteRelationBuilders = {
    buildDocumentFragment, // REF fragment (no relations)
    buildAccountFragment, // REF fragment (no relations) - NOT buildInvestmentAccountFragment!
    buildContactFragment, // REF fragment (no relations) - NOT buildInvestmentContactFragment!
    buildLeadFragment, // REF fragment (no relations) - NOT buildInvestmentLeadFragment!
    buildOpportunityFragment // REF fragment (no relations) - NOT buildInvestmentOpportunityFragment!
  }

  const relationFields: NoteRelationFields = {
    documentFields: InvestmentDocumentFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields
  }

  return buildNoteFragmentWithRelations(fields, relationBuilders, relationFields)
}

/**
 * Build Investment Note query with fields mapping
 */
export const buildInvestmentNoteQuery = (
  fields: typeof InvestmentNoteFields = InvestmentNoteFields,
  fragment: string = buildInvestmentNoteFragment(fields)
): string => {
  return buildNoteQuery(fields, fragment, 'InvestmentNote')
}

/**
 * Build Investment Note by ID query
 */
export const buildInvestmentNoteByIdQuery = (
  fields: typeof InvestmentNoteFields = InvestmentNoteFields,
  fragment: string = buildInvestmentNoteFragment(fields),
  id: string
): string => {
  return buildNoteByIdQuery(fields, fragment, id, 'InvestmentNote')
}

/**
 * Build Investment Note search query
 */
export const buildInvestmentNoteSearchQuery = (fields: typeof InvestmentNoteFields = InvestmentNoteFields): string => {
  return buildNoteSearchQuery(fields, 'InvestmentNote')
}

/**
 * Build WHERE condition for Investment Note queries
 * Uses INVESTMENT_NOTE_DESCRIPTORS which includes common descriptors
 */
export const buildInvestmentNoteWhereCondition = (
  variables: InvestmentNoteQueryVariables = {},
  additionalDescriptors: Descriptor[] = [],
  customConditions: Record<string, any>[] = []
): Record<string, any> => {
  // INVESTMENT_NOTE_DESCRIPTORS already includes common descriptors
  const descriptors = [...INVESTMENT_NOTE_DESCRIPTORS, ...additionalDescriptors]
  return buildNoteWhereCondition(variables, descriptors, customConditions)
}

/**
 * Build ORDER BY for Investment Note queries
 * Uses INVESTMENT_NOTE_DESCRIPTORS which includes common descriptors
 */
export const buildInvestmentNoteOrderBy = (
  orderBy: InvestmentNoteQueryVariables['orderBy'] = [],
  additionalDescriptors: Descriptor[] = []
): any[] => {
  // INVESTMENT_NOTE_DESCRIPTORS already includes common descriptors
  const descriptors = [...INVESTMENT_NOTE_DESCRIPTORS, ...additionalDescriptors]
  return buildNoteOrderBy(orderBy, descriptors)
}

// =====================================================
// LEGACY QUERY EXPORTS (for backward compatibility)
// =====================================================

/**
 * Get investment notes with filtering
 * @deprecated Use buildInvestmentNoteQuery instead
 */
export const GET_INVESTMENT_NOTES = (): string => {
  return buildInvestmentNoteQuery()
}

/**
 * Get investment notes by investment ID (using GraphQL variables)
 * @deprecated Use buildInvestmentNoteQuery with customConditions instead
 */
export const GET_INVESTMENT_NOTES_BY_INVESTMENT_ID = (): string => {
  const fragment = buildInvestmentNoteFragment()

  return `
    query GetInvestmentNotesByInvestmentId(
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
