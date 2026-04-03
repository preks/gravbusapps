import { useMemo } from 'react'
import { ScheduledTasksClient } from './ScheduledTasksClient'

/**
 * Hook to get a ScheduledTasksClient instance with the access token set
 */
export const useScheduledTasksClient = (accessToken: string): ScheduledTasksClient => {
  return useMemo(() => {
    const client = new ScheduledTasksClient()
    client.setAccessToken(accessToken)
    return client
  }, [accessToken])
}
