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
  buildNoteByLeadIdQuery,
  buildNoteByAccountIdQuery,
  buildNoteByContactIdQuery,
  buildNoteByOpportunityIdQuery,
  type CommonNoteQueryVariables,
  type NoteRelationBuilders,
  type NoteRelationFields
} from '@/common/data/relations/queries/noteQueries'
import { CustomerNoteFields, CUSTOMER_NOTE_DESCRIPTORS } from '../types/customerNoteTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import {
  buildDocumentFragment,
  buildAccountFragment,
  buildContactFragment,
  buildLeadFragment,
  buildOpportunityFragment
} from '@/common/data/relations/queries/relationFragments'

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
 * Build Customer Note query with fields mapping
 * CRM uses "CrmNote" as entity name (not "CustomerNote")
 */
export const buildCustomerNoteQuery = (fields: typeof CustomerNoteFields = CustomerNoteFields): string => {
  return buildNoteQuery('CrmNote', fields)
}

/**
 * Build Customer Note by ID query
 */
export const buildCustomerNoteByIdQuery = (
  fields: typeof CustomerNoteFields = CustomerNoteFields,
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
    documentFields: CustomerDocumentFields,
    accountFields: CustomerAccountFields,
    contactFields: CustomerContactFields,
    leadFields: CustomerLeadFields,
    opportunityFields: CustomerOpportunityFields
  }

  return buildNoteByIdQuery('CrmNote', id, fields, relationBuilders, relationFields)
}

/**
 * Build Customer Note search query
 */
export const buildCustomerNoteSearchQuery = (fields: typeof CustomerNoteFields = CustomerNoteFields): string => {
  return buildNoteSearchQuery('CrmNote', fields)
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

// =====================================================
// CUSTOMER NOTE BY ENTITY ID QUERY BUILDERS
// =====================================================

/**
 * Build Customer Note query filtered by Lead ID
 * Uses common buildNoteByLeadIdQuery with Customer-specific fields and relations
 */
export const buildCustomerNoteByLeadIdQuery = (): string => {
  const relationBuilders: Partial<NoteRelationBuilders> = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: Partial<NoteRelationFields> = {
    documentFields: CustomerDocumentFields,
    accountFields: CustomerAccountFields,
    contactFields: CustomerContactFields,
    leadFields: CustomerLeadFields,
    opportunityFields: CustomerOpportunityFields
  }

  return buildNoteByLeadIdQuery('CrmNote', CustomerNoteFields, relationBuilders, relationFields)
}

/**
 * Build Customer Note query filtered by Account ID
 */
export const buildCustomerNoteByAccountIdQuery = (): string => {
  const relationBuilders: Partial<NoteRelationBuilders> = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: Partial<NoteRelationFields> = {
    documentFields: CustomerDocumentFields,
    accountFields: CustomerAccountFields,
    contactFields: CustomerContactFields,
    leadFields: CustomerLeadFields,
    opportunityFields: CustomerOpportunityFields
  }

  return buildNoteByAccountIdQuery('CrmNote', CustomerNoteFields, relationBuilders, relationFields)
}

/**
 * Build Customer Note query filtered by Contact ID
 */
export const buildCustomerNoteByContactIdQuery = (): string => {
  const relationBuilders: Partial<NoteRelationBuilders> = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: Partial<NoteRelationFields> = {
    documentFields: CustomerDocumentFields,
    accountFields: CustomerAccountFields,
    contactFields: CustomerContactFields,
    leadFields: CustomerLeadFields,
    opportunityFields: CustomerOpportunityFields
  }

  return buildNoteByContactIdQuery('CrmNote', CustomerNoteFields, relationBuilders, relationFields)
}

/**
 * Build Customer Note query filtered by Opportunity ID
 */
export const buildCustomerNoteByOpportunityIdQuery = (): string => {
  const relationBuilders: Partial<NoteRelationBuilders> = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: Partial<NoteRelationFields> = {
    documentFields: CustomerDocumentFields,
    accountFields: CustomerAccountFields,
    contactFields: CustomerContactFields,
    leadFields: CustomerLeadFields,
    opportunityFields: CustomerOpportunityFields
  }

  return buildNoteByOpportunityIdQuery('CrmNote', CustomerNoteFields, relationBuilders, relationFields)
}
