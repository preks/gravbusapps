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
  buildActivityByLeadIdQuery,
  buildActivityByAccountIdQuery,
  buildActivityByContactIdQuery,
  buildActivityByOpportunityIdQuery,
  type CommonActivityQueryVariables,
  type ActivityRelationBuilders,
  type ActivityRelationFields
} from '@/common/data/relations/queries/activityQueries'
import { CustomerActivityFields, CUSTOMER_ACTIVITY_DESCRIPTORS } from '../types/customerActivityTypes'
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
 * Customer Activity Query Variables Interface
 * Extends CommonActivityQueryVariables (no CRM-specific filters)
 */
export type CustomerActivityQueryVariables = CommonActivityQueryVariables

/**
 * Build Customer Activity query with fields mapping
 * CRM uses "SalesActivity" as entity name (not "CustomerActivity")
 */
export const buildCustomerActivityQuery = (fields: typeof CustomerActivityFields = CustomerActivityFields): string => {
  return buildActivityQuery('SalesActivity', fields)
}

/**
 * Build Customer Activity by ID query
 */
export const buildCustomerActivityByIdQuery = (
  fields: typeof CustomerActivityFields = CustomerActivityFields,
  id: string
): string => {
  // Build relation builders and fields for common relations
  const relationBuilders: ActivityRelationBuilders = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: ActivityRelationFields = {
    documentFields: CustomerDocumentFields,
    accountFields: CustomerAccountFields,
    contactFields: CustomerContactFields,
    leadFields: CustomerLeadFields,
    opportunityFields: CustomerOpportunityFields
  }

  return buildActivityByIdQuery('SalesActivity', id, fields, relationBuilders, relationFields)
}

/**
 * Build Customer Activity search query
 */
export const buildCustomerActivitySearchQuery = (
  fields: typeof CustomerActivityFields = CustomerActivityFields
): string => {
  return buildActivitySearchQuery('SalesActivity', fields)
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

// =====================================================
// CUSTOMER ACTIVITY BY ENTITY ID QUERY BUILDERS
// =====================================================

/**
 * Build Customer Activity query filtered by Lead ID
 * Uses common buildActivityByLeadIdQuery with Customer-specific fields and relations
 */
export const buildCustomerActivityByLeadIdQuery = (): string => {
  const relationBuilders: Partial<ActivityRelationBuilders> = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: Partial<ActivityRelationFields> = {
    documentFields: CustomerDocumentFields,
    accountFields: CustomerAccountFields,
    contactFields: CustomerContactFields,
    leadFields: CustomerLeadFields,
    opportunityFields: CustomerOpportunityFields
  }

  return buildActivityByLeadIdQuery('SalesActivity', CustomerActivityFields, relationBuilders, relationFields)
}

/**
 * Build Customer Activity query filtered by Account ID
 */
export const buildCustomerActivityByAccountIdQuery = (): string => {
  const relationBuilders: Partial<ActivityRelationBuilders> = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: Partial<ActivityRelationFields> = {
    documentFields: CustomerDocumentFields,
    accountFields: CustomerAccountFields,
    contactFields: CustomerContactFields,
    leadFields: CustomerLeadFields,
    opportunityFields: CustomerOpportunityFields
  }

  return buildActivityByAccountIdQuery('SalesActivity', CustomerActivityFields, relationBuilders, relationFields)
}

/**
 * Build Customer Activity query filtered by Contact ID
 */
export const buildCustomerActivityByContactIdQuery = (): string => {
  const relationBuilders: Partial<ActivityRelationBuilders> = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: Partial<ActivityRelationFields> = {
    documentFields: CustomerDocumentFields,
    accountFields: CustomerAccountFields,
    contactFields: CustomerContactFields,
    leadFields: CustomerLeadFields,
    opportunityFields: CustomerOpportunityFields
  }

  return buildActivityByContactIdQuery('SalesActivity', CustomerActivityFields, relationBuilders, relationFields)
}

/**
 * Build Customer Activity query filtered by Opportunity ID
 */
export const buildCustomerActivityByOpportunityIdQuery = (): string => {
  const relationBuilders: Partial<ActivityRelationBuilders> = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: Partial<ActivityRelationFields> = {
    documentFields: CustomerDocumentFields,
    accountFields: CustomerAccountFields,
    contactFields: CustomerContactFields,
    leadFields: CustomerLeadFields,
    opportunityFields: CustomerOpportunityFields
  }

  return buildActivityByOpportunityIdQuery('SalesActivity', CustomerActivityFields, relationBuilders, relationFields)
}
