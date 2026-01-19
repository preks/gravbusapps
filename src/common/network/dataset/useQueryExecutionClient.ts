import { useEffect, useMemo } from 'react'
import { QueryExecutionClient } from './QueryExecutionClient'
import { Services } from '@/common/types/enums/Services'

export const useQueryExecutionClient = (accessToken: string, service: Services) => {
  const client = useMemo(() => new QueryExecutionClient(service), [service])

  client.setAccessToken(accessToken)

  useEffect(
    function addRefreshedTokenToAuthorizationHeader() {
      window.addEventListener('com.newwork.token.shouldRefreshAuthorizationHeader', listener as EventListener)
      return () => {
        window.removeEventListener('com.newwork.token.shouldRefreshAuthorizationHeader', listener as EventListener)
      }

      function listener() {
        client.setAccessToken(accessToken)
      }
    },
    [accessToken, client]
  )

  return client
}
