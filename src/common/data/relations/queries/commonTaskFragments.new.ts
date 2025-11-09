/**
 * Common Task Fragments (New)
 *
 * Builds Task fragments using TaskFields mapping
 */

import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { TaskFields } from '../types/commonTaskTypes'

/**
 * Build Task fragment using fields mapping (REF fields only, no relations)
 */
export const buildTaskFragment = (fields: Record<keyof typeof TaskFields, string> = TaskFields): string => {
  return `
  ${AUDIT_FIELDS}
  ${fields.assignedEmployee} {
    ${EMPLOYEE_REF}
  }
  ${fields.assignedEmployeeId}
  ${fields.assignedUserId}
  ${fields.code}
  # TODO: comments missing
  ${fields.creatorEmployee} {
    ${EMPLOYEE_REF}
  }
  ${fields.creatorEmployeeId}
  ${fields.creatorUserId} # TODO: deprecated --> createdBy
  ${fields.description}
  ${fields.dueDate}
  ${fields.endDate}
  ${fields.id}
  ${fields.name}
  ${fields.source}
  ${fields.startDate}
  ${fields.taskPriority} {
    ${CATALOG_ENTRY}
  }
  ${fields.taskPriorityRef}
  ${fields.taskStatus} {
    ${CATALOG_ENTRY}
  }
  ${fields.taskStatusRef}
  ${fields.taskTiming}
  ${fields.taskType} {
    ${CATALOG_ENTRY}
  }
  ${fields.taskTypeRef}
  ${fields.templateStartDate}
`
}

/**
 * Default Common Task Fields fragment (no relations)
 */
export const COMMON_TASK_FIELDS_NEW = buildTaskFragment(TaskFields)
