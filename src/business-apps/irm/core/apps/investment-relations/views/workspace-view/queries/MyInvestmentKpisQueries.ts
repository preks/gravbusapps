/**
 * IRM KPI Queries for Personal Investment Manager
 */
export const GET_MY_INVESTMENT_KPIS = `
  query GetMyInvestmentKpis(
    $employeeId: uuid!
    $currentQuarterStart: timestamptz!
    $previousQuarterStart: timestamptz!
    $previousQuarterEnd: timestamptz!
  ) {
    # Current Quarter Data
    currentQuarterOpportunities: InvestmentOpportunityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentQuarterStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    currentQuarterAccounts: InvestmentAccountAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentQuarterStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    currentQuarterContacts: InvestmentContactAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentQuarterStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    currentQuarterInvestments: InvestmentAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentQuarterStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Previous Quarter Data
    previousQuarterOpportunities: InvestmentOpportunityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousQuarterStart, _lte: $previousQuarterEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    previousQuarterAccounts: InvestmentAccountAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousQuarterStart, _lte: $previousQuarterEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    previousQuarterContacts: InvestmentContactAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousQuarterStart, _lte: $previousQuarterEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    previousQuarterInvestments: InvestmentAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousQuarterStart, _lte: $previousQuarterEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Total Counts
    totalOpportunities: InvestmentOpportunityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    totalAccounts: InvestmentAccountAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    totalContacts: InvestmentContactAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    totalInvestments: InvestmentAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`
