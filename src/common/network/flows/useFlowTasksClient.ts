import { useMemo } from 'react'
import { FlowTasksClient } from './FlowTasksClient'

export const useFlowTasksClient = (accessToken: string): FlowTasksClient => {
  return useMemo(() => new FlowTasksClient(accessToken), [accessToken])
}
