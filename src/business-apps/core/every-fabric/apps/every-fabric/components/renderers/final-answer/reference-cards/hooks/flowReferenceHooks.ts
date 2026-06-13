import { useFlowProgressClient, type FlowOverview } from '@/common/network/flows/useFlowProgressClient'
import { FlowTemplateClient, type FlowTemplate } from '@/common/network/flows/FlowTemplateClient'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useReferenceFetch, type ReferenceFetchState } from './useReferenceFetch'

/**
 * Running flow instance overview (status + step progress) from
 * custom-flow-engine. `useFlowProgressClient` is itself a hook, so it is
 * called at the top level and its memoised `getFlowOverview` drives the fetch.
 */
export function useFlowReference(id: string, accessToken: string): ReferenceFetchState<FlowOverview> {
  const { getFlowOverview } = useFlowProgressClient({ accessToken } as BusinessAppContextProps)
  return useReferenceFetch<FlowOverview>(async () => {
    try {
      return await getFlowOverview(id)
    } catch {
      return null
    }
  }, [id, accessToken])
}

export interface FlowTemplateReference {
  template: FlowTemplate
  metadata?: {
    createdAt?: string
    updatedAt?: string
    isDraft?: boolean
  }
}

/** Flow template / draft definition (name, version, step count, draft flag). */
export function useFlowTemplateReference(id: string, accessToken: string): ReferenceFetchState<FlowTemplateReference> {
  return useReferenceFetch<FlowTemplateReference>(async () => {
    try {
      const client = new FlowTemplateClient(accessToken)
      const result = await client.getTemplateWithMetadata(id)
      return { template: result.template, metadata: result.metadata }
    } catch {
      return null
    }
  }, [id, accessToken])
}
