/**
 * Common Task Fragments
 *
 * Shared GraphQL fragments for tasks across Customer and Investment relations
 */

import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'

/**
 * COMMON_TASK_FIELDS - Core fields shared between Customer and Investment tasks
 */
export const COMMON_TASK_FIELDS = `
    id
    code
    name
    source
    description
    ${AUDIT_FIELDS}
    
    # Date fields
    templateStartDate
    startDate
    dueDate
    endDate
    # NOTE: taskTiming field name differs between domains:
    # - Investment Relations: taskTiming
    # - Customer Relations: timingType
    # TODO: Standardize to taskTiming in future schema migration
    
    # Employee references
    creatorEmployeeId
    creatorEmployee {
      ${EMPLOYEE_REF}
    }
    assignedEmployeeId
    assignedEmployee {
      ${EMPLOYEE_REF}
    }
    
    # User IDs
    creatorUserId
    assignedUserId
    
    # NOTE: Catalog field names differ between domains:
    # - Investment Relations: taskType/Ref, taskPriority/Ref, taskStatus/Ref
    # - Customer Relations: type/Ref, priority/Ref, status/Ref
    # TODO: Standardize to taskType/taskPriority/taskStatus in future schema migration
    # (Commented out from common fields - added in domain-specific fragments)
    
    # NOTE: Task Template reference field names differ between domains:
    # - Investment Relations: taskTemplateId, taskTemplate
    # - Customer Relations: salesTaskTemplateId, salesTaskTemplate
    # TODO: Standardize to taskTemplateId/taskTemplate in future schema migration
    # (Commented out from common fields - added in domain-specific fragments)
    
    # Entity reference IDs
    accountId
    contactId
    leadId
    opportunityId
`
