import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'

/**
 * Customer Lead Fragment
 * NOTE: CRM uses different field names than IRM
 * - industry (CRM) vs industryClass (IRM)
 * - numberOfEmployees (CRM) vs companySize (IRM)
 * - annualRevenue (CRM) vs accountAnnualRevenueBand (IRM)
 * - city (CRM) vs locality (IRM)
 */
export const CUSTOMER_LEAD = `
    id
    code
    firstName
    lastName
    sensitive
    email
    phoneNumber
    position
    companyName
    companyEmail
    companyPhone
    companyWebsite
    description
    conversionDate
    ${AUDIT_FIELDS}
    
    # Address fields (for computed address object)
    addressLine
    city
    postalCode
    country {
      ${CATALOG_ENTRY}
    }
    region {
      ${CATALOG_ENTRY}
    }
    
    # Contact fields (for computed communication channels)
    email
    phoneNumber
    
    # Catalog relationships (CRM naming)
    academicTitle {
      ${CATALOG_ENTRY}
    }
    leadRating {
      ${CATALOG_ENTRY}
    }
    leadStatus {
      ${CATALOG_ENTRY}
    }
    leadSource {
      ${CATALOG_ENTRY}
    }
    industry {
      ${CATALOG_ENTRY}
    }
    numberOfEmployees {
      ${CATALOG_ENTRY}
    }
    annualRevenue {
      ${CATALOG_ENTRY}
    }
    country {
      ${CATALOG_ENTRY}
    }
    region {
      ${CATALOG_ENTRY}
    }
    timeZone {
      ${CATALOG_ENTRY}
    }
    legalForm {
      ${CATALOG_ENTRY}
    }
    
    # Employee relationship
    ownerEmployee {
      ${EMPLOYEE_REF}
    }
`

export const CUSTOMER_LEAD_REF = `
    id
    code
    firstName
    lastName
    email
`
