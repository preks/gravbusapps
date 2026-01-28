import { useEffect, useMemo } from 'react'
import { ResourceClient } from '@/common/network/resources/ResourceClient'

export const useResourceClient = (accessToken?: string) => {
  const resourceClient = useMemo(() => {
    const client = new ResourceClient()
    if (accessToken) {
      client.setAccessToken(accessToken)
    }
    return client
  }, [])

  useEffect(() => {
    if (accessToken) {
      resourceClient.setAccessToken(accessToken)
    }

    const handleShouldRefreshAuthorizationHeader = (event: any) => {
      const { accessToken } = event.detail
      if (accessToken) {
        resourceClient.setAccessToken(accessToken)
      }
    }

    globalThis.window.addEventListener(
      'com.newwork.token.shouldRefreshAuthorizationHeader',
      handleShouldRefreshAuthorizationHeader
    )

    return () => {
      globalThis.window.removeEventListener(
        'com.newwork.token.shouldRefreshAuthorizationHeader',
        handleShouldRefreshAuthorizationHeader
      )
    }
  }, [resourceClient, accessToken])

  return resourceClient
}
