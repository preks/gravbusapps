import React, { useState, useEffect, useCallback } from 'react'
import {
  Button,
  Alert,
  PageHeader,
  IconAvatar,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@newwork/nw-design-system'
import { DatabaseIcon, X, XCircle } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CatalogListView } from './components/views/CatalogListView'
import { CatalogDetailView } from './components/views/CatalogDetailView'
import { Catalog } from '@/common/data/catalog'

interface CatalogManagerProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

interface CatalogTab {
  id: string
  catalog: Catalog
  isLoading?: boolean
}

interface TabState {
  activeTabId: string
  catalogTabs: CatalogTab[]
}

// Cache key for localStorage
const CATALOG_TABS_CACHE_KEY = 'catalog-manager-tabs'

export const CatalogManager: React.FC<CatalogManagerProps> = context => {
  const [tabState, setTabState] = useState<TabState>({
    activeTabId: 'catalogs',
    catalogTabs: []
  })
  const [error, setError] = useState<string | null>(null)

  // Load tabs from cache
  const loadTabsFromCache = useCallback((): CatalogTab[] => {
    try {
      const cached = localStorage.getItem(CATALOG_TABS_CACHE_KEY)
      if (cached) {
        const parsedTabs = JSON.parse(cached)
        return Array.isArray(parsedTabs) ? parsedTabs : []
      }
    } catch (error) {
      console.warn('Failed to load tabs from cache:', error)
    }
    return []
  }, [])

  // Save tabs to cache
  const saveTabsToCache = useCallback((tabs: CatalogTab[]) => {
    try {
      localStorage.setItem(CATALOG_TABS_CACHE_KEY, JSON.stringify(tabs))
    } catch (error) {
      console.warn('Failed to save tabs to cache:', error)
    }
  }, [])

  // Initialize tabs from cache and URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const identifier = urlParams.get('identifier')
    const version = urlParams.get('version')

    // Load cached tabs
    const cachedTabs = loadTabsFromCache()

    // If URL has catalog parameters, add/activate that tab
    if (identifier && version) {
      const tabId = `${identifier}:${version}`
      const existingTab = cachedTabs.find(tab => tab.id === tabId)

      if (existingTab) {
        // Tab exists in cache, just activate it
        setTabState({
          activeTabId: tabId,
          catalogTabs: cachedTabs
        })
      } else {
        // Create new tab; detail view will load full data itself
        const newTab: CatalogTab = {
          id: tabId,
          catalog: { identifier, version, name: identifier } as Catalog, // Use identifier as name initially
          isLoading: false
        }
        const updatedTabs = [...cachedTabs, newTab]

        setTabState({
          activeTabId: tabId,
          catalogTabs: updatedTabs
        })
      }
    } else {
      // No URL parameters, just load cached tabs
      setTabState(prev => ({
        ...prev,
        catalogTabs: cachedTabs
      }))
    }
  }, [loadTabsFromCache])

  // Save tabs to cache whenever they change
  useEffect(() => {
    saveTabsToCache(tabState.catalogTabs)
  }, [tabState.catalogTabs, saveTabsToCache])

  // No catalog data fetching here; DetailView handles its own data

  // Handle opening a catalog in a new tab
  const handleViewCatalog = (catalog: Catalog) => {
    const tabId = `${catalog.identifier}:${catalog.version}`

    // Check if tab already exists
    const existingTab = tabState.catalogTabs.find(tab => tab.id === tabId)

    if (existingTab) {
      // Just switch to existing tab
      setTabState(prev => ({ ...prev, activeTabId: tabId }))
    } else {
      // Create new tab
      const newTab: CatalogTab = {
        id: tabId,
        catalog,
        isLoading: false // Don't show loading in tab title
      }

      setTabState(prev => ({
        activeTabId: tabId,
        catalogTabs: [...prev.catalogTabs, newTab]
      }))

      // Detail view will fetch full catalog content if needed
    }

    // Update URL
    updateUrlForTab(tabId, catalog)
  }

  // Update URL for active tab
  const updateUrlForTab = (tabId: string, catalog?: Catalog) => {
    const url = new URL(window.location.href)

    if (tabId === 'catalogs') {
      url.searchParams.delete('identifier')
      url.searchParams.delete('version')
    } else if (catalog) {
      url.searchParams.set('identifier', catalog.identifier || '')
      url.searchParams.set('version', catalog.version || 'v1')
    }

    window.history.pushState({}, '', url.toString())
  }

  // Handle tab change
  const handleTabChange = (tabId: string) => {
    setTabState(prev => ({ ...prev, activeTabId: tabId }))

    if (tabId === 'catalogs') {
      updateUrlForTab(tabId)
    } else {
      const tab = tabState.catalogTabs.find(t => t.id === tabId)
      if (tab) {
        updateUrlForTab(tabId, tab.catalog)
      }
    }
  }

  // Close a catalog tab
  const handleCloseTab = (tabId: string) => {
    setTabState(prev => {
      const updatedTabs = prev.catalogTabs.filter(tab => tab.id !== tabId)
      const newActiveTabId = prev.activeTabId === tabId ? 'catalogs' : prev.activeTabId

      return {
        activeTabId: newActiveTabId,
        catalogTabs: updatedTabs
      }
    })

    // Update URL if we closed the active tab
    if (tabState.activeTabId === tabId) {
      updateUrlForTab('catalogs')
    }
  }

  // Close all catalog tabs
  const handleCloseAllTabs = () => {
    setTabState({
      activeTabId: 'catalogs',
      catalogTabs: []
    })
    updateUrlForTab('catalogs')
  }

  // Render tab content
  const renderTabContent = (tabId: string) => {
    if (tabId === 'catalogs') {
      return <CatalogListView onViewCatalog={handleViewCatalog} {...context} data-testid="CatalogManager-ListView" />
    }

    const tab = tabState.catalogTabs.find(t => t.id === tabId)
    if (!tab) {
      return (
        <div className="gba:p-6" data-testid="CatalogManager-TabNotFound">
          <Alert>
            <h4 className="gba:font-semibold">Tab Not Found</h4>
            <p className="gba:text-sm">The requested catalog tab could not be found.</p>
            <Button size="sm" onClick={() => handleTabChange('catalogs')} className="gba:mt-2">
              Back to Catalogs
            </Button>
          </Alert>
        </div>
      )
    }

    if (error && tabState.activeTabId === tabId) {
      return (
        <div className="gba:p-6" data-testid="CatalogManager-DetailError">
          <Alert variant="destructive">
            <h4 className="gba:font-semibold">Error Loading Catalog</h4>
            <p className="gba:text-sm">{error}</p>
            <div className="gba:mt-4 gba:flex gba:gap-2">
              <Button size="sm" onClick={() => handleTabChange('catalogs')}>
                Back to Catalogs
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleTabChange(tabId)}>
                Retry
              </Button>
            </div>
          </Alert>
        </div>
      )
    }

    return (
      <CatalogDetailView
        catalog={tab.catalog}
        onBack={() => handleTabChange('catalogs')}
        onViewCatalog={handleViewCatalog}
        isLoading={tab.isLoading || false}
        {...context}
        data-testid={`CatalogManager-DetailView-${tabId}`}
      />
    )
  }

  const getHeaderTitle = () => {
    return 'Catalog Manager'
  }

  const getHeaderDescription = () => {
    return 'Manage catalog definitions, entries, and hierarchies across the platform'
  }

  const renderHeaderIcon = () => (
    <IconAvatar icon={DatabaseIcon} variant="secondary" size="lg" decorative={false} label="Catalog Manager icon" />
  )

  // Render close button for catalog tabs
  const renderTabCloseButton = (tabId: string) => (
    <div
      onClick={e => {
        e.stopPropagation()
        handleCloseTab(tabId)
      }}
      className="gba:ml-2 gba:p-1 gba:rounded gba:hover:bg-gray-200 gba:transition-colors gba:cursor-pointer gba:flex gba:items-center gba:justify-center"
      title="Close tab"
      data-testid={`CatalogManager-CloseTab-${tabId}`}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          handleCloseTab(tabId)
        }
      }}
    >
      <X className="gba:h-3 gba:w-3" />
    </div>
  )

  return (
    <div data-testid="CatalogManager" className="gba:min-h-screen">
      <PageHeader icon={renderHeaderIcon()} title={getHeaderTitle()} description={getHeaderDescription()} />

      <div className="gba:flex-1" data-testid="CatalogManager-Content">
        <Tabs value={tabState.activeTabId} onValueChange={handleTabChange}>
          <div className="gba:border-b gba:bg-white gba:px-6">
            <TabsList className="gba:h-auto gba:p-0 gba:bg-transparent">
              {/* Main Catalogs Tab */}
              <TabsTrigger
                value="catalogs"
                className="gba:px-4 gba:py-3 gba:rounded-none gba:border-b-2 gba:border-transparent data-[state=active]:gba:border-blue-500 data-[state=active]:gba:bg-transparent"
                data-testid="CatalogManager-CatalogsTab"
              >
                Catalogs
              </TabsTrigger>

              {/* Dynamic Catalog Tabs */}
              {tabState.catalogTabs.map(tab => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="gba:px-4 gba:py-3 gba:rounded-none gba:border-b-2 gba:border-transparent data-[state=active]:gba:border-blue-500 data-[state=active]:gba:bg-transparent gba:flex gba:items-center"
                  data-testid={`CatalogManager-Tab-${tab.id}`}
                >
                  <span className="gba:flex gba:items-center gba:max-w-[200px]">
                    <span className="gba:truncate" title={tab.catalog.name || tab.catalog.identifier}>
                      {tab.catalog.name || tab.catalog.identifier}
                    </span>
                    {renderTabCloseButton(tab.id)}
                  </span>
                </TabsTrigger>
              ))}

              {/* Close All Tabs Button */}
              {tabState.catalogTabs.length > 0 && (
                <div className="gba:flex gba:items-center gba:px-4 gba:py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseAllTabs}
                    data-testid="CatalogManager-CloseAllTabs"
                    className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:h-auto gba:py-1"
                    style={{ color: 'var(--nw-color-text-secondary)' }}
                  >
                    <XCircle className="gba:h-3 gba:w-3" />
                    Close All
                  </Button>
                </div>
              )}
            </TabsList>
          </div>

          {/* Tab Content */}
          <TabsContent value="catalogs" className="gba:m-0 gba:p-0">
            {renderTabContent('catalogs')}
          </TabsContent>

          {tabState.catalogTabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id} className="gba:m-0 gba:p-0">
              {renderTabContent(tab.id)}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}

export default CatalogManager
