/**
 * Investment Task Queries (New)
 * GraphQL queries for Investment Task entities using fields mapping
 * Extends Common Task Queries with InvestmentTaskFields (with override + custom reference descriptor)
 */

import {
  buildTaskQuery,
  buildTaskByIdQuery,
  buildTaskSearchQuery,
  buildTaskWhereCondition,
  buildTaskOrderBy,
  buildTaskByLeadIdQuery,
  buildTaskByAccountIdQuery,
  buildTaskByContactIdQuery,
  type CommonTaskQueryVariables,
  type TaskRelationBuilders,
  type TaskRelationFields
} from '@/common/data/relations/queries/taskQueries'
import { InvestmentTaskFields, INVESTMENT_TASK_DESCRIPTORS } from '../types/investmentTaskTypes'
// TaskFields type is used implicitly through Record<keyof typeof TaskFields, string>
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'

// Import Common REF Fragment Builders (no relations - to avoid circular dependencies)
import {
  buildAccountFragment,
  buildContactFragment,
  buildDocumentFragment,
  buildLeadFragment,
  buildOpportunityFragment
} from '@/common/data/relations/queries/relationFragments'
import { INVESTMENT_REF } from './fragments/investmentReferenceFragments'

// Import Investment Fields
import { InvestmentDocumentFields } from '../types/investmentDocumentTypes'
import { InvestmentAccountFields } from '../types/investmentAccountTypes'
import { InvestmentContactFields } from '../types/investmentContactTypes'
import { InvestmentLeadFields } from '../types/investmentLeadTypes'
import { InvestmentOpportunityFields } from '../types/investmentOpportunityTypes'

/**
 * Investment Task Query Variables Interface
 * Extends CommonTaskQueryVariables with investment-specific filters
 */
export interface InvestmentTaskQueryVariables extends CommonTaskQueryVariables {
  // Investment-specific filters
  investmentIds?: string[]
  referenceTypes?: string[]
}

/**
 * Build Task Assignee Fragment
 * Fragment for querying task assignees (multiple assignees support)
 * NOTE: Must be defined before constants that use it
 */
export const buildTaskAssigneeFragment = (): string => `
  id
  taskId
  assignedEmployee {
    ${EMPLOYEE_REF}
  }
  assignedEmployeeId
  assignedUserId
  taskStatus
  completedAt
  ${AUDIT_FIELDS}
`

/**
 * Shared constants for all Investment Task queries
 * These are reused across all query builders to avoid duplication
 */
const INVESTMENT_TASK_RELATION_BUILDERS: Partial<TaskRelationBuilders> = {
  buildDocumentFragment,
  buildAccountFragment,
  buildContactFragment,
  buildLeadFragment,
  buildOpportunityFragment
}

const INVESTMENT_TASK_RELATION_FIELDS: Partial<TaskRelationFields> = {
  documentFields: InvestmentDocumentFields,
  accountFields: InvestmentAccountFields,
  contactFields: InvestmentContactFields,
  leadFields: InvestmentLeadFields,
  opportunityFields: InvestmentOpportunityFields
}

const INVESTMENT_TASK_ENTITY_FIELDS = `
    # Investment relation (only in IRM, not in CRM)
    investment{
      ${INVESTMENT_REF}
    }
    investmentId
  
  # Task Assignees (multiple assignees support - NEW)
  taskAssignees(where: { isDeleted: { _eq: false } }) {
    ${buildTaskAssigneeFragment()}
  }
`

/**
 * Build IRM-Specific Task Fragment for Relations
 * IMPORTANT: This overrides the common buildTaskFragment for IRM entities
 * IRM uses taskAssignees (multiple assignees), not assignedEmployee
 * Used when tasks are included as relations in other entities (opportunity, account, etc.)
 */
export const buildInvestmentTaskFragmentForRelations = (): string => {
  return `
  ${AUDIT_FIELDS}
  # Task Assignees (multiple assignees - NEW for IRM)
  taskAssignees(where: { isDeleted: { _eq: false } }) {
    ${buildTaskAssigneeFragment()}
  }
  businessKey
  code
  creatorEmployee {
    ${EMPLOYEE_REF}
  }
  creatorEmployeeId
  creatorUserId
  description
  dueDate
  endDate
  id
  name
  source
  startDate
  taskPriority {
    ${CATALOG_ENTRY}
  }
  taskPriorityRef
  taskStatus {
    ${CATALOG_ENTRY}
  }
  taskStatusRef
  taskTiming
  taskType {
    ${CATALOG_ENTRY}
  }
  taskTypeRef
  templateStartDate
`
}

/**
 * Build Investment Task query with fields mapping
 * Custom implementation for InvestmentTask (does not use buildTaskQuery)
 * NOTE: assignedEmployee fields removed - replaced by taskAssignees (multiple assignees)
 */
export const buildInvestmentTaskQuery = (): string => {
  // Build optional relations (documents, account, contact, lead, opportunity)
  const references = `
    # Common entity relations
    ${
      INVESTMENT_TASK_RELATION_BUILDERS.buildDocumentFragment && INVESTMENT_TASK_RELATION_FIELDS.documentFields
        ? `documents(where: { isDeleted: { _eq: false } }) {
      ${INVESTMENT_TASK_RELATION_BUILDERS.buildDocumentFragment(INVESTMENT_TASK_RELATION_FIELDS.documentFields)}
    }`
        : ''
    }
    
    ${
      INVESTMENT_TASK_RELATION_BUILDERS.buildAccountFragment && INVESTMENT_TASK_RELATION_FIELDS.accountFields
        ? `accountId
      account {
        ${INVESTMENT_TASK_RELATION_BUILDERS.buildAccountFragment(INVESTMENT_TASK_RELATION_FIELDS.accountFields)}
      }`
        : ''
    }
    ${
      INVESTMENT_TASK_RELATION_BUILDERS.buildContactFragment && INVESTMENT_TASK_RELATION_FIELDS.contactFields
        ? `contactId
      contact {
        ${INVESTMENT_TASK_RELATION_BUILDERS.buildContactFragment(INVESTMENT_TASK_RELATION_FIELDS.contactFields)}
      }`
        : ''
    }
    ${
      INVESTMENT_TASK_RELATION_BUILDERS.buildLeadFragment && INVESTMENT_TASK_RELATION_FIELDS.leadFields
        ? `leadId
      lead {
        ${INVESTMENT_TASK_RELATION_BUILDERS.buildLeadFragment(INVESTMENT_TASK_RELATION_FIELDS.leadFields)}
      }`
        : ''
    }
    ${
      INVESTMENT_TASK_RELATION_BUILDERS.buildOpportunityFragment && INVESTMENT_TASK_RELATION_FIELDS.opportunityFields
        ? `opportunityId
      opportunity {
        ${INVESTMENT_TASK_RELATION_BUILDERS.buildOpportunityFragment(INVESTMENT_TASK_RELATION_FIELDS.opportunityFields)}
      }`
        : ''
    }
  `

  return `
    query GetInvestmentTasks(
      $limit: Int
      $offset: Int
      $where: InvestmentTaskBoolExp
      $orderBy: [InvestmentTaskOrderBy!]
    ) {
      InvestmentTask(
        limit: $limit
        offset: $offset
        orderBy: $orderBy
        where: $where
      ) {
        ${AUDIT_FIELDS}
        businessKey
        code
        creatorEmployee {
          ${EMPLOYEE_REF}
        }
        creatorEmployeeId
        creatorUserId
        description
        dueDate
        endDate
        id
        name
        source
        startDate
        taskPriority {
          ${CATALOG_ENTRY}
        }
        taskPriorityRef
        taskStatus {
          ${CATALOG_ENTRY}
        }
        taskStatusRef
        taskTiming
        taskType {
          ${CATALOG_ENTRY}
        }
        taskTypeRef
        templateStartDate
        
        ${INVESTMENT_TASK_ENTITY_FIELDS}
        
        ${references}
      }
      InvestmentTaskAggregate(where: $where) {
        aggregate { count }
      }
    }
  `
}

/**
 * Build Investment Task by ID query
 */
export const buildInvestmentTaskByIdQuery = (
  fields: typeof InvestmentTaskFields = InvestmentTaskFields,
  id: string
): string => {
  return buildTaskByIdQuery(
    'InvestmentTask',
    id,
    fields,
    INVESTMENT_TASK_RELATION_BUILDERS as TaskRelationBuilders,
    INVESTMENT_TASK_RELATION_FIELDS as TaskRelationFields,
    INVESTMENT_TASK_ENTITY_FIELDS
  )
}

/**
 * Build Investment Task search query
 */
export const buildInvestmentTaskSearchQuery = (fields: typeof InvestmentTaskFields = InvestmentTaskFields): string => {
  return buildTaskSearchQuery('InvestmentTask', fields)
}

/**
 * Build WHERE condition for Investment Task queries
 * Uses INVESTMENT_TASK_DESCRIPTORS which includes common descriptors + custom reference descriptor
 * NOTE: Handles assignedEmployeeIds through taskAssignees relationship (multiple assignees support)
 */
export const buildInvestmentTaskWhereCondition = (
  variables: InvestmentTaskQueryVariables = {},
  additionalDescriptors: Descriptor[] = [],
  customConditions: Record<string, any>[] = []
): Record<string, any> => {
  // Handle assignedEmployeeIds through taskAssignees relationship (NEW: multiple assignees)
  if (variables.assignedEmployeeIds && variables.assignedEmployeeIds.length > 0) {
    customConditions.push({
      taskAssignees: {
        assignedEmployeeId: { _in: variables.assignedEmployeeIds },
        isDeleted: { _eq: false }
      }
    })
    // Remove assignedEmployeeIds from variables to prevent it from being processed by base builder
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { assignedEmployeeIds, ...restVariables } = variables
    variables = restVariables as InvestmentTaskQueryVariables
  }

  // INVESTMENT_TASK_DESCRIPTORS already includes common descriptors + custom reference descriptor
  const descriptors = [...INVESTMENT_TASK_DESCRIPTORS, ...additionalDescriptors]
  return buildTaskWhereCondition(variables, descriptors, customConditions)
}

/**
 * Build ORDER BY for Investment Task queries
 * Uses INVESTMENT_TASK_DESCRIPTORS which includes common descriptors + custom reference descriptor
 */
export const buildInvestmentTaskOrderBy = (
  orderBy: InvestmentTaskQueryVariables['orderBy'] = [],
  additionalDescriptors: Descriptor[] = []
): any[] => {
  const descriptors = [...INVESTMENT_TASK_DESCRIPTORS, ...additionalDescriptors]
  return buildTaskOrderBy(orderBy, descriptors)
}

// =====================================================
// INVESTMENT TASK BY ENTITY ID QUERY BUILDERS
// =====================================================

/**
 * Build Investment Task query filtered by Lead ID
 * Uses common buildTaskByLeadIdQuery with Investment-specific fields and relations
 */
export const buildInvestmentTaskByLeadIdQuery = (): string => {
  return buildTaskByLeadIdQuery(
    'InvestmentTask',
    InvestmentTaskFields,
    INVESTMENT_TASK_RELATION_BUILDERS,
    INVESTMENT_TASK_RELATION_FIELDS,
    INVESTMENT_TASK_ENTITY_FIELDS
  )
}

/**
 * Build Investment Task query filtered by Account ID
 * Uses common buildTaskByAccountIdQuery with Investment-specific fields and relations
 */
export const buildInvestmentTaskByAccountIdQuery = (): string => {
  return buildTaskByAccountIdQuery(
    'InvestmentTask',
    InvestmentTaskFields,
    INVESTMENT_TASK_RELATION_BUILDERS,
    INVESTMENT_TASK_RELATION_FIELDS,
    INVESTMENT_TASK_ENTITY_FIELDS
  )
}

/**
 * Build Investment Task query filtered by Contact ID
 * Uses common buildTaskByContactIdQuery with Investment-specific fields and relations
 */
export const buildInvestmentTaskByContactIdQuery = (): string => {
  return buildTaskByContactIdQuery(
    'InvestmentTask',
    InvestmentTaskFields,
    INVESTMENT_TASK_RELATION_BUILDERS,
    INVESTMENT_TASK_RELATION_FIELDS,
    INVESTMENT_TASK_ENTITY_FIELDS
  )
}

/**
 * Build Investment Task query filtered by Opportunity ID
 * Note: This is identical to buildInvestmentTaskQuery - use WHERE clause to filter by opportunityId
 */
export const buildInvestmentTaskByOpportunityIdQuery = (): string => {
  // Reuse the main query builder - filtering is done via WHERE clause
  return buildInvestmentTaskQuery()
}

/**
 * Build Investment Task query filtered by Investment ID
 * IRM-specific query builder
 */
export const buildInvestmentTaskByInvestmentIdQuery = (): string => {
  // Use buildTaskQuery directly since there's no common builder for investment
  return buildTaskQuery(
    'InvestmentTask',
    InvestmentTaskFields,
    INVESTMENT_TASK_RELATION_BUILDERS,
    INVESTMENT_TASK_RELATION_FIELDS,
    INVESTMENT_TASK_ENTITY_FIELDS
  )
}
