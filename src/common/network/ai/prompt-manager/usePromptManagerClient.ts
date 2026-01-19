import { useEffect } from 'react'
import { promptManagerClient } from './PromptManagerClient'

export const usePromptManagerClient = (accessToken: string) => {
  promptManagerClient.setAccessToken(accessToken)

  useEffect(
    function addRefreshedTokenToAuthorizationHeader() {
      window.addEventListener('com.newwork.token.shouldRefreshAuthorizationHeader', listener as EventListener)
      return () => {
        window.removeEventListener('com.newwork.token.shouldRefreshAuthorizationHeader', listener as EventListener)
      }

      function listener() {
        promptManagerClient.setAccessToken(accessToken)
      }
    },
    [accessToken]
  )

  return promptManagerClient
}
