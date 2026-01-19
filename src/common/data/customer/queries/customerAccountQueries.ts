/**
 * Customer Account Queries (New)
 * GraphQL queries for Customer Account entities using fields mapping
 * Extends Common Account Queries with CRM-specific fields
 */

import {
  buildAccountQuery,
  buildAccountByPkQuery,
  buildAccountSearchQuery,
  buildAccountWhereCondition,
  buildAccountOrderBy,
  type AccountQueryVariables,
  type AccountRelationBuilders,
  type AccountRelationFields
} from '@/common/data/relations/queries/accountQueries'
import { CustomerAccountFields, CUSTOMER_ACCOUNT_DESCRIPTORS } from '../types/customerAccountTypes'
import { CUSTOMER_CAMPAIGN_REF } from './fragments/customerReferenceFragments'
import { CUSTOMER_ADDRESS_FRAGMENT } from '../types/customerAddressTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import {
  buildContactFragment,
  buildDocumentFragment,
  buildNoteFragment,
  buildTaskFragment
} from '@/common/data/relations/queries/relationFragments'

// Import Customer Fields
import { CustomerContactFields } from '../types/customerContactTypes'
import { CustomerDocumentFields } from '../types/customerDocumentTypes'
import { CustomerNoteFields } from '../types/customerNoteTypes'
import { CustomerTaskFields } from '../types/customerTaskTypes'

/**
 * Customer Account Query Variables Interface
 * Extends AccountQueryVariables with CRM-specific filters
 */
export interface CustomerAccountQueryVariables extends AccountQueryVariables {
  // CRM-specific filter IDs
  campaignIds?: string[]
}

/**
 * Build Customer Account query with fields mapping
 * CRM uses "Account" as entity name (not "CustomerAccount")
 */
export const buildCustomerAccountQuery = (fields: typeof CustomerAccountFields = CustomerAccountFields): string => {
  const entityFields = `
    # Addresses relation (CRM uses "city" not "locality")
    ${fields.addresses}(where: { isDeleted: { _eq: false } }) {
      ${CUSTOMER_ADDRESS_FRAGMENT}
    }
    
    # CRM duplicate relations
    ${fields.documents}(where: { isDeleted: { _eq: false } }) {
      ${buildDocumentFragment(CustomerDocumentFields)}
    }
    
    ${fields.notes}(where: { isDeleted: { _eq: false } }) {
      ${buildNoteFragment(CustomerNoteFields)}
    }
    
    # CRM-specific fields
    salesCampaign {
      ${CUSTOMER_CAMPAIGN_REF}
    }
    salesCampaignId
  `
  return buildAccountQuery('Account', fields, entityFields)
}

/**
 * Build Customer Account by ID query
 */
export const buildCustomerAccountByIdQuery = (fields: typeof CustomerAccountFields = CustomerAccountFields): string => {
  // Build relation builders and fields for common relations
  const relationBuilders: AccountRelationBuilders = {
    buildContactFragment,
    buildDocumentFragment,
    buildNoteFragment,
    buildTaskFragment
    // Note: CRM doesn't have "activities" or "leads" on Account level
    // Note: opportunities are fetched separately via useCustomerOpportunitiesList (not from Account query)
  }

  const relationFields: AccountRelationFields = {
    contactFields: CustomerContactFields,
    documentFields: CustomerDocumentFields,
    noteFields: CustomerNoteFields,
    taskFields: CustomerTaskFields
    // Note: CRM doesn't have "activities" or "leads" on Account level
    // Note: opportunities are fetched separately via useCustomerOpportunitiesList (not from Account query)
  }

  // Domain-specific entity fields (addresses, crmDocument, crmNote, salesCampaign)
  const entityFields = `
    # Addresses relation (CRM uses "city" not "locality")
    ${fields.addresses}(where: { isDeleted: { _eq: false } }) {
      ${CUSTOMER_ADDRESS_FRAGMENT}
    }
    
    # CRM duplicate relations
    ${fields.documents}(where: { isDeleted: { _eq: false } }) {
      ${buildDocumentFragment(CustomerDocumentFields)}
    }
    
    ${fields.notes}(where: { isDeleted: { _eq: false } }) {
      ${buildNoteFragment(CustomerNoteFields)}
    }
    
    # CRM-specific fields
    salesCampaign {
      ${CUSTOMER_CAMPAIGN_REF}
    }
    salesCampaignId
  `

  return buildAccountByPkQuery('Account', fields, relationBuilders, relationFields, entityFields)
}

/**
 * Build Customer Account search query
 */
export const buildCustomerAccountSearchQuery = (
  fields: typeof CustomerAccountFields = CustomerAccountFields
): string => {
  return buildAccountSearchQuery('Account', fields)
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
