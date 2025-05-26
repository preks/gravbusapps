import { useEffect } from 'react'
import { flowRegistryClient } from './FlowRegistryClient';

export const useFlowRegistryClient = (accessToken: string) => {
  flowRegistryClient.setAccessToken(accessToken);
  
  useEffect(
    function addRefreshedTokenToAuthorizationHeader() {
      window.addEventListener('com.newwork.token.shouldRefreshAuthorizationHeader', listener as EventListener)
      return () => {
        window.removeEventListener('com.newwork.token.shouldRefreshAuthorizationHeader', listener as EventListener)
      }

      function listener() {
        flowRegistryClient.setAccessToken(accessToken);
      }
    },
    [accessToken]
  )

  return flowRegistryClient;
}