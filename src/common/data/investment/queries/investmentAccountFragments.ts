/**
 * Investment Account Fragments
 * IRM-specific account fragments with IRM field naming conventions (matches CommonAccount standard)
 */

import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'

/**
 * Investment Communication Channel Fragment
 */
export const INVESTMENT_COMMUNICATION_CHANNEL = `
    id
    value
    valueExtension
    communicationChannel {
      ${CATALOG_ENTRY}
    }
`

/**
 * Investment Address Fragment
 */
export const INVESTMENT_ADDRESS = `
    id
    addressLine
    locality
    postalCode
    region {
      ${CATALOG_ENTRY}
    }
    country {
      ${CATALOG_ENTRY}
    }
`

/**
 * Investment Account Fragment
 * Uses IRM standard naming (industryClass, companySize, accountAnnualRevenueBand, locality)
 * This naming matches CommonAccount interface standards
 */
export const INVESTMENT_ACCOUNT = `
    id
    code
    name
    email
    phone
    foundationDate
    geographicPresence
    specialty
    mission
    liquidationDate
    website
    picture
    pictureThumbnail
    notesSummary
    businessKey
    additionalProperties
    processInstanceId
    synchronizedAt
    ${AUDIT_FIELDS}
    
    # Address information (IRM uses 'locality' field)
    addresses {
      ${INVESTMENT_ADDRESS}
    }
    
    # Communication channels
    communicationChannels {
      ${INVESTMENT_COMMUNICATION_CHANNEL}
    }
    
    # Catalog relationships (IRM field names - matches CommonAccount standard)
    legalForm {
      ${CATALOG_ENTRY}
    }
    accountAnnualRevenueBand {
      ${CATALOG_ENTRY}
    }
    companySize {
      ${CATALOG_ENTRY}
    }
    industryClass {
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
 * Investment Account Reference Fragment (lightweight version)
 * For use in nested queries where full account details aren't needed
 */
export const INVESTMENT_ACCOUNT_REF = `
    id
    code
    name
    picture
    pictureThumbnail
`
