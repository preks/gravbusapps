export const getOpportunitiesQuery = `
  query GetOpportunities($offset: Int, $limit: Int, $orderBy: [OpportunityOrderBy!], $where: OpportunityBoolExp) {
    Opportunity(offset: $offset, limit: $limit, orderBy:$orderBy, where: $where) {
      id
      version
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
      stage
      salesPipelineStage {
        value
      }
      ownerEmployee {
        displayName
      }
      createdAt
    }
    OpportunityAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

export default getOpportunitiesQuery;
