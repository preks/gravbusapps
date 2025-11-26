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
  type CommonLeadQueryVariables,
  type LeadRelationBuilders,
  type LeadRelationFields
} from '@/common/data/relations/queries/leadQueries'
import { CustomerLeadFields, CUSTOMER_LEAD_DESCRIPTORS } from '../types/customerLeadTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import {
  buildActivityFragment,
  buildDocumentFragment,
  buildNoteFragment,
  buildTaskFragment,
  buildAccountFragment,
  buildContactFragment,
  buildOpportunityFragment
} from '@/common/data/relations/queries/relationFragments'

import { CUSTOMER_CAMPAIGN_REF } from './fragments/customerReferenceFragments'

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
 * Build Customer Lead query with fields mapping
 * CRM uses "Lead" as entity name (not "CustomerLead")
 */
export const buildCustomerLeadQuery = (fields: typeof CustomerLeadFields = CustomerLeadFields): string => {
  return buildLeadQuery('Lead', fields)
}

/**
 * Build Customer Lead by ID query
 */
export const buildCustomerLeadByIdQuery = (fields: typeof CustomerLeadFields = CustomerLeadFields): string => {
  // Build relation builders and fields for common relations
  const relationBuilders: LeadRelationBuilders = {
    buildActivityFragment,
    buildDocumentFragment,
    buildNoteFragment,
    buildTaskFragment,
    buildAccountFragment,
    buildContactFragment,
    buildOpportunityFragment
  }

  const relationFields: LeadRelationFields = {
    activityFields: CustomerActivityFields,
    documentFields: CustomerDocumentFields,
    noteFields: CustomerNoteFields,
    taskFields: CustomerTaskFields,
    accountFields: CustomerAccountFields,
    contactFields: CustomerContactFields,
    opportunityFields: CustomerOpportunityFields
  }

  // CRM-specific additional fields: salesCampaign and salesCampaignId
  const additionalFields = `
    salesCampaign {
      ${CUSTOMER_CAMPAIGN_REF}
    }
    salesCampaignId
  `

  return buildLeadByIdQuery('Lead', fields, relationBuilders, relationFields, additionalFields)
}

/**
 * Build Customer Lead search query
 */
export const buildCustomerLeadSearchQuery = (fields: typeof CustomerLeadFields = CustomerLeadFields): string => {
  return buildLeadSearchQuery('Lead', fields)
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
