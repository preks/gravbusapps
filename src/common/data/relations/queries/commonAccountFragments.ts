/**
 * Common Account Fragments
 *
 * Shared GraphQL fragments for accounts across Customer and Investment relations
 */

import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'

/**
 * COMMON_ACCOUNT_FIELDS - Core fields shared between Customer and Investment accounts
 *
 * NOTE: Field naming differences between domains:
 * - CRM: industry, numberOfEmployees, annualRevenue, city
 * - IRM: industryClass, companySize, accountAnnualRevenueBand, locality
 *
 * CommonAccount interface uses IRM naming as standard.
 * Domain-specific fragments must handle their own field names.
 */
export const COMMON_ACCOUNT_FIELDS = `
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
    
    # Pictures
    picture
    pictureThumbnail
    
    # NOTE: Addresses and CommunicationChannels have different structures between domains
    # These must be included in domain-specific fragments
    # - CRM: addresses -> CrmAddress (uses 'city')
    # - IRM: addresses -> InvestmentAddress (uses 'locality')
    
    # NOTE: Catalog field names differ between domains:
    # - CRM: industry, numberOfEmployees, annualRevenue
    # - IRM: industryClass, companySize, accountAnnualRevenueBand
    # These must be included in domain-specific fragments
    
    # NOTE: Employee reference is consistent
    ownerEmployeeId
    ownerEmployee {
      ${EMPLOYEE_REF}
    }
`
