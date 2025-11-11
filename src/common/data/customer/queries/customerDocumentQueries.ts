/**
 * Customer Document Queries (New)
 * GraphQL queries for Customer Document entities using fields mapping
 * Extends Common Document Queries with CRM-specific fields
 */

import {
  buildDocumentQuery,
  buildDocumentByIdQuery,
  buildDocumentSearchQuery,
  buildDocumentWhereCondition,
  buildDocumentOrderBy,
  buildDocumentByLeadIdQuery,
  buildDocumentByAccountIdQuery,
  buildDocumentByContactIdQuery,
  buildDocumentByOpportunityIdQuery,
  type CommonDocumentQueryVariables,
  type DocumentRelationBuilders,
  type DocumentRelationFields
} from '@/common/data/relations/queries/documentQueries'
import { CustomerDocumentFields, CUSTOMER_DOCUMENT_DESCRIPTORS } from '../types/customerDocumentTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import {
  buildAccountFragment,
  buildContactFragment,
  buildLeadFragment,
  buildOpportunityFragment,
  buildTaskFragment,
  buildActivityFragment,
  buildNoteFragment
} from '@/common/data/relations/queries/relationFragments'

// Import Customer Fields
import { CustomerAccountFields } from '../types/customerAccountTypes'
import { CustomerContactFields } from '../types/customerContactTypes'
import { CustomerLeadFields } from '../types/customerLeadTypes'
import { CustomerOpportunityFields } from '../types/customerOpportunityTypes'
import { CustomerTaskFields } from '../types/customerTaskTypes'
import { CustomerActivityFields } from '../types/customerActivityTypes'
import { CustomerNoteFields } from '../types/customerNoteTypes'

/**
 * Customer Document Query Variables Interface
 * Extends CommonDocumentQueryVariables (no CRM-specific filters)
 */
export type CustomerDocumentQueryVariables = CommonDocumentQueryVariables

/**
 * Build Customer Document query with fields mapping
 * CRM uses "CrmDocument" as entity name (not "CustomerDocument")
 */
export const buildCustomerDocumentQuery = (fields: typeof CustomerDocumentFields = CustomerDocumentFields): string => {
  return buildDocumentQuery('CrmDocument', fields)
}

/**
 * Build Customer Document by ID query
 */
export const buildCustomerDocumentByIdQuery = (
  fields: typeof CustomerDocumentFields = CustomerDocumentFields,
  id: string
): string => {
  // Build relation builders and fields for common relations
  const relationBuilders: DocumentRelationBuilders = {
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment,
    buildTaskFragment,
    buildActivityFragment,
    buildNoteFragment
  }

  const relationFields: DocumentRelationFields = {
    accountFields: CustomerAccountFields,
    contactFields: CustomerContactFields,
    leadFields: CustomerLeadFields,
    opportunityFields: CustomerOpportunityFields,
    taskFields: CustomerTaskFields,
    activityFields: CustomerActivityFields,
    noteFields: CustomerNoteFields
  }

  return buildDocumentByIdQuery('CrmDocument', id, fields, relationBuilders, relationFields)
}

/**
 * Build Customer Document search query
 */
export const buildCustomerDocumentSearchQuery = (
  fields: typeof CustomerDocumentFields = CustomerDocumentFields
): string => {
  return buildDocumentSearchQuery('CrmDocument', fields)
}

/**
 * Build WHERE condition for Customer Document queries
 * Uses CUSTOMER_DOCUMENT_DESCRIPTORS which includes common descriptors
 */
export const buildCustomerDocumentWhereCondition = (
  variables: CustomerDocumentQueryVariables = {},
  additionalDescriptors: Descriptor[] = [],
  customConditions: Record<string, any>[] = []
): Record<string, any> => {
  // CUSTOMER_DOCUMENT_DESCRIPTORS already includes common descriptors
  const descriptors = [...CUSTOMER_DOCUMENT_DESCRIPTORS, ...additionalDescriptors]
  return buildDocumentWhereCondition(variables, descriptors, customConditions)
}

/**
 * Build ORDER BY for Customer Document queries
 */
export const buildCustomerDocumentOrderBy = (
  orderBy: CustomerDocumentQueryVariables['orderBy'] = [],
  additionalDescriptors: Descriptor[] = []
): any[] => {
  const descriptors = [...CUSTOMER_DOCUMENT_DESCRIPTORS, ...additionalDescriptors]
  return buildDocumentOrderBy(orderBy, descriptors)
}

// =====================================================
// CUSTOMER DOCUMENT BY ENTITY ID QUERY BUILDERS
// =====================================================

/**
 * Build Customer Document query filtered by Lead ID
 * Uses common buildDocumentByLeadIdQuery with Customer-specific fields and relations
 */
export const buildCustomerDocumentByLeadIdQuery = (): string => {
  const relationBuilders: Partial<DocumentRelationBuilders> = {
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment,
    buildTaskFragment,
    buildActivityFragment,
    buildNoteFragment
  }

  const relationFields: Partial<DocumentRelationFields> = {
    accountFields: CustomerAccountFields,
    contactFields: CustomerContactFields,
    leadFields: CustomerLeadFields,
    opportunityFields: CustomerOpportunityFields,
    taskFields: CustomerTaskFields,
    activityFields: CustomerActivityFields,
    noteFields: CustomerNoteFields
  }

  return buildDocumentByLeadIdQuery('CrmDocument', CustomerDocumentFields, relationBuilders, relationFields)
}

/**
 * Build Customer Document query filtered by Account ID
 */
export const buildCustomerDocumentByAccountIdQuery = (): string => {
  const relationBuilders: Partial<DocumentRelationBuilders> = {
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment,
    buildTaskFragment,
    buildActivityFragment,
    buildNoteFragment
  }

  const relationFields: Partial<DocumentRelationFields> = {
    accountFields: CustomerAccountFields,
    contactFields: CustomerContactFields,
    leadFields: CustomerLeadFields,
    opportunityFields: CustomerOpportunityFields,
    taskFields: CustomerTaskFields,
    activityFields: CustomerActivityFields,
    noteFields: CustomerNoteFields
  }

  return buildDocumentByAccountIdQuery('CrmDocument', CustomerDocumentFields, relationBuilders, relationFields)
}

/**
 * Build Customer Document query filtered by Contact ID
 */
export const buildCustomerDocumentByContactIdQuery = (): string => {
  const relationBuilders: Partial<DocumentRelationBuilders> = {
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment,
    buildTaskFragment,
    buildActivityFragment,
    buildNoteFragment
  }

  const relationFields: Partial<DocumentRelationFields> = {
    accountFields: CustomerAccountFields,
    contactFields: CustomerContactFields,
    leadFields: CustomerLeadFields,
    opportunityFields: CustomerOpportunityFields,
    taskFields: CustomerTaskFields,
    activityFields: CustomerActivityFields,
    noteFields: CustomerNoteFields
  }

  return buildDocumentByContactIdQuery('CrmDocument', CustomerDocumentFields, relationBuilders, relationFields)
}

/**
 * Build Customer Document query filtered by Opportunity ID
 */
export const buildCustomerDocumentByOpportunityIdQuery = (): string => {
  const relationBuilders: Partial<DocumentRelationBuilders> = {
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment,
    buildTaskFragment,
    buildActivityFragment,
    buildNoteFragment
  }

  const relationFields: Partial<DocumentRelationFields> = {
    accountFields: CustomerAccountFields,
    contactFields: CustomerContactFields,
    leadFields: CustomerLeadFields,
    opportunityFields: CustomerOpportunityFields,
    taskFields: CustomerTaskFields,
    activityFields: CustomerActivityFields,
    noteFields: CustomerNoteFields
  }

  return buildDocumentByOpportunityIdQuery('CrmDocument', CustomerDocumentFields, relationBuilders, relationFields)
}
