/**
 * Customer Activity Queries (New)
 * GraphQL queries for Customer Activity entities using fields mapping
 * Extends Common Activity Queries with CRM-specific fields
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
import { CustomerActivityFields, CUSTOMER_ACTIVITY_DESCRIPTORS } from '../types/customerActivityTypes'
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
 * Customer Activity Query Variables Interface
 * Extends CommonActivityQueryVariables (no CRM-specific filters)
 */
export type CustomerActivityQueryVariables = CommonActivityQueryVariables

/**
 * Build Customer Activity fragment using fields mapping
 * Includes Common Activity fields + common entity relations
 */
export const buildCustomerActivityFragment = (
  fields: typeof CustomerActivityFields = CustomerActivityFields
): string => {
  // Build common fragment with relations using REF fragments (no relations) to avoid circular dependencies
  const relationBuilders: ActivityRelationBuilders = {
    buildDocumentFragment, // REF fragment (no relations)
    buildAccountFragment, // REF fragment (no relations) - NOT buildCustomerAccountFragment!
    buildContactFragment, // REF fragment (no relations) - NOT buildCustomerContactFragment!
    buildLeadFragment, // REF fragment (no relations)
    buildOpportunityFragment // REF fragment (no relations) - NOT buildCustomerOpportunityFragment!
  }

  const relationFields: ActivityRelationFields = {
    documentFields: CustomerDocumentFields,
    accountFields: CustomerAccountFields,
    contactFields: CustomerContactFields,
    leadFields: CustomerLeadFields,
    opportunityFields: CustomerOpportunityFields
  }

  return buildActivityFragmentWithRelations(fields, relationBuilders, relationFields)
}

/**
 * Build Customer Activity query with fields mapping
 * CRM uses "SalesActivity" as entity name (not "CustomerActivity")
 */
export const buildCustomerActivityQuery = (
  fields: typeof CustomerActivityFields = CustomerActivityFields,
  fragment: string = buildCustomerActivityFragment(fields)
): string => {
  return buildActivityQuery(fields, fragment, 'SalesActivity')
}

/**
 * Build Customer Activity by ID query
 */
export const buildCustomerActivityByIdQuery = (
  fields: typeof CustomerActivityFields = CustomerActivityFields,
  fragment: string = buildCustomerActivityFragment(fields),
  id: string
): string => {
  return buildActivityByIdQuery(fields, fragment, id, 'SalesActivity')
}

/**
 * Build Customer Activity search query
 */
export const buildCustomerActivitySearchQuery = (
  fields: typeof CustomerActivityFields = CustomerActivityFields
): string => {
  return buildActivitySearchQuery(fields, 'SalesActivity')
}

/**
 * Build WHERE condition for Customer Activity queries
 * Uses CUSTOMER_ACTIVITY_DESCRIPTORS which includes common descriptors
 */
export const buildCustomerActivityWhereCondition = (
  variables: CustomerActivityQueryVariables = {},
  additionalDescriptors: Descriptor[] = [],
  customConditions: Record<string, any>[] = []
): Record<string, any> => {
  // CUSTOMER_ACTIVITY_DESCRIPTORS already includes common descriptors
  const descriptors = [...CUSTOMER_ACTIVITY_DESCRIPTORS, ...additionalDescriptors]
  return buildActivityWhereCondition(variables, descriptors, customConditions)
}

/**
 * Build ORDER BY for Customer Activity queries
 */
export const buildCustomerActivityOrderBy = (
  orderBy: CustomerActivityQueryVariables['orderBy'] = [],
  additionalDescriptors: Descriptor[] = []
): any[] => {
  const descriptors = [...CUSTOMER_ACTIVITY_DESCRIPTORS, ...additionalDescriptors]
  return buildActivityOrderBy(orderBy, descriptors)
}
