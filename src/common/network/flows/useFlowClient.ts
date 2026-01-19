import { useEffect } from 'react'
import { flowClient } from './FlowClient'
import { BusinessAppContextProps } from '../../BusinessAppContext'

/**
 * Hook for using the FlowClient with BusinessAppContext
 * @param contextProps - Context props containing accessToken
 * @returns FlowClient instance with access token set
 */
export const useFlowClient = (contextProps: Pick<BusinessAppContextProps, 'accessToken'>) => {
  const { accessToken } = contextProps

  flowClient.setAccessToken(accessToken)

  useEffect(
    function addRefreshedTokenToAuthorizationHeader() {
      window.addEventListener('com.newwork.token.shouldRefreshAuthorizationHeader', listener as EventListener)
      return () => {
        window.removeEventListener('com.newwork.token.shouldRefreshAuthorizationHeader', listener as EventListener)
      }

      function listener() {
        flowClient.setAccessToken(accessToken)
      }
    },
    [accessToken]
  )

  return flowClient
}

export default useFlowClient
