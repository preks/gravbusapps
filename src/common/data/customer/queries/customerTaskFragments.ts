/**
 * Customer Task Fragments
 * Domain-specific GraphQL fragments for Customer/CRM tasks
 */

import { COMMON_TASK_FIELDS } from '@/common/data/relations/queries/commonTaskFragments'
import { CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'

/**
 * CUSTOMER_TASK_FIELDS - Customer-specific task fields
 * Extends COMMON_TASK_FIELDS with Customer Relations schema fields
 */
export const CUSTOMER_TASK_FIELDS = `
    ${COMMON_TASK_FIELDS}
    
    # Customer-specific fields
    # NOTE: In Customer Relations (SalesTask), the timing field is named "timingType"
    # This differs from Investment Relations where it's "taskTiming"
    # TODO: Rename to taskTiming in future schema migration for consistency
    timingType
    comment
    
    # Catalog references (old naming schema)
    # NOTE: Customer Relations still uses old field names
    # TODO: Migrate to taskType/Ref, taskPriority/Ref, taskStatus/Ref
    typeRef
    type {
      ${CATALOG_ENTRY}
    }
    priorityRef
    priority {
      ${CATALOG_ENTRY}
    }
    statusRef
    status {
      ${CATALOG_ENTRY}
    }
    
    # Task Template reference (old naming schema)
    # NOTE: Customer Relations uses old field name
    # TODO: Migrate to taskTemplateId/taskTemplate
    salesTaskTemplateId
`
