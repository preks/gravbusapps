import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button, Popover, PopoverContent, PopoverTrigger, Spinner, Badge } from '@newwork/nw-design-system'
import { ChevronDown, X, Database, FileText } from 'lucide-react'
import { DebouncedInput } from '@/components/debounced-input'
import { useCatalogs, useCatalogEntries, Catalog, CatalogEntry } from '@/common/data/catalog'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface ParentCatalogEntrySelectorProps {
  value?: string // Parent entry ID
  onChange: (entryId: string | undefined) => void
  accessToken: string
  placeholder?: string
  disabled?: boolean
  'data-testid'?: string
}

interface SelectorState {
  catalogSearchTerm: string
  entrySearchTerm: string
  selectedCatalog: Catalog | null
  selectedEntry: CatalogEntry | null
  // Pagination state
  catalogPage: number
  entryPage: number
  catalogHasMore: boolean
  entryHasMore: boolean
}

const ITEMS_PER_PAGE = 20

export const ParentCatalogEntrySelector: React.FC<ParentCatalogEntrySelectorProps> = ({
  value,
  onChange,
  accessToken,
  placeholder = '',
  disabled = false,
  'data-testid': dataTestId = 'ParentCatalogEntrySelector'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [state, setState] = useState<SelectorState>({
    catalogSearchTerm: '',
    entrySearchTerm: '',
    selectedCatalog: null,
    selectedEntry: null,
    catalogPage: 1,
    entryPage: 1,
    catalogHasMore: true,
    entryHasMore: true
  })

  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [entries, setEntries] = useState<CatalogEntry[]>([])
  const [catalogsLoading, setCatalogsLoading] = useState(false)
  const [entriesLoading, setEntriesLoading] = useState(false)

  // Refs for scroll detection
  const catalogScrollRef = useRef<HTMLDivElement>(null)
  const entryScrollRef = useRef<HTMLDivElement>(null)

  // Use standardized GraphQL hooks
  const context = { accessToken } as BusinessAppContextProps
  const { fetchCatalogs } = useCatalogs(context)
  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken })

  // Load catalogs with pagination
  const loadCatalogs = useCallback(
    async (reset: boolean = false) => {
      if (!accessToken) return

      // Only show loading on initial load when we have no data
      if (reset && catalogs.length === 0) {
        setCatalogsLoading(true)
      }
      try {
        const variables = {
          limit: ITEMS_PER_PAGE,
          offset: reset ? 0 : (state.catalogPage - 1) * ITEMS_PER_PAGE,
          search: state.catalogSearchTerm || undefined
        }

        const searchVariables = state.catalogSearchTerm ? { ...variables, search: state.catalogSearchTerm } : variables
        const list = await fetchCatalogs(searchVariables)

        const pageItems = list.items || []
        setCatalogs(prev => (reset ? pageItems : [...prev, ...pageItems]))
        setState(prev => ({
          ...prev,
          catalogHasMore: (reset ? 0 : catalogs.length) + pageItems.length < (list.total || pageItems.length),
          catalogPage: reset ? 2 : prev.catalogPage + 1
        }))
      } catch (error) {
        console.error('Error loading catalogs:', error)
      } finally {
        // Only clear loading if we set it
        if (reset && catalogs.length === 0) {
          setCatalogsLoading(false)
        }
      }
    },
    [accessToken, fetchCatalogs, state.catalogSearchTerm, state.catalogPage, catalogs.length]
  )

  // Load catalog entries with pagination
  const loadEntries = useCallback(
    async (reset: boolean = false) => {
      if (!accessToken || !state.selectedCatalog) return

      // Only show loading on initial load when we have no data
      if (reset && entries.length === 0) {
        setEntriesLoading(true)
      }
      try {
        const variables = {
          limit: ITEMS_PER_PAGE,
          offset: reset ? 0 : (state.entryPage - 1) * ITEMS_PER_PAGE,
          search: state.entrySearchTerm || undefined
        }

        const { entries: pageEntries, totalCount } = await fetchCatalogEntriesByIdentifier(
          state.selectedCatalog.identifier,
          variables
        )

        setEntries(prev => (reset ? pageEntries : [...prev, ...pageEntries]))
        setState(prev => ({
          ...prev,
          entryHasMore: (reset ? 0 : entries.length) + pageEntries.length < totalCount,
          entryPage: reset ? 2 : prev.entryPage + 1
        }))
      } catch (error) {
        console.error('Error loading entries:', error)
      } finally {
        // Only clear loading if we set it
        if (reset && entries.length === 0) {
          setEntriesLoading(false)
        }
      }
    },
    [
      accessToken,
      fetchCatalogEntriesByIdentifier,
      state.selectedCatalog,
      state.entrySearchTerm,
      state.entryPage,
      entries.length
    ]
  )

  // Handle search changes
  const handleCatalogSearch = useCallback(
    (searchTerm: string) => {
      setState(prev => ({
        ...prev,
        catalogSearchTerm: searchTerm,
        catalogPage: 1,
        catalogHasMore: true
      }))
      setCatalogs([])
      // Load without triggering spinner since we're just changing search
      loadCatalogs(true)
    },
    [loadCatalogs]
  )

  const handleEntrySearch = useCallback(
    (searchTerm: string) => {
      setState(prev => ({
        ...prev,
        entrySearchTerm: searchTerm,
        entryPage: 1,
        entryHasMore: true
      }))
      setEntries([])
      // Load without triggering spinner since we're just changing search
      loadEntries(true)
    },
    [loadEntries]
  )

  // Scroll handlers for infinite scroll
  const handleCatalogScroll = useCallback(() => {
    if (!catalogScrollRef.current || catalogsLoading || !state.catalogHasMore) return

    const { scrollTop, scrollHeight, clientHeight } = catalogScrollRef.current
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      loadCatalogs(false)
    }
  }, [catalogsLoading, state.catalogHasMore, loadCatalogs])

  const handleEntryScroll = useCallback(() => {
    if (!entryScrollRef.current || entriesLoading || !state.entryHasMore) return

    const { scrollTop, scrollHeight, clientHeight } = entryScrollRef.current
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      loadEntries(false)
    }
  }, [entriesLoading, state.entryHasMore, loadEntries])

  // Selection handlers
  const handleCatalogSelect = useCallback((catalog: Catalog) => {
    setState(prev => ({
      ...prev,
      selectedCatalog: catalog,
      selectedEntry: null,
      entrySearchTerm: '',
      entryPage: 1,
      entryHasMore: true
    }))
    setEntries([])
  }, [])

  const handleEntrySelect = useCallback(
    (entry: CatalogEntry) => {
      setState(prev => ({ ...prev, selectedEntry: entry }))
      onChange(entry.id)
      setIsOpen(false)
    },
    [onChange]
  )

  // Clear selection
  const handleClear = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedCatalog: null,
      selectedEntry: null,
      catalogSearchTerm: '',
      entrySearchTerm: '',
      catalogPage: 1,
      entryPage: 1,
      catalogHasMore: true,
      entryHasMore: true
    }))
    setCatalogs([])
    setEntries([])
    onChange(undefined)
    setIsOpen(false)
  }, [onChange])

  // Initial load when popover opens
  useEffect(() => {
    if (isOpen && catalogs.length === 0) {
      // This will trigger loading spinner since we have no data
      loadCatalogs(true)
    }
  }, [isOpen, catalogs.length, loadCatalogs])

  // Reset search when popover closes
  useEffect(() => {
    if (!isOpen) {
      setState(prev => ({
        ...prev,
        catalogSearchTerm: '',
        entrySearchTerm: '',
        catalogPage: 1,
        entryPage: 1,
        catalogHasMore: true,
        entryHasMore: true
      }))
      setCatalogs([])
      setEntries([])
    }
  }, [isOpen])

  // Load entries when a catalog is selected (fixes double-click requirement)
  useEffect(() => {
    if (state.selectedCatalog) {
      loadEntries(true)
    }
  }, [state.selectedCatalog, loadEntries])

  // Display value
  const displayValue = state.selectedEntry
    ? `${state.selectedEntry.code || state.selectedEntry.id} (${state.selectedCatalog?.name || 'Unknown Catalog'})`
    : value
      ? `ID: ${value}`
      : ''

  return (
    <div className="gba:w-full" data-testid={dataTestId}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="gba:w-full gba:justify-between gba:h-6 gba:border-0 gba:bg-transparent gba:p-1 gba:text-xs gba:focus:bg-white gba:focus:border"
            style={{ minWidth: '150px' }}
            disabled={disabled}
            data-testid={`${dataTestId}-Trigger`}
          >
            <span className="gba:truncate">{displayValue || placeholder}</span>
            <div className="gba:flex gba:items-center gba:gap-1">
              {displayValue && (
                <X
                  className="gba:h-3 gba:w-3 gba:text-gray-500 gba:hover:text-gray-700"
                  onClick={e => {
                    e.stopPropagation()
                    handleClear()
                  }}
                />
              )}
              <ChevronDown className="gba:h-3 gba:w-3 gba:shrink-0 gba:opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="gba:[&&]:w-[600px] gba:p-0" align="start">
          <div className="gba:flex gba:h-[400px]">
            {/* Catalog Selection Panel */}
            <div className="gba:w-1/2 gba:border-r gba:border-gray-200">
              <div className="gba:p-3 gba:border-b gba:border-gray-200">
                <h4 className="gba:text-sm gba:font-medium gba:mb-2">Select Catalog</h4>
                <div className="gba:relative">
                  <DebouncedInput
                    placeholder="Search catalogs..."
                    className="gba:h-8 gba:text-xs"
                    value={state.catalogSearchTerm}
                    onChange={handleCatalogSearch}
                    data-testid={`${dataTestId}-CatalogSearch`}
                  />
                </div>
              </div>
              <div
                ref={catalogScrollRef}
                className="gba:max-h-[316px] gba:overflow-y-auto"
                onScroll={handleCatalogScroll}
              >
                {catalogs.map(catalog => (
                  <div
                    key={catalog.id}
                    className={`gba:p-2 gba:cursor-pointer gba:border-b gba:border-gray-100 gba:hover:bg-gray-50 ${
                      state.selectedCatalog?.id === catalog.id ? 'gba:bg-blue-50' : ''
                    }`}
                    onClick={() => handleCatalogSelect(catalog)}
                    data-testid={`${dataTestId}-CatalogOption-${catalog.id}`}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Database className="gba:h-3 gba:w-3 gba:text-blue-500" />
                      <div>
                        <div className="gba:text-xs gba:font-medium gba:truncate">{catalog.name}</div>
                        <div className="gba:text-xs gba:text-gray-500 gba:truncate">{catalog.identifier}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {catalogsLoading && (
                  <div className="gba:p-3 gba:flex gba:justify-center">
                    <Spinner size="sm" />
                  </div>
                )}
                {!state.catalogHasMore && catalogs.length > 0 && (
                  <div className="gba:p-2 gba:text-xs gba:text-gray-500 gba:text-center">All catalogs loaded</div>
                )}
                {catalogs.length === 0 && !catalogsLoading && (
                  <div className="gba:p-2 gba:text-xs gba:text-gray-500 gba:text-center">No catalogs found</div>
                )}
              </div>
            </div>

            {/* Catalog Entries Selection Panel */}
            <div className="gba:w-1/2">
              <div className="gba:p-3 gba:border-b gba:border-gray-200">
                <h4 className="gba:text-sm gba:font-medium gba:mb-2">Select Entry</h4>
                {state.selectedCatalog ? (
                  <div className="gba:relative">
                    <DebouncedInput
                      placeholder="Search entries..."
                      className="gba:h-8 gba:text-xs"
                      value={state.entrySearchTerm}
                      onChange={handleEntrySearch}
                      data-testid={`${dataTestId}-EntrySearch`}
                    />
                  </div>
                ) : (
                  <div className="gba:text-xs gba:text-gray-500">Select a catalog first</div>
                )}
              </div>
              <div ref={entryScrollRef} className="gba:max-h-[316px] gba:overflow-y-auto" onScroll={handleEntryScroll}>
                {state.selectedCatalog ? (
                  <>
                    {entries.map(entry => (
                      <div
                        key={entry.id}
                        className="gba:p-2 gba:cursor-pointer gba:border-b gba:border-gray-100 gba:hover:bg-gray-50"
                        onClick={() => handleEntrySelect(entry)}
                        data-testid={`${dataTestId}-EntryOption-${entry.id}`}
                      >
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <FileText className="gba:h-3 gba:w-3 gba:text-green-500" />
                          <div>
                            <div className="gba:text-xs gba:font-medium gba:truncate">
                              {entry.value || entry.code || entry.id}
                            </div>
                            {entry.code && entry.code !== entry.value && (
                              <div className="gba:text-xs gba:text-gray-500 gba:truncate">{entry.code}</div>
                            )}
                          </div>
                          <Badge variant="outline" className="gba:text-xs gba:ml-auto">
                            {entry.type || 'DEFAULT'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {entriesLoading && (
                      <div className="gba:p-3 gba:flex gba:justify-center">
                        <Spinner size="sm" />
                      </div>
                    )}
                    {!state.entryHasMore && entries.length > 0 && (
                      <div className="gba:p-2 gba:text-xs gba:text-gray-500 gba:text-center">All entries loaded</div>
                    )}
                    {entries.length === 0 && !entriesLoading && (
                      <div className="gba:p-3 gba:text-xs gba:text-gray-500 gba:text-center">No entries found</div>
                    )}
                  </>
                ) : (
                  <div className="gba:p-3 gba:text-xs gba:text-gray-500 gba:text-center">
                    Select a catalog to view entries
                  </div>
                )}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
