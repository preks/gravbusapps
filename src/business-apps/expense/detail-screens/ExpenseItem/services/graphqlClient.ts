/**
 * GraphQL client utility for making API requests
 */
import { GRAPHQL_API_ENDPOINT } from '../ExpenseItemContext/constants';

/**
 * Creates a GraphQL client for making API requests
 * @param accessToken - The access token for authentication
 * @returns A GraphQL client object with a query method
 */
export const createGraphQLClient = (accessToken: string) => ({
  query: async ({
    query,
    variables,
  }: {
    query: string;
    variables?: any;
  }) => {
    const response = await fetch(
      GRAPHQL_API_ENDPOINT,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      }
    );
    return response.json();
  },
});
