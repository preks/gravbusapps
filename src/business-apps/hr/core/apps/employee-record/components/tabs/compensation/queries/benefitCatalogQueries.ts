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
