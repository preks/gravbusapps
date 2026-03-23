import React, { useEffect, useMemo, useState } from 'react'
import { Combobox } from '@newwork/nw-design-system'
import { useContentEntries } from '@/common/data/content/hooks/useContentEntries'
import { ContentGroup, ContentRole } from '@/common/data/content/types/contentEnums'
import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'

export type ContentEntryPickerMode = 'knowledge' | 'policy'

export type PickedContentEntry = {
  id: string
  title: string
}

export interface ContentEntryPickerProps {
  mode: ContentEntryPickerMode
  accessToken: string
  value: string
  onValueChange: (contentId: string, entry?: PickedContentEntry) => void
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
  'data-testid'?: string
}

const LIMIT = 20

const normalize = (value?: string | null): string => (value || '').trim().toLowerCase()

function isLikelyPolicy(entry: ContentEntry): boolean {
  const ref = normalize((entry as any)?.contentTypeRef)
  const typeValue = normalize((entry as any)?.contentType?.value)
  const typeCode = normalize((entry as any)?.contentType?.code)
  if (
    ref.endsWith(':policy') ||
    ref.endsWith(':policies') ||
    ref === 'policy' ||
    ref === 'policies' ||
    ref.includes(':policies')
  ) {
    return true
  }
  const policyTokens = ['policy', 'policies']
  return policyTokens.some(
    token => typeValue === token || typeCode === token || typeValue.includes(token) || typeCode.includes(token)
  )
}

function mergeUniqueById(prev: ContentEntry[], next: ContentEntry[]): ContentEntry[] {
  if (prev.length === 0) return next
  const seen = new Set(prev.map(e => String(e.id)))
  const merged = prev.slice()
  for (const n of next) {
    const id = String((n as any)?.id || '')
    if (!id || seen.has(id)) continue
    seen.add(id)
    merged.push(n)
  }
  return merged
}

export const ContentEntryPicker: React.FC<ContentEntryPickerProps> = ({
  mode,
  accessToken,
  value,
  onValueChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  disabled,
  className,
  'data-testid': testId = 'content-entry-picker'
}) => {
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [items, setItems] = useState<ContentEntry[]>([])

  const queryParams = useMemo(() => {
    if (mode === 'knowledge') {
      return {
        role: ContentRole.ROOT,
        contentGroupRef: ContentGroup.KNOWLEDGE,
        search,
        limit: LIMIT,
        offset,
        sortBy: 'updatedAt' as const,
        sortOrder: 'DESC' as const
      }
    }

    // Policy: query broadly and filter client-side to avoid tenant-specific categorization drift.
    return {
      role: ContentRole.ROOT,
      contentGroupRefs: [
        ContentGroup.NEWS,
        ContentGroup.KNOWLEDGE,
        ContentGroup.DOCUMENT,
        ContentGroup.QUESTION,
        ContentGroup.INTRANET,
        ContentGroup.GLOSSARY,
        ContentGroup.POLICY
      ],
      search,
      limit: LIMIT,
      offset,
      sortBy: 'updatedAt' as const,
      sortOrder: 'DESC' as const
    }
  }, [mode, offset, search])

  const { entries, isLoading, error, totalCount } = useContentEntries(queryParams as any, accessToken, {
    fields: ['id', 'title', 'contentTypeRef', 'contentType', 'updatedAt'] as any,
    relationLimit: 0,
    relationOffset: 0
  })

  const filteredEntries = useMemo(() => {
    const list = Array.isArray(entries) ? entries : []
    if (mode !== 'policy') return list
    return list.filter(isLikelyPolicy)
  }, [entries, mode])

  useEffect(() => {
    setItems(prev => (offset === 0 ? filteredEntries : mergeUniqueById(prev, filteredEntries)))
  }, [filteredEntries, offset])

  // Reset paging on mode/search changes
  useEffect(() => {
    setOffset(0)
    setItems([])
  }, [mode, search])

  const byId = useMemo(() => {
    const map = new Map<string, ContentEntry>()
    for (const e of items) map.set(String((e as any)?.id || ''), e)
    return map
  }, [items])

  const options = useMemo(() => {
    return items
      .map(e => {
        const id = String((e as any)?.id || '').trim()
        if (!id) return null
        const title = String((e as any)?.title || '').trim() || id
        return { value: id, label: title }
      })
      .filter(Boolean) as Array<{ value: string; label: string }>
  }, [items])

  const hasMore = useMemo(() => {
    if (!Number.isFinite(totalCount)) return options.length >= LIMIT
    return offset + (Array.isArray(entries) ? entries.length : 0) < totalCount
  }, [entries, offset, options.length, totalCount])

  const emptyText = (() => {
    if (isLoading) return 'Loading…'
    if (error) return 'Content unavailable'
    return 'No results'
  })()

  return (
    <Combobox
      className={className}
      options={options as any}
      value={value || ''}
      onValueChange={(next: string) => {
        const id = String(next || '').trim()
        const entry = byId.get(id)
        onValueChange(id, entry ? { id, title: String((entry as any)?.title || '').trim() || id } : undefined)
      }}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyText={emptyText}
      onSearch={q => setSearch(q)}
      searchDebounce={250}
      loading={Boolean(isLoading)}
      onLoadMore={() => {
        if (!hasMore) return
        setOffset(prev => prev + LIMIT)
      }}
      hasMore={Boolean(hasMore)}
      align="start"
      disabled={Boolean(disabled)}
      data-testid={testId}
    />
  )
}
