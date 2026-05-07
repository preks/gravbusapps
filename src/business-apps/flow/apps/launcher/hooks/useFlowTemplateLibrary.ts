import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlowTemplateClient, FlowTriggerType, type FlowTemplate } from '@/common/network/flows/FlowTemplateClient'
import { dedupFlowTemplateLibraryItems } from '../components/flowLibraryUtils'

export type FlowTemplateLibraryItem = {
  template: FlowTemplate
  templateId: string
  name: string
  description?: string
  triggerTypes: FlowTriggerType[]
  isManualLaunchable: boolean
  serviceCategoryRefs: string[]
  serviceCategoryIds: string[]
}

export type UseFlowTemplateLibraryOptions = {
  enabled?: boolean
  limit?: number
  includeDrafts?: boolean
  onlyLatest?: boolean
  templateType?: 'TEMPLATE' | 'SELF_SERVICE'
}

export type UseFlowTemplateLibraryResult = {
  items: FlowTemplateLibraryItem[]
  isLoading: boolean
  error: string | null
  search: string
  setSearch: (value: string) => void
  totalCount: number
  hasNextPage: boolean
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
}

const normalizeToStringArray = (value: unknown): string[] => {
  if (!value) return []
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
  if (typeof value === 'string' && value.trim().length > 0) return [value.trim()]
  return []
}

const parseServicePortalCategoryId = (ref: string): string | null => {
  const match = /^ServicePortalCategory:\d+:(.+)$/.exec(ref)
  if (!match) return null
  const code = match[1]?.trim()
  if (!code) return null
  return code.toLowerCase()
}

export const useFlowTemplateLibrary = (
  accessToken: string | undefined,
  options: UseFlowTemplateLibraryOptions = {}
): UseFlowTemplateLibraryResult => {
  const { enabled = true, limit = 200, includeDrafts = true, onlyLatest = true, templateType } = options

  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<FlowTemplate[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [offset, setOffset] = useState(0)

  const fetchPage = useCallback(
    async (nextOffset: number, mode: 'replace' | 'append') => {
      if (!enabled) return
      if (!accessToken) {
        setError('Access token is required')
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        const client = new FlowTemplateClient(accessToken)
        const result = await client.getTemplatesList({
          limit,
          offset: nextOffset,
          onlyLatest,
          includeDrafts,
          templateType,
          search: search.trim() ? search.trim() : undefined
        })

        setTemplates(prev => (mode === 'append' ? [...prev, ...result.templates] : result.templates))
        setTotalCount(result.totalCount)
        setOffset(result.offset)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load templates')
        setTemplates([])
        setTotalCount(0)
        setOffset(0)
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, enabled, includeDrafts, limit, onlyLatest, search, templateType]
  )

  const refetch = useCallback(async () => {
    await fetchPage(0, 'replace')
  }, [fetchPage])

  const loadMore = useCallback(async () => {
    const nextOffset = offset + limit
    await fetchPage(nextOffset, 'append')
  }, [fetchPage, limit, offset])

  useEffect(() => {
    const handle = setTimeout(() => {
      void refetch()
    }, 300)
    return () => clearTimeout(handle)
  }, [refetch, search])

  useEffect(() => {
    if (!enabled) return
    void refetch()
  }, [enabled, refetch])

  const items = useMemo((): FlowTemplateLibraryItem[] => {
    const mapped = templates
      .filter((t): t is FlowTemplate & { id: string } => typeof t?.id === 'string' && t.id.trim().length > 0)
      .map(t => {
        const triggers = t.start?.triggers || []
        const triggerTypes =
          triggers.length > 0 ? triggers.map(tr => tr.type) : ([FlowTriggerType.MANUAL_FORM] as FlowTriggerType[])
        const isManualLaunchable = triggerTypes.includes(FlowTriggerType.MANUAL_FORM)

        const tags: any = t.tags || {}
        const serviceCategoryRefs = normalizeToStringArray(tags.serviceCategory)
        const serviceCategoryIds = serviceCategoryRefs
          .map(parseServicePortalCategoryId)
          .filter((v): v is string => Boolean(v))

        return {
          template: t,
          templateId: t.id,
          name: t.name,
          description: t.description,
          triggerTypes,
          isManualLaunchable,
          serviceCategoryRefs,
          serviceCategoryIds
        }
      })
    return dedupFlowTemplateLibraryItems(mapped)
  }, [templates])

  const hasNextPage = useMemo(() => {
    if (totalCount <= 0) return false
    return templates.length < totalCount
  }, [templates.length, totalCount])

  return {
    items,
    isLoading,
    error,
    search,
    setSearch,
    totalCount,
    hasNextPage,
    refetch,
    loadMore
  }
}
