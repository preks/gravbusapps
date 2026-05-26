// GraphQL query for monthly salary forecast, headcount, and new hires for the current year
// Groups by month using hireDate, exitDate, and monthlyGrossSalary

export const getMonthlySalaryForecastQuery = `
  query GetMonthlySalaryForecast {
    monthly: EmployeeWorkingCondition(
      where: {
        employee: {
          isDeleted: { _eq: false }
        }
        isDeleted: { _eq: false }
      }
      orderBy: [{ employeeId: ASC }, { activeFrom: DESC }, { createdAt: DESC }]
    ) {
      id
      employeeId
      activeFrom
      activeTo
      hireDate
      exitDate
      monthlyGrossSalary
    }
  }
`
