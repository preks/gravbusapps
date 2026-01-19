/**
 * GraphQL client utility for making API requests
 */

/**
 * Wrapper for GraphQL client operations
 * @param graphQLClient - The base GraphQL client
 * @returns GraphQL client with query method
 */
export const wrapGraphQLClient = (graphQLClient: any) => {
  return {
    /**
     * Execute a GraphQL query
     * @param options - Query options with query string and variables
     * @returns Promise with query results
     */
    query: async ({ query, variables }: { query: string; variables?: Record<string, any> }): Promise<{ data: any }> => {
      const result = await graphQLClient.request(query, variables)
      return { data: result }
    }
  }
}
