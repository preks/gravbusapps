import { useCallback, useEffect, useMemo, useState } from 'react'
import { Input, useTranslation } from '@newwork/nw-design-system'
import { BrainIcon, MagnifyingGlassIcon, TrashIcon } from '@phosphor-icons/react'
import type { MemoryEntry, MemoryNamespace } from '../agentSettings.types'
import { MEMORY_NAMESPACES } from '../agentSettings.types'
import { useEnterpriseAgentClient } from '../../../hooks/useEnterpriseAgentClient'
import { SectionHeader } from './SettingsShared'
import { MemoryListSkeleton } from './SkeletonLoader'
import { PreferencesEditor } from './PreferencesEditor'
import translations from '../../../_i18n'

const MEMORY_NAMESPACE_LABEL_KEYS: Record<MemoryNamespace, string> = {
  preferences: 'settings-memory-namespace-preferences',
  domain: 'settings-memory-namespace-domain',
  skills: 'settings-memory-namespace-skills',
  episodes: 'settings-memory-namespace-episodes'
}

const MEMORY_NAMESPACE_EMPTY_KEYS: Record<MemoryNamespace, string> = {
  preferences: 'settings-memory-empty-preferences',
  domain: 'settings-memory-empty-domain',
  skills: 'settings-memory-empty-skills',
  episodes: 'settings-memory-empty-episodes'
}

interface MemorySectionProps {
  client: ReturnType<typeof useEnterpriseAgentClient>
  isOpen: boolean
}

// Auto-learned keys look like `pattern-org-headcount-dashboard`. Turn them into
// a readable title, falling back to the first words of the body for legacy
// hash-style keys (e.g. `pattern-9a2c640d`).
const HEX_KEY = /^[0-9a-f]{6,}$/
const formatMemoryTitle = (entry: MemoryEntry): string => {
  if (entry.title?.trim()) return entry.title.trim()
  const stripped = entry.key.replace(/^(pattern|insight)-/i, '')
  if (HEX_KEY.test(stripped)) {
    const words = cleanMemoryBody(entry.value).split(' ').slice(0, 7).join(' ')
    return words || stripped
  }
  const words = stripped.replace(/[-_]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const isWhitespace = (char: string): boolean => char.trim() === ''

const skipWhitespace = (value: string, startIndex: number): number => {
  let index = startIndex
  while (index < value.length && isWhitespace(value[index])) index += 1
  return index
}

const stripHeadingPrefix = (line: string): string => {
  const markerStart = skipWhitespace(line, 0)
  let markerEnd = markerStart

  while (markerEnd < line.length && line[markerEnd] === '#' && markerEnd - markerStart < 6) {
    markerEnd += 1
  }

  if (markerEnd === markerStart) return line

  return line.slice(skipWhitespace(line, markerEnd))
}

const stripBulletPrefix = (line: string): string => {
  const markerStart = skipWhitespace(line, 0)
  const marker = line[markerStart]

  if (marker !== '-' && marker !== '*') return line

  const contentStart = markerStart + 1
  if (contentStart >= line.length || !isWhitespace(line[contentStart])) return line

  return line.slice(skipWhitespace(line, contentStart))
}

const stripLinePrefixes = (value: string): string =>
  value
    .split('\n')
    .map(line => stripBulletPrefix(stripHeadingPrefix(line)))
    .join('\n')

const stripLeadingSummary = (value: string): string => {
  const prefix = 'summary'
  const prefixStart = skipWhitespace(value, 0)
  const prefixEnd = prefixStart + prefix.length

  if (value.slice(prefixStart, prefixEnd).toLowerCase() !== prefix) return value

  let contentStart = prefixEnd
  while (contentStart < value.length) {
    const char = value[contentStart]
    if (char !== ':' && char !== '-' && !isWhitespace(char)) break
    contentStart += 1
  }

  return value.slice(contentStart)
}

const stripPairedMarker = (value: string, marker: string): string => {
  let result = ''
  let index = 0

  while (index < value.length) {
    if (value.startsWith(marker, index)) {
      const contentStart = index + marker.length
      const markerEnd = value.indexOf(marker, contentStart)
      const content = value.slice(contentStart, markerEnd)

      if (markerEnd > contentStart && !content.includes(marker[0])) {
        result += content
        index = markerEnd + marker.length
        continue
      }
    }

    result += value[index]
    index += 1
  }

  return result
}

const collapseWhitespace = (value: string): string => {
  let result = ''
  let previousWasWhitespace = false

  for (const char of value) {
    if (isWhitespace(char)) {
      if (!previousWasWhitespace) result += ' '
      previousWasWhitespace = true
      continue
    }

    result += char
    previousWasWhitespace = false
  }

  return result.trim()
}

// New entries arrive clean from the backend; this also tidies legacy rows that
// still carry raw markdown (### Summary, **bold**, bullets).
const cleanMemoryBody = (value: string): string =>
  collapseWhitespace(
    stripLeadingSummary(
      stripPairedMarker(stripPairedMarker(stripPairedMarker(stripLinePrefixes(value || ''), '**'), '*'), '`')
    )
  )

const relativeDate = (iso: string | undefined, t: (key: string, args?: Record<string, unknown>) => string): string => {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const days = Math.floor((Date.now() - then) / 86_400_000)
  if (days <= 0) return t('settings-memory-relative-today')
  if (days === 1) return t('settings-memory-relative-yesterday')
  if (days < 7) return t('settings-memory-relative-days', { days })
  if (days < 30) return t('settings-memory-relative-weeks', { weeks: Math.floor(days / 7) })
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export const MemorySection: React.FC<MemorySectionProps> = ({ client, isOpen }) => {
  const { t } = useTranslation(translations)
  const [memories, setMemories] = useState<MemoryEntry[]>([])
  const [memoryQuery, setMemoryQuery] = useState('')
  const [activeNamespace, setActiveNamespace] = useState<MemoryNamespace>('preferences')
  const [activeTopic, setActiveTopic] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const searchMemories = useCallback(
    async (query?: string) => {
      setIsLoading(true)
      try {
        const results = await client.getMemory(query || '*', { namespace: activeNamespace })
        setMemories(
          (results ?? []).map(r => ({
            key: r.key,
            value: r.value,
            namespace: r.namespace,
            title: r.title ?? undefined,
            tags: r.tags ?? undefined,
            entities: r.entities ?? undefined,
            occurredAt: r.occurred_at ?? undefined,
            updatedAt: r.updated_at ?? undefined
          }))
        )
      } catch {
        setMemories([])
      } finally {
        setIsLoading(false)
      }
    },
    [client, activeNamespace]
  )

  useEffect(() => {
    // The preferences tab loads its own data (PreferencesEditor); only fetch the
    // raw list when a machine-generated namespace is active.
    if (isOpen && activeNamespace !== 'preferences') searchMemories()
  }, [isOpen, activeNamespace, searchMemories])

  const handleSearchMemory = useCallback(() => {
    searchMemories(memoryQuery || undefined)
  }, [memoryQuery, searchMemories])

  const handleDeleteMemory = useCallback(
    async (key: string, namespace?: string) => {
      try {
        await client.deleteMemory(key, namespace)
        setMemories(prev => prev.filter(m => !(m.key === key && m.namespace === namespace)))
      } catch {
        // best-effort
      }
    },
    [client]
  )

  // Reset the topic filter whenever the active tab changes so a stale topic from
  // the diary does not hide entries in another namespace.
  useEffect(() => {
    setActiveTopic(null)
  }, [activeNamespace])

  const namespaceMemories = useMemo(
    () => memories.filter(m => !m.namespace || m.namespace === activeNamespace),
    [memories, activeNamespace]
  )

  // Available topics for the diary, derived from the loaded entries' tags.
  const availableTopics = useMemo(() => {
    const counts = new Map<string, number>()
    for (const entry of namespaceMemories) {
      for (const tag of entry.tags ?? []) {
        const clean = tag.trim()
        if (clean) counts.set(clean, (counts.get(clean) ?? 0) + 1)
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag)
  }, [namespaceMemories])

  const filteredMemories = useMemo(() => {
    if (!activeTopic) return namespaceMemories
    return namespaceMemories.filter(m => (m.tags ?? []).includes(activeTopic))
  }, [namespaceMemories, activeTopic])

  const renderMemoryList = () => {
    if (isLoading) {
      return <MemoryListSkeleton />
    }

    if (filteredMemories.length === 0) {
      return (
        <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:py-4">
          {t(MEMORY_NAMESPACE_EMPTY_KEYS[activeNamespace])}
        </p>
      )
    }

    return filteredMemories.map(entry => {
      const when = relativeDate(entry.occurredAt || entry.updatedAt, t)
      const tags = entry.tags ?? []
      return (
        <div
          key={`${entry.namespace}-${entry.key}`}
          className="gba:rounded-xl gba:border gba:border-border/60 gba:bg-muted/20 gba:p-3 gba:hover:bg-muted/35 gba:transition-colors"
        >
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
            <div className="gba:flex-1 gba:min-w-0">
              <div className="gba:flex gba:items-center gba:gap-2">
                <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                  {formatMemoryTitle(entry)}
                </p>
                {when && <span className="gba:shrink-0 gba:text-[10px] gba:text-muted-foreground/70">{when}</span>}
              </div>
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5 gba:line-clamp-2">
                {cleanMemoryBody(entry.value)}
              </p>
              {tags.length > 0 && (
                <div className="gba:mt-1.5 gba:flex gba:flex-wrap gba:gap-1">
                  {tags.slice(0, 6).map(tag => (
                    <span
                      key={tag}
                      className="gba:rounded-full gba:bg-muted/60 gba:px-2 gba:py-0.5 gba:text-[10px] gba:text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => handleDeleteMemory(entry.key, entry.namespace)}
              className="gba:flex gba:items-center gba:justify-center gba:h-7 gba:w-7 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors gba:shrink-0"
              data-testid={`settings-memory-delete-${entry.key}`}
              aria-label={t('settings-memory-delete-aria', { title: formatMemoryTitle(entry) })}
            >
              <TrashIcon className="gba:h-3 gba:w-3" />
            </button>
          </div>
        </div>
      )
    })
  }

  return (
    <>
      <SectionHeader
        icon={<BrainIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground/60" />}
        title={t('settings-memory-title')}
      />
      <div className="gba:pb-2.5 sm:gba:pb-3">
        {MEMORY_NAMESPACES.length > 1 && (
          <div className="gba:px-3 sm:gba:px-4 gba:mb-5">
            <div className="gba:flex gba:gap-5 gba:border-b gba:border-border/60">
              {MEMORY_NAMESPACES.map(ns => (
                <button
                  key={ns}
                  type="button"
                  onClick={() => setActiveNamespace(ns)}
                  className={`gba:-mb-px gba:border-b-2 gba:px-0.5 gba:pb-2 gba:text-sm gba:font-semibold gba:transition-colors ${
                    activeNamespace === ns
                      ? 'gba:border-foreground gba:text-foreground'
                      : 'gba:border-transparent gba:text-muted-foreground gba:hover:text-foreground'
                  }`}
                >
                  {t(MEMORY_NAMESPACE_LABEL_KEYS[ns])}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeNamespace === 'preferences' ? (
          <PreferencesEditor client={client} isOpen={isOpen} />
        ) : (
          <div className="gba:px-3 sm:gba:px-4">
            <div className="gba:relative gba:mb-2.5 sm:gba:mb-3">
              <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 -gba:translate-y-1/2 gba:h-3.5 gba:w-3.5 gba:text-muted-foreground/50" />
              <Input
                value={memoryQuery}
                onChange={e => setMemoryQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearchMemory()}
                placeholder={t('settings-memory-search-placeholder', {
                  namespace: t(MEMORY_NAMESPACE_LABEL_KEYS[activeNamespace]).toLowerCase()
                })}
                className="gba:h-8 gba:pl-9 gba:text-sm gba:rounded-full gba:bg-muted/30 gba:border-border/50"
                data-testid="settings-memory-search"
              />
            </div>
            {!isLoading && availableTopics.length > 0 && (
              <div className="gba:mb-2.5 gba:flex gba:flex-wrap gba:gap-1.5" data-testid="settings-memory-topics">
                <button
                  type="button"
                  onClick={() => setActiveTopic(null)}
                  className={`gba:rounded-full gba:px-2.5 gba:py-0.5 gba:text-[11px] gba:transition-colors ${
                    activeTopic === null
                      ? 'gba:bg-foreground gba:text-background'
                      : 'gba:bg-muted/50 gba:text-muted-foreground gba:hover:bg-muted/70'
                  }`}
                >
                  {t('settings-memory-all-topics')}
                </button>
                {availableTopics.slice(0, 12).map(topic => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setActiveTopic(prev => (prev === topic ? null : topic))}
                    className={`gba:rounded-full gba:px-2.5 gba:py-0.5 gba:text-[11px] gba:transition-colors ${
                      activeTopic === topic
                        ? 'gba:bg-foreground gba:text-background'
                        : 'gba:bg-muted/50 gba:text-muted-foreground gba:hover:bg-muted/70'
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            )}
            {!isLoading && filteredMemories.length > 0 && (
              <p className="gba:mb-2 gba:px-1 gba:text-[11px] gba:text-muted-foreground/70">
                {t('settings-memory-entry-count', { count: filteredMemories.length })}
                {activeNamespace === 'episodes'
                  ? ` ${t('settings-memory-entries-episodes-suffix')}`
                  : ` ${t('settings-memory-entries-auto-suffix')}`}
              </p>
            )}
            <div className="gba:space-y-1.5 gba:max-h-80 gba:overflow-y-auto gba:pr-0.5">{renderMemoryList()}</div>
          </div>
        )}
      </div>
    </>
  )
}
