import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'

export const COMMON_ACTIVITY_FIELDS = `
  ${AUDIT_FIELDS}
  activityType {
    ${CATALOG_ENTRY}
  }
  activityTypeRef
  completedAt
  description
  id
  occurredAt
  ownerEmployee {
    ${EMPLOYEE_REF}
  }
  ownerEmployeeId
  source
  title
`
