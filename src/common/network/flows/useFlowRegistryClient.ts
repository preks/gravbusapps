import { useEffect, useMemo } from 'react'
import { FlowRegistryClient } from './FlowRegistryClient'

export const useFlowRegistryClient = (accessToken?: string) => {
  const flowRegistryClient = useMemo(() => {
    const client = new FlowRegistryClient()
    // Set the access token immediately if available
    if (accessToken) {
      client.setAccessToken(accessToken)
    }
    return client
  }, [])

  useEffect(() => {
    // Update the token whenever it changes
    if (accessToken) {
      flowRegistryClient.setAccessToken(accessToken)
    }

    const handleShouldRefreshAuthorizationHeader = (event: any) => {
      const { accessToken } = event.detail
      if (accessToken) {
        flowRegistryClient.setAccessToken(accessToken)
      }
    }

    window.addEventListener(
      'com.newwork.token.shouldRefreshAuthorizationHeader',
      handleShouldRefreshAuthorizationHeader
    )

    return () => {
      window.removeEventListener(
        'com.newwork.token.shouldRefreshAuthorizationHeader',
        handleShouldRefreshAuthorizationHeader
      )
    }
  }, [flowRegistryClient, accessToken])

  return flowRegistryClient
}
