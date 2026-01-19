/**
 * GraphQL queries for the HR salaries module
 */

export const getSalaryByEmployeeId = `
  query getSalaryByEmployeeId($employeeId: ID!, $limit: Int, $offset: Int) {
    salaries(
      where: { employeeId: { eq: $employeeId }, isActive: { eq: true } }
      limit: $limit
      offset: $offset
    ) {
      id
      employeeId
      amount
      currency
      salaryType
      effectiveDate
      endDate
      paymentFrequency
      isActive
      createdAt
      updatedAt
    }
  }
`

export const getCompensationComponentsBySalaryId = `
  query getCompensationComponentsBySalaryId($salaryId: ID!, $limit: Int, $offset: Int) {
    compensationComponents(
      where: { salaryId: { eq: $salaryId } }
      limit: $limit
      offset: $offset
    ) {
      id
      employeeId
      salaryId
      name
      description
      amount
      currency
      type
      effectiveDate
      endDate
      paymentFrequency
      isActive
      createdAt
      updatedAt
    }
  }
`

export const getSalaryHistory = `
  query getSalaryHistory($employeeId: ID!, $limit: Int, $offset: Int) {
    salaryHistory(
      where: { employeeId: { eq: $employeeId } }
      orderBy: { effectiveDate: DESC }
      limit: $limit
      offset: $offset
    ) {
      id
      employeeId
      previousAmount
      newAmount
      currency
      effectiveDate
      reason
      createdBy
      createdAt
    }
  }
`

export const getSalaryStatistics = `
  query getSalaryStatistics($structureId: ID!) {
    salaryStatistics(structureId: $structureId) {
      averageSalary
      medianSalary
      totalCompensation
      currency
      employeeCount
      lastUpdated
    }
  }
`

export const updateSalary = `
  mutation updateSalary($id: ID!, $input: SalaryUpdateInput!) {
    updateSalary(id: $id, input: $input) {
      id
      amount
      currency
      effectiveDate
      endDate
      paymentFrequency
      isActive
      updatedAt
    }
  }
`

export const createCompensationComponent = `
  mutation createCompensationComponent($input: CompensationComponentInput!) {
    createCompensationComponent(input: $input) {
      id
      employeeId
      salaryId
      name
      description
      amount
      currency
      type
      effectiveDate
      endDate
      paymentFrequency
      isActive
      createdAt
    }
  }
`

export const updateCompensationComponent = `
  mutation updateCompensationComponent($id: ID!, $input: CompensationComponentUpdateInput!) {
    updateCompensationComponent(id: $id, input: $input) {
      id
      name
      description
      amount
      currency
      type
      effectiveDate
      endDate
      paymentFrequency
      isActive
      updatedAt
    }
  }
`
