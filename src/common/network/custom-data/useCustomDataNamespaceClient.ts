import { useEffect, useMemo } from 'react'
import { CustomDataMutationClient } from './CustomDataMutationClient'
import { CustomDataGraphQLClient } from './CustomDataGraphQLClient'

export type CustomDataNamespaceClient = {
  mutationClient: CustomDataMutationClient
  queryClient: CustomDataGraphQLClient
}

export const useCustomDataNamespaceClient = (accessToken: string, namespace?: string): CustomDataNamespaceClient => {
  const mutationClient = useMemo(() => new CustomDataMutationClient(), [])
  const queryClient = useMemo(() => new CustomDataGraphQLClient(), [])

  useEffect(() => {
    mutationClient.setNamespace(namespace)
    queryClient.setNamespace(namespace)
  }, [mutationClient, queryClient, namespace])

  useEffect(() => {
    if (accessToken) {
      mutationClient.setAccessToken(accessToken)
      queryClient.setAccessToken(accessToken)
    }

    const handleShouldRefreshAuthorizationHeader = (event: any) => {
      const refreshed = String(event?.detail?.accessToken || '').trim()
      const tokenToUse = refreshed || accessToken
      if (!tokenToUse) return

      mutationClient.setAccessToken(tokenToUse)
      queryClient.setAccessToken(tokenToUse)
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
  }, [mutationClient, queryClient, accessToken])

  return useMemo(
    () => ({
      mutationClient,
      queryClient
    }),
    [mutationClient, queryClient]
  )
}
