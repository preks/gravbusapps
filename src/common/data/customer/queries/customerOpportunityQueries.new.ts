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
  type CommonOpportunityQueryVariables
} from '@/common/data/relations/queries/commonOpportunityQueries'
import {
  buildOpportunityFragmentWithRelations,
  type OpportunityRelationBuilders,
  type OpportunityRelationFields
} from '@/common/data/relations/queries/commonOpportunityQueries'
import { CustomerOpportunityFields, CUSTOMER_OPPORTUNITY_DESCRIPTORS } from '../types/customerOpportunityTypes'
import { CUSTOMER_CAMPAIGN_REF } from './fragments/customerReferenceFragments'
import { CUSTOMER_ADDRESS_FRAGMENT } from '../types/customerAddressTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import { buildActivityFragment } from '@/common/data/relations/queries/commonActivityFragments.new'
import { buildAccountFragment } from '@/common/data/relations/queries/commonAccountFragments.new'
import { buildContactFragment } from '@/common/data/relations/queries/commonContactFragments.new'
import { buildDocumentFragment } from '@/common/data/relations/queries/commonDocumentFragments.new'
import { buildLeadFragment } from '@/common/data/relations/queries/commonLeadFragments.new'
import { buildNoteFragment } from '@/common/data/relations/queries/commonNoteFragments.new'
import { buildTaskFragment } from '@/common/data/relations/queries/commonTaskFragments.new'

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
 * Build Customer Opportunity fragment using fields mapping
 * Includes Common Opportunity fields + common entity relations + CRM-specific relations
 */
export const buildCustomerOpportunityFragment = (
  fields: typeof CustomerOpportunityFields = CustomerOpportunityFields
): string => {
  // Build common fragment with relations using REF fragments (no relations) to avoid circular dependencies
  const relationBuilders: OpportunityRelationBuilders = {
    buildActivityFragment, // REF fragment (no relations)
    buildAccountFragment, // REF fragment (no relations) - NOT buildCustomerAccountFragment!
    buildContactFragment, // REF fragment (no relations) - NOT buildCustomerContactFragment!
    buildDocumentFragment, // REF fragment (no relations)
    buildLeadFragment, // REF fragment (no relations)
    buildNoteFragment, // REF fragment (no relations)
    buildTaskFragment // REF fragment (no relations) - NOT buildCustomerTaskFragment!
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

  const commonFragmentWithRelations = buildOpportunityFragmentWithRelations(fields, relationBuilders, relationFields)

  return `
  ${commonFragmentWithRelations}
  
  # Addresses relation (CRM uses "city" not "locality")
  ${fields.addresses}(where: { isDeleted: { _eq: false } }) {
    ${CUSTOMER_ADDRESS_FRAGMENT}
  }
  
  # Lead relation (CRM uses singular "lead" as object, not array - no where clause)
  ${fields.leads} {
    ${relationBuilders.buildLeadFragment(relationFields.leadFields)}
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
 * Build Customer Opportunity query with fields mapping
 * CRM uses "Opportunity" as entity name (not "CustomerOpportunity")
 */
export const buildCustomerOpportunityQuery = (
  fields: typeof CustomerOpportunityFields = CustomerOpportunityFields,
  fragment: string = buildCustomerOpportunityFragment(fields)
): string => {
  return buildOpportunityQuery(fields, fragment, 'Opportunity')
}

/**
 * Build Customer Opportunity by ID query
 */
export const buildCustomerOpportunityByIdQuery = (
  fields: typeof CustomerOpportunityFields = CustomerOpportunityFields,
  fragment: string = buildCustomerOpportunityFragment(fields),
  id: string
): string => {
  return buildOpportunityByIdQuery(fields, fragment, id, 'Opportunity')
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
