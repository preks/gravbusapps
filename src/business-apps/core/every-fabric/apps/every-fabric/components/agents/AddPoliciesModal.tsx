import React, { useEffect, useMemo, useState } from 'react'
import { MagnifyingGlass, X, ArrowClockwise, ShieldCheck, ArrowSquareOut } from '@phosphor-icons/react'
import { Button } from '@newwork/nw-design-system'
import { useContentEntries } from '@/common/data/content/hooks/useContentEntries'
import { ContentGroup, ContentRole } from '@/common/data/content/constants/contentConstants'
import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'

/**
 * URL of the intranet detail view for a policy ContentEntry. Mirrors the
 * `intranet` / `content_entry` urlTemplate in entityConfig.ts so chip links
 * keep working if the route ever moves.
 */
export const buildPolicyDetailUrl = (policyId: string): string =>
  `/platform/content/intranet/content-record?contentId=${encodeURIComponent(policyId)}`

/** Minimum payload the parent needs to render a chip with a real title. */
export interface PickedPolicy {
  id: string
  title: string
  updatedAt?: string
}

export interface AddPoliciesModalProps {
  open: boolean
  onClose: () => void
  accessToken: string
  /** Policy uuids already attached to the agent — pre-checked on open. */
  alreadySelected: string[]
  /**
   * IDs of policies that are already in the workspace Default Policies
   * baseline. When provided, matching items show a "Default" badge so
   * users know these are always available to the agent anyway.
   */
  workspaceDefaultIds?: Set<string>
  /**
   * Called with the full desired set of policies (id + title) when the user
   * clicks Apply. Title comes from the entry the user actually clicked, so the
   * parent can paint a friendly chip without waiting for a backend round-trip.
   */
  onAdd: (policies: PickedPolicy[]) => void
}

const PAGE_SIZE = 20

interface PolicyOption {
  id: string
  title: string
  contentTypeName?: string
  updatedAt?: string
}

function toPolicyOption(entry: ContentEntry): PolicyOption | null {
  const raw = entry as unknown as {
    id?: string
    title?: string
    contentType?: { name?: string }
    updatedAt?: string
  }
  const id = String(raw?.id ?? '').trim()
  if (!id) return null
  return {
    id,
    title: String(raw?.title ?? '').trim() || id,
    contentTypeName: raw?.contentType?.name,
    updatedAt: raw?.updatedAt
  }
}

function formatDate(iso?: string): string {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
  } catch {
    return ''
  }
}

/**
 * Browse-and-pick modal for intranet ContentEntry items that live under
 * `/platform/content/intranet?tab=policies` (contentGroup = POLICY).
 *
 * Used by the agent configure page to populate the per-agent
 * ``policy_refs`` allow-list. The picker itself is content-side only —
 * it never talks to the agent or skill backends — so it stays a small
 * pure ContentEntry browser regardless of who attaches the policies.
 */
const SEARCH_DEBOUNCE_MS = 250

export const AddPoliciesModal: React.FC<AddPoliciesModalProps> = ({
  open,
  onClose,
  accessToken,
  alreadySelected,
  workspaceDefaultIds,
  onAdd
}) => {
  // Two-stage search: `searchInput` follows the keyboard immediately so the
  // input feels responsive; `search` lags by SEARCH_DEBOUNCE_MS and is what
  // drives the GraphQL query. Mirrors `ContentEntryPicker`'s 250 ms debounce.
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set())
  // Metadata for every entry the user has scrolled past in this session.
  // Pages turn this into a 1-shot cache so `handleAdd` can return titles and
  // updatedAt for items selected on previous pages without a second fetch.
  const [seenMeta, setSeenMeta] = useState<Record<string, { title: string; updatedAt?: string }>>({})

  useEffect(() => {
    if (!open) return
    setSearchInput('')
    setSearch('')
    setOffset(0)
    setSeenMeta({})
    setLocalSelected(new Set(alreadySelected))
  }, [alreadySelected, open])

  useEffect(() => {
    const handle = globalThis.setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS)
    return () => globalThis.clearTimeout(handle)
  }, [searchInput])

  useEffect(() => {
    setOffset(0)
  }, [search])

  const queryParams = useMemo(
    () => ({
      role: ContentRole.ROOT,
      contentGroup: ContentGroup.POLICY,
      search,
      limit: PAGE_SIZE,
      offset,
      sortBy: 'updatedAt' as const,
      sortOrder: 'DESC' as const
    }),
    [search, offset]
  )

  // Stable reference for the third arg of useContentEntries. The hook
  // pulls `options` into its useCallback deps, so an inline literal here
  // would change identity every render → fetchEntries re-creates →
  // useEffect re-fires → setState → re-render → infinite fetch loop
  // (the exact symptom that floods the network logs when the host or
  // backend is unhealthy).
  const queryOptions = useMemo(
    () =>
      ({
        fields: ['id', 'title', 'contentGroup', 'contentType', 'updatedAt', 'preview'],
        relationLimit: 0,
        relationOffset: 0
      }) as any,
    []
  )

  const { entries, isLoading, error, totalCount, refetch } = useContentEntries(
    queryParams as any,
    accessToken,
    queryOptions
  )

  const options = useMemo(() => {
    const list = Array.isArray(entries) ? entries : []
    return list.map(toPolicyOption).filter((p): p is PolicyOption => p !== null)
  }, [entries])

  // Extend the seen-meta cache whenever a new page lands, so toggling items
  // across page boundaries doesn't drop the title/date we'd need at Apply time.
  useEffect(() => {
    if (options.length === 0) return
    setSeenMeta(prev => {
      let changed = false
      const next = { ...prev }
      for (const o of options) {
        const existing = next[o.id]
        if (!existing || existing.title !== o.title || existing.updatedAt !== o.updatedAt) {
          next[o.id] = { title: o.title, updatedAt: o.updatedAt }
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [options])

  const totalPages = Math.max(1, Math.ceil((totalCount || options.length) / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const hasPrev = offset > 0
  const hasNext = offset + options.length < (totalCount || 0)

  const toggleItem = (policyId: string) => {
    setLocalSelected(prev => {
      const next = new Set(prev)
      if (next.has(policyId)) next.delete(policyId)
      else next.add(policyId)
      return next
    })
  }

  const handleAdd = () => {
    const enriched: PickedPolicy[] = [...localSelected].map(id => ({
      id,
      title: seenMeta[id]?.title ?? id,
      updatedAt: seenMeta[id]?.updatedAt
    }))
    onAdd(enriched)
    onClose()
  }

  if (!open) return null

  return (
    <dialog
      open
      aria-modal="true"
      className="gba:fixed gba:inset-0 gba:z-[60] gba:flex gba:items-center gba:justify-center gba:bg-background/80 gba:backdrop-blur-sm gba:p-4 gba:m-0 gba:max-w-none gba:w-full gba:h-full gba:border-0 gba:bg-transparent"
      data-testid="add-policies-modal"
    >
      <button
        type="button"
        className="gba:absolute gba:inset-0 gba:cursor-default"
        onClick={onClose}
        onKeyDown={e => {
          if (e.key === 'Escape') onClose()
        }}
        tabIndex={-1}
        aria-label="Close dialog"
      />
      <div className="gba:relative gba:w-full gba:max-w-2xl gba:max-h-[80vh] gba:overflow-hidden gba:flex gba:flex-col gba:rounded-xl gba:border gba:border-border gba:bg-background gba:shadow-xl">
        {/* Header */}
        <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:border-b gba:border-border">
          <div className="gba:flex gba:items-center gba:gap-2">
            <ShieldCheck className="gba:h-4 gba:w-4 gba:text-primary" />
            <h3 className="gba:text-sm gba:font-semibold">Attach Intranet Policy to Agent</h3>
          </div>
          <button
            type="button"
            className="gba:p-1 gba:rounded gba:hover:bg-muted"
            onClick={onClose}
            data-testid="add-policies-modal-close"
            aria-label="Close"
          >
            <X className="gba:h-4 gba:w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="gba:px-4 gba:pt-3 gba:pb-2">
          <div className="gba:relative">
            <MagnifyingGlass className="gba:absolute gba:left-2.5 gba:top-1/2 gba:-translate-y-1/2 gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search policies by title…"
              className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-muted/20 gba:pl-8 gba:pr-3 gba:py-2 gba:text-sm gba:text-foreground placeholder:gba:text-muted-foreground/50 focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-primary/30"
              data-testid="add-policies-modal-search"
            />
          </div>
        </div>

        {/* List */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:px-4 gba:pb-2">
          {isLoading && (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-10 gba:text-sm gba:text-muted-foreground">
              Loading policies…
            </div>
          )}

          {!isLoading && error && (
            <div className="gba:flex gba:flex-col gba:items-center gba:gap-3 gba:py-10">
              <p className="gba:text-sm gba:text-destructive">
                Failed to load policies. The intranet may be unreachable.
              </p>
              <Button variant="ghost" size="sm" onClick={() => void refetch()}>
                <ArrowClockwise className="gba:h-3.5 gba:w-3.5 gba:mr-1.5" />
                Retry
              </Button>
            </div>
          )}

          {!isLoading && !error && options.length === 0 && (
            <div className="gba:flex gba:flex-col gba:items-center gba:gap-1 gba:py-10 gba:text-center">
              <p className="gba:text-sm gba:text-muted-foreground">
                {search.trim() ? 'No policies match your search.' : 'No policies found.'}
              </p>
              <p className="gba:text-xs gba:text-muted-foreground/70">
                Publish a policy under <code className="gba:font-mono">/platform/content/intranet?tab=policies</code>{' '}
                first.
              </p>
            </div>
          )}

          {!isLoading && !error && options.length > 0 && (
            <ul className="gba:space-y-1 gba:py-1">
              {options.map(policy => {
                const checked = localSelected.has(policy.id)
                return (
                  <li key={policy.id}>
                    <button
                      type="button"
                      className={[
                        'gba:w-full gba:flex gba:items-start gba:gap-3 gba:rounded-lg gba:px-3 gba:py-2.5 gba:text-left gba:transition-colors',
                        checked ? 'gba:bg-primary/8' : 'gba:hover:bg-muted/40'
                      ].join(' ')}
                      onClick={() => toggleItem(policy.id)}
                      data-testid={`add-policies-item-${policy.id}`}
                    >
                      <span
                        className={[
                          'gba:flex-shrink-0 gba:mt-0.5 gba:w-4 gba:h-4 gba:rounded gba:border gba:flex gba:items-center gba:justify-center',
                          checked ? 'gba:bg-primary gba:border-primary' : 'gba:border-border gba:bg-background'
                        ].join(' ')}
                        aria-hidden
                      >
                        {checked && (
                          <svg
                            className="gba:w-2.5 gba:h-2.5 gba:text-primary-foreground"
                            viewBox="0 0 12 12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="2,6 5,9 10,3" />
                          </svg>
                        )}
                      </span>
                      <div className="gba:flex-1 gba:min-w-0">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                            {policy.title}
                          </span>
                          {policy.contentTypeName && (
                            <span className="gba:flex-shrink-0 gba:rounded-full gba:bg-muted gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-muted-foreground">
                              {policy.contentTypeName}
                            </span>
                          )}
                          {workspaceDefaultIds?.has(policy.id) && (
                            <span
                              className="gba:flex-shrink-0 gba:rounded-full gba:bg-primary/10 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-primary"
                              title="Already in workspace Default Policies — available to all agents automatically"
                            >
                              Default
                            </span>
                          )}
                        </div>
                        {policy.updatedAt && (
                          <p className="gba:text-[11px] gba:text-muted-foreground gba:mt-0.5">
                            Updated {formatDate(policy.updatedAt)}
                          </p>
                        )}
                      </div>
                      <a
                        href={buildPolicyDetailUrl(policy.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={event => event.stopPropagation()}
                        onKeyDown={event => event.stopPropagation()}
                        className="gba:flex-shrink-0 gba:inline-flex gba:items-center gba:justify-center gba:h-7 gba:w-7 gba:rounded gba:text-muted-foreground gba:hover:text-primary gba:hover:bg-primary/5"
                        title={`Open policy in a new tab (ID: ${policy.id})`}
                        data-testid={`add-policies-item-open-${policy.id}`}
                      >
                        <ArrowSquareOut className="gba:h-4 gba:w-4" />
                      </a>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && !error && (hasPrev || hasNext) && (
          <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-2 gba:border-t gba:border-border/60">
            <span className="gba:text-xs gba:text-muted-foreground">
              Page {currentPage} of {totalPages} ({totalCount} total)
            </span>
            <div className="gba:flex gba:gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="gba:h-7 gba:text-xs"
                disabled={!hasPrev}
                onClick={() => setOffset(prev => Math.max(0, prev - PAGE_SIZE))}
                data-testid="add-policies-modal-prev"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gba:h-7 gba:text-xs"
                disabled={!hasNext}
                onClick={() => setOffset(prev => prev + PAGE_SIZE)}
                data-testid="add-policies-modal-next"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Action row */}
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:px-4 gba:py-3 gba:border-t gba:border-border">
          <span className="gba:text-xs gba:text-muted-foreground">{localSelected.size} selected</span>
          <div className="gba:flex gba:gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="add-policies-modal-cancel">
              Cancel
            </Button>
            <Button size="sm" disabled={isLoading} onClick={handleAdd} data-testid="add-policies-modal-add">
              Apply
            </Button>
          </div>
        </div>
      </div>
    </dialog>
  )
}
