/**
 * Customer Account Fragments
 * CRM-specific account fragments with CRM field naming conventions
 */

import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'

/**
 * Customer Account Fragment
 * NOTE: CRM uses different field names than IRM
 * - industry (CRM) vs industryClass (IRM)
 * - numberOfEmployees (CRM) vs companySize (IRM)
 * - annualRevenue (CRM) vs accountAnnualRevenueBand (IRM)
 * - city (CRM) vs locality (IRM)
 * - pictureUrl/pictureThumbnailUrl (CRM GraphQL) vs picture/pictureThumbnail (IRM GraphQL)
 */
export const CUSTOMER_ACCOUNT = `
    id
    code
    name
    website
    foundationDate
    liquidationDate
    mission
    specialty
    geographicPresence
    notesSummary
    ${AUDIT_FIELDS}
    
    # Pictures (CRM uses pictureUrl/pictureThumbnailUrl in GraphQL)
    pictureUrl
    pictureThumbnailUrl
    
    # Communication Channels
    communicationChannels(where: { isDeleted: { _eq: false } }) {
      id
      communicationChannel {
        ${CATALOG_ENTRY}
      }
      value
      valueExtension
    }
    
    # Addresses (CRM uses 'city' field)
    addresses(where: { isDeleted: { _eq: false } }) {
      id
      addressType
      addressLine
      city
      postalCode
      region {
        ${CATALOG_ENTRY}
      }
      country {
        ${CATALOG_ENTRY}
      }
    }
    
    # Catalog relationships (CRM field names)
    annualRevenue {
      ${CATALOG_ENTRY}
    }
    industry {
      ${CATALOG_ENTRY}
    }
    legalForm {
      ${CATALOG_ENTRY}
    }
    numberOfEmployees {
      ${CATALOG_ENTRY}
    }
    timeZone {
      ${CATALOG_ENTRY}
    }
    
    # Employee relationship
    ownerEmployeeId
    ownerEmployee {
      ${EMPLOYEE_REF}
    }
`

/**
 * Customer Account Reference Fragment (lightweight version)
 * For use in nested queries where full account details aren't needed
 * NOTE: CRM uses pictureUrl/pictureThumbnailUrl (not picture/pictureThumbnail)
 */
export const CUSTOMER_ACCOUNT_REF = `
    id
    code
    name
    pictureUrl
    pictureThumbnailUrl
`
