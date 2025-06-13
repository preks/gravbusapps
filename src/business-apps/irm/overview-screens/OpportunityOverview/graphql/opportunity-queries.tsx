export interface OpportunityData {
    id: string;
    name: string;
    winningChance: number;
    stage: string;
    estimatedAmount: number;
    lastInteraction: string;
    createdAt: string;
    closeDate: string;
    ownerEmployee: {
      firstName: string;
      lastName: string;
    };
    account: {
      name: string;
      contact: {
        firstName: string;
        lastName: string;
      };
    };
  }
  
  export interface GetOpportunitiesResponse {
    Opportunity: OpportunityData[];
    totalCount: {
      aggregate: {
        count: number;
      };
    };
  }
  
export const GET_OPPORTUNITIES = `
  query GetOpportunity($limit: Int, $offset: Int, $where: OpportunityBoolExp) {
    Opportunity(limit: $limit, offset: $offset, where: $where) {
      id
      name
      winningChance
      stage
      estimatedAmount
      lastInteraction
      createdAt
      closeDate
      ownerEmployee {
        firstName
        lastName
      }
      account {
        name
        contact {
          firstName
          lastName
        }
      }
    }
    totalCount: OpportunityAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

