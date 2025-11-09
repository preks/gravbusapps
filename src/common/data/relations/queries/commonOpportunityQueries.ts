/**
 * Common Opportunity Queries
 * GraphQL queries for Opportunity entities using fields mapping
 */

import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { COMMUNICATION_CHANNEL_REF } from '@/common/data/common/queries/communicationChannelFragments'
import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import { OpportunityFields } from '../types/commonOpportunityTypes'
import { buildOpportunityFragment } from './commonOpportunityFragments.new'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

/**
 * Build Opportunity fragment with common entity relations
 */
export interface OpportunityRelationBuilders {
  buildActivityFragment: (fields: any) => string
  buildAccountFragment: (fields: any) => string
  buildContactFragment: (fields: any) => string
  buildDocumentFragment: (fields: any) => string
  buildLeadFragment: (fields: any) => string
  buildNoteFragment: (fields: any) => string
  buildTaskFragment: (fields: any) => string
}

export interface OpportunityRelationFields {
  activityFields: any
  accountFields: any
  contactFields: any
  documentFields: any
  leadFields: any
  noteFields: any
  taskFields: any
}

export const buildOpportunityFragmentWithRelations = (
  fields: Record<keyof typeof OpportunityFields, string> = OpportunityFields,
  relationBuilders: OpportunityRelationBuilders,
  relationFields: OpportunityRelationFields
): string => {
  const baseFragment = buildOpportunityFragment(fields)
  return `
  ${baseFragment}
  
  # Account relation
  ${fields.accountId}
  ${
    fields.account
      ? `${fields.account} {
    ${relationBuilders.buildAccountFragment(relationFields.accountFields)}
  }`
      : ''
  }
  
  # Common entity relations (present in both IRM and CRM)
  # NOTE: addresses are handled separately in domain-specific queries (customerOpportunityQueries.new.ts, investmentOpportunityQueries.new.ts)
  
  ${fields.communicationChannels}(where: { isDeleted: { _eq: false } }) {
    ${COMMUNICATION_CHANNEL_REF}
  }
  
  ${fields.documents}(where: { isDeleted: { _eq: false } }) {
    ${relationBuilders.buildDocumentFragment(relationFields.documentFields)}
  }
  
  ${fields.notes}(where: { isDeleted: { _eq: false } }) {
    ${relationBuilders.buildNoteFragment(relationFields.noteFields)}
  }
  
  ${fields.tasks}(where: { isDeleted: { _eq: false } }) {
    ${relationBuilders.buildTaskFragment(relationFields.taskFields)}
  }
  
  ${fields.activities}(where: { isDeleted: { _eq: false } }) {
    ${relationBuilders.buildActivityFragment(relationFields.activityFields)}
  }
  
  # NOTE: leads relation is handled separately in domain-specific queries
  # - Customer Opportunity: singular "lead" (object, no where)
  # - Investment Opportunity: plural "investmentLead" (array, with where)
  
  # OpportunityContacts relation (field name varies: opportunityContacts vs investmentOpportunityContact vs contacts)
  ${fields.opportunityContacts}(where: { isDeleted: { _eq: false } }) {
    id
    ${AUDIT_FIELDS}
    contactType
    contact {
      ${relationBuilders.buildContactFragment(relationFields.contactFields)}
    }
  }
  
  # OpportunityStageConditions relation (field name varies: opportunityStageConditions vs investmentOpportunityStageCondition vs stageConditionStatuses)
  ${
    fields.opportunityStageConditions
      ? `${fields.opportunityStageConditions}(where: { isDeleted: { _eq: false } }) {
    id
    ${AUDIT_FIELDS}
    completed
    completedAt
    completedByEmployee {
      ${EMPLOYEE_REF}
    }
    completedByEmployeeId
    configSnapshot
    deadlineAt
    opportunityId
    opportunityPipelineStageCondition {
      ${CATALOG_ENTRY}
    }
    opportunityPipelineStageConditionRef
    task {
      ${relationBuilders.buildTaskFragment(relationFields.taskFields)}
    }
    taskId
  }`
      : ''
  }
`
}

export interface CommonOpportunityQueryVariables {
  ids?: string[]
  limit?: number
  offset?: number
  search?: string
  orderBy?: Array<{
    field: string
    direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
  }>
  accountIds?: string[]
  currencyIds?: string[]
  opportunityPipelineIds?: string[]
  opportunityPipelineStageIds?: string[]
  opportunityStatusIds?: string[]
  ownerEmployeeIds?: string[]
  createdAtFrom?: string
  createdAtTo?: string
  closeDateFrom?: string
  closeDateTo?: string
}

/**
 * Build Opportunity query with fields mapping
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param aggregateName - GraphQL aggregate name (optional, defaults to '{entityName}Aggregate')
 */
export const buildOpportunityQuery = (
  fields: Record<keyof typeof OpportunityFields, string> = OpportunityFields,
  fragment: string = buildOpportunityFragment(fields),
  entityName: string,
  aggregateName?: string
): string => {
  const boolExpType = `${entityName}BoolExp`
  const orderByType = `[${entityName}OrderBy!]`
  const finalAggregateName = aggregateName || `${entityName}Aggregate`

  return `
    query Get${entityName}s(
      $limit: Int
      $offset: Int
      $where: ${boolExpType}
      $orderBy: ${orderByType}
    ) {
      ${entityName}(
        limit: $limit
        offset: $offset
        orderBy: $orderBy
        where: $where
      ) {
        ${fragment}
      }
      ${finalAggregateName}(where: $where) {
        aggregate { count }
      }
    }
  `
}

/**
 * Build Opportunity by ID query
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param byPkName - GraphQL ByPk name (optional, defaults to '{entityName}ByPk')
 */
export const buildOpportunityByIdQuery = (
  fields: Record<keyof typeof OpportunityFields, string> = OpportunityFields,
  fragment: string = buildOpportunityFragment(fields),
  id: string,
  entityName: string,
  byPkName?: string
): string => {
  const finalByPkName = byPkName || `${entityName}ByPk`

  return `
    query Get${entityName}ById {
      ${finalByPkName}(id: "${id}") {
        ${fragment}
      }
    }
  `
}

/**
 * Build Opportunity search query
 * @param entityName - GraphQL entity name (REQUIRED)
 */
export const buildOpportunitySearchQuery = (
  fields: Record<keyof typeof OpportunityFields, string> = OpportunityFields,
  entityName: string
): string => {
  const boolExpType = `${entityName}BoolExp`

  return `
    query Search${entityName}s(
      $limit: Int
      $where: ${boolExpType}
    ) {
      ${entityName}(
        limit: $limit
        where: $where
      ) {
        ${fields.id}
        ${fields.name}
        ${fields.code}
      }
    }
  `
}

/**
 * Build WHERE condition for Opportunity queries
 * @param variables - Query variables
 * @param descriptors - Descriptors to use (MUST be provided by consumer)
 * @param customConditions - Additional custom WHERE conditions
 * @returns WHERE condition object for GraphQL variables
 */
export const buildOpportunityWhereCondition = (
  variables: CommonOpportunityQueryVariables = {},
  descriptors: Descriptor[] = [],
  customConditions: Record<string, any>[] = []
): Record<string, any> => {
  if (descriptors.length === 0) {
    throw new Error('Query Descriptor is missing')
  }
  return buildWhere({
    variables,
    descriptors,
    ids: variables.ids,
    customConditions,
    isDeleted: true
  })
}

/**
 * Build ORDER BY for Opportunity queries
 * @param orderBy - Order by array from variables
 * @param descriptors - Descriptors to use (MUST be provided by consumer)
 * @returns ORDER BY array for GraphQL variables
 */
export const buildOpportunityOrderBy = (
  orderBy: CommonOpportunityQueryVariables['orderBy'] = [],
  descriptors: Descriptor[] = []
): any[] => {
  if (descriptors.length === 0) {
    throw new Error('Query Descriptor is missing')
  }
  return buildOrderBy(orderBy, descriptors)
}
