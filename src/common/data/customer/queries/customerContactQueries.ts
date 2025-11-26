/**
 * Customer Contact Queries (New)
 * GraphQL queries for Customer Contact entities using fields mapping
 * Extends Common Contact Queries with CRM-specific fields
 */

import {
  buildContactQuery,
  buildContactByIdQuery,
  buildContactSearchQuery,
  buildContactWhereCondition,
  buildContactOrderBy,
  type CommonContactQueryVariables,
  type ContactRelationBuilders,
  type ContactRelationFields
} from '@/common/data/relations/queries/contactQueries'
import { CustomerContactFields, CUSTOMER_CONTACT_DESCRIPTORS } from '../types/customerContactTypes'
import { CUSTOMER_ADDRESS_FRAGMENT } from '../types/customerAddressTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import {
  buildActivityFragment,
  buildAccountFragment,
  buildDocumentFragment,
  buildLeadFragment,
  buildNoteFragment,
  buildOpportunityFragment,
  buildTaskFragment
} from '@/common/data/relations/queries/relationFragments'
import { CUSTOMER_CAMPAIGN_REF } from './fragments/customerReferenceFragments'

// Import Customer Fields
import { CustomerActivityFields } from '../types/customerActivityTypes'
import { CustomerAccountFields } from '../types/customerAccountTypes'
import { CustomerDocumentFields } from '../types/customerDocumentTypes'
import { CustomerLeadFields } from '../types/customerLeadTypes'
import { CustomerNoteFields } from '../types/customerNoteTypes'
import { CustomerOpportunityFields } from '../types/customerOpportunityTypes'
import { CustomerTaskFields } from '../types/customerTaskTypes'

/**
 * Customer Contact Query Variables Interface
 * Extends CommonContactQueryVariables with CRM-specific filters
 */
export interface CustomerContactQueryVariables extends CommonContactQueryVariables {
  // CRM-specific filters
  accountIds?: string[]
  contactTypes?: string[]
  departments?: string[]
  fullNames?: string[]
  hasEmail?: boolean
  missingEmail?: boolean
  hasPhone?: boolean
  missingPhone?: boolean
  birthDateFrom?: string
  birthDateTo?: string
}

/**
 * Build Customer Contact query with fields mapping
 * CRM uses "Contact" as entity name (not "CustomerContact")
 */
export const buildCustomerContactQuery = (fields: typeof CustomerContactFields = CustomerContactFields): string => {
  // Build relation builders and fields for accountContacts
  // Use wrapper function to include relations (website, addresses, communicationChannels) in account fragment
  const buildAccountFragmentWithRelations = (accountFields: any) => {
    return buildAccountFragment(accountFields)
  }

  const relationBuilders: Partial<ContactRelationBuilders> = {
    buildAccountFragment: buildAccountFragmentWithRelations
  }

  const relationFields: Partial<ContactRelationFields> = {
    accountFields: CustomerAccountFields
  }

  const entityFields = `
    # Addresses relation (CRM uses "city" not "locality")
    ${fields.addresses}(where: { isDeleted: { _eq: false } }) {
      ${CUSTOMER_ADDRESS_FRAGMENT}
    }
    
    # Lead relation (CRM uses singular "lead" as object, not array - no where clause)
    ${fields.leads} {
      ${buildLeadFragment(CustomerLeadFields)}
    }
    # CRM-specific fields
    salesCampaign {
      ${CUSTOMER_CAMPAIGN_REF}
    }
    salesCampaignId
  `
  return buildContactQuery('Contact', fields, relationBuilders, relationFields, entityFields)
}

/**
 * Build Customer Contact by ID query
 */
export const buildCustomerContactByIdQuery = (fields: typeof CustomerContactFields = CustomerContactFields): string => {
  // Build relation builders and fields for common relations
  // Use wrapper function to include relations (website, addresses, communicationChannels) in account fragment
  const buildAccountFragmentWithRelations = (accountFields: any) => {
    return buildAccountFragment(accountFields)
  }

  const relationBuilders: ContactRelationBuilders = {
    buildActivityFragment,
    buildAccountFragment: buildAccountFragmentWithRelations,
    buildDocumentFragment,
    buildLeadFragment,
    buildNoteFragment,
    buildOpportunityFragment,
    buildTaskFragment
  }

  const relationFields: ContactRelationFields = {
    activityFields: CustomerActivityFields,
    accountFields: CustomerAccountFields,
    documentFields: CustomerDocumentFields,
    leadFields: CustomerLeadFields,
    noteFields: CustomerNoteFields,
    opportunityFields: CustomerOpportunityFields,
    taskFields: CustomerTaskFields
  }

  // Domain-specific entity fields (addresses, leads)
  const entityFields = `
    # Addresses relation (CRM uses "city" not "locality")
    ${fields.addresses}(where: { isDeleted: { _eq: false } }) {
      ${CUSTOMER_ADDRESS_FRAGMENT}
    }
    
    # Lead relation (CRM uses singular "lead" as object, not array - no where clause)
    ${fields.leads} {
      ${buildLeadFragment(CustomerLeadFields)}
    }
    # CRM-specific fields
    salesCampaign {
      ${CUSTOMER_CAMPAIGN_REF}
    }
    salesCampaignId
  `

  return buildContactByIdQuery('Contact', fields, relationBuilders, relationFields, entityFields)
}

/**
 * Build Customer Contact search query
 */
export const buildCustomerContactSearchQuery = (
  fields: typeof CustomerContactFields = CustomerContactFields
): string => {
  return buildContactSearchQuery('Contact', fields)
}

/**
 * Build WHERE condition for Customer Contact queries
 * Uses CUSTOMER_CONTACT_DESCRIPTORS which includes common descriptors
 */
export const buildCustomerContactWhereCondition = (
  variables: CustomerContactQueryVariables = {},
  additionalDescriptors: Descriptor[] = [],
  customConditions: Record<string, any>[] = []
): Record<string, any> => {
  // CUSTOMER_CONTACT_DESCRIPTORS already includes common descriptors
  const descriptors = [...CUSTOMER_CONTACT_DESCRIPTORS, ...additionalDescriptors]
  return buildContactWhereCondition(variables, descriptors, customConditions)
}

/**
 * Build ORDER BY for Customer Contact queries
 */
export const buildCustomerContactOrderBy = (
  orderBy: CustomerContactQueryVariables['orderBy'] = [],
  additionalDescriptors: Descriptor[] = []
): any[] => {
  const descriptors = [...CUSTOMER_CONTACT_DESCRIPTORS, ...additionalDescriptors]
  return buildContactOrderBy(orderBy, descriptors)
}
