import { useEffect } from 'react'
import { builderClient } from './BuilderClient'

export const useBuilderClient = (accessToken: string) => {
  builderClient.setAccessToken(accessToken)

  useEffect(
    function addRefreshedTokenToAuthorizationHeader() {
      globalThis.window.addEventListener(
        'com.newwork.token.shouldRefreshAuthorizationHeader',
        listener as EventListener
      )
      return () => {
        globalThis.window.removeEventListener(
          'com.newwork.token.shouldRefreshAuthorizationHeader',
          listener as EventListener
        )
      }

      function listener() {
        builderClient.setAccessToken(accessToken)
      }
    },
    [accessToken]
  )

  return builderClient
}
