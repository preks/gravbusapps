/**
 * Investment Contact Queries (New)
 * GraphQL queries for Investment Contact entities using fields mapping
 * Extends Common Contact Queries with InvestmentContactFields (with overrides)
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
  buildOpportunityFragment,
  buildTaskFragment
} from '@/common/data/relations/queries/relationFragments'

// Import Investment Fields
import { InvestmentActivityFields } from '../types/investmentActivityTypes'
import { InvestmentAccountFields } from '../types/investmentAccountTypes'
import { InvestmentDocumentFields } from '../types/investmentDocumentTypes'
import { InvestmentLeadFields } from '../types/investmentLeadTypes'
import { InvestmentNoteFields } from '../types/investmentNoteTypes'
import { InvestmentOpportunityFields } from '../types/investmentOpportunityTypes'
import { InvestmentTaskFields } from '../types/investmentTaskTypes'

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
}

/**
 * Build Investment Contact query with fields mapping
 */
export const buildInvestmentContactQuery = (
  fields: typeof InvestmentContactFields = InvestmentContactFields
): string => {
  const entityFields = `
    # Addresses relation (IRM uses "locality")
    ${fields.addresses}(where: { isDeleted: { _eq: false } }) {
      ${INVESTMENT_ADDRESS_FRAGMENT}
    }
    
    # Leads relation (IRM uses "investmentLead" as array, with where clause)
    ${fields.leads}(where: { isDeleted: { _eq: false } }) {
      ${buildLeadFragment(InvestmentLeadFields)}
    }
  `
  return buildContactQuery(fields, 'InvestmentContact', entityFields)
}

/**
 * Build Investment Contact by ID query
 */
export const buildInvestmentContactByIdQuery = (
  fields: typeof InvestmentContactFields = InvestmentContactFields,
  id: string
): string => {
  // Build relation builders and fields for common relations
  const relationBuilders: ContactRelationBuilders = {
    buildActivityFragment,
    buildAccountFragment,
    buildDocumentFragment,
    buildLeadFragment,
    buildNoteFragment,
    buildOpportunityFragment,
    buildTaskFragment
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
  `

  return buildContactByIdQuery(fields, id, 'InvestmentContact', relationBuilders, relationFields, entityFields)
}

/**
 * Build Investment Contact search query
 */
export const buildInvestmentContactSearchQuery = (
  fields: typeof InvestmentContactFields = InvestmentContactFields
): string => {
  return buildContactSearchQuery(fields, 'InvestmentContact')
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

// =====================================================
// INVESTMENT CONTACT RELATED ENTITIES QUERIES
// =====================================================

/**
 * Build Investment Tasks by Contact ID query (using GraphQL variables)
 */
export const buildInvestmentTasksByContactIdQuery = (): string => {
  const fragment = `
    ${buildTaskFragment(InvestmentTaskFields)}
    
    # Entity references
    contact {
      id
      code
      firstName
      lastName
    }
  `

  return `
    query GetInvestmentTasksByContactId(
      $where: InvestmentTaskBoolExp
      $orderBy: [InvestmentTaskOrderBy!]
    ) {
      InvestmentTask(
        where: $where
        orderBy: $orderBy
      ) {
        ${fragment}
      }
    }
  `
}

/**
 * Build Investment Activities by Contact ID query (using GraphQL variables)
 */
export const buildInvestmentActivitiesByContactIdQuery = (): string => {
  const fragment = `
    ${buildActivityFragment(InvestmentActivityFields)}
    
    # Entity references
    contact {
      id
      code
      firstName
      lastName
    }
  `

  return `
    query GetInvestmentActivitiesByContactId(
      $where: InvestmentActivityBoolExp
      $orderBy: [InvestmentActivityOrderBy!]
    ) {
      InvestmentActivity(
        where: $where
        orderBy: $orderBy
      ) {
        ${fragment}
      }
    }
  `
}

/**
 * Build Investment Notes by Contact ID query (using GraphQL variables)
 */
export const buildInvestmentNotesByContactIdQuery = (): string => {
  const fragment = buildNoteFragment(InvestmentNoteFields)

  return `
    query GetInvestmentNotesByContactId(
      $where: InvestmentNoteBoolExp
      $orderBy: [InvestmentNoteOrderBy!]
    ) {
      InvestmentNote(
        where: $where
        orderBy: $orderBy
      ) {
        ${fragment}
      }
    }
  `
}

/**
 * Build Investment Documents by Contact ID query (using GraphQL variables)
 */
export const buildInvestmentDocumentsByContactIdQuery = (): string => {
  const fragment = `
    ${buildDocumentFragment(InvestmentDocumentFields)}
    
    # Entity references
    contact {
      id
      code
      firstName
      lastName
    }
  `

  return `
    query GetInvestmentDocumentsByContactId(
      $where: InvestmentDocumentBoolExp
      $orderBy: [InvestmentDocumentOrderBy!]
    ) {
      InvestmentDocument(
        where: $where
        orderBy: $orderBy
      ) {
        ${fragment}
      }
    }
  `
}

// Legacy exports for backward compatibility (deprecated - use builder functions above)
export const GET_INVESTMENT_TASKS_BY_CONTACT_ID = buildInvestmentTasksByContactIdQuery
export const GET_INVESTMENT_ACTIVITIES_BY_CONTACT_ID = buildInvestmentActivitiesByContactIdQuery
export const GET_INVESTMENT_NOTES_BY_CONTACT_ID = buildInvestmentNotesByContactIdQuery
export const GET_INVESTMENT_DOCUMENTS_BY_CONTACT_ID = buildInvestmentDocumentsByContactIdQuery
