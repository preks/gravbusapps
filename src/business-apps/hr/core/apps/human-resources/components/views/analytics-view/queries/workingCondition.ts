// GraphQL query for workingCondition data for forecasting KPI

export const workingConditionQuery = `
  query WorkingConditionForecast($yearStart: timestamp!, $yearEnd: timestamp!) {
    EmployeeWorkingCondition(
      where: {
        _and: [
          { hireDate: { _lte: $yearEnd } },
          { _or: [
              { exitDate: { _isNull: true } },
              { exitDate: { _gte: $yearStart } }
          ]}
        ]
      }
    ) {
      id
      employeeId
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
    EmployeeWorkingConditionAggregate {
      aggregate {
        count
      }
    }
  }
`
