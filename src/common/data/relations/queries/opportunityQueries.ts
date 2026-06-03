/**
 * Common Opportunity Queries
 * GraphQL queries for Opportunity entities using fields mapping
 */

import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { COMMUNICATION_CHANNEL_REF } from '@/common/data/common/queries/communicationChannelFragments'
import { buildWhere, buildOrderBy, type Descriptor } from '@/common/network/graphql/queryHelpers'
import { OpportunityFields } from '../types/opportunityTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'
import { ADDRESS_REF } from '@/common/data/common/queries/addressFragments'
import { COMPANY_REF } from '@/common/data/orgchart/queries/fragments/companyFragments'

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
  contactIds?: string[]
  currencyIds?: string[]
  currencyCode?: string // Filter by currency code (e.g., 'EUR', 'USD')
  opportunityPipelineIds?: string[]
  opportunityPipelineStageIds?: string[]
  opportunityStatusIds?: string[]
  /**
   * Filter by status code (CRM) or status type (IRM) using IN.
   * Use ['WON'] or ['LOST'] to match exactly one bucket.
   * Each hook translates this to the correct field (code vs type).
   */
  opportunityStatusTypesIn?: string[]
  opportunityForecastIds?: string[]
  ownerEmployeeIds?: string[]
  closeDateFrom?: string
  closeDateTo?: string
  /** When true, excludes Won and Lost opportunities (shows only active/open pipeline). */
  activeOnly?: boolean
}

/**
 * Build Opportunity query with fields mapping
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param entityFields - OpportunityFields mapping (default: OpportunityFields)
 * @param additionalFields - Additional domain-specific fields (optional)
 * @param additionalQueries - Additional query fields (optional)
 * @returns GraphQL query string using variables
 */
export const buildOpportunityQuery = (
  entityName: string,
  entityFields: Record<keyof typeof OpportunityFields, string> = OpportunityFields,
  additionalFields?: string,
  additionalQueries?: string
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
        ${entityFields.closeDate}
        ${entityFields.code}
        ${entityFields.currency} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.currencyRef}
        ${entityFields.id}
        ${entityFields.estimatedAmount}
        ${entityFields.name}
        ${entityFields.notesSummary}
        ${entityFields.opportunityPipeline} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.opportunityPipelineRef}
        ${entityFields.opportunityPipelineStage} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.opportunityPipelineStageRef}
        ${entityFields.opportunityStatus} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.opportunityStatusRef}
        ${entityFields.opportunityForecast} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.opportunityForecastRef}
        ${entityFields.ownerEmployee} {
          ${EMPLOYEE_REF}
        }
        ${entityFields.ownerEmployeeId}
        ${entityFields.winningChance}
        ${entityFields.aiOpportunityScore}
        ${entityFields.aiOpportunityGrade}
        # Account relation (only for IRM - CRM uses opportunityAccounts junction table)
        ${
          entityFields.account
            ? `
        ${entityFields.accountId}
        ${entityFields.account} {
          id
          name
        }
        `
            : ''
        }
        # Company relation (only for CRM - IRM does not have companyId)
        ${
          entityFields.companyId
            ? `
        ${entityFields.companyId}
        ${entityFields.company} {
          ${COMPANY_REF}
        }
        `
            : ''
        }
        ${additionalFields || ''}
      }
      ${entityName}Aggregate(where: $where) {
        aggregate { count }
      }
      ${additionalQueries || ''}
    }
  `
}

/**
 * Build Opportunity by ID query
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param id - Opportunity ID
 * @param entityFields - OpportunityFields mapping (default: OpportunityFields)
 * @param relationBuilders - Object containing fragment builder functions for relations (optional)
 * @param relationFields - Object containing field mappings for relations (optional)
 * @param additionalFields - Additional domain-specific fields (optional)
 */
export const buildOpportunityByIdQuery = (
  entityName: string,
  entityFields: Record<keyof typeof OpportunityFields, string> = OpportunityFields,
  relationBuilders?: OpportunityRelationBuilders,
  relationFields?: OpportunityRelationFields,
  additionalFields?: string
): string => {
  // Base fields inline
  const baseFields = `
        ${AUDIT_FIELDS}
        ${entityFields.closeDate}
        ${entityFields.code}
        ${entityFields.currency} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.currencyRef}
        ${entityFields.id}
        ${entityFields.estimatedAmount}
        ${entityFields.name}
        ${entityFields.notesSummary}
        ${entityFields.opportunityPipeline} {
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
        ${entityFields.opportunityPipelineRef}
        ${entityFields.opportunityPipelineStage} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.opportunityPipelineStageRef}
        ${entityFields.opportunityStatus} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.opportunityStatusRef}
        ${entityFields.opportunityForecast} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.opportunityForecastRef}
        ${entityFields.ownerEmployee} {
          ${EMPLOYEE_REF}
        }
        ${entityFields.ownerEmployeeId}
        ${entityFields.winningChance}
        ${entityFields.aiOpportunityScore}
        ${entityFields.aiOpportunityGrade}
        # Company relation (only for CRM - IRM does not have companyId)
        ${
          entityFields.companyId
            ? `
        ${entityFields.companyId}
        ${entityFields.company} {
          ${COMPANY_REF}
        }
        `
            : ''
        }
  `

  // Helper function to build account relation string
  const buildAccountRelation = (
    accountField: string | undefined,
    relationBuilders: OpportunityRelationBuilders,
    accountFields: any
  ): string => {
    if (!accountField) return ''
    return `${accountField} {
      ${relationBuilders.buildAccountFragment(accountFields)}
      # ✅ Relations direkt hier hinzufügen (nicht im Fragment)
      ${accountFields.communicationChannels}(where: { isDeleted: { _eq: false } }) {
        ${COMMUNICATION_CHANNEL_REF}
      }
      ${accountFields.addresses}(where: { isDeleted: { _eq: false } }) {
        ${ADDRESS_REF}
      }
    }`
  }

  // Common entity relations
  const accountRelation =
    entityFields.account && relationBuilders && relationFields
      ? `
    ${entityFields.accountId}
    ${buildAccountRelation(entityFields.account, relationBuilders, relationFields.accountFields)}
    `
      : ''

  const companyRelation = entityFields.companyId
    ? `
    ${entityFields.companyId}
    ${entityFields.company} {
      ${COMPANY_REF}
    }
    `
    : ''

  const commonRelations =
    relationBuilders && relationFields
      ? `
    # Account relation (legacy - both IRM and CRM now use opportunityAccounts junction table)
    ${accountRelation}
    
    # Company relation (only for CRM - IRM does not have companyId)
    ${companyRelation}
    
    ${entityFields.documents}(where: { isDeleted: { _eq: false } }) {
      ${relationBuilders.buildDocumentFragment(relationFields.documentFields)}
    }
    
    ${entityFields.notes}(where: { isDeleted: { _eq: false } }) {
      ${relationBuilders.buildNoteFragment(relationFields.noteFields)}
    }
    
    ${entityFields.tasks}(where: { isDeleted: { _eq: false } }) {
      ${relationBuilders.buildTaskFragment(relationFields.taskFields)}
      
      # Documents relation within tasks
      documents(where: { isDeleted: { _eq: false } }) {
        ${relationBuilders.buildDocumentFragment(relationFields.documentFields)}
      }
    }
    
    ${entityFields.activities}(where: { isDeleted: { _eq: false } }) {
      ${relationBuilders.buildActivityFragment(relationFields.activityFields)}
    }
    
    # OpportunityContacts relation (field name varies: opportunityContacts vs investmentOpportunityContact vs contacts)
    ${entityFields.opportunityContacts}(where: { isDeleted: { _eq: false } }) {
      id
      ${AUDIT_FIELDS}
      contactType
      contact {
        ${relationBuilders.buildContactFragment(relationFields.contactFields)}
      }
      contactId
      opportunityId
    }
    
    # OpportunityStageConditions relation (field name varies: opportunityStageConditions vs investmentOpportunityStageCondition vs stageConditionStatuses)
    ${
      entityFields.opportunityStageConditions
        ? `${entityFields.opportunityStageConditions}(where: { isDeleted: { _eq: false } }) {
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
    query Get${entityName}ById($id: uuid!) {
      ${entityName}ByPk(id: $id) {
        ${baseFields}
        ${commonRelations}
        ${additionalFields || ''}
      }
    }
  `
}

/**
 * Build Opportunity search query
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param entityFields - OpportunityFields mapping (default: OpportunityFields)
 */
export const buildOpportunitySearchQuery = (
  entityName: string,
  entityFields: Record<keyof typeof OpportunityFields, string> = OpportunityFields
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
        ${entityFields.id}
        ${entityFields.name}
        ${entityFields.code}
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
