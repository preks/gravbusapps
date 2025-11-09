/**
 * Customer Lead Queries (New)
 * GraphQL queries for Customer Lead entities using fields mapping
 * Extends Common Lead Queries with CRM-specific fields
 */

import {
  buildLeadQuery,
  buildLeadByIdQuery,
  buildLeadSearchQuery,
  buildLeadWhereCondition,
  buildLeadOrderBy,
  type CommonLeadQueryVariables
} from '@/common/data/relations/queries/commonLeadQueries'
import {
  buildLeadFragmentWithRelations,
  type LeadRelationBuilders,
  type LeadRelationFields
} from '@/common/data/relations/queries/commonLeadQueries'
import { CustomerLeadFields, CUSTOMER_LEAD_DESCRIPTORS } from '../types/customerLeadTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import { buildActivityFragment } from '@/common/data/relations/queries/commonActivityFragments.new'
import { buildDocumentFragment } from '@/common/data/relations/queries/commonDocumentFragments.new'
import { buildNoteFragment } from '@/common/data/relations/queries/commonNoteFragments.new'
import { buildTaskFragment } from '@/common/data/relations/queries/commonTaskFragments.new'
import { buildAccountFragment } from '@/common/data/relations/queries/commonAccountFragments.new'
import { buildContactFragment } from '@/common/data/relations/queries/commonContactFragments.new'
import { buildOpportunityFragment } from '@/common/data/relations/queries/commonOpportunityFragments.new'

// Import Customer Fields
import { CustomerActivityFields } from '../types/customerActivityTypes'
import { CustomerDocumentFields } from '../types/customerDocumentTypes'
import { CustomerNoteFields } from '../types/customerNoteTypes'
import { CustomerTaskFields } from '../types/customerTaskTypes'
import { CustomerAccountFields } from '../types/customerAccountTypes'
import { CustomerContactFields } from '../types/customerContactTypes'
import { CustomerOpportunityFields } from '../types/customerOpportunityTypes'

/**
 * Customer Lead Query Variables Interface
 * Extends CommonLeadQueryVariables with CRM-specific filters
 */
export type CustomerLeadQueryVariables = CommonLeadQueryVariables

/**
 * Build Customer Lead fragment using fields mapping
 * Includes Common Lead fields + common entity relations
 */
export const buildCustomerLeadFragment = (fields: typeof CustomerLeadFields = CustomerLeadFields): string => {
  // Build common fragment with relations using REF fragments (no relations) to avoid circular dependencies
  const relationBuilders: LeadRelationBuilders = {
    buildActivityFragment, // REF fragment (no relations)
    buildDocumentFragment, // REF fragment (no relations)
    buildNoteFragment, // REF fragment (no relations)
    buildTaskFragment, // REF fragment (no relations)
    buildAccountFragment, // REF fragment (no relations) - for convertedAccount
    buildContactFragment, // REF fragment (no relations) - for convertedContact
    buildOpportunityFragment // REF fragment (no relations) - for convertedOpportunity
  }

  const relationFields: LeadRelationFields = {
    activityFields: CustomerActivityFields,
    documentFields: CustomerDocumentFields,
    noteFields: CustomerNoteFields,
    taskFields: CustomerTaskFields,
    accountFields: CustomerAccountFields, // for convertedAccount
    contactFields: CustomerContactFields, // for convertedContact
    opportunityFields: CustomerOpportunityFields // for convertedOpportunity
  }

  return buildLeadFragmentWithRelations(fields, relationBuilders, relationFields)
}

/**
 * Build Customer Lead query with fields mapping
 * CRM uses "Lead" as entity name (not "CustomerLead")
 */
export const buildCustomerLeadQuery = (
  fields: typeof CustomerLeadFields = CustomerLeadFields,
  fragment: string = buildCustomerLeadFragment(fields)
): string => {
  return buildLeadQuery(fields, fragment, 'Lead')
}

/**
 * Build Customer Lead by ID query
 */
export const buildCustomerLeadByIdQuery = (
  fields: typeof CustomerLeadFields = CustomerLeadFields,
  fragment: string = buildCustomerLeadFragment(fields),
  id: string
): string => {
  return buildLeadByIdQuery(fields, fragment, id, 'Lead')
}

/**
 * Build Customer Lead search query
 */
export const buildCustomerLeadSearchQuery = (fields: typeof CustomerLeadFields = CustomerLeadFields): string => {
  return buildLeadSearchQuery(fields, 'Lead')
}

/**
 * Build WHERE condition for Customer Lead queries
 * Uses CUSTOMER_LEAD_DESCRIPTORS which includes common descriptors
 */
export const buildCustomerLeadWhereCondition = (
  variables: CustomerLeadQueryVariables = {},
  additionalDescriptors: Descriptor[] = [],
  customConditions: Record<string, any>[] = []
): Record<string, any> => {
  // CUSTOMER_LEAD_DESCRIPTORS already includes common descriptors
  const descriptors = [...CUSTOMER_LEAD_DESCRIPTORS, ...additionalDescriptors]
  return buildLeadWhereCondition(variables, descriptors, customConditions)
}

/**
 * Build ORDER BY for Customer Lead queries
 */
export const buildCustomerLeadOrderBy = (
  orderBy: CustomerLeadQueryVariables['orderBy'] = [],
  additionalDescriptors: Descriptor[] = []
): any[] => {
  const descriptors = [...CUSTOMER_LEAD_DESCRIPTORS, ...additionalDescriptors]
  return buildLeadOrderBy(orderBy, descriptors)
}
