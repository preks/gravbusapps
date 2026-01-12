import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getFlowEngineApiBaseUrl } from './flowEngineUrl'

export interface TriggerEventListItem {
  schemaId: string
  name: string
  description?: string
}

export const useTriggerEventsClient = (context: BusinessAppContextProps) => {
  const apiBaseUrl = getFlowEngineApiBaseUrl()

  const listEvents = React.useCallback(async (): Promise<TriggerEventListItem[]> => {
    const response = await fetch(`${apiBaseUrl}/triggers/events`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${context.accessToken}`
      }
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch trigger events: ${response.status} ${response.statusText}`)
    }
    const json = await response.json()
    return Array.isArray(json?.data) ? (json.data as TriggerEventListItem[]) : []
  }, [apiBaseUrl, context.accessToken])

  const getEventSchema = React.useCallback(
    async (schemaId: string): Promise<Record<string, any>> => {
      const response = await fetch(`${apiBaseUrl}/triggers/events/${encodeURIComponent(schemaId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${context.accessToken}`
        }
      })
      if (!response.ok) {
        throw new Error(`Failed to fetch trigger event schema: ${response.status} ${response.statusText}`)
      }
      return response.json()
    },
    [apiBaseUrl, context.accessToken]
  )

  return React.useMemo(() => ({ listEvents, getEventSchema }), [getEventSchema, listEvents])
}
