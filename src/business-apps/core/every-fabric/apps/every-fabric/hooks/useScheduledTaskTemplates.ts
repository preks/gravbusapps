import { useCallback, useEffect, useState } from 'react'
import type {
  ScheduledTaskFrequency,
  ScheduledTaskTemplate
} from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'

interface UseScheduledTaskTemplatesResult {
  templates: ScheduledTaskTemplate[]
  isLoading: boolean
  error: string | null
  refresh: () => void
  create: (body: {
    title: string
    task: string
    description?: string
    icon?: string
    defaultFrequency?: ScheduledTaskFrequency
    defaultTime?: string
  }) => Promise<boolean>
  remove: (templateId: string) => Promise<boolean>
}

export const useScheduledTaskTemplates = (accessToken: string): UseScheduledTaskTemplatesResult => {
  const client = usePromptManagerClient(accessToken)
  const [templates, setTemplates] = useState<ScheduledTaskTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    client
      .getScheduledTaskTemplates()
      .then(data => {
        if (!cancelled) setTemplates(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load templates.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [client, refreshKey])

  const create = useCallback(
    async (body: {
      title: string
      task: string
      description?: string
      icon?: string
      defaultFrequency?: ScheduledTaskFrequency
      defaultTime?: string
    }): Promise<boolean> => {
      try {
        await client.createScheduledTaskTemplate(body)
        refresh()
        return true
      } catch (err) {
        console.error('[useScheduledTaskTemplates] create failed:', err)
        return false
      }
    },
    [client, refresh]
  )

  const remove = useCallback(
    async (templateId: string): Promise<boolean> => {
      try {
        await client.deleteScheduledTaskTemplate(templateId)
        refresh()
        return true
      } catch (err) {
        console.error('[useScheduledTaskTemplates] remove failed:', err)
        return false
      }
    },
    [client, refresh]
  )

  return { templates, isLoading, error, refresh, create, remove }
}
