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
      comments
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

/**
 * Employment region lookup for an employee to obtain region id
 */
export const GET_EMPLOYEE_REGION_ID = /*sql*/ `
  query GetEmployeeRegionId($employeeId: uuid!) {
    Employee(where: { isDeleted: { _eq: false }, id: { _eq: $employeeId } }) {
      id
      workingCondition {
        region {
          id
        }
      }
    }
  }
`

/**
 * Resolve the country id for a given EmploymentRegion entry.
 * Convention: EmploymentRegion.additionalValue3 stores the Country catalog entry id.
 */
export const GET_REGION_COUNTRY_ID = /*sql*/ `
  query GetRegionCountryId($regionId: String!) {
    CatalogEntry(where: { id: { _eq: $regionId } }) {
      id
      additionalValue3
    }
  }
`

/**
 * BenefitType catalog entries filtered by parent country (Country catalog entry id)
 */
export const GET_BENEFIT_TYPES_FOR_COUNTRY_WITH_TRANSLATIONS = /*sql*/ `
  query GetBenefitTypesForCountry($catalogIdentifier: String!, $catalogVersion: String!, $countryId: String!) {
    CatalogEntry(
      where: {
        catalog: { identifier: { _eq: $catalogIdentifier }, version: { _eq: $catalogVersion } }
        isDeleted: { _eq: false }
        parentEntryId: { _eq: $countryId }
      }
      orderBy: { displayOrder: ASC }
      limit: 100
    ) {
      ${CATALOG_ENTRY_REF}
      childEntries(where: { isDeleted: { _eq: false } }) {
        ${CATALOG_ENTRY_REF}
      }
    }
  }
`
