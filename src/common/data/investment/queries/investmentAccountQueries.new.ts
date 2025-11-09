/**
 * Investment Account Queries (New)
 * GraphQL queries for Investment Account entities using fields mapping
 * Extends Common Account Queries with IRM-specific fields
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
import { InvestmentAccountFields, INVESTMENT_ACCOUNT_DESCRIPTORS } from '../types/investmentAccountTypes'
import { INVESTMENT_REF, INVESTMENT_REPORT_REF } from './fragments/investmentReferenceFragments'
import { INVESTMENT_ADDRESS_FRAGMENT } from '../types/investmentAddressTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import { buildActivityFragment } from '@/common/data/relations/queries/commonActivityFragments.new'
import { buildContactFragment } from '@/common/data/relations/queries/commonContactFragments.new'
import { buildDocumentFragment } from '@/common/data/relations/queries/commonDocumentFragments.new'
import { buildNoteFragment } from '@/common/data/relations/queries/commonNoteFragments.new'
import { buildTaskFragment } from '@/common/data/relations/queries/commonTaskFragments.new'
import { buildLeadFragment } from '@/common/data/relations/queries/commonLeadFragments.new'
import { buildOpportunityFragment } from '@/common/data/relations/queries/commonOpportunityFragments.new'

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
 * Extends CommonAccountQueryVariables with IRM-specific filters
 */
export interface InvestmentAccountQueryVariables extends CommonAccountQueryVariables {
  // IRM-specific filter IDs
  investmentIds?: string[]
  reportIds?: string[]
}

/**
 * Build Investment Account fragment using fields mapping
 * Includes Common Account fields + common entity relations + IRM-specific relations
 */
export const buildInvestmentAccountFragment = (
  fields: typeof InvestmentAccountFields = InvestmentAccountFields
): string => {
  // Build common fragment with relations using REF fragments (no relations) to avoid circular dependencies
  const relationBuilders: AccountRelationBuilders = {
    buildActivityFragment, // REF fragment (no relations)
    buildContactFragment, // REF fragment (no relations) - NOT buildInvestmentContactFragment!
    buildDocumentFragment, // REF fragment (no relations)
    buildNoteFragment, // REF fragment (no relations)
    buildTaskFragment, // REF fragment (no relations) - NOT buildInvestmentTaskFragment!
    buildLeadFragment, // REF fragment (no relations)
    buildOpportunityFragment // REF fragment (no relations) - NOT buildInvestmentOpportunityFragment!
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

  const commonFragmentWithRelations = buildAccountFragmentWithRelations(fields, relationBuilders, relationFields)

  return `
  ${commonFragmentWithRelations}
  
  # Addresses relation (IRM uses "locality")
  ${fields.addresses}(where: { isDeleted: { _eq: false } }) {
    ${INVESTMENT_ADDRESS_FRAGMENT}
  }
  
  # Activities relation (only in IRM, not in CRM)
  ${fields.activities}(where: { isDeleted: { _eq: false } }) {
    ${buildActivityFragment(InvestmentActivityFields)}
  }
  
  # IRM-specific relations (not in common)
  investment(where: { isDeleted: { _eq: false } }) {
    ${INVESTMENT_REF}
  }
  
  investmentReport(where: { isDeleted: { _eq: false } }) {
    ${INVESTMENT_REPORT_REF}
  }
`
}

/**
 * Build Investment Account query with fields mapping
 */
export const buildInvestmentAccountQuery = (
  fields: typeof InvestmentAccountFields = InvestmentAccountFields,
  fragment: string = buildInvestmentAccountFragment(fields)
): string => {
  return buildAccountQuery(fields, fragment, 'InvestmentAccount')
}

/**
 * Build Investment Account by ID query
 */
export const buildInvestmentAccountByIdQuery = (
  fields: typeof InvestmentAccountFields = InvestmentAccountFields,
  fragment: string = buildInvestmentAccountFragment(fields),
  id: string
): string => {
  return buildAccountByIdQuery(fields, fragment, id, 'InvestmentAccount')
}

/**
 * Build Investment Account search query
 */
export const buildInvestmentAccountSearchQuery = (
  fields: typeof InvestmentAccountFields = InvestmentAccountFields
): string => {
  return buildAccountSearchQuery(fields, 'InvestmentAccount')
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
