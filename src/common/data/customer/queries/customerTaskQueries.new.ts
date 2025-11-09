/**
 * Customer Task Queries (New)
 * GraphQL queries for Customer Task entities using fields mapping
 * Extends Common Task Queries with CRM-specific fields
 */

import {
  buildTaskQuery,
  buildTaskByIdQuery,
  buildTaskSearchQuery,
  buildTaskWhereCondition,
  buildTaskOrderBy,
  type CommonTaskQueryVariables
} from '@/common/data/relations/queries/commonTaskQueries'
import {
  buildTaskFragmentWithRelations,
  type TaskRelationBuilders,
  type TaskRelationFields
} from '@/common/data/relations/queries/commonTaskQueries'
import { CustomerTaskFields, CUSTOMER_TASK_DESCRIPTORS } from '../types/customerTaskTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import { buildAccountFragment } from '@/common/data/relations/queries/commonAccountFragments.new'
import { buildContactFragment } from '@/common/data/relations/queries/commonContactFragments.new'
import { buildDocumentFragment } from '@/common/data/relations/queries/commonDocumentFragments.new'
import { buildLeadFragment } from '@/common/data/relations/queries/commonLeadFragments.new'
import { buildOpportunityFragment } from '@/common/data/relations/queries/commonOpportunityFragments.new'

// Import Customer Fields
import { CustomerDocumentFields } from '../types/customerDocumentTypes'
import { CustomerAccountFields } from '../types/customerAccountTypes'
import { CustomerContactFields } from '../types/customerContactTypes'
import { CustomerLeadFields } from '../types/customerLeadTypes'
import { CustomerOpportunityFields } from '../types/customerOpportunityTypes'

/**
 * Customer Task Query Variables Interface
 * Extends CommonTaskQueryVariables with CRM-specific filters
 */
export type CustomerTaskQueryVariables = CommonTaskQueryVariables

/**
 * Build Customer Task fragment using fields mapping
 * Includes Common Task fields + common entity relations
 */
export const buildCustomerTaskFragment = (fields: typeof CustomerTaskFields = CustomerTaskFields): string => {
  // Build common fragment with relations using REF fragments (no relations) to avoid circular dependencies
  const relationBuilders: TaskRelationBuilders = {
    buildDocumentFragment, // REF fragment (no relations)
    buildAccountFragment, // REF fragment (no relations) - NOT buildCustomerAccountFragment!
    buildContactFragment, // REF fragment (no relations) - NOT buildCustomerContactFragment!
    buildLeadFragment, // REF fragment (no relations)
    buildOpportunityFragment // REF fragment (no relations) - NOT buildCustomerOpportunityFragment!
  }

  const relationFields: TaskRelationFields = {
    documentFields: CustomerDocumentFields,
    accountFields: CustomerAccountFields,
    contactFields: CustomerContactFields,
    leadFields: CustomerLeadFields,
    opportunityFields: CustomerOpportunityFields
  }

  return buildTaskFragmentWithRelations(fields, relationBuilders, relationFields)
}

/**
 * Build Customer Task query with fields mapping
 * CRM uses "SalesTask" as entity name (not "CustomerTask")
 */
export const buildCustomerTaskQuery = (
  fields: typeof CustomerTaskFields = CustomerTaskFields,
  fragment: string = buildCustomerTaskFragment(fields)
): string => {
  return buildTaskQuery(fields, fragment, 'SalesTask')
}

/**
 * Build Customer Task by ID query
 */
export const buildCustomerTaskByIdQuery = (
  fields: typeof CustomerTaskFields = CustomerTaskFields,
  fragment: string = buildCustomerTaskFragment(fields),
  id: string
): string => {
  return buildTaskByIdQuery(fields, fragment, id, 'SalesTask')
}

/**
 * Build Customer Task search query
 */
export const buildCustomerTaskSearchQuery = (fields: typeof CustomerTaskFields = CustomerTaskFields): string => {
  return buildTaskSearchQuery(fields, 'SalesTask')
}

/**
 * Build WHERE condition for Customer Task queries
 * Uses CUSTOMER_TASK_DESCRIPTORS which includes common descriptors
 */
export const buildCustomerTaskWhereCondition = (
  variables: CustomerTaskQueryVariables = {},
  additionalDescriptors: Descriptor[] = [],
  customConditions: Record<string, any>[] = []
): Record<string, any> => {
  // CUSTOMER_TASK_DESCRIPTORS already includes common descriptors
  const descriptors = [...CUSTOMER_TASK_DESCRIPTORS, ...additionalDescriptors]
  return buildTaskWhereCondition(variables, descriptors, customConditions)
}

/**
 * Build ORDER BY for Customer Task queries
 */
export const buildCustomerTaskOrderBy = (
  orderBy: CustomerTaskQueryVariables['orderBy'] = [],
  additionalDescriptors: Descriptor[] = []
): any[] => {
  const descriptors = [...CUSTOMER_TASK_DESCRIPTORS, ...additionalDescriptors]
  return buildTaskOrderBy(orderBy, descriptors)
}
