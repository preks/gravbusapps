import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { DataDisplay, Button } from '@newwork/nw-design-system'
import { Link, TreeStructure, Lightning, Folder, Plus } from '@phosphor-icons/react'
import { RefreshCw } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { NavigationTab } from './tabs/navigation-tab/NavigationTab'
import { ActionTab } from './tabs/action-tab/ActionTab'
import { DebugTab } from './tabs/debug-tab/DebugTab'

interface ResourceViewProps extends BusinessAppContextProps {
  'data-testid'?: string
}

const VALID_TABS = ['url-resources', 'action-resources', 'debug-resources'] as const
type TabKey = (typeof VALID_TABS)[number]

export const ResourceView: React.FC<ResourceViewProps> = ({
  'data-testid': dataTestId = 'resource-view',
  ...context
}) => {
  // Performance logging refs
  const renderCountRef = useRef(0)
  const prevPropsRef = useRef<{ activeSection: string; actionView: string }>({ activeSection: '', actionView: '' })

  // Get initial tab from URL or default to first tab
  const getInitialTab = useCallback((): TabKey => {
    if (typeof window === 'undefined') return 'url-resources'
    const urlParams = new URLSearchParams(window.location.search)
    const tabFromUrl = urlParams.get('tabs')

    // Validate that the tab exists in our valid tabs
    if (tabFromUrl && VALID_TABS.includes(tabFromUrl as TabKey)) {
      return tabFromUrl as TabKey
    }

    // Default to first tab
    return 'url-resources'
  }, [])

  const [activeSection, setActiveSection] = useState<TabKey>(getInitialTab())
  const [urlResourcesViewCount, setUrlResourcesViewCount] = useState<number>(0)
  const [actionResourcesViewCount, setActionResourcesViewCount] = useState<number>(0)
  const [debugViewCount, setDebugViewCount] = useState<number>(0)
  const [urlResourcesLoading, setUrlResourcesLoading] = useState<boolean>(false)
  const [actionResourcesLoading, setActionResourcesLoading] = useState<boolean>(false)
  const [debugLoading] = useState<boolean>(false)
  const [hasInitialized, setHasInitialized] = useState(false)

  // Sub-view state for NavigationTab
  const [navigationView, setNavigationView] = useState<string>('urls')
  const [navigationViewCounts, setNavigationViewCounts] = useState<{ urls: number; menu: number }>({ urls: 0, menu: 0 })
  const [navigationViewLoading, setNavigationViewLoading] = useState<{ urls: boolean; menu: boolean }>({
    urls: false,
    menu: false
  })
  const [navigationRefetch, setNavigationRefetch] = useState<(() => void) | null>(null)

  // Sub-view state for ActionTab
  const [actionView, setActionView] = useState<string>('actions')
  const [actionViewCounts, setActionViewCounts] = useState<{ actions: number; contexts: number }>({
    actions: 0,
    contexts: 0
  })
  const [actionViewLoading, setActionViewLoading] = useState<{ actions: boolean; contexts: boolean }>({
    actions: false,
    contexts: false
  })
  const [actionDialogOpen, setActionDialogOpen] = useState<boolean>(false)
  const [contextDialogOpen, setContextDialogOpen] = useState<boolean>(false)
  const [actionRefetch, setActionRefetch] = useState<(() => void) | null>(null)
  const [contextRefetch, setContextRefetch] = useState<(() => void) | null>(null)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [contextLoading, setContextLoading] = useState<boolean>(false)

  // Performance logging (only in dev, after state declarations)
  if (process.env.NODE_ENV === 'development') {
    renderCountRef.current++
    const currentProps = { activeSection, actionView }
    const propsChanged =
      currentProps.activeSection !== prevPropsRef.current.activeSection ||
      currentProps.actionView !== prevPropsRef.current.actionView

    if (propsChanged || renderCountRef.current <= 3) {
      console.log(`[ResourceView] Render #${renderCountRef.current}`, {
        propsChanged,
        currentProps,
        timestamp: new Date().toISOString()
      })
      prevPropsRef.current = currentProps
    }
  }

  // Update URL when tab changes
  const updateUrl = useCallback((tab: string) => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)

    // Always set the tabs parameter
    urlParams.set('tabs', tab)

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }, [])

  const handleSectionChange = useCallback(
    (section: string) => {
      if (!section || section === activeSection) {
        return
      }
      if (VALID_TABS.includes(section as TabKey)) {
        setActiveSection(section as TabKey)
        updateUrl(section)
      }
    },
    [activeSection, updateUrl]
  )

  // Ensure URL always has tabs parameter on initial load
  useEffect(() => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)
    // Only set tabs if we're in the resources view (view parameter should be set by parent)
    const viewParam = urlParams.get('view')
    if (viewParam === 'resources' && !urlParams.has('tabs')) {
      updateUrl(activeSection)
    }
  }, [activeSection, updateUrl])

  // Initial load: Load all sections when view opens (not just the active one)
  useEffect(() => {
    if (hasInitialized) return

    // Trigger initial load for all tabs
    // They will load their data even if not rendered (shouldInitialLoad prop)
    setHasInitialized(true)
  }, [hasInitialized])

  // Listen for browser back/forward navigation
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handlePopState = () => {
      const newTab = getInitialTab()
      setActiveSection(newTab)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [getInitialTab])

  // Get primary action based on active section and view
  const getPrimaryAction = useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ResourceView] getPrimaryAction recalculated', { activeSection, actionView })
    }
    if (activeSection === 'url-resources') {
      // NavigationTab: Refresh button
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            navigationRefetch?.()
          }}
          disabled={urlResourcesLoading}
        >
          <RefreshCw className={`gba:h-4 gba:w-4 ${urlResourcesLoading ? 'gba:animate-spin' : ''}`} />
        </Button>
      )
    } else if (activeSection === 'action-resources') {
      // ActionTab: Create button + Refresh button based on view
      if (actionView === 'actions') {
        return (
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setActionDialogOpen(true)}
              disabled={actionLoading}
              data-testid={`${dataTestId}-create-action-button`}
            >
              <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
              Create
            </Button>
            <Button variant="outline" size="sm" onClick={() => actionRefetch?.()} disabled={actionLoading}>
              <RefreshCw className={`gba:h-4 gba:w-4 ${actionLoading ? 'gba:animate-spin' : ''}`} />
            </Button>
          </div>
        )
      } else if (actionView === 'contexts') {
        return (
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setContextDialogOpen(true)}
              disabled={contextLoading}
              data-testid={`${dataTestId}-create-context-button`}
            >
              <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
              Create
            </Button>
            <Button variant="outline" size="sm" onClick={() => contextRefetch?.()} disabled={contextLoading}>
              <RefreshCw className={`gba:h-4 gba:w-4 ${contextLoading ? 'gba:animate-spin' : ''}`} />
            </Button>
          </div>
        )
      }
    }
    return null
  }, [
    activeSection,
    actionView,
    urlResourcesLoading,
    actionLoading,
    contextLoading,
    navigationRefetch,
    actionRefetch,
    contextRefetch,
    dataTestId
  ])

  // View options for NavigationTab sub-views
  const navigationViewOptions = useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ResourceView] navigationViewOptions recalculated', { navigationViewCounts, navigationViewLoading })
    }
    return [
      {
        value: 'urls',
        label: 'URL Resources',
        icon: Link,
        metadata: {
          count: navigationViewCounts.urls,
          isLoading: navigationViewLoading.urls
        }
      },
      {
        value: 'menu',
        label: 'Menu Tree',
        icon: TreeStructure,
        metadata: {
          count: navigationViewCounts.menu,
          isLoading: navigationViewLoading.menu
        }
      }
    ]
  }, [navigationViewCounts, navigationViewLoading])

  // View options for ActionTab sub-views
  const actionViewOptions = useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ResourceView] actionViewOptions recalculated', { actionViewCounts, actionViewLoading })
    }
    return [
      {
        value: 'actions',
        label: 'Action Items',
        icon: Lightning,
        metadata: {
          count: actionViewCounts.actions,
          isLoading: actionViewLoading.actions
        }
      },
      {
        value: 'contexts',
        label: 'Context Items',
        icon: Folder,
        metadata: {
          count: actionViewCounts.contexts,
          isLoading: actionViewLoading.contexts
        }
      }
    ]
  }, [actionViewCounts, actionViewLoading])

  // Get viewOptions for current section
  const currentViewOptions = useMemo(() => {
    if (activeSection === 'url-resources') {
      return navigationViewOptions
    } else if (activeSection === 'action-resources') {
      return actionViewOptions
    }
    return undefined
  }, [activeSection, navigationViewOptions, actionViewOptions])

  // Get current view for current section
  const currentView = useMemo(() => {
    if (activeSection === 'url-resources') {
      return navigationView
    } else if (activeSection === 'action-resources') {
      return actionView
    }
    return undefined
  }, [activeSection, navigationView, actionView])

  // Handle view change for sub-views
  const handleViewChange = useCallback(
    (view: string) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[ResourceView] handleViewChange called', { activeSection, view })
      }
      if (activeSection === 'url-resources') {
        setNavigationView(view)
      } else if (activeSection === 'action-resources') {
        setActionView(view)
      }
    },
    [activeSection]
  )

  // Memoize callbacks to prevent unnecessary re-renders
  const handleNavigationViewChange = useCallback((view: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ResourceView] Navigation view changed', { view })
    }
    setNavigationView(view)
  }, [])

  const handleActionViewChange = useCallback((view: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ResourceView] Action view changed', { view })
    }
    setActionView(view)
  }, [])

  const handleNavigationViewCountChange = useCallback((counts: { urls: number; menu: number }) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ResourceView] Navigation view counts changed', counts)
    }
    setNavigationViewCounts(counts)
  }, [])

  const handleNavigationViewLoadingChange = useCallback((loading: { urls: boolean; menu: boolean }) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ResourceView] Navigation view loading changed', loading)
    }
    setNavigationViewLoading(loading)
  }, [])

  const handleActionViewCountChange = useCallback((counts: { actions: number; contexts: number }) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ResourceView] Action view counts changed', counts)
    }
    setActionViewCounts(counts)
  }, [])

  const handleActionViewLoadingChange = useCallback((loading: { actions: boolean; contexts: boolean }) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ResourceView] Action view loading changed', loading)
    }
    setActionViewLoading(loading)
  }, [])

  const handleNavigationRefetchChange = useCallback((refetch: () => void) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ResourceView] Navigation refetch function set')
    }
    setNavigationRefetch(() => refetch)
  }, [])

  const handleActionRefetchChange = useCallback((refetch: () => void) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ResourceView] Action refetch function set')
    }
    setActionRefetch(() => refetch)
  }, [])

  const handleContextRefetchChange = useCallback((refetch: () => void) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ResourceView] Context refetch function set')
    }
    setContextRefetch(() => refetch)
  }, [])

  const handleActionLoadingChange = useCallback((loading: boolean) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ResourceView] Action loading changed', { loading })
    }
    setActionLoading(loading)
  }, [])

  const handleContextLoadingChange = useCallback((loading: boolean) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ResourceView] Context loading changed', { loading })
    }
    setContextLoading(loading)
  }, [])

  return (
    <div data-testid={dataTestId}>
      <DataDisplay
        titleSections={[
          {
            id: 'url-resources',
            label: 'Navigations',
            metadata: {
              count: urlResourcesViewCount,
              isLoading: urlResourcesLoading
            }
          },
          {
            id: 'action-resources',
            label: 'Actions',
            metadata: {
              count: actionResourcesViewCount,
              isLoading: actionResourcesLoading
            }
          },
          {
            id: 'debug-resources',
            label: 'Debug',
            metadata: {
              count: debugViewCount,
              isLoading: debugLoading
            }
          }
        ]}
        currentSection={activeSection}
        onSectionChange={handleSectionChange}
        viewOptions={currentViewOptions}
        currentView={currentView}
        onViewChange={handleViewChange}
        primaryAction={getPrimaryAction}
      >
        {/* Render all tabs but hide inactive ones - this allows initial loading of all sections */}
        <div className={activeSection === 'url-resources' ? '' : 'gba:hidden'}>
          <NavigationTab
            {...context}
            data-testid={`${dataTestId}-url-resources`}
            onCountChange={setUrlResourcesViewCount}
            onLoadingChange={setUrlResourcesLoading}
            currentView={navigationView}
            onViewChange={handleNavigationViewChange}
            onViewCountChange={handleNavigationViewCountChange}
            onViewLoadingChange={handleNavigationViewLoadingChange}
            onRefetchChange={handleNavigationRefetchChange}
            isActive={activeSection === 'url-resources'}
            shouldInitialLoad={!hasInitialized}
          />
        </div>
        <div className={activeSection === 'action-resources' ? '' : 'gba:hidden'}>
          <ActionTab
            {...context}
            data-testid={`${dataTestId}-action-resources`}
            onCountChange={setActionResourcesViewCount}
            onLoadingChange={setActionResourcesLoading}
            currentView={actionView}
            onViewChange={handleActionViewChange}
            onViewCountChange={handleActionViewCountChange}
            onViewLoadingChange={handleActionViewLoadingChange}
            onActionRefetchChange={handleActionRefetchChange}
            onContextRefetchChange={handleContextRefetchChange}
            onActionLoadingChange={handleActionLoadingChange}
            onContextLoadingChange={handleContextLoadingChange}
            dialogOpen={actionDialogOpen}
            onDialogOpenChange={setActionDialogOpen}
            contextDialogOpen={contextDialogOpen}
            onContextDialogOpenChange={setContextDialogOpen}
            isActive={activeSection === 'action-resources'}
            shouldInitialLoad={!hasInitialized}
          />
        </div>
        <div className={activeSection === 'debug-resources' ? '' : 'gba:hidden'}>
          <DebugTab
            {...context}
            data-testid={`${dataTestId}-debug-resources`}
            onCountChange={setDebugViewCount}
            isActive={activeSection === 'debug-resources'}
            shouldInitialLoad={!hasInitialized}
          />
        </div>
      </DataDisplay>
    </div>
  )
}
