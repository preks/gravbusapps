/**
 * Catalog Selector
 *
 * Select catalogs to add as knowledge sources
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Spinner,
  Badge
} from '@newwork/nw-design-system'
import { Search, Database, Check } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogs } from '@/common/data/catalog/hooks/useCatalogs'
import type { Catalog } from '@/common/data/catalog/types/catalogTypes'
import type { KnowledgeSource } from '@/common/network/ai/prompt-manager/PromptManagerClient'

interface CatalogSelectorProps extends BusinessAppContextProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (
    catalogs: Array<{ id: string; identifier: string; version: string; name: string; entriesCount?: number }>
  ) => void
  existingSources?: KnowledgeSource[] // Already assigned catalogs
  'data-testid'?: string
}

export const CatalogSelector: React.FC<CatalogSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  existingSources = [],
  'data-testid': testId = 'catalog-selector',
  ...context
}) => {
  const { fetchCatalogs } = useCatalogs(context)
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isInitialLoading, setIsInitialLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const debounceTimerRef = useRef<NodeJS.Timeout>()

  const ITEMS_PER_PAGE = 20

  // Create set of existing catalog identifiers for quick lookup
  const existingCatalogKeys = new Set(
    existingSources
      .filter(s => {
        // Backend returns snake_case, handle both formats
        const catalogId = (s as any).catalog_identifier || s.catalogIdentifier
        return s.type === 'catalog' && catalogId
      })
      .map(s => {
        // Backend returns snake_case, handle both formats
        const catalogId = (s as any).catalog_identifier || s.catalogIdentifier
        const catalogVer = (s as any).catalog_version || s.catalogVersion || 'v1'
        return `${catalogId}:${catalogVer}`
      })
  )

  const loadCatalogs = useCallback(
    async (search: string, pageNum: number, isInitial: boolean = false) => {
      if (isInitial) {
        setIsInitialLoading(true)
      } else {
        setIsSearching(true)
      }
      setError(null)
      try {
        const result = await fetchCatalogs({
          search: search || undefined,
          limit: ITEMS_PER_PAGE,
          offset: (pageNum - 1) * ITEMS_PER_PAGE,
          includeCatalogEntries: false
        })
        setCatalogs(result.items)
        setTotal(result.total)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load catalogs')
      } finally {
        setIsInitialLoading(false)
        setIsSearching(false)
      }
    },
    [fetchCatalogs]
  )

  // Initial load
  useEffect(() => {
    if (isOpen) {
      loadCatalogs('', 1, true)
      setSearchQuery('')
      setDebouncedSearch('')
      setPage(1)
    }
  }, [isOpen, loadCatalogs])

  // Debounced search effect
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1)
    }, 300)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchQuery])

  // Load catalogs when debounced search or page changes
  useEffect(() => {
    if (isOpen && !isInitialLoading) {
      loadCatalogs(debouncedSearch, page, false)
    }
  }, [debouncedSearch, page, isOpen, isInitialLoading, loadCatalogs])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
  }

  const handleToggleSelection = (catalog: Catalog) => {
    const catalogVersion = catalog.version || 'v1'
    const catalogKey = `${catalog.identifier}:${catalogVersion}`
    // Don't allow selecting already assigned catalogs
    if (existingCatalogKeys.has(catalogKey)) {
      return
    }
    const newSelection = new Set(selectedCatalogIds)
    if (newSelection.has(catalogKey)) {
      newSelection.delete(catalogKey)
    } else {
      newSelection.add(catalogKey)
    }
    setSelectedCatalogIds(newSelection)
  }

  const handleConfirm = () => {
    const selected = catalogs
      .filter(cat => selectedCatalogIds.has(`${cat.identifier}:${cat.version}`))
      .map(cat => ({
        id: cat.id,
        identifier: cat.identifier,
        version: cat.version || 'v1',
        name: cat.name || cat.identifier,
        entriesCount: cat.entriesCount
      }))
    onSelect(selected)
    setSelectedCatalogIds(new Set())
    setSearchQuery('')
    setPage(1)
    onClose()
  }

  const handleCancel = () => {
    setSelectedCatalogIds(new Set())
    setSearchQuery('')
    setPage(1)
    onClose()
  }

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleCancel()}>
      <DialogContent className="gba:max-w-2xl" data-testid={testId}>
        <DialogHeader>
          <DialogTitle>Select Catalogs</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4">
          {/* Search */}
          <div className="gba:space-y-2">
            <Label htmlFor="catalog-search">Search Catalogs</Label>
            <div className="gba:relative">
              <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <Input
                id="catalog-search"
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder="Search by name or identifier..."
                className="gba:pl-10"
                data-testid={`${testId}-search-input`}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="gba:text-destructive gba:text-sm" data-testid={`${testId}-error`}>
              {error}
            </div>
          )}

          {/* Initial Loading */}
          {isInitialLoading && (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
              <Spinner size="lg" />
            </div>
          )}

          {/* Catalog List */}
          {!isInitialLoading && catalogs.length > 0 && (
            <div className="gba:relative">
              {/* Search overlay indicator */}
              {isSearching && (
                <div className="gba:absolute gba:top-2 gba:right-2 gba:z-10">
                  <Spinner size="sm" />
                </div>
              )}
              <div className="gba:space-y-2 gba:max-h-96 gba:overflow-y-auto gba:border gba:rounded-lg gba:p-3">
                {catalogs.map(catalog => {
                  const catalogVersion = catalog.version || 'v1'
                  const catalogKey = `${catalog.identifier}:${catalogVersion}`
                  const isSelected = selectedCatalogIds.has(catalogKey)
                  const isAlreadyAssigned = existingCatalogKeys.has(catalogKey)

                  return (
                    <div
                      key={catalogKey}
                      className={`gba:flex gba:items-start gba:gap-3 gba:p-3 gba:rounded-lg gba:border gba:transition-colors ${
                        isAlreadyAssigned
                          ? 'gba:bg-muted/20 gba:border-border gba:opacity-60 gba:cursor-not-allowed'
                          : isSelected
                            ? 'gba:bg-primary/10 gba:border-primary gba:cursor-pointer'
                            : 'gba:bg-muted/30 gba:border-border gba:hover:bg-muted/50 gba:cursor-pointer'
                      }`}
                      onClick={() => !isAlreadyAssigned && handleToggleSelection(catalog)}
                      data-testid={`${testId}-catalog-${catalogKey}`}
                    >
                      {isAlreadyAssigned ? (
                        <div className="gba:mt-1 gba:w-4 gba:h-4 gba:rounded gba:bg-success/20 gba:flex gba:items-center gba:justify-center">
                          <Check className="gba:w-3 gba:h-3 gba:text-success" />
                        </div>
                      ) : (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelection(catalog)}
                          className="gba:mt-1"
                          onClick={e => e.stopPropagation()}
                        />
                      )}
                      <div className="gba:w-10 gba:h-10 gba:rounded gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                        <Database className="gba:w-5 gba:h-5 gba:text-primary" />
                      </div>
                      <div className="gba:flex-1 gba:min-w-0">
                        <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
                          <div className="gba:flex-1">
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <h4 className="gba:font-medium gba:text-sm">{catalog.name || catalog.identifier}</h4>
                              {isAlreadyAssigned && (
                                <Badge
                                  variant="outline"
                                  className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:bg-success/10 gba:text-success gba:border-success/20"
                                >
                                  Assigned
                                </Badge>
                              )}
                            </div>
                            <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">
                              {catalog.identifier} {catalogVersion && `(${catalogVersion})`}
                            </p>
                            {catalog.description && (
                              <p className="gba:text-xs gba:text-muted-foreground gba:mt-1 gba:line-clamp-2">
                                {catalog.description}
                              </p>
                            )}
                          </div>
                          {catalog.entriesCount !== undefined && (
                            <Badge
                              variant="secondary"
                              className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:flex-shrink-0"
                            >
                              {catalog.entriesCount} entries
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* No Results */}
          {!isInitialLoading && catalogs.length === 0 && (
            <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
              <Database className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-2 gba:opacity-50" />
              <p className="gba:text-sm">No catalogs found</p>
              {searchQuery && <p className="gba:text-xs gba:mt-1">Try adjusting your search</p>}
            </div>
          )}

          {/* Pagination */}
          {!isInitialLoading && totalPages > 1 && (
            <div className="gba:flex gba:items-center gba:justify-between gba:pt-2">
              <p className="gba:text-sm gba:text-muted-foreground">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="gba:flex gba:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel} data-testid={`${testId}-cancel-button`}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleConfirm}
            disabled={selectedCatalogIds.size === 0}
            data-testid={`${testId}-confirm-button`}
          >
            Add {selectedCatalogIds.size > 0 && `(${selectedCatalogIds.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CatalogSelector
