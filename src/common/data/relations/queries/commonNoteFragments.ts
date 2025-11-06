import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'

export const COMMON_NOTE_FIELDS = `
  ${AUDIT_FIELDS}
  authorEmployee {
    ${EMPLOYEE_REF}
  }
  authorEmployeeId
  id
  reminderDate
  source
  # text missing in CRM
  # title missing in CRM
`
