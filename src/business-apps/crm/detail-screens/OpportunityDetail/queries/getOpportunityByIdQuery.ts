export const getOpportunityByIdQuery = `
  query GetOpportunityById($id: uuid!) {
    Opportunity(where: {id: {_eq: $id}}) {
      id
      version
      name
      notesSummary
      estimatedAmount
      winningChance
      currencyRef
      currency {
        id
        value
        code
      }
      account {
        id
        name
        website
        industry {
          value
        }
      }
      accountId
      salesPipeline {
        id
        value
        code
      }
      salesPipelineStage {
        id
        value
        code
      }
      ownerEmployee {
        id
        firstName
        lastName
        displayName
      }
      createdAt
      updatedAt
    }
  }
`;

export default getOpportunityByIdQuery;
