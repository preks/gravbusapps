export interface SalesActivityResponse {
  SalesActivity: {
    id: string;
    accountId: string;
    title: string;
    version: number;
    description: string;
    createdAt: string;
  }[];
}

/**
 * Query to fetch sales activities by account ID
 */
export const GET_SALES_ACTIVITIES = `
  query GetSalesActivities($accountId: uuid!) {
    SalesActivity(
      where: { accountId: { _eq: $accountId }, isDeleted: { _eq: false } }
      orderBy: { createdAt: DESC }
    ) {
      id
      accountId
      title
      version
      description
      createdAt
    }
  }
`;
