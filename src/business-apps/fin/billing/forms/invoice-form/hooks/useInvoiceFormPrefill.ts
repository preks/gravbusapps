import { useMemo } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface InvoiceFormPrefill {
  initialAccountId: string | null
  initialOpportunityId: string | null
}

type LaunchSource = Record<string, unknown>

function toLaunchSource(value: unknown): LaunchSource {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as LaunchSource
}

function pickString(sources: LaunchSource[], keys: string[]): string | null {
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key]
      if (typeof value === 'string' && value.trim()) {
        return value
      }
    }
  }

  return null
}

function readQueryParam(search: string, name: string): string | null {
  return new URLSearchParams(search).get(name)
}

export function useInvoiceFormPrefill(additionalData?: BusinessAppContextProps['additionalData']): InvoiceFormPrefill {
  return useMemo(() => {
    const directContext = toLaunchSource(additionalData)
    const taskPayload = toLaunchSource(directContext.psi_taskPayload)
    const launchSources = [
      toLaunchSource(taskPayload.psi_initialParameters),
      toLaunchSource(taskPayload.initialParameters),
      taskPayload,
      toLaunchSource(directContext.psi_initialParameters),
      toLaunchSource(directContext.externalContextData),
      toLaunchSource(directContext.contextData),
      toLaunchSource(directContext.flowContext),
      directContext
    ]
    const contextAccountId = pickString(launchSources, ['accountId', 'crmAccountId', 'customerAccountId'])
    const contextOpportunityId = pickString(launchSources, [
      'opportunityId',
      'crmOpportunityId',
      'customerOpportunityId'
    ])

    if (globalThis.window === undefined) {
      return {
        initialAccountId: contextAccountId,
        initialOpportunityId: contextOpportunityId
      }
    }

    return {
      initialAccountId:
        contextAccountId ??
        readQueryParam(globalThis.window.location.search, 'accountId') ??
        readQueryParam(globalThis.window.location.search, 'crmAccountId'),
      initialOpportunityId:
        contextOpportunityId ??
        readQueryParam(globalThis.window.location.search, 'opportunityId') ??
        readQueryParam(globalThis.window.location.search, 'crmOpportunityId')
    }
  }, [additionalData])
}
