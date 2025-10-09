// GraphQL query for monthly salary forecast, headcount, and new hires for the current year
// Groups by month using hireDate, exitDate, and monthlyGrossSalary

export const getMonthlySalaryForecastQuery = `
  query GetMonthlySalaryForecast($startOfYear: timestamp!, $endOfYear: timestamp!) {
    monthly: EmployeeWorkingCondition(
      where: {
        hireDate: { _lt: $endOfYear },
        _or: [
          { exitDate: { _isNull: true } },
          { exitDate: { _gte: $startOfYear } }
        ]
      }
    ) {
      id
      hireDate
      exitDate
      monthlyGrossSalary
    }
  }
`
