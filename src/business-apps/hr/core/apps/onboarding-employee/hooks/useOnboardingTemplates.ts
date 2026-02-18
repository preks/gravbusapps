import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { FLOW_ENGINE_API_BASE, ONBOARDING_APP_TAG } from '../constants'

/** Template item as returned by GET /templates (flow-engine), normalized for onboarding. */
export interface OnboardingTemplateItem {
  id: string
  name: string
  description?: string
  type?: string
  version?: number
  tags?: Record<string, string>
  /** Step definitions (title, form, assignment, etc.) */
  steps?: unknown[]
  /** Template metadata (databaseInfo: templateId, version, isDraft, createdOn, modifiedOn). */
  metadata?: { databaseInfo?: Record<string, unknown> }
  /** Raw payload for extensibility */
  raw?: Record<string, unknown>
}

/**
 * API response shape: { status, count, totalCount, hasMore, pagination, data: Template[] }
 * data is the array of templates directly.
 */
function normalizeTemplatesResponse(raw: unknown): OnboardingTemplateItem[] {
  let list: unknown[] = []
  if (raw && typeof raw === 'object' && 'data' in raw) {
    const data = (raw as { data: unknown }).data
    if (Array.isArray(data)) {
      list = data
    }
  }
  return list.map((t: any) => ({
    id: t.id ?? t.templateId ?? t.key ?? '',
    name: t.name ?? t.templateName ?? t.title ?? t.id ?? '–',
    description: t.description ?? '',
    type: t.type,
    version: typeof t.version === 'number' ? t.version : undefined,
    tags: t.tags && typeof t.tags === 'object' ? t.tags : undefined,
    steps: Array.isArray(t.steps) ? t.steps : undefined,
    metadata: t.metadata,
    raw: t
  }))
}

export interface UseOnboardingTemplatesProps {
  accessToken: string
  enabled?: boolean
  limit?: number
}

export interface UseOnboardingTemplatesReturn {
  templates: OnboardingTemplateItem[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetches flow templates from flow-engine GET /templates filtered by tag app=AppCatalog:1:HR_ONBOARDING.
 * Same base URL and tag as used for flows/tasks in onboarding.
 */
export function useOnboardingTemplates({
  accessToken,
  enabled = true,
  limit = 100
}: UseOnboardingTemplatesProps): UseOnboardingTemplatesReturn {
  const client = useRestClient(FLOW_ENGINE_API_BASE)
  const headers = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken])

  const [templates, setTemplates] = useState<OnboardingTemplateItem[]>([])
  const [loading, setLoading] = useState(!!enabled)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!enabled || !accessToken) {
      setTemplates([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await client.get<unknown>('/templates', {
        headers,
        params: {
          'tag.app': ONBOARDING_APP_TAG,
          limit: String(limit)
        }
      })
      setTemplates(normalizeTemplatesResponse(res ?? {}))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load templates')
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, client, headers, enabled, limit])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { templates, loading, error, refetch }
}
