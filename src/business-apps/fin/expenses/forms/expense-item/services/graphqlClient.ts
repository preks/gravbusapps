/**
 * GraphQL client utility for making API requests
 */
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

/**
 * Hook to use the GraphQL client with proper typing
 * @param contextProps - Business app context props containing accessToken
 * @returns GraphQL client with query method
 */
export const useExpenseGraphQLClient = (contextProps: Pick<BusinessAppContextProps, 'accessToken'>) => {
  const graphQLClient = useGraphqlClient(contextProps.accessToken)

  return {
    /**
     * Execute a GraphQL query
     * @param options - Query options with query string and variables
     * @returns Promise with query results
     */
    query: async <T = any>({
      query,
      variables
    }: {
      query: string
      variables?: Record<string, any>
    }): Promise<{ data: T }> => {
      const result = await graphQLClient.request<T>(query, variables)
      return { data: result }
    }
  }
}

/**
 * Legacy function for creating a GraphQL client
 * @deprecated Use useExpenseGraphQLClient hook instead
 * @param accessToken - The access token for authentication
 * @returns A GraphQL client object with a query method
 */
export const createGraphQLClient = (accessToken: string) => {
  return {
    query: async ({ query, variables }: { query: string; variables?: Record<string, any> }) => {
      const { graphQLClient } = await import('@/common/network/graphql/GraphQLClient')

      graphQLClient.setAccessToken(accessToken)

      const result = await graphQLClient.request(query, variables)
      return { data: result }
    }
  }
}
