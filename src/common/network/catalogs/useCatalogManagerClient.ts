import { useEffect } from 'react'
import { catalogManagerClient } from './CatalogManagerClient'

export const useCatalogManagerClient = (accessToken: string) => {
  catalogManagerClient.setAccessToken(accessToken)

  useEffect(
    function addRefreshedTokenToAuthorizationHeader() {
      window.addEventListener('com.newwork.token.shouldRefreshAuthorizationHeader', listener as EventListener)
      return () => {
        window.removeEventListener('com.newwork.token.shouldRefreshAuthorizationHeader', listener as EventListener)
      }

      function listener() {
        catalogManagerClient.setAccessToken(accessToken)
      }
    },
    [accessToken]
  )

  return catalogManagerClient
}
