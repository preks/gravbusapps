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
  type CommonDocumentQueryVariables
} from '@/common/data/relations/queries/commonDocumentQueries'
import {
  buildDocumentFragmentWithRelations,
  type DocumentRelationBuilders,
  type DocumentRelationFields
} from '@/common/data/relations/queries/commonDocumentQueries'
import { CustomerDocumentFields, CUSTOMER_DOCUMENT_DESCRIPTORS } from '../types/customerDocumentTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import { buildAccountFragment } from '@/common/data/relations/queries/commonAccountFragments.new'
import { buildContactFragment } from '@/common/data/relations/queries/commonContactFragments.new'
import { buildLeadFragment } from '@/common/data/relations/queries/commonLeadFragments.new'
import { buildOpportunityFragment } from '@/common/data/relations/queries/commonOpportunityFragments.new'
import { buildTaskFragment } from '@/common/data/relations/queries/commonTaskFragments.new'
import { buildActivityFragment } from '@/common/data/relations/queries/commonActivityFragments.new'
import { buildNoteFragment } from '@/common/data/relations/queries/commonNoteFragments.new'

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
 * Build Customer Document fragment using fields mapping
 * Includes Common Document fields + common entity relations
 */
export const buildCustomerDocumentFragment = (
  fields: typeof CustomerDocumentFields = CustomerDocumentFields
): string => {
  // Build common fragment with relations using REF fragments (no relations) to avoid circular dependencies
  const relationBuilders: DocumentRelationBuilders = {
    buildAccountFragment, // REF fragment (no relations) - NOT buildCustomerAccountFragment!
    buildContactFragment, // REF fragment (no relations) - NOT buildCustomerContactFragment!
    buildLeadFragment, // REF fragment (no relations)
    buildOpportunityFragment, // REF fragment (no relations) - NOT buildCustomerOpportunityFragment!
    buildTaskFragment, // REF fragment (no relations) - NOT buildCustomerTaskFragment!
    buildActivityFragment, // REF fragment (no relations) - NOT buildCustomerActivityFragment!
    buildNoteFragment // REF fragment (no relations) - NOT buildCustomerNoteFragment!
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

  return buildDocumentFragmentWithRelations(fields, relationBuilders, relationFields)
}

/**
 * Build Customer Document query with fields mapping
 * CRM uses "CrmDocument" as entity name (not "CustomerDocument")
 */
export const buildCustomerDocumentQuery = (
  fields: typeof CustomerDocumentFields = CustomerDocumentFields,
  fragment: string = buildCustomerDocumentFragment(fields)
): string => {
  return buildDocumentQuery(fields, fragment, 'CrmDocument')
}

/**
 * Build Customer Document by ID query
 */
export const buildCustomerDocumentByIdQuery = (
  fields: typeof CustomerDocumentFields = CustomerDocumentFields,
  fragment: string = buildCustomerDocumentFragment(fields),
  id: string
): string => {
  return buildDocumentByIdQuery(fields, fragment, id, 'CrmDocument')
}

/**
 * Build Customer Document search query
 */
export const buildCustomerDocumentSearchQuery = (
  fields: typeof CustomerDocumentFields = CustomerDocumentFields
): string => {
  return buildDocumentSearchQuery(fields, 'CrmDocument')
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
