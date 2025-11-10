/**
 * Common Opportunity Queries
 * GraphQL queries for Opportunity entities using fields mapping
 */

import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { COMMUNICATION_CHANNEL_REF } from '@/common/data/common/queries/communicationChannelFragments'
import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import { OpportunityFields } from '../types/opportunityTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'
import { buildAddressFragment } from './_tempAddress'

// =====================================================
// OPPORTUNITY RELATION TYPES
// =====================================================

/**
 * Opportunity relation builders interface
 * Used by buildOpportunityByIdQuery to build common entity relations
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

/**
 * Opportunity relation fields interface
 * Used by buildOpportunityByIdQuery to pass field mappings for relations
 */
export interface OpportunityRelationFields {
  activityFields: any
  accountFields: any
  contactFields: any
  documentFields: any
  leadFields: any
  noteFields: any
  taskFields: any
  stageConditionFields?: any // Optional: field mappings for opportunityStageConditions nested fields
}

export interface CommonOpportunityQueryVariables extends BaseQueryVariables {
  accountIds?: string[]
  currencyIds?: string[]
  opportunityPipelineIds?: string[]
  opportunityPipelineStageIds?: string[]
  opportunityStatusIds?: string[]
  ownerEmployeeIds?: string[]
  closeDateFrom?: string
  closeDateTo?: string
}

/**
 * Build Opportunity query with fields mapping
 * @param fields - OpportunityFields mapping (default: OpportunityFields)
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param entityFields - Additional domain-specific fields (optional)
 * @param queryFields - Additional query fields (optional)
 * @returns GraphQL query string using variables
 */
export const buildOpportunityQuery = (
  fields: Record<keyof typeof OpportunityFields, string> = OpportunityFields,
  entityName: string,
  entityFields?: string,
  queryFields?: string
): string => {
  const boolExpType = `${entityName}BoolExp`
  const orderByType = `[${entityName}OrderBy!]`

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
        ${AUDIT_FIELDS}
        ${fields.closeDate}
        ${fields.code}
        ${fields.currency} {
          ${CATALOG_ENTRY}
        }
        ${fields.currencyRef}
        ${fields.id}
        ${fields.estimatedAmount}
        ${fields.name}
        ${fields.notesSummary}
        ${fields.opportunityPipeline} {
          ${CATALOG_ENTRY}
        }
        ${fields.opportunityPipelineRef}
        ${fields.opportunityPipelineStage} {
          ${CATALOG_ENTRY}
        }
        ${fields.opportunityPipelineStageRef}
        ${fields.opportunityStatus} {
          ${CATALOG_ENTRY}
        }
        ${fields.opportunityStatusRef}
        ${fields.ownerEmployee} {
          ${EMPLOYEE_REF}
        }
        ${fields.ownerEmployeeId}
        ${fields.winningChance}
        # Account relation
        ${fields.accountId}
        ${fields.account} {
          id
          name
        }
        ${entityFields || ''}
      }
      ${entityName}Aggregate(where: $where) {
        aggregate { count }
      }
      ${queryFields || ''}
    }
  `
}

/**
 * Build Opportunity by ID query
 * @param fields - OpportunityFields mapping (default: OpportunityFields)
 * @param id - Opportunity ID
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param relationBuilders - Object containing fragment builder functions for relations (optional)
 * @param relationFields - Object containing field mappings for relations (optional)
 * @param entityFields - Additional domain-specific fields (optional)
 */
export const buildOpportunityByIdQuery = (
  fields: Record<keyof typeof OpportunityFields, string> = OpportunityFields,
  id: string,
  entityName: string,
  relationBuilders?: OpportunityRelationBuilders,
  relationFields?: OpportunityRelationFields,
  entityFields?: string
): string => {
  // Base fields inline
  const baseFields = `
        ${AUDIT_FIELDS}
        ${fields.closeDate}
        ${fields.code}
        ${fields.currency} {
          ${CATALOG_ENTRY}
        }
        ${fields.currencyRef}
        ${fields.id}
        ${fields.estimatedAmount}
        ${fields.name}
        ${fields.notesSummary}
        ${fields.opportunityPipeline} {
          ${CATALOG_ENTRY}
          childEntries {
            id
            code
            value
            alternativeCode
            displayOrder
            additionalValue1
          }
        }
        ${fields.opportunityPipelineRef}
        ${fields.opportunityPipelineStage} {
          ${CATALOG_ENTRY}
        }
        ${fields.opportunityPipelineStageRef}
        ${fields.opportunityStatus} {
          ${CATALOG_ENTRY}
        }
        ${fields.opportunityStatusRef}
        ${fields.ownerEmployee} {
          ${EMPLOYEE_REF}
        }
        ${fields.ownerEmployeeId}
        ${fields.winningChance}
  `

  // Common entity relations
  const commonRelations =
    relationBuilders && relationFields
      ? `
    # Account relation
    ${fields.accountId}
    ${
      fields.account
        ? `${fields.account} {
      ${relationBuilders.buildAccountFragment(relationFields.accountFields)}
      # ✅ Relations direkt hier hinzufügen (nicht im Fragment)
      ${relationFields.accountFields.communicationChannels}(where: { isDeleted: { _eq: false } }) {
        ${COMMUNICATION_CHANNEL_REF}
      }
      ${relationFields.accountFields.addresses}(where: { isDeleted: { _eq: false } }) {
        ${buildAddressFragment(entityName)}
      }
    }`
        : ''
    }
    
    # Common entity relations (present in both IRM and CRM)
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
      
      # Documents relation within tasks
      documents(where: { isDeleted: { _eq: false } }) {
        ${relationBuilders.buildDocumentFragment(relationFields.documentFields)}
      }
    }
    
    ${fields.activities}(where: { isDeleted: { _eq: false } }) {
      ${relationBuilders.buildActivityFragment(relationFields.activityFields)}
    }
    
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
      ${
        relationFields.stageConditionFields
          ? `${relationFields.stageConditionFields.opportunityPipelineStageCondition} {
        ${CATALOG_ENTRY}
      }
      ${relationFields.stageConditionFields.opportunityPipelineStageConditionRef}
      ${relationFields.stageConditionFields.task} {
        ${relationBuilders.buildTaskFragment(relationFields.taskFields)}
        
        # Documents relation within tasks
        documents(where: { isDeleted: { _eq: false } }) {
          ${relationBuilders.buildDocumentFragment(relationFields.documentFields)}
        }
      }
      ${relationFields.stageConditionFields.taskId}`
          : `opportunityPipelineStageCondition {
        ${CATALOG_ENTRY}
      }
      opportunityPipelineStageConditionRef
      task {
        ${relationBuilders.buildTaskFragment(relationFields.taskFields)}
        
        # Documents relation within tasks
        documents(where: { isDeleted: { _eq: false } }) {
          ${relationBuilders.buildDocumentFragment(relationFields.documentFields)}
        }
      }
      taskId`
      }
    }`
        : ''
    }
  `
      : ''

  return `
    query Get${entityName}ById {
      ${entityName}ByPk(id: "${id}") {
        ${baseFields}
        ${commonRelations}
        ${entityFields || ''}
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
