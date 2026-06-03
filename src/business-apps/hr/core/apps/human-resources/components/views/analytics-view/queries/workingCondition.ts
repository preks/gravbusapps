// GraphQL query for workingCondition data for forecasting KPI

export const workingConditionQuery = `
  query WorkingConditionForecast {
    EmployeeWorkingCondition(
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
      annualGrossSalary
      hourlyGrossSalary
      employmentType { value }
      contractType { value }
      region { value }
      remote { value }
      probationEnd
      currency { code }
    }
  }
`
