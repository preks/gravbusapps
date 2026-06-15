import dayjs from 'dayjs'

// Combined query for employee sales performance KPIs with 30-day historical aggregates
export const GET_ALL_PERFORMANCE_STATISTICS = (currencyCode?: string) => {
  const thirtyDaysAgo = dayjs().subtract(30, 'day').toISOString()
  const currencyFilter = currencyCode ? `, currencyRef: { _ilike: "%${currencyCode}" }` : ''

  return `
  query GetAllPerformanceStatistics($employeeId: uuid!) {
    totalRevenue: OpportunityAggregate(where: {
      isDeleted: { _eq: false },
      opportunityStatus: { code: { _eq: "WON" } },
      ownerEmployeeId: { _eq: $employeeId }${currencyFilter}
    }) {
      aggregate {
        sum { estimatedAmount }
        count
      }
    }

    totalOpportunities: OpportunityAggregate(where: {
      isDeleted: { _eq: false },
      ownerEmployeeId: { _eq: $employeeId }${currencyFilter}
    }) {
      aggregate {
        count
      }
    }

    pipelineValue: OpportunityAggregate(where: {
      isDeleted: { _eq: false },
      opportunityStatus: { code: { _nin: ["WON", "LOST"] } },
      ownerEmployeeId: { _eq: $employeeId }${currencyFilter}
    }) {
      aggregate {
        sum { estimatedAmount }
      }
    }

    revenue30d: OpportunityAggregate(where: {
      isDeleted: { _eq: false },
      opportunityStatus: { code: { _eq: "WON" } },
      ownerEmployeeId: { _eq: $employeeId },
      closeDate: { _lte: "${thirtyDaysAgo}" }${currencyFilter}
    }) {
      aggregate {
        sum { estimatedAmount }
        count
      }
    }

    totalOpportunities30d: OpportunityAggregate(where: {
      isDeleted: { _eq: false },
      ownerEmployeeId: { _eq: $employeeId },
      createdAt: { _lte: "${thirtyDaysAgo}" }${currencyFilter}
    }) {
      aggregate {
        count
      }
    }

    pipelineValue30d: OpportunityAggregate(where: {
      isDeleted: { _eq: false },
      opportunityStatus: { code: { _nin: ["WON", "LOST"] } },
      ownerEmployeeId: { _eq: $employeeId },
      createdAt: { _lte: "${thirtyDaysAgo}" }${currencyFilter}
    }) {
      aggregate {
        sum { estimatedAmount }
      }
    }

    sampleOpportunity: Opportunity(
      limit: 1,
      where: {
        isDeleted: { _eq: false },
        ownerEmployeeId: { _eq: $employeeId },
        currencyRef: { _isNull: false }${currencyFilter}
      }
    ) {
      currencyRef
      currency {
        value
        code
      }
    }
  }
`
}
