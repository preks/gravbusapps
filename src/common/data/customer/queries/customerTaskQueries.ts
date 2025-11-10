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
  type CommonTaskQueryVariables,
  type TaskRelationBuilders,
  type TaskRelationFields
} from '@/common/data/relations/queries/taskQueries'
import { CustomerTaskFields, CUSTOMER_TASK_DESCRIPTORS } from '../types/customerTaskTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import {
  buildAccountFragment,
  buildContactFragment,
  buildDocumentFragment,
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
 * Customer Task Query Variables Interface
 * Extends CommonTaskQueryVariables with CRM-specific filters
 */
export type CustomerTaskQueryVariables = CommonTaskQueryVariables

/**
 * Build Customer Task query with fields mapping
 * CRM uses "SalesTask" as entity name (not "CustomerTask")
 */
export const buildCustomerTaskQuery = (fields: typeof CustomerTaskFields = CustomerTaskFields): string => {
  // Build relation builders and fields for references
  const relationBuilders: Partial<TaskRelationBuilders> = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: Partial<TaskRelationFields> = {
    documentFields: CustomerDocumentFields,
    accountFields: CustomerAccountFields,
    contactFields: CustomerContactFields,
    leadFields: CustomerLeadFields,
    opportunityFields: CustomerOpportunityFields
  }

  return buildTaskQuery(fields, 'SalesTask', undefined, undefined, relationBuilders, relationFields)
}

/**
 * Build Customer Task by ID query
 */
export const buildCustomerTaskByIdQuery = (
  fields: typeof CustomerTaskFields = CustomerTaskFields,
  id: string
): string => {
  // Build relation builders and fields for common relations
  const relationBuilders: TaskRelationBuilders = {
    buildDocumentFragment,
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: TaskRelationFields = {
    documentFields: CustomerDocumentFields,
    accountFields: CustomerAccountFields,
    contactFields: CustomerContactFields,
    leadFields: CustomerLeadFields,
    opportunityFields: CustomerOpportunityFields
  }

  return buildTaskByIdQuery(fields, id, 'SalesTask', relationBuilders, relationFields)
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
