/**
 * Customer Note Queries (New)
 * GraphQL queries for Customer Note entities using fields mapping
 * Extends Common Note Queries with CRM-specific fields
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
import { CustomerNoteFields, CUSTOMER_NOTE_DESCRIPTORS } from '../types/customerNoteTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import { buildDocumentFragment } from '@/common/data/relations/queries/commonDocumentFragments.new'
import { buildAccountFragment } from '@/common/data/relations/queries/commonAccountFragments.new'
import { buildContactFragment } from '@/common/data/relations/queries/commonContactFragments.new'
import { buildLeadFragment } from '@/common/data/relations/queries/commonLeadFragments.new'
import { buildOpportunityFragment } from '@/common/data/relations/queries/commonOpportunityFragments.new'

// Import Customer Fields
import { CustomerDocumentFields } from '../types/customerDocumentTypes'
import { CustomerAccountFields } from '../types/customerAccountTypes'
import { CustomerContactFields } from '../types/customerContactTypes'
import { CustomerLeadFields } from '../types/customerLeadTypes'
import { CustomerOpportunityFields } from '../types/customerOpportunityTypes'

/**
 * Customer Note Query Variables Interface
 * Extends CommonNoteQueryVariables (no CRM-specific filters)
 */
export type CustomerNoteQueryVariables = CommonNoteQueryVariables

/**
 * Build Customer Note fragment using fields mapping
 * Includes Common Note fields + common entity relations
 */
export const buildCustomerNoteFragment = (fields: typeof CustomerNoteFields = CustomerNoteFields): string => {
  // Build common fragment with relations using REF fragments (no relations) to avoid circular dependencies
  const relationBuilders: NoteRelationBuilders = {
    buildDocumentFragment, // REF fragment (no relations)
    buildAccountFragment, // REF fragment (no relations) - NOT buildCustomerAccountFragment!
    buildContactFragment, // REF fragment (no relations) - NOT buildCustomerContactFragment!
    buildLeadFragment, // REF fragment (no relations)
    buildOpportunityFragment // REF fragment (no relations) - NOT buildCustomerOpportunityFragment!
  }

  const relationFields: NoteRelationFields = {
    documentFields: CustomerDocumentFields,
    accountFields: CustomerAccountFields,
    contactFields: CustomerContactFields,
    leadFields: CustomerLeadFields,
    opportunityFields: CustomerOpportunityFields
  }

  return buildNoteFragmentWithRelations(fields, relationBuilders, relationFields)
}

/**
 * Build Customer Note query with fields mapping
 * CRM uses "CrmNote" as entity name (not "CustomerNote")
 */
export const buildCustomerNoteQuery = (
  fields: typeof CustomerNoteFields = CustomerNoteFields,
  fragment: string = buildCustomerNoteFragment(fields)
): string => {
  return buildNoteQuery(fields, fragment, 'CrmNote')
}

/**
 * Build Customer Note by ID query
 */
export const buildCustomerNoteByIdQuery = (
  fields: typeof CustomerNoteFields = CustomerNoteFields,
  fragment: string = buildCustomerNoteFragment(fields),
  id: string
): string => {
  return buildNoteByIdQuery(fields, fragment, id, 'CrmNote')
}

/**
 * Build Customer Note search query
 */
export const buildCustomerNoteSearchQuery = (fields: typeof CustomerNoteFields = CustomerNoteFields): string => {
  return buildNoteSearchQuery(fields, 'CrmNote')
}

/**
 * Build WHERE condition for Customer Note queries
 * Uses CUSTOMER_NOTE_DESCRIPTORS which includes common descriptors
 */
export const buildCustomerNoteWhereCondition = (
  variables: CustomerNoteQueryVariables = {},
  additionalDescriptors: Descriptor[] = [],
  customConditions: Record<string, any>[] = []
): Record<string, any> => {
  // CUSTOMER_NOTE_DESCRIPTORS already includes common descriptors
  const descriptors = [...CUSTOMER_NOTE_DESCRIPTORS, ...additionalDescriptors]
  return buildNoteWhereCondition(variables, descriptors, customConditions)
}

/**
 * Build ORDER BY for Customer Note queries
 */
export const buildCustomerNoteOrderBy = (
  orderBy: CustomerNoteQueryVariables['orderBy'] = [],
  additionalDescriptors: Descriptor[] = []
): any[] => {
  const descriptors = [...CUSTOMER_NOTE_DESCRIPTORS, ...additionalDescriptors]
  return buildNoteOrderBy(orderBy, descriptors)
}
