export const GET_MY_KPIS = `
  query GetMyKpis(
    $employeeId: uuid!
    $currentMonthStart: timestamptz!
    $previousMonthStart: timestamptz!
    $previousMonthEnd: timestamptz!
    $currentQuarterStart: timestamptz!
    $previousQuarterStart: timestamptz!
    $previousQuarterEnd: timestamptz!
  ) {
    # Current Month Data
    currentLeads: LeadAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentMonthStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    currentConvertedLeads: LeadAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentMonthStart }
        isDeleted: { _eq: false }
        leadStatus: { code: { _eq: "CONVERTED" } }
      }
    ) {
      aggregate {
        count
      }
    }
    
    currentContacts: ContactAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentMonthStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    currentOpportunities: OpportunityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentMonthStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    currentWonOpportunities: OpportunityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentMonthStart }
        isDeleted: { _eq: false }
        opportunityStatus: { code: { _eq: "WON" } }
      }
    ) {
      aggregate {
        count
      }
    }
    
    currentActivities: SalesActivityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $currentMonthStart }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Previous Month Data
    previousLeads: LeadAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousMonthStart, _lte: $previousMonthEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    previousContacts: ContactAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousMonthStart, _lte: $previousMonthEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    previousOpportunities: OpportunityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousMonthStart, _lte: $previousMonthEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    previousActivities: SalesActivityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        createdAt: { _gte: $previousMonthStart, _lte: $previousMonthEnd }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Total Counts
    totalLeads: LeadAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    totalContacts: ContactAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    totalOpportunities: OpportunityAggregate(
      where: {
        ownerEmployeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Accounts Data (Quarterly Comparison)
    currentQuarterAccounts: AccountAggregate(
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
    
    previousQuarterAccounts: AccountAggregate(
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
    
    totalAccounts: AccountAggregate(
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
