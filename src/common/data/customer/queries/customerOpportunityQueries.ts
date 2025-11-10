/**
 * Customer Opportunity Queries (New)
 * GraphQL queries for Customer Opportunity entities using fields mapping
 * Extends Common Opportunity Queries with CRM-specific fields
 */

import {
  buildOpportunityQuery,
  buildOpportunityByIdQuery,
  buildOpportunitySearchQuery,
  buildOpportunityWhereCondition,
  buildOpportunityOrderBy,
  type CommonOpportunityQueryVariables,
  type OpportunityRelationBuilders,
  type OpportunityRelationFields
} from '@/common/data/relations/queries/opportunityQueries'
import { CustomerOpportunityFields, CUSTOMER_OPPORTUNITY_DESCRIPTORS } from '../types/customerOpportunityTypes'
import { CUSTOMER_CAMPAIGN_REF } from './fragments/customerReferenceFragments'
import { CUSTOMER_ADDRESS_FRAGMENT } from '../types/customerAddressTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import {
  buildActivityFragment,
  buildAccountFragment,
  buildContactFragment,
  buildDocumentFragment,
  buildLeadFragment,
  buildNoteFragment,
  buildTaskFragment
} from '@/common/data/relations/queries/relationFragments'

// Import Customer Fields
import { CustomerActivityFields } from '../types/customerActivityTypes'
import { CustomerAccountFields } from '../types/customerAccountTypes'
import { CustomerContactFields } from '../types/customerContactTypes'
import { CustomerDocumentFields } from '../types/customerDocumentTypes'
import { CustomerLeadFields } from '../types/customerLeadTypes'
import { CustomerNoteFields } from '../types/customerNoteTypes'
import { CustomerTaskFields } from '../types/customerTaskTypes'

/**
 * Customer Opportunity Query Variables Interface
 * Extends CommonOpportunityQueryVariables with CRM-specific filters
 */
export interface CustomerOpportunityQueryVariables extends CommonOpportunityQueryVariables {
  // CRM-specific filter IDs
  salesCampaignIds?: string[]
}

/**
 * Build Customer Opportunity query with fields mapping
 * CRM uses "Opportunity" as entity name (not "CustomerOpportunity")
 */
export const buildCustomerOpportunityQuery = (
  fields: typeof CustomerOpportunityFields = CustomerOpportunityFields
): string => {
  const entityFields = `
    # Addresses relation (CRM uses "city" not "locality")
    ${fields.addresses}(where: { isDeleted: { _eq: false } }) {
      ${CUSTOMER_ADDRESS_FRAGMENT}
    }
    
    # Lead relation (CRM uses singular "lead" as object, not array - no where clause)
    ${fields.leads} {
      ${buildLeadFragment(CustomerLeadFields)}
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
  return buildOpportunityQuery(fields, 'Opportunity', entityFields)
}

/**
 * Build Customer Opportunity by ID query
 */
export const buildCustomerOpportunityByIdQuery = (
  fields: typeof CustomerOpportunityFields = CustomerOpportunityFields,
  id: string
): string => {
  // Build relation builders and fields for common relations
  // Use wrapper function to include relations (website, addresses, communicationChannels) in account fragment
  const buildAccountFragmentWithRelations = (accountFields: any) => {
    return buildAccountFragment(accountFields, true, CUSTOMER_ADDRESS_FRAGMENT)
  }

  const relationBuilders: OpportunityRelationBuilders = {
    buildActivityFragment,
    buildAccountFragment: buildAccountFragmentWithRelations,
    buildContactFragment,
    buildDocumentFragment,
    buildLeadFragment,
    buildNoteFragment,
    buildTaskFragment
  }

  const relationFields: OpportunityRelationFields = {
    activityFields: CustomerActivityFields,
    accountFields: CustomerAccountFields,
    contactFields: CustomerContactFields,
    documentFields: CustomerDocumentFields,
    leadFields: CustomerLeadFields,
    noteFields: CustomerNoteFields,
    taskFields: CustomerTaskFields
  }

  // Domain-specific entity fields (addresses, leads, crmDocument, crmNote, salesCampaign)
  const entityFields = `
    # Addresses relation (CRM uses "city" not "locality")
    ${fields.addresses}(where: { isDeleted: { _eq: false } }) {
      ${CUSTOMER_ADDRESS_FRAGMENT}
    }
    
    # Lead relation (CRM uses singular "lead" as object, not array - no where clause)
    ${fields.leads} {
      ${buildLeadFragment(CustomerLeadFields)}
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

  return buildOpportunityByIdQuery(fields, id, 'Opportunity', relationBuilders, relationFields, entityFields)
}

/**
 * Build Customer Opportunity search query
 */
export const buildCustomerOpportunitySearchQuery = (
  fields: typeof CustomerOpportunityFields = CustomerOpportunityFields
): string => {
  return buildOpportunitySearchQuery(fields, 'Opportunity')
}

/**
 * Build WHERE condition for Customer Opportunity queries
 * Includes CRM-specific descriptors (salesCampaignIds)
 */
export const buildCustomerOpportunityWhereCondition = (
  variables: CustomerOpportunityQueryVariables = {},
  additionalDescriptors: Descriptor[] = [],
  customConditions: Record<string, any>[] = []
): Record<string, any> => {
  // CUSTOMER_OPPORTUNITY_DESCRIPTORS already includes common descriptors + CRM-specific overrides
  const descriptors = [...CUSTOMER_OPPORTUNITY_DESCRIPTORS, ...additionalDescriptors]
  return buildOpportunityWhereCondition(variables, descriptors, customConditions)
}

/**
 * Build ORDER BY for Customer Opportunity queries
 */
export const buildCustomerOpportunityOrderBy = (
  orderBy: CustomerOpportunityQueryVariables['orderBy'] = [],
  additionalDescriptors: Descriptor[] = []
): any[] => {
  // CUSTOMER_OPPORTUNITY_DESCRIPTORS already includes common descriptors + CRM-specific overrides
  const descriptors = [...CUSTOMER_OPPORTUNITY_DESCRIPTORS, ...additionalDescriptors]
  return buildOpportunityOrderBy(orderBy, descriptors)
}
