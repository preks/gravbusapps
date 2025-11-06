import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'

export const COMMON_TASK_FIELDS = `
  ${AUDIT_FIELDS}
  assignedEmployee {
    ${EMPLOYEE_REF}
  }
  assignedEmployeeId
  assignedUserId
  code
  # TODO: comments missing
  creatorEmployee {
    ${EMPLOYEE_REF}
  }
  creatorEmployeeId
  creatorUserId # TODO: deprecated --> createdBy
  description
  dueDate
  endDate
  id
  name
  source
  startDate
  # TODO: taskPriority
  # TODO: taskPriorityRef
  # TODO: taskStatus
  # TODO: taskStatusRef
  # TODO: taskTiming
  # TODO: taskType
  # TODO: taskTypeRef
  templateStartDate
`

export const COMMON_TASK_TEMPLATE_FIELDS = `
    ${AUDIT_FIELDS}
    assigneeType
    code
    daysOfMonth
    daysOfWeek
    displayOrder
    durationDays
    enabled
    holidayPolicy
    id
    intervalDays
    monthsOfYear
    name
    nextStartDate
    priority {
      ${CATALOG_ENTRY}
    }
    priorityRef
    type {
      ${CATALOG_ENTRY}
    }
    typeRef
`

export const COMMON_TASK_COMMENT_FIELDS = `
    ${AUDIT_FIELDS}
    authorEmployee {
      ${EMPLOYEE_REF}
    }
    authorEmployeeId
    comment
    id
`
