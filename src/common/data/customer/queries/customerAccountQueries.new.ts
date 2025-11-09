/**
 * Customer Account Queries (New)
 * GraphQL queries for Customer Account entities using fields mapping
 * Extends Common Account Queries with CRM-specific fields
 */

import {
  buildAccountQuery,
  buildAccountByIdQuery,
  buildAccountSearchQuery,
  buildAccountWhereCondition,
  buildAccountOrderBy,
  buildAccountFragmentWithRelations,
  type CommonAccountQueryVariables,
  type AccountRelationBuilders,
  type AccountRelationFields
} from '@/common/data/relations/queries/commonAccountQueries'
import { CustomerAccountFields, CUSTOMER_ACCOUNT_DESCRIPTORS } from '../types/customerAccountTypes'
import { CUSTOMER_CAMPAIGN_REF } from './fragments/customerReferenceFragments'
import { CUSTOMER_ADDRESS_FRAGMENT } from '../types/customerAddressTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import { buildContactFragment } from '@/common/data/relations/queries/commonContactFragments.new'
import { buildDocumentFragment } from '@/common/data/relations/queries/commonDocumentFragments.new'
import { buildNoteFragment } from '@/common/data/relations/queries/commonNoteFragments.new'
import { buildTaskFragment } from '@/common/data/relations/queries/commonTaskFragments.new'
import { buildOpportunityFragment } from '@/common/data/relations/queries/commonOpportunityFragments.new'

// Import Customer Fields
import { CustomerContactFields } from '../types/customerContactTypes'
import { CustomerDocumentFields } from '../types/customerDocumentTypes'
import { CustomerNoteFields } from '../types/customerNoteTypes'
import { CustomerTaskFields } from '../types/customerTaskTypes'
import { CustomerOpportunityFields } from '../types/customerOpportunityTypes'

/**
 * Customer Account Query Variables Interface
 * Extends CommonAccountQueryVariables with CRM-specific filters
 */
export interface CustomerAccountQueryVariables extends CommonAccountQueryVariables {
  // CRM-specific filter IDs
  campaignIds?: string[]
}

/**
 * Build Customer Account fragment using fields mapping
 * Includes Common Account fields + common entity relations + CRM-specific relations
 */
export const buildCustomerAccountFragment = (fields: typeof CustomerAccountFields = CustomerAccountFields): string => {
  // Build common fragment with relations using REF fragments (no relations) to avoid circular dependencies
  const relationBuilders: AccountRelationBuilders = {
    buildContactFragment, // REF fragment (no relations) - NOT buildCustomerContactFragment!
    buildDocumentFragment, // REF fragment (no relations)
    buildNoteFragment, // REF fragment (no relations)
    buildTaskFragment, // REF fragment (no relations) - NOT buildCustomerTaskFragment!
    buildOpportunityFragment // REF fragment (no relations) - NOT buildCustomerOpportunityFragment!
    // Note: CRM doesn't have "activities" or "leads" on Account level
  }

  const relationFields: AccountRelationFields = {
    contactFields: CustomerContactFields,
    documentFields: CustomerDocumentFields,
    noteFields: CustomerNoteFields,
    taskFields: CustomerTaskFields,
    opportunityFields: CustomerOpportunityFields
    // Note: CRM doesn't have "activities" or "leads" on Account level
  }

  const commonFragmentWithRelations = buildAccountFragmentWithRelations(fields, relationBuilders, relationFields)

  return `
  ${commonFragmentWithRelations}
  
  # Addresses relation (CRM uses "city" not "locality")
  ${fields.addresses}(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_ADDRESS_FRAGMENT}
  }
  
  # CRM duplicate relations (mapped to main relations in mapper)
  crmDocument(where: { isDeleted: { _eq: false } }) {
    ${buildDocumentFragment(CustomerDocumentFields)}
  }
  
  crmNote(where: { isDeleted: { _eq: false } }) {
    ${buildNoteFragment(CustomerNoteFields)}
  }
  
  # CRM-specific fields
  salesCampaign {
    ${CUSTOMER_CAMPAIGN_REF}
  }
`
}

/**
 * Build Customer Account query with fields mapping
 * CRM uses "Account" as entity name (not "CustomerAccount")
 */
export const buildCustomerAccountQuery = (
  fields: typeof CustomerAccountFields = CustomerAccountFields,
  fragment: string = buildCustomerAccountFragment(fields)
): string => {
  return buildAccountQuery(fields, fragment, 'Account')
}

/**
 * Build Customer Account by ID query
 */
export const buildCustomerAccountByIdQuery = (
  fields: typeof CustomerAccountFields = CustomerAccountFields,
  fragment: string = buildCustomerAccountFragment(fields),
  id: string
): string => {
  return buildAccountByIdQuery(fields, fragment, id, 'Account')
}

/**
 * Build Customer Account search query
 */
export const buildCustomerAccountSearchQuery = (
  fields: typeof CustomerAccountFields = CustomerAccountFields
): string => {
  return buildAccountSearchQuery(fields, 'Account')
}

/**
 * Build WHERE condition for Customer Account queries
 * Uses CUSTOMER_ACCOUNT_DESCRIPTORS which includes common descriptors + CRM-specific overrides
 */
export const buildCustomerAccountWhereCondition = (
  variables: CustomerAccountQueryVariables = {},
  additionalDescriptors: Descriptor[] = []
): Record<string, any> => {
  // CUSTOMER_ACCOUNT_DESCRIPTORS already includes common descriptors + CRM-specific overrides
  const descriptors = [...CUSTOMER_ACCOUNT_DESCRIPTORS, ...additionalDescriptors]
  return buildAccountWhereCondition(variables, descriptors)
}

/**
 * Build ORDER BY for Customer Account queries
 * Uses CUSTOMER_ACCOUNT_DESCRIPTORS which includes common descriptors + CRM-specific overrides
 */
export const buildCustomerAccountOrderBy = (
  orderBy: CustomerAccountQueryVariables['orderBy'] = [],
  additionalDescriptors: Descriptor[] = []
): any[] => {
  // CUSTOMER_ACCOUNT_DESCRIPTORS already includes common descriptors + CRM-specific overrides
  const descriptors = [...CUSTOMER_ACCOUNT_DESCRIPTORS, ...additionalDescriptors]
  return buildAccountOrderBy(orderBy, descriptors)
}
