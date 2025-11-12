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
  buildNoteByLeadIdQuery,
  buildNoteByAccountIdQuery,
  buildNoteByContactIdQuery,
  buildNoteByOpportunityIdQuery,
  type CommonNoteQueryVariables,
  type NoteRelationBuilders,
  type NoteRelationFields
} from '@/common/data/relations/queries/noteQueries'
import { InvestmentNoteFields, INVESTMENT_NOTE_DESCRIPTORS } from '../types/investmentNoteTypes'
import { InvestmentDocumentFields } from '../types/investmentDocumentTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import {
  buildAccountFragment,
  buildContactFragment,
  buildDocumentFragment,
  buildLeadFragment,
  buildNoteFragment,
  buildOpportunityFragment
} from '@/common/data/relations/queries/relationFragments'
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
 * Build Investment Note query with fields mapping
 */
export const buildInvestmentNoteQuery = (fields: typeof InvestmentNoteFields = InvestmentNoteFields): string => {
  return buildNoteQuery('InvestmentNote', fields)
}

/**
 * Build Investment Note by ID query
 */
export const buildInvestmentNoteByIdQuery = (
  fields: typeof InvestmentNoteFields = InvestmentNoteFields,
  id: string
): string => {
  // Build relation builders and fields for common relations
  const relationBuilders: NoteRelationBuilders = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: NoteRelationFields = {
    documentFields: InvestmentDocumentFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields
  }

  return buildNoteByIdQuery('InvestmentNote', id, fields, relationBuilders, relationFields)
}

/**
 * Build Investment Note search query
 */
export const buildInvestmentNoteSearchQuery = (fields: typeof InvestmentNoteFields = InvestmentNoteFields): string => {
  return buildNoteSearchQuery('InvestmentNote', fields)
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
// INVESTMENT NOTE BY ENTITY ID QUERY BUILDERS
// =====================================================

/**
 * Build Investment Note query filtered by Lead ID
 * Uses common buildNoteByLeadIdQuery with Investment-specific fields and relations
 */
export const buildInvestmentNoteByLeadIdQuery = (): string => {
  const relationBuilders: Partial<NoteRelationBuilders> = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: Partial<NoteRelationFields> = {
    documentFields: InvestmentDocumentFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields
  }

  return buildNoteByLeadIdQuery('InvestmentNote', InvestmentNoteFields, relationBuilders, relationFields)
}

/**
 * Build Investment Note query filtered by Account ID
 */
export const buildInvestmentNoteByAccountIdQuery = (): string => {
  const relationBuilders: Partial<NoteRelationBuilders> = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: Partial<NoteRelationFields> = {
    documentFields: InvestmentDocumentFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields
  }

  return buildNoteByAccountIdQuery('InvestmentNote', InvestmentNoteFields, relationBuilders, relationFields)
}

/**
 * Build Investment Note query filtered by Contact ID
 */
export const buildInvestmentNoteByContactIdQuery = (): string => {
  const relationBuilders: Partial<NoteRelationBuilders> = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: Partial<NoteRelationFields> = {
    documentFields: InvestmentDocumentFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields
  }

  return buildNoteByContactIdQuery('InvestmentNote', InvestmentNoteFields, relationBuilders, relationFields)
}

/**
 * Build Investment Note query filtered by Opportunity ID
 */
export const buildInvestmentNoteByOpportunityIdQuery = (): string => {
  const relationBuilders: Partial<NoteRelationBuilders> = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: Partial<NoteRelationFields> = {
    documentFields: InvestmentDocumentFields,
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields
  }

  return buildNoteByOpportunityIdQuery('InvestmentNote', InvestmentNoteFields, relationBuilders, relationFields)
}

// =====================================================
// LEGACY QUERY EXPORTS (for backward compatibility)
// =====================================================

/**
 * Get investment notes by investment ID (using GraphQL variables)
 * @deprecated Use buildInvestmentNoteQuery with customConditions instead
 */
export const GET_INVESTMENT_NOTES_BY_INVESTMENT_ID = (): string => {
  // Use buildNoteFragment directly from relationFragments
  const fragment = buildNoteFragment(InvestmentNoteFields)

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
        
        # Title and text fields (CRM uses noteTitle/noteText, IRM uses title/text)
        title
        text
        
        # Documents relation (includes fileInfo)
        documents(where: { isDeleted: { _eq: false } }) {
          ${buildDocumentFragment(InvestmentDocumentFields)}
        }
      }
    }
  `
}
