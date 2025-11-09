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
  type CommonContactQueryVariables
} from '@/common/data/relations/queries/commonContactQueries'
import {
  buildContactFragmentWithRelations,
  type ContactRelationBuilders,
  type ContactRelationFields
} from '@/common/data/relations/queries/commonContactQueries'
import { CustomerContactFields, CUSTOMER_CONTACT_DESCRIPTORS } from '../types/customerContactTypes'
import { CUSTOMER_ADDRESS_FRAGMENT } from '../types/customerAddressTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import { buildActivityFragment } from '@/common/data/relations/queries/commonActivityFragments.new'
import { buildAccountFragment } from '@/common/data/relations/queries/commonAccountFragments.new'
import { buildDocumentFragment } from '@/common/data/relations/queries/commonDocumentFragments.new'
import { buildLeadFragment } from '@/common/data/relations/queries/commonLeadFragments.new'
import { buildNoteFragment } from '@/common/data/relations/queries/commonNoteFragments.new'
import { buildOpportunityFragment } from '@/common/data/relations/queries/commonOpportunityFragments.new'
import { buildTaskFragment } from '@/common/data/relations/queries/commonTaskFragments.new'

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
 * Build Customer Contact fragment using fields mapping
 * Includes Common Contact fields + common entity relations
 */
export const buildCustomerContactFragment = (fields: typeof CustomerContactFields = CustomerContactFields): string => {
  // Build common fragment with relations using REF fragments (no relations) to avoid circular dependencies
  const relationBuilders: ContactRelationBuilders = {
    buildActivityFragment, // REF fragment (no relations)
    buildAccountFragment, // REF fragment (no relations) - NOT buildCustomerAccountFragment!
    buildDocumentFragment, // REF fragment (no relations)
    buildLeadFragment, // REF fragment (no relations)
    buildNoteFragment, // REF fragment (no relations)
    buildOpportunityFragment, // REF fragment (no relations) - NOT buildCustomerOpportunityFragment!
    buildTaskFragment // REF fragment (no relations)
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

  const commonFragmentWithRelations = buildContactFragmentWithRelations(fields, relationBuilders, relationFields)

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
`
}

/**
 * Build Customer Contact query with fields mapping
 * CRM uses "Contact" as entity name (not "CustomerContact")
 */
export const buildCustomerContactQuery = (
  fields: typeof CustomerContactFields = CustomerContactFields,
  fragment: string = buildCustomerContactFragment(fields)
): string => {
  return buildContactQuery(fields, fragment, 'Contact')
}

/**
 * Build Customer Contact by ID query
 */
export const buildCustomerContactByIdQuery = (
  fields: typeof CustomerContactFields = CustomerContactFields,
  fragment: string = buildCustomerContactFragment(fields),
  id: string
): string => {
  return buildContactByIdQuery(fields, fragment, id, 'Contact')
}

/**
 * Build Customer Contact search query
 */
export const buildCustomerContactSearchQuery = (
  fields: typeof CustomerContactFields = CustomerContactFields
): string => {
  return buildContactSearchQuery(fields, 'Contact')
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
