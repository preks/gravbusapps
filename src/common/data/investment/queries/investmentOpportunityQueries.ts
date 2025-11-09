// Investment Opportunity Queries - Complete queries using shared fragments
// NOTE: Related-entity queries have been moved to investmentOpportunityQueries.new.ts
import { INVESTMENT_OPPORTUNITY } from './fragments/investmentFragments'

// Get Investment Opportunities with full details
export const GET_INVESTMENT_OPPORTUNITIES = (): string => {
  return `
    query GetInvestmentOpportunities(
      $limit: Int
      $offset: Int
      $where: InvestmentOpportunityBoolExp
      $orderBy: [InvestmentOpportunityOrderBy!]
    ) {
      InvestmentOpportunity(
        limit: $limit
        offset: $offset
        orderBy: $orderBy
        where: $where
      ) {
        ${INVESTMENT_OPPORTUNITY}
        
        # Aggregate counts for relationships
        investmentAggregate {
          aggregate {
            count
          }
        }
        investmentActivityAggregate {
          aggregate {
            count
          }
        }
        investmentDocumentAggregate {
          aggregate {
            count
          }
        }
        investmentNoteAggregate {
          aggregate {
            count
          }
        }
        investmentTaskAggregate {
          aggregate {
            count
          }
        }
      }
      
      InvestmentOpportunityAggregate(where: $where) {
        aggregate {
          count
        }
      }
    }
  `
}

// Get Investment Opportunity by ID
export const GET_INVESTMENT_OPPORTUNITY_BY_ID = (id: string): string => {
  return `
    query GetInvestmentOpportunityById {
      InvestmentOpportunity(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
        ${INVESTMENT_OPPORTUNITY}
      }
    }
  `
}

// =====================================================
// INVESTMENT OPPORTUNITY RELATED ENTITIES QUERIES
// =====================================================
// NOTE: Related-entity queries have been moved to investmentOpportunityQueries.new.ts
// Import them from there: GET_INVESTMENT_TASKS_BY_OPPORTUNITY_ID, etc.

// Get Investment Opportunity Aggregates - for metrics calculation
export const GET_INVESTMENT_OPPORTUNITY_AGGREGATES = (): string => {
  return `
    query GetInvestmentOpportunityAggregates(
      $where: InvestmentOpportunityBoolExp
      $wonWhere: InvestmentOpportunityBoolExp
    ) {
      # All opportunities aggregate
      InvestmentOpportunityAggregate(where: $where) {
        aggregate {
          count
          sum {
            estimatedAmount
          }
          avg {
            estimatedAmount
          }
        }
      }
      
      # Won opportunities aggregate
      InvestmentOpportunityWonAggregate: InvestmentOpportunityAggregate(where: $wonWhere) {
        aggregate {
          count
          sum {
            estimatedAmount
          }
        }
      }
    }
  `
}

// Get Investment Opportunity Stage Condition by ID
export const GET_INVESTMENT_OPPORTUNITY_STAGE_CONDITION_BY_ID = (id: string): string => {
  return `
    query GetInvestmentOpportunityStageConditionById {
      InvestmentOpportunityStageConditionByPk(id: "${id}") {
        id
        completed
        completedAt
        deadlineAt
        version
        opportunityPipelineStageCondition {
          id
          value
          code
          parentEntryId
        }
        configSnapshot
      }
    }
  `
}

// Get all Investment Opportunity Stage Conditions for an Opportunity
export const GET_INVESTMENT_OPPORTUNITY_STAGE_CONDITIONS_BY_OPPORTUNITY_ID = (opportunityId: string): string => {
  return `
    query GetInvestmentOpportunityStageConditionsByOpportunityId {
      InvestmentOpportunityStageCondition(
        where: {
          opportunity: { id: { _eq: "${opportunityId}" } },
          isDeleted: { _eq: false }
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        id
        completed
        completedAt
        deadlineAt
        version
        configSnapshot
        completedByEmployee {
          id
          displayName
          firstName
          lastName
        }
        opportunityPipelineStageCondition {
          id
          value
          code
          parentEntryId
        }
      }
    }
  `
}
