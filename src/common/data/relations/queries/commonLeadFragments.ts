import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'

export const COMMON_LEAD_FIELDS = `
  ${AUDIT_FIELDS}
  academicTitle {
    ${CATALOG_ENTRY}
  }
  academicTitleRef
  addressLine
  code
  companyEmail
  companyName
  companyPhone
  companyWebsite
  conversionDate
  country {
    ${CATALOG_ENTRY}
  }
  countryRef
  description
  email
  firstName
  id
  lastName
  leadRating {
    ${CATALOG_ENTRY}
  }
  leadRatingRef
  leadSource {
    ${CATALOG_ENTRY}
  }
  leadSourceRef
  leadStatus {
    ${CATALOG_ENTRY}
  }
  leadStatusRef
  ownerEmployee {
    ${EMPLOYEE_REF}
  }
  ownerEmployeeId
  phoneNumber
  position
  postalCode
  region {
    ${CATALOG_ENTRY}
  }
  regionRef
  sensitive
`
