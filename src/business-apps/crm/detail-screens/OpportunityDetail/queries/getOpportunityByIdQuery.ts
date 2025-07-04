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
      stage
      currency {
        id
        value
        code
      }
      lead {
        id
        version
        contact {
          id
          version
          email
          lastName
          phone
          pictureUrl
          firstName
          jobTitle
        }
      }
      account {
        id
        version
        name
        industryRef
        foundationDate
        industry {
          code
          id
          type
          value
        }
        numberOfEmployees {
          type
          value
          id
          code
        }
        numberOfEmployeesRef
        annualRevenueRef
        annualRevenue {
          type
          value
          id
          code
        }
        website
        ownerEmployeeId
        ownerEmployee {
          firstName
          lastName
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
      opportunityStatusRef
      opportunityStatus {
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
