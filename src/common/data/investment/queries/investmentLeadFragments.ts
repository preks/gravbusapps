import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'

export const INVESTMENT_ADDRESS = `
    id
    addressType
    addressLine
    postalCode
    locality
    region {
        ${CATALOG_ENTRY}
    }
    country {
        ${CATALOG_ENTRY}
    }
`

export const INVESTMENT_COMMUNICATION_CHANNEL = `
    id
    source
    value
    valueExtension
    communicationChannel {
        ${CATALOG_ENTRY}
    }
`

/**
 * Investment Lead Fragment
 * Uses IRM standard naming (industryClass, companySize, accountAnnualRevenueBand, locality)
 */
export const INVESTMENT_LEAD = `
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
        annualNetColdRent
        ${AUDIT_FIELDS}
        
        # Address fields (for computed address object)
        addressLine
        postalCode
        locality
        country {
          ${CATALOG_ENTRY}
        }
        region {
          ${CATALOG_ENTRY}
        }
        
        # Contact fields (for computed communication channels)
        email
        phoneNumber
        
        # Investment descriptive fields
        academicTitle {
          ${CATALOG_ENTRY}
        }
        salutation {
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
        industryClass {
          ${CATALOG_ENTRY}
        }
        companySize {
          ${CATALOG_ENTRY}
        }
        accountAnnualRevenueBand {
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
        
        # Investment-specific fields
        stakePercentage
        marketValue
        initialInvestmentAmount
        buildingYear
        size
        sizeMeasurementUnit {
          ${CATALOG_ENTRY}
        }
        forecastedProfitAmount
        requiredCapitalAmount
        loanAmount
        loanInterestRate
        
        # Investment relationships
        investmentGroup {
          ${CATALOG_ENTRY}
        }
        investmentType {
          ${CATALOG_ENTRY}
        }
        investmentRole {
          ${CATALOG_ENTRY}
        }
        investmentStakeType {
          ${CATALOG_ENTRY}
        }
        
        # Employee relationship
        ownerEmployee {
          ${EMPLOYEE_REF}
        }
`

export const INVESTMENT_LEAD_REF = `
    id
    code
    firstName
    lastName
    companyName
    email
    phoneNumber
`
