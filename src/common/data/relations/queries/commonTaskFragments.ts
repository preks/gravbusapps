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
    description
    startDate
    dueDate
    endDate
    ${AUDIT_FIELDS}
    
    # Employee references
    creatorEmployee {
      ${EMPLOYEE_REF}
    }
    assignedEmployee {
      ${EMPLOYEE_REF}
    }
    
    # User IDs
    creatorUserId
    assignedUserId
`
