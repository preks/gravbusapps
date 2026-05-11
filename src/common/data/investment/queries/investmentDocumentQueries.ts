/**
 * Investment Document Queries (New)
 * GraphQL queries for Investment Document entities using fields mapping
 * Uses Common Document Queries with InvestmentDocumentFields (no overrides needed)
 */

import {
  buildDocumentQuery,
  buildDocumentByIdQuery,
  buildDocumentSearchQuery,
  buildDocumentWhereCondition,
  buildDocumentOrderBy,
  buildDocumentByLeadIdQuery,
  buildDocumentByAccountIdQuery,
  buildDocumentByContactIdQuery,
  buildDocumentByOpportunityIdQuery,
  type CommonDocumentQueryVariables,
  type DocumentRelationBuilders,
  type DocumentRelationFields
} from '@/common/data/relations/queries/documentQueries'
import { InvestmentDocumentFields, INVESTMENT_DOCUMENT_DESCRIPTORS } from '../types/investmentDocumentTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import {
  buildAccountFragment,
  buildContactFragment,
  buildLeadFragment,
  buildOpportunityFragment,
  buildActivityFragment,
  buildNoteFragment
} from '@/common/data/relations/queries/relationFragments'

// Import IRM-specific task fragment (uses taskAssignees instead of assignedEmployee)
import { buildInvestmentTaskFragmentForRelations } from './investmentTaskQueries'

// Import Investment Fields
import { InvestmentAccountFields } from '../types/investmentAccountTypes'
import { InvestmentContactFields } from '../types/investmentContactTypes'
import { InvestmentLeadFields } from '../types/investmentLeadTypes'
import { InvestmentOpportunityFields } from '../types/investmentOpportunityTypes'
import { InvestmentTaskFields } from '../types/investmentTaskTypes'
import { InvestmentActivityFields } from '../types/investmentActivityTypes'
import { InvestmentNoteFields } from '../types/investmentNoteTypes'
import { INVESTMENT_COMPANY_REF } from './fragments/investmentReferenceFragments'

/**
 * Investment Document Query Variables Interface
 * Extends CommonDocumentQueryVariables with investment-specific filters
 */
export interface InvestmentDocumentQueryVariables extends CommonDocumentQueryVariables {
  // Investment-specific: investmentId filter
  investmentId?: string
  investmentIds?: string[]
  investmentCompanyIds?: string[]
}

const INVESTMENT_DOCUMENT_COMPANY_FIELDS = `
  ${InvestmentDocumentFields.investmentCompanyId}
  ${InvestmentDocumentFields.investmentCompany} {
    ${INVESTMENT_COMPANY_REF}
  }
`

/**
 * Build Investment Document query with fields mapping
 */
export const buildInvestmentDocumentQuery = (
  fields: typeof InvestmentDocumentFields = InvestmentDocumentFields
): string => {
  return buildDocumentQuery('InvestmentDocument', fields, undefined, undefined, INVESTMENT_DOCUMENT_COMPANY_FIELDS)
}

/**
 * Build Investment Document by ID query
 */
export const buildInvestmentDocumentByIdQuery = (
  fields: typeof InvestmentDocumentFields = InvestmentDocumentFields,
  id: string
): string => {
  // Build relation builders and fields for common relations
  const relationBuilders: DocumentRelationBuilders = {
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment,
    buildTaskFragment: buildInvestmentTaskFragmentForRelations, // Use IRM-specific version (taskAssignees)
    buildActivityFragment,
    buildNoteFragment
  }

  const relationFields: DocumentRelationFields = {
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields,
    taskFields: InvestmentTaskFields,
    activityFields: InvestmentActivityFields,
    noteFields: InvestmentNoteFields
  }

  return buildDocumentByIdQuery(
    'InvestmentDocument',
    id,
    fields,
    relationBuilders,
    relationFields,
    INVESTMENT_DOCUMENT_COMPANY_FIELDS
  )
}

/**
 * Build Investment Document search query
 */
export const buildInvestmentDocumentSearchQuery = (
  fields: typeof InvestmentDocumentFields = InvestmentDocumentFields
): string => {
  return buildDocumentSearchQuery('InvestmentDocument', fields)
}

/**
 * Build WHERE condition for Investment Document queries
 * Uses INVESTMENT_DOCUMENT_DESCRIPTORS which includes common descriptors
 */
export const buildInvestmentDocumentWhereCondition = (
  variables: InvestmentDocumentQueryVariables = {},
  additionalDescriptors: Descriptor[] = [],
  customConditions: Record<string, any>[] = []
): Record<string, any> => {
  // INVESTMENT_DOCUMENT_DESCRIPTORS already includes common descriptors
  const descriptors = [...INVESTMENT_DOCUMENT_DESCRIPTORS, ...additionalDescriptors]
  return buildDocumentWhereCondition(variables, descriptors, customConditions)
}

/**
 * Build ORDER BY for Investment Document queries
 * Uses INVESTMENT_DOCUMENT_DESCRIPTORS which includes common descriptors
 */
export const buildInvestmentDocumentOrderBy = (
  orderBy: InvestmentDocumentQueryVariables['orderBy'] = [],
  additionalDescriptors: Descriptor[] = []
): any[] => {
  // INVESTMENT_DOCUMENT_DESCRIPTORS already includes common descriptors
  const descriptors = [...INVESTMENT_DOCUMENT_DESCRIPTORS, ...additionalDescriptors]
  return buildDocumentOrderBy(orderBy, descriptors)
}

// =====================================================
// INVESTMENT DOCUMENT BY ENTITY ID QUERY BUILDERS
// =====================================================

/**
 * Build Investment Document query filtered by Lead ID
 * Uses common buildDocumentByLeadIdQuery with Investment-specific fields and relations
 */
export const buildInvestmentDocumentByLeadIdQuery = (): string => {
  const relationBuilders: Partial<DocumentRelationBuilders> = {
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment,
    buildTaskFragment: buildInvestmentTaskFragmentForRelations, // Use IRM-specific version (taskAssignees)
    buildActivityFragment,
    buildNoteFragment
  }

  const relationFields: Partial<DocumentRelationFields> = {
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields,
    taskFields: InvestmentTaskFields,
    activityFields: InvestmentActivityFields,
    noteFields: InvestmentNoteFields
  }

  return buildDocumentByLeadIdQuery(
    'InvestmentDocument',
    InvestmentDocumentFields,
    relationBuilders,
    relationFields,
    INVESTMENT_DOCUMENT_COMPANY_FIELDS
  )
}

/**
 * Build Investment Document query filtered by Account ID
 */
export const buildInvestmentDocumentByAccountIdQuery = (): string => {
  const relationBuilders: Partial<DocumentRelationBuilders> = {
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment,
    buildTaskFragment: buildInvestmentTaskFragmentForRelations, // Use IRM-specific version (taskAssignees)
    buildActivityFragment,
    buildNoteFragment
  }

  const relationFields: Partial<DocumentRelationFields> = {
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields,
    taskFields: InvestmentTaskFields,
    activityFields: InvestmentActivityFields,
    noteFields: InvestmentNoteFields
  }

  return buildDocumentByAccountIdQuery(
    'InvestmentDocument',
    InvestmentDocumentFields,
    relationBuilders,
    relationFields,
    INVESTMENT_DOCUMENT_COMPANY_FIELDS
  )
}

/**
 * Build Investment Document query filtered by Contact ID
 */
export const buildInvestmentDocumentByContactIdQuery = (): string => {
  const relationBuilders: Partial<DocumentRelationBuilders> = {
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment,
    buildTaskFragment: buildInvestmentTaskFragmentForRelations, // Use IRM-specific version (taskAssignees)
    buildActivityFragment,
    buildNoteFragment
  }

  const relationFields: Partial<DocumentRelationFields> = {
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields,
    taskFields: InvestmentTaskFields,
    activityFields: InvestmentActivityFields,
    noteFields: InvestmentNoteFields
  }

  return buildDocumentByContactIdQuery(
    'InvestmentDocument',
    InvestmentDocumentFields,
    relationBuilders,
    relationFields,
    INVESTMENT_DOCUMENT_COMPANY_FIELDS
  )
}

/**
 * Build Investment Document query filtered by Opportunity ID
 */
export const buildInvestmentDocumentByOpportunityIdQuery = (): string => {
  const relationBuilders: Partial<DocumentRelationBuilders> = {
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment,
    buildTaskFragment: buildInvestmentTaskFragmentForRelations, // Use IRM-specific version (taskAssignees)
    buildActivityFragment,
    buildNoteFragment
  }

  const relationFields: Partial<DocumentRelationFields> = {
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields,
    taskFields: InvestmentTaskFields,
    activityFields: InvestmentActivityFields,
    noteFields: InvestmentNoteFields
  }

  return buildDocumentByOpportunityIdQuery(
    'InvestmentDocument',
    InvestmentDocumentFields,
    relationBuilders,
    relationFields,
    INVESTMENT_DOCUMENT_COMPANY_FIELDS
  )
}

export const buildInvestmentDocumentByCompanyIdQuery = (): string => {
  const relationBuilders: Partial<DocumentRelationBuilders> = {
    buildAccountFragment,
    buildContactFragment,
    buildLeadFragment,
    buildOpportunityFragment,
    buildTaskFragment: buildInvestmentTaskFragmentForRelations,
    buildActivityFragment,
    buildNoteFragment
  }

  const relationFields: Partial<DocumentRelationFields> = {
    accountFields: InvestmentAccountFields,
    contactFields: InvestmentContactFields,
    leadFields: InvestmentLeadFields,
    opportunityFields: InvestmentOpportunityFields,
    taskFields: InvestmentTaskFields,
    activityFields: InvestmentActivityFields,
    noteFields: InvestmentNoteFields
  }

  return buildDocumentQuery(
    'InvestmentDocument',
    InvestmentDocumentFields,
    relationBuilders,
    relationFields,
    INVESTMENT_DOCUMENT_COMPANY_FIELDS
  )
}

import { INVESTMENT_DOCUMENT } from './fragments/investmentFragments'

// Get investment documents with filtering
export const GET_INVESTMENT_DOCUMENTS = (): string => {
  return `
    query GetInvestmentDocuments(
      $limit: Int
      $offset: Int
      $where: InvestmentDocumentBoolExp
      $orderBy: [InvestmentDocumentOrderBy!]
    ) {
      InvestmentDocument(
        limit: $limit
        offset: $offset
        orderBy: $orderBy
        where: $where
      ) {
        ${INVESTMENT_DOCUMENT}
      }
      InvestmentDocumentAggregate(where: $where) {
        aggregate {
          count
        }
      }
    }
  `
}

// Get investment documents by investment ID
export const GET_INVESTMENT_DOCUMENTS_BY_INVESTMENT_ID = (): string => {
  return GET_INVESTMENT_DOCUMENTS()
}
