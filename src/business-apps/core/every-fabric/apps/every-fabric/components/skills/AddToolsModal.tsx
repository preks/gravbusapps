import React, { useCallback, useEffect, useState } from 'react'
import { MagnifyingGlass, X, ArrowClockwise } from '@phosphor-icons/react'
import { Button } from '@newwork/nw-design-system'
import { FunctionsServiceClient, type LatestFunctionItem } from '@/common/network/functions/FunctionsServiceClient'

export interface AddToolsModalProps {
  open: boolean
  onClose: () => void
  accessToken?: string
  /** Current tools already attached to the skill draft — pre-checked on open. */
  alreadySelected: string[]
  /** Called with the full desired set of tool names when the user clicks Add. */
  onAdd: (toolNames: string[]) => void
}

const PAGE_SIZE = 10

export const AddToolsModal: React.FC<AddToolsModalProps> = ({ open, onClose, accessToken, alreadySelected, onAdd }) => {
  const [functions, setFunctions] = useState<LatestFunctionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set())

  const fetchFunctions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const client = new FunctionsServiceClient(accessToken)
      const list = await client.listLatest()
      setFunctions(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load functions')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  // Reset and fetch when modal opens
  useEffect(() => {
    if (!open) return
    setSearch('')
    setPage(1)
    setLocalSelected(new Set(alreadySelected))
    void fetchFunctions()
  }, [open])

  // Reset page when search changes
  useEffect(() => {
    setPage(1)
  }, [search])

  const filtered = functions.filter(fn => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return fn.name.toLowerCase().includes(q) || (fn.description ?? '').toLowerCase().includes(q)
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleItem = (name: string) => {
    setLocalSelected(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const handleAdd = () => {
    onAdd([...localSelected])
    onClose()
  }

  const handleClose = () => {
    onClose()
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="gba:fixed gba:inset-0 gba:z-[60] gba:flex gba:items-center gba:justify-center gba:bg-background/80 gba:backdrop-blur-sm gba:p-4"
      data-testid="add-tools-modal"
    >
      <button
        type="button"
        className="gba:absolute gba:inset-0 gba:cursor-default"
        onClick={handleClose}
        onKeyDown={e => {
          if (e.key === 'Escape') handleClose()
        }}
        tabIndex={-1}
        aria-label="Close dialog"
      />
      <div className="gba:relative gba:w-full gba:max-w-lg gba:max-h-[80vh] gba:overflow-hidden gba:flex gba:flex-col gba:rounded-xl gba:border gba:border-border gba:bg-background gba:shadow-xl">
        {/* Header */}
        <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:border-b gba:border-border">
          <h3 className="gba:text-sm gba:font-semibold">Add Tool to Skill</h3>
          <button
            type="button"
            className="gba:p-1 gba:rounded gba:hover:bg-muted"
            onClick={handleClose}
            data-testid="add-tools-modal-close"
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
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or description…"
              className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-muted/20 gba:pl-8 gba:pr-3 gba:py-2 gba:text-sm gba:text-foreground placeholder:gba:text-muted-foreground/50 focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-primary/30"
              data-testid="add-tools-modal-search"
            />
          </div>
        </div>

        {/* List */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:px-4 gba:pb-2">
          {loading && (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-10 gba:text-sm gba:text-muted-foreground">
              Loading functions…
            </div>
          )}

          {!loading && error && (
            <div className="gba:flex gba:flex-col gba:items-center gba:gap-3 gba:py-10">
              <p className="gba:text-sm gba:text-destructive">{error}</p>
              <Button variant="ghost" size="sm" onClick={() => void fetchFunctions()}>
                <ArrowClockwise className="gba:h-3.5 gba:w-3.5 gba:mr-1.5" />
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && pageItems.length === 0 && (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-10 gba:text-sm gba:text-muted-foreground">
              {search.trim() ? 'No functions match your search.' : 'No functions found.'}
            </div>
          )}

          {!loading && !error && pageItems.length > 0 && (
            <ul className="gba:space-y-1 gba:py-1">
              {pageItems.map(fn => {
                const checked = localSelected.has(fn.name)
                return (
                  <li key={fn.id}>
                    <button
                      type="button"
                      className={[
                        'gba:w-full gba:flex gba:items-start gba:gap-3 gba:rounded-lg gba:px-3 gba:py-2.5 gba:text-left gba:transition-colors',
                        checked ? 'gba:bg-primary/8' : 'gba:hover:bg-muted/40'
                      ].join(' ')}
                      onClick={() => toggleItem(fn.name)}
                      data-testid={`add-tools-item-${fn.name}`}
                    >
                      {/* Checkbox */}
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

                      {/* Text */}
                      <div className="gba:flex-1 gba:min-w-0">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                            {fn.name}
                          </span>
                          {fn.agentEnabled && (
                            <span className="gba:flex-shrink-0 gba:rounded-full gba:bg-primary/10 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-primary">
                              agent
                            </span>
                          )}
                        </div>
                        {fn.description && (
                          <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5 gba:truncate">
                            {fn.description}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Pagination */}
        {!loading && !error && filtered.length > 0 && (
          <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-2 gba:border-t gba:border-border/60">
            <span className="gba:text-xs gba:text-muted-foreground">
              Page {page} of {totalPages} ({filtered.length} total)
            </span>
            <div className="gba:flex gba:gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="gba:h-7 gba:text-xs"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                data-testid="add-tools-modal-prev"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gba:h-7 gba:text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                data-testid="add-tools-modal-next"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Action row */}
        <div className="gba:flex gba:items-center gba:justify-end gba:gap-2 gba:px-4 gba:py-3 gba:border-t gba:border-border">
          <Button variant="ghost" size="sm" onClick={handleClose} data-testid="add-tools-modal-cancel">
            Cancel
          </Button>
          <Button size="sm" disabled={loading} onClick={handleAdd} data-testid="add-tools-modal-add">
            Add
          </Button>
        </div>
      </div>
    </div>
  )
}
