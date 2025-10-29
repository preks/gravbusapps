/**
 * GraphQL queries for Benefits Catalog Management
 *
 * ✅ CONNECTED TO:
 * - BenefitType catalog (via CatalogEntry)
 * - BenefitProvider catalog (via CatalogEntry)
 * - EmployeeBenefit table (employee's benefits)
 */

/**
 * Query to fetch all benefit types from the BenefitType catalog
 * Returns all available benefit options that can be assigned to employees
 */
export const GET_BENEFIT_CATALOG = /*sql*/ `
  query GetBenefitCatalog {
    CatalogEntry(
      where: {
        _and: [
          { catalog: { identifier: { _eq: "BenefitType" } } },
          { catalog: { version: { _eq: "v1" } } },
          { isDeleted: { _neq: true } }
        ]
      }
      orderBy: [{ displayOrder: ASC }, { value: ASC }]
    ) {
      id
      value
      code
      description
      displayOrder
      additionalValue1
      additionalValue2
      additionalValue3
    }
  }
`

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
 * Query to fetch benefit providers from the BenefitProvider catalog
 * Used for dropdowns when requesting benefits
 */
export const GET_BENEFIT_PROVIDERS = /*sql*/ `
  query GetBenefitProviders {
    CatalogEntry(
      where: {
        _and: [
          { catalog: { identifier: { _eq: "BenefitProvider" } } },
          { catalog: { version: { _eq: "v1" } } },
          { isDeleted: { _neq: true } }
        ]
      }
      orderBy: [{ displayOrder: ASC }, { value: ASC }]
    ) {
      id
      value
      code
      description
    }
  }
`
