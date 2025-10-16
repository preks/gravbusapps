import { useEffect } from 'react'
import { graphQLClient } from './GraphQLClient'

export const useGraphqlClient = (accessToken?: string) => {
  if (accessToken) {
    graphQLClient.setAccessToken(accessToken)
  }

  useEffect(
    function addRefreshedTokenToAuthorizationHeader() {
      if (!accessToken) return

      window.addEventListener('com.newwork.token.shouldRefreshAuthorizationHeader', listener as EventListener)
      return () => {
        window.removeEventListener('com.newwork.token.shouldRefreshAuthorizationHeader', listener as EventListener)
      }

      function listener() {
        if (accessToken) {
          graphQLClient.setAccessToken(accessToken)
        }
      }
    },
    [accessToken]
  )

  return graphQLClient
}

// TODO: Replace old useGraphqlClient everywhere
export { useGraphqlClient as useGraphQLClient }
