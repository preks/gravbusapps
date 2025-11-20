import { CATALOG_ENTRY_REF } from '@/common/data/catalog/queries/catalogFragments'

/**
 * Query to fetch employee's benefits (both active and inactive)
 * Used to match against catalog to show which benefits employee has
 */
export const GET_EMPLOYEE_BENEFITS_FOR_CATALOG = /*sql*/ `
  query GetEmployeeBenefitsForCatalog($employeeId: uuid!) {
    EmployeeBenefit(
      where: {
        employeeId: { _eq: $employeeId }
      }
      orderBy: { startDate: DESC }
    ) {
      id
      employeeId
      benefitType {
        id
        value
        code
      }
      benefitTypeRef
      benefitProvider {
        id
        value
        code
      }
      benefitProviderRef
      yearlyAmount
      monthlyAmount
      employeeYearlyContribution
      employeeMonthlyContribution
      currency {
        id
        code
        value
      }
      currencyRef
      startDate
      endDate
      status
      benefitStatus
      notes
      createdAt
      updatedAt
    }
  }
`

/**
 * Query to fetch BenefitType catalog entries with translations and child providers
 * Used by useBenefitsCatalog hook to get all available benefit types with translations
 */
export const GET_BENEFIT_TYPES_WITH_TRANSLATIONS = /*sql*/ `
  query GetBenefitTypes($catalogIdentifier: String!, $catalogVersion: String!) {
    CatalogEntry(
      where: {
        catalog: {
          identifier: {_eq: $catalogIdentifier}
          version: {_eq: $catalogVersion}
        }
        isDeleted: {_eq: false}
      }
      orderBy: {displayOrder: ASC}
      limit: 100
    ) {
      ${CATALOG_ENTRY_REF}
      childEntries(where: {isDeleted: {_eq: false}}) {
        ${CATALOG_ENTRY_REF}
      }
    }
  }
`
