import { useEffect } from 'react'
import { graphQLClient } from './GraphQLClient';

export const useGraphqlClient = (accessToken: string) => {
  graphQLClient.setAccessToken(accessToken);
  
  useEffect(
    function addRefreshedTokenToAuthorizationHeader() {
      window.addEventListener('com.newwork.token.shouldRefreshAuthorizationHeader', listener as EventListener)
      return () => {
        window.removeEventListener('com.newwork.token.shouldRefreshAuthorizationHeader', listener as EventListener)
      }

      function listener() {
        graphQLClient.setAccessToken(accessToken);
      }
    },
    [accessToken]
  )

  return graphQLClient;
}