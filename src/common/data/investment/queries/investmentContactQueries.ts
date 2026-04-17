/**
 * Investment Contact Queries (New)
 * GraphQL queries for Investment Contact entities using fields mapping
 * Extends Common Contact Queries with InvestmentContactFields (with overrides)
 */

import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
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
import { InvestmentContactFields, INVESTMENT_CONTACT_DESCRIPTORS } from '../types/investmentContactTypes'
import { INVESTMENT_ADDRESS_FRAGMENT } from '../types/investmentAddressTypes'
// ContactFields type is used implicitly through Record<keyof typeof ContactFields, string>
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import {
  buildActivityFragment,
  buildAccountFragment,
  buildDocumentFragment,
  buildLeadFragment,
  buildNoteFragment,
  buildOpportunityFragment
} from '@/common/data/relations/queries/relationFragments'

// Import IRM-specific task fragment (uses taskAssignees instead of assignedEmployee)
import { buildInvestmentTaskFragmentForRelations } from './investmentTaskQueries'

// Import Investment Fields
import { InvestmentActivityFields } from '../types/investmentActivityTypes'
import { InvestmentAccountFields } from '../types/investmentAccountTypes'
import { InvestmentDocumentFields } from '../types/investmentDocumentTypes'
import { InvestmentLeadFields } from '../types/investmentLeadTypes'
import { InvestmentNoteFields } from '../types/investmentNoteTypes'
import { InvestmentOpportunityFields } from '../types/investmentOpportunityTypes'
import { InvestmentTaskFields } from '../types/investmentTaskTypes'

/** Nested under account in accountContacts — investments linked to that account (IRM activity association). */
export const INVESTMENT_ACCOUNT_NESTED_INVESTMENTS_FOR_ACTIVITY = `
        investments(where: { isDeleted: { _eq: false } }) {
          id
          investmentId
          investmentAccountId
          investment {
            id
            name
            code
          }
          ${AUDIT_FIELDS}
        }
`

/**
 * Investment Contact Query Variables Interface
 * Extends CommonContactQueryVariables with investment-specific filters
 */
export interface InvestmentContactQueryVariables extends CommonContactQueryVariables {
  // Investment-specific filters
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
  userIds?: string[] // Filter by Keycloak user IDs
}

/**
 * Build Investment Contact query with fields mapping
 */
export const buildInvestmentContactQuery = (
  fields: typeof InvestmentContactFields = InvestmentContactFields
): string => {
  // Build relation builders and fields for accountContacts
  const relationBuilders: Partial<ContactRelationBuilders> = {
    buildAccountFragment
  }

  const relationFields: Partial<ContactRelationFields> = {
    accountFields: InvestmentAccountFields
  }

  const entityFields = `
    # Addresses relation (IRM uses "locality")
    ${fields.addresses}(where: { isDeleted: { _eq: false } }) {
      ${INVESTMENT_ADDRESS_FRAGMENT}
    }
    
    # Leads relation (IRM uses "investmentLead" as array, with where clause)
    ${fields.leads}(where: { isDeleted: { _eq: false } }) {
      ${buildLeadFragment(InvestmentLeadFields)}
    }
    
    # IRM-specific fields
    ${fields.userId}
  `
  return buildContactQuery('InvestmentContact', fields, relationBuilders, relationFields, entityFields)
}

/**
 * Build Investment Contact by ID query
 */
export const buildInvestmentContactByIdQuery = (
  fields: typeof InvestmentContactFields = InvestmentContactFields
): string => {
  // Build relation builders and fields for common relations
  const relationBuilders: ContactRelationBuilders = {
    buildActivityFragment,
    buildAccountFragment,
    buildDocumentFragment,
    buildLeadFragment,
    buildNoteFragment,
    buildOpportunityFragment,
    buildTaskFragment: buildInvestmentTaskFragmentForRelations // Use IRM-specific version (taskAssignees)
  }

  const relationFields: ContactRelationFields = {
    activityFields: InvestmentActivityFields,
    accountFields: InvestmentAccountFields,
    documentFields: InvestmentDocumentFields,
    leadFields: InvestmentLeadFields,
    noteFields: InvestmentNoteFields,
    opportunityFields: InvestmentOpportunityFields,
    taskFields: InvestmentTaskFields
  }

  // Domain-specific entity fields (addresses, leads)
  const entityFields = `
    # Addresses relation (IRM uses "locality")
    ${fields.addresses}(where: { isDeleted: { _eq: false } }) {
      ${INVESTMENT_ADDRESS_FRAGMENT}
    }
    
    # Leads relation (IRM uses "investmentLead" as array, with where clause)
    ${fields.leads}(where: { isDeleted: { _eq: false } }) {
      ${buildLeadFragment(InvestmentLeadFields)}
    }
    
    # IRM-specific fields
    ${fields.userId}
  `

  return buildContactByIdQuery(
    'InvestmentContact',
    fields,
    relationBuilders,
    relationFields,
    entityFields,
    INVESTMENT_ACCOUNT_NESTED_INVESTMENTS_FOR_ACTIVITY
  )
}

/**
 * Build Investment Contact search query
 */
export const buildInvestmentContactSearchQuery = (
  fields: typeof InvestmentContactFields = InvestmentContactFields
): string => {
  return buildContactSearchQuery('InvestmentContact', fields)
}

/**
 * Build WHERE condition for Investment Contact queries
 * Uses INVESTMENT_CONTACT_DESCRIPTORS which includes common descriptors
 */
export const buildInvestmentContactWhereCondition = (
  variables: InvestmentContactQueryVariables = {},
  additionalDescriptors: Descriptor[] = [],
  customConditions: Record<string, any>[] = []
): Record<string, any> => {
  // INVESTMENT_CONTACT_DESCRIPTORS already includes common descriptors
  const descriptors = [...INVESTMENT_CONTACT_DESCRIPTORS, ...additionalDescriptors]
  return buildContactWhereCondition(variables, descriptors, customConditions)
}

/**
 * Build ORDER BY for Investment Contact queries
 */
export const buildInvestmentContactOrderBy = (
  orderBy: InvestmentContactQueryVariables['orderBy'] = [],
  additionalDescriptors: Descriptor[] = []
): any[] => {
  const descriptors = [...INVESTMENT_CONTACT_DESCRIPTORS, ...additionalDescriptors]
  return buildContactOrderBy(orderBy, descriptors)
}
