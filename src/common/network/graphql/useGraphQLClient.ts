import { graphQLClient } from './GraphQLClient'
import { useSyncClientAccessToken } from '../useSyncClientAccessToken'

export const useGraphqlClient = (accessToken?: string) => {
  useSyncClientAccessToken(graphQLClient, accessToken)

  return graphQLClient
}

// TODO: Replace old useGraphqlClient everywhere
export { useGraphqlClient as useGraphQLClient }
