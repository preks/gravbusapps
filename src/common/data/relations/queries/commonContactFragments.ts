import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'

export const COMMON_CONTACT_FIELDS = `
  ${AUDIT_FIELDS}
  academicTitle {
    ${CATALOG_ENTRY}
  }
  academicTitleRef
  birthDate
  code
  department
  id
  firstName
  language {
    ${CATALOG_ENTRY}
  }
  languageRef
  lastName
  notesSummary
  ownerEmployee {
    ${EMPLOYEE_REF}
  }
  ownerEmployeeId
  salutation {
    ${CATALOG_ENTRY}
  }
  salutationRef
`
