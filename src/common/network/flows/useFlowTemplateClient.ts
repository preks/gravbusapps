import { useMemo } from 'react'
import { FlowTemplateClient } from './FlowTemplateClient'

export const useFlowTemplateClient = (accessToken: string): FlowTemplateClient => {
  return useMemo(() => {
    return new FlowTemplateClient(accessToken)
  }, [accessToken])
}
