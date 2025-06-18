export const getOpportunitiesQuery = `
  query GetOpportunities($offset: Int, $limit: Int) {
    Opportunity(offset: $offset, limit: $limit) {
      name
      account {
        name
        website
      }
      currencyRef
      currency {
        value
      }
      estimatedAmount
      winningChance
      salesPipeline {
        value
      }
      salesPipelineStage {
        value
      }
      ownerEmployee {
        displayName
      }
    }
    OpportunityAggregate {
      aggregate {
        count
      }
    }
  }
`;

export default getOpportunitiesQuery;
