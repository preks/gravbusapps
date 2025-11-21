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

/**
 * Query to fetch BenefitType catalog entries excluding HR_BACKOFFICE children
 * Used when user does not have hr-backoffice permission
 */
export const GET_BENEFIT_TYPES_WITH_TRANSLATIONS_EXCLUDE_HR_BACKOFFICE = /*sql*/ `
  query GetBenefitTypesExcludeHrBackoffice($catalogIdentifier: String!, $catalogVersion: String!) {
    CatalogEntry(
      where: {
        catalog: {
          identifier: {_eq: $catalogIdentifier}
          version: {_eq: $catalogVersion}
        }
        isDeleted: {_eq: false}
        parentEntryId: { _neq: "BenefitType:v1:HR_BACKOFFICE" }
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
