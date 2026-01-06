/**
 * Investment Account Queries (New)
 * GraphQL queries for Investment Account entities using fields mapping
 * Extends Common Account Queries with IRM-specific fields
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
import { InvestmentAccountFields, INVESTMENT_ACCOUNT_DESCRIPTORS } from '../types/investmentAccountTypes'
import { INVESTMENT_REPORT_REF } from './fragments/investmentReferenceFragments'
import { INVESTMENT_ADDRESS_FRAGMENT } from '../types/investmentAddressTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import {
  buildActivityFragment,
  buildContactFragment,
  buildDocumentFragment,
  buildNoteFragment,
  buildLeadFragment,
  buildOpportunityFragment
} from '@/common/data/relations/queries/relationFragments'

// Import IRM-specific task fragment (uses taskAssignees instead of assignedEmployee)
import { buildInvestmentTaskFragmentForRelations } from './investmentTaskQueries'

// Import Investment Fields
import { InvestmentActivityFields } from '../types/investmentActivityTypes'
import { InvestmentContactFields } from '../types/investmentContactTypes'
import { InvestmentDocumentFields } from '../types/investmentDocumentTypes'
import { InvestmentNoteFields } from '../types/investmentNoteTypes'
import { InvestmentTaskFields } from '../types/investmentTaskTypes'
import { InvestmentLeadFields } from '../types/investmentLeadTypes'
import { InvestmentOpportunityFields } from '../types/investmentOpportunityTypes'

/**
 * Investment Account Query Variables Interface
 * Extends AccountQueryVariables with IRM-specific filters
 */
export interface InvestmentAccountQueryVariables extends AccountQueryVariables {
  // IRM-specific filter IDs
  investmentIds?: string[]
  reportIds?: string[]
}

/**
 * Build Investment Account query with fields mapping
 */
export const buildInvestmentAccountQuery = (
  fields: typeof InvestmentAccountFields = InvestmentAccountFields
): string => {
  const entityFields = `
    # Addresses relation (IRM uses "locality")
    ${fields.addresses}(where: { isDeleted: { _eq: false } }) {
      ${INVESTMENT_ADDRESS_FRAGMENT}
    }
    
    # Activities relation (only in IRM, not in CRM)
    ${fields.activities}(where: { isDeleted: { _eq: false } }) {
      ${buildActivityFragment(InvestmentActivityFields)}
    }
    
    # IRM-specific relations
    # Note: investmentInvestmentAccount is accessed FROM Investment, not FROM InvestmentAccount
    # Investments can be filtered via descriptors using the junction table path
    
    investmentReport(where: { isDeleted: { _eq: false } }) {
      ${INVESTMENT_REPORT_REF}
    }
      `
  return buildAccountQuery('InvestmentAccount', fields, entityFields)
}

/**
 * Build Investment Account by ID query
 */
export const buildInvestmentAccountByIdQuery = (
  fields: typeof InvestmentAccountFields = InvestmentAccountFields
): string => {
  // Build relation builders and fields for common relations
  const relationBuilders: AccountRelationBuilders = {
    buildActivityFragment,
    buildContactFragment,
    buildDocumentFragment,
    buildNoteFragment,
    buildTaskFragment: buildInvestmentTaskFragmentForRelations, // Use IRM-specific version (taskAssignees)
    buildLeadFragment,
    buildOpportunityFragment
  }

  const relationFields: AccountRelationFields = {
    activityFields: InvestmentActivityFields,
    contactFields: InvestmentContactFields,
    documentFields: InvestmentDocumentFields,
    noteFields: InvestmentNoteFields,
    taskFields: InvestmentTaskFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields
  }

  // Domain-specific entity fields (addresses, activities, investment, investmentReport)
  const entityFields = `
    # Addresses relation (IRM uses "locality")
    ${fields.addresses}(where: { isDeleted: { _eq: false } }) {
      ${INVESTMENT_ADDRESS_FRAGMENT}
    }
    
    # Activities relation (only in IRM, not in CRM)
    ${fields.activities}(where: { isDeleted: { _eq: false } }) {
      ${buildActivityFragment(InvestmentActivityFields)}
    }
    
    # IRM-specific relations
    # Note: investmentInvestmentAccount is accessed FROM Investment, not FROM InvestmentAccount
    # Investments can be filtered via descriptors using the junction table path
    
    investmentReport(where: { isDeleted: { _eq: false } }) {
      ${INVESTMENT_REPORT_REF}
    }
  `

  return buildAccountByPkQuery('InvestmentAccount', fields, relationBuilders, relationFields, entityFields)
}

/**
 * Build Investment Account search query
 */
export const buildInvestmentAccountSearchQuery = (
  fields: typeof InvestmentAccountFields = InvestmentAccountFields
): string => {
  return buildAccountSearchQuery('InvestmentAccount', fields)
}

/**
 * Build WHERE condition for Investment Account queries
 * Uses INVESTMENT_ACCOUNT_DESCRIPTORS which includes common descriptors + IRM-specific fields
 */
export const buildInvestmentAccountWhereCondition = (
  variables: InvestmentAccountQueryVariables = {},
  additionalDescriptors: Descriptor[] = []
): Record<string, any> => {
  // INVESTMENT_ACCOUNT_DESCRIPTORS already includes common descriptors + IRM-specific fields
  const descriptors = [...INVESTMENT_ACCOUNT_DESCRIPTORS, ...additionalDescriptors]
  return buildAccountWhereCondition(variables, descriptors)
}

/**
 * Build ORDER BY for Investment Account queries
 * Uses INVESTMENT_ACCOUNT_DESCRIPTORS which includes common descriptors + IRM-specific fields
 */
export const buildInvestmentAccountOrderBy = (
  orderBy: InvestmentAccountQueryVariables['orderBy'] = [],
  additionalDescriptors: Descriptor[] = []
): any[] => {
  // INVESTMENT_ACCOUNT_DESCRIPTORS already includes common descriptors + IRM-specific fields
  const descriptors = [...INVESTMENT_ACCOUNT_DESCRIPTORS, ...additionalDescriptors]
  return buildAccountOrderBy(orderBy, descriptors)
}
