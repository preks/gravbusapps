/**
 * Investment Task Fragments
 * Domain-specific GraphQL fragments for Investment tasks
 */

import { COMMON_TASK_FIELDS } from '@/common/data/relations/queries/commonTaskFragments'
import { CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'

/**
 * INVESTMENT_TASK_FIELDS - Investment-specific task fields
 * Extends COMMON_TASK_FIELDS with Investment Relations schema fields
 */
export const INVESTMENT_TASK_FIELDS = `
    ${COMMON_TASK_FIELDS}
    
    # Investment-specific fields
    # NOTE: In Investment Relations, the timing field is named "taskTiming"
    # This differs from Customer Relations where it's "timingType"
    taskTiming
    
    # Catalog references
    # NOTE: These field names are correct and should be standard across all domains
    # Customer Relations still uses old names (type, priority, status) - TODO: migrate
    taskTypeRef
    taskType {
      ${CATALOG_ENTRY}
    }
    taskPriorityRef
    taskPriority {
      ${CATALOG_ENTRY}
    }
    taskStatusRef
    taskStatus {
      ${CATALOG_ENTRY}
    }
    
    # Task Template reference
    # NOTE: These field names are correct and should be standard
    # Customer Relations uses old names (salesTaskTemplate) - TODO: migrate
    taskTemplateId
`
