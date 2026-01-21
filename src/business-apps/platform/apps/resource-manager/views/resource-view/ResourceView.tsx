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

const VALID_TABS = ['navigations', 'actions', 'debug'] as const
type TabKey = (typeof VALID_TABS)[number]

const VALID_NAV_SUBVIEWS = ['items', 'menu'] as const
type NavSubView = (typeof VALID_NAV_SUBVIEWS)[number]

const VALID_ACTION_SUBVIEWS = ['items', 'contexts'] as const
type ActionSubView = (typeof VALID_ACTION_SUBVIEWS)[number]

export const ResourceView: React.FC<ResourceViewProps> = ({
  'data-testid': dataTestId = 'resource-view',
  ...context
}) => {
  // Performance logging refs
  const renderCountRef = useRef(0)
  const prevPropsRef = useRef<{ activeSection: string; actionView: string }>({ activeSection: '', actionView: '' })

  // Get initial tab from URL or default to first tab
  const getInitialTab = useCallback((): TabKey => {
    if (typeof window === 'undefined') return 'navigations'
    const urlParams = new URLSearchParams(window.location.search)
    const tabFromUrl = urlParams.get('tab')

    // Validate that the tab exists in our valid tabs
    if (tabFromUrl && VALID_TABS.includes(tabFromUrl as TabKey)) {
      return tabFromUrl as TabKey
    }

    // Default to first tab
    return 'navigations'
  }, [])

  // Get initial navigation subview from URL or default
  const getInitialNavSubview = useCallback((): NavSubView => {
    if (typeof window === 'undefined') return 'items'
    const urlParams = new URLSearchParams(window.location.search)
    const subviewFromUrl = urlParams.get('subview')

    if (subviewFromUrl && VALID_NAV_SUBVIEWS.includes(subviewFromUrl as NavSubView)) {
      return subviewFromUrl as NavSubView
    }

    return 'items'
  }, [])

  // Get initial action subview from URL or default
  const getInitialActionSubview = useCallback((): ActionSubView => {
    if (typeof window === 'undefined') return 'items'
    const urlParams = new URLSearchParams(window.location.search)
    const subviewFromUrl = urlParams.get('subview')

    if (subviewFromUrl && VALID_ACTION_SUBVIEWS.includes(subviewFromUrl as ActionSubView)) {
      return subviewFromUrl as ActionSubView
    }

    return 'items'
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
  const [navigationView, setNavigationView] = useState<NavSubView>(getInitialNavSubview())
  const [navigationViewCounts, setNavigationViewCounts] = useState<{ items: number; menu: number }>({
    items: 0,
    menu: 0
  })
  const [navigationViewLoading, setNavigationViewLoading] = useState<{ items: boolean; menu: boolean }>({
    items: false,
    menu: false
  })
  const [navigationRefetch, setNavigationRefetch] = useState<(() => void) | null>(null)

  // Sub-view state for ActionTab
  const [actionView, setActionView] = useState<ActionSubView>(getInitialActionSubview())
  const [actionViewCounts, setActionViewCounts] = useState<{ items: number; contexts: number }>({
    items: 0,
    contexts: 0
  })
  const [actionViewLoading, setActionViewLoading] = useState<{ items: boolean; contexts: boolean }>({
    items: false,
    contexts: false
  })
  const [actionDialogOpen, setActionDialogOpen] = useState<boolean>(false)
  const [contextDialogOpen, setContextDialogOpen] = useState<boolean>(false)
  const [actionRefetch, setActionRefetch] = useState<(() => void) | null>(null)
  const [contextRefetch, setContextRefetch] = useState<(() => void) | null>(null)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [contextLoading, setContextLoading] = useState<boolean>(false)
  const [addAction, setAddAction] = useState<(() => void) | null>(null)
  const [addContext, setAddContext] = useState<(() => void) | null>(null)
  const [addNavigation, setAddNavigation] = useState<(() => void) | null>(null)
  const [addMenuItem, setAddMenuItem] = useState<(() => void) | null>(null)

  // Performance logging (only in dev, after state declarations)
  if (process.env.NODE_ENV === 'development') {
    renderCountRef.current++
    const currentProps = { activeSection, actionView }
    const propsChanged =
      currentProps.activeSection !== prevPropsRef.current.activeSection ||
      currentProps.actionView !== prevPropsRef.current.actionView

    if (propsChanged || renderCountRef.current <= 3) {
      prevPropsRef.current = currentProps
    }
  }

  // Update URL when tab or subview changes
  const updateUrl = useCallback((tab: string, subview?: string) => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)

    // Always set the tab parameter
    urlParams.set('tab', tab)

    // Set or clear subview parameter
    if (subview) {
      urlParams.set('subview', subview)
    } else {
      urlParams.delete('subview')
    }

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

        // Set default subview based on the tab
        let defaultSubview: string | undefined
        if (section === 'navigations') {
          defaultSubview = 'items'
          setNavigationView('items')
        } else if (section === 'actions') {
          defaultSubview = 'items'
          setActionView('items')
        }

        updateUrl(section, defaultSubview)
      }
    },
    [activeSection, updateUrl]
  )

  // Ensure URL always has tab parameter on initial load
  useEffect(() => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)
    // Only set tab if we're in the resources view (view parameter should be set by parent)
    const viewParam = urlParams.get('view')
    if (viewParam === 'resources' && !urlParams.has('tab')) {
      const subview =
        activeSection === 'navigations' || activeSection === 'actions' ? navigationView || actionView : undefined
      updateUrl(activeSection, subview)
    }
  }, [activeSection, navigationView, actionView, updateUrl])

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

      if (newTab === 'navigations') {
        const newSubview = getInitialNavSubview()
        setNavigationView(newSubview)
      } else if (newTab === 'actions') {
        const newSubview = getInitialActionSubview()
        setActionView(newSubview)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [getInitialTab, getInitialNavSubview, getInitialActionSubview])

  // Get primary action based on active section and view
  const getPrimaryAction = useMemo(() => {
    if (activeSection === 'navigations') {
      // NavigationTab: Refresh button (for both items and Menu views now we also have Create)
      if (navigationView === 'items') {
        return (
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => addNavigation?.()}
              disabled={urlResourcesLoading}
              data-testid={`${dataTestId}-create-navigation-button`}
            >
              <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
              Create
            </Button>
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
          </div>
        )
      } else if (navigationView === 'menu') {
        return (
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => addMenuItem?.()}
              disabled={urlResourcesLoading}
              data-testid={`${dataTestId}-create-menu-item-button`}
            >
              <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
              Create
            </Button>
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
          </div>
        )
      }
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
    } else if (activeSection === 'actions') {
      // ActionTab: Create button + Refresh button based on view
      if (actionView === 'items') {
        return (
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => addAction?.()}
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
              onClick={() => addContext?.()}
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
    navigationView,
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
        value: 'items',
        label: 'URL Resources',
        icon: Link,
        metadata: {
          count: navigationViewCounts.items,
          isLoading: navigationViewLoading.items
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
    return [
      {
        value: 'items',
        label: 'Action Items',
        icon: Lightning,
        metadata: {
          count: actionViewCounts.items,
          isLoading: actionViewLoading.items
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
    if (activeSection === 'navigations') {
      return navigationViewOptions
    } else if (activeSection === 'actions') {
      return actionViewOptions
    }
    return undefined
  }, [activeSection, navigationViewOptions, actionViewOptions])

  // Get current view for current section
  const currentView = useMemo(() => {
    if (activeSection === 'navigations') {
      return navigationView
    } else if (activeSection === 'actions') {
      return actionView
    }
    return undefined
  }, [activeSection, navigationView, actionView])

  // Handle view change - no longer needed as parent manages it
  // Parent passes currentView and onViewChange props

  // Memoize callbacks to prevent unnecessary re-renders
  const handleNavigationViewChange = useCallback(
    (view: string) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[ResourceView] Navigation view changed', { view })
      }
      setNavigationView(view as NavSubView)
      updateUrl(activeSection, view)
    },
    [activeSection, updateUrl]
  )

  const handleActionViewChange = useCallback(
    (view: string) => {
      setActionView(view as ActionSubView)
      updateUrl(activeSection, view)
    },
    [activeSection, updateUrl]
  )

  const handleNavigationViewCountChange = useCallback((counts: { items: number; menu: number }) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ResourceView] Navigation view counts changed', counts)
    }
    setNavigationViewCounts(counts)
  }, [])

  const handleNavigationViewLoadingChange = useCallback((loading: { items: boolean; menu: boolean }) => {
    setNavigationViewLoading(loading)
  }, [])

  const handleActionViewCountChange = useCallback((counts: { items: number; contexts: number }) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ResourceView] Action view counts changed', counts)
    }
    setActionViewCounts(counts)
  }, [])

  const handleActionViewLoadingChange = useCallback((loading: { items: boolean; contexts: boolean }) => {
    setActionViewLoading(loading)
  }, [])

  const handleNavigationRefetchChange = useCallback((refetch: () => void) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ResourceView] Navigation refetch function set')
    }
    setNavigationRefetch(() => refetch)
  }, [])

  const handleActionRefetchChange = useCallback((refetch: () => void) => {
    setActionRefetch(() => refetch)
  }, [])

  const handleContextRefetchChange = useCallback((refetch: () => void) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ResourceView] Context refetch function set')
    }
    setContextRefetch(() => refetch)
  }, [])

  const handleActionLoadingChange = useCallback((loading: boolean) => {
    setActionLoading(loading)
  }, [])

  const handleContextLoadingChange = useCallback((loading: boolean) => {
    setContextLoading(loading)
  }, [])

  const handleAddActionChange = useCallback((addActionFn: () => void) => {
    setAddAction(() => addActionFn)
  }, [])

  const handleAddContextChange = useCallback((addContextFn: () => void) => {
    setAddContext(() => addContextFn)
  }, [])

  const handleAddNavigationChange = useCallback((addNavigationFn: () => void) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ResourceView] Add navigation function set')
    }
    setAddNavigation(() => addNavigationFn)
  }, [])

  const handleAddMenuItemChange = useCallback((addMenuItemFn: () => void) => {
    setAddMenuItem(() => addMenuItemFn)
  }, [])

  return (
    <div data-testid={dataTestId}>
      <DataDisplay
        titleSections={[
          {
            id: 'navigations',
            label: 'Navigations',
            metadata: {
              count: urlResourcesViewCount,
              isLoading: urlResourcesLoading
            }
          },
          {
            id: 'actions',
            label: 'Actions',
            metadata: {
              count: actionResourcesViewCount,
              isLoading: actionResourcesLoading
            }
          },
          {
            id: 'debug',
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
        onViewChange={activeSection === 'navigations' ? handleNavigationViewChange : handleActionViewChange}
        primaryAction={getPrimaryAction}
      >
        {/* Render all tabs but hide inactive ones - this allows initial loading of all sections */}
        <div className={activeSection === 'navigations' ? '' : 'gba:hidden'}>
          <NavigationTab
            {...context}
            data-testid={`${dataTestId}-navigations`}
            onCountChange={setUrlResourcesViewCount}
            onLoadingChange={setUrlResourcesLoading}
            currentView={navigationView}
            onViewChange={handleNavigationViewChange}
            onViewCountChange={handleNavigationViewCountChange}
            onViewLoadingChange={handleNavigationViewLoadingChange}
            onRefetchChange={handleNavigationRefetchChange}
            onAddNavigationChange={handleAddNavigationChange}
            onAddMenuItemChange={handleAddMenuItemChange}
            isActive={activeSection === 'navigations'}
            shouldInitialLoad={!hasInitialized}
          />
        </div>
        <div className={activeSection === 'actions' ? '' : 'gba:hidden'}>
          <ActionTab
            {...context}
            data-testid={`${dataTestId}-actions`}
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
            onAddActionChange={handleAddActionChange}
            onAddContextChange={handleAddContextChange}
            dialogOpen={actionDialogOpen}
            onDialogOpenChange={setActionDialogOpen}
            contextDialogOpen={contextDialogOpen}
            onContextDialogOpenChange={setContextDialogOpen}
            isActive={activeSection === 'actions'}
            shouldInitialLoad={!hasInitialized}
          />
        </div>
        <div className={activeSection === 'debug' ? '' : 'gba:hidden'}>
          <DebugTab
            {...context}
            data-testid={`${dataTestId}-debug`}
            onCountChange={setDebugViewCount}
            isActive={activeSection === 'debug'}
            shouldInitialLoad={!hasInitialized}
          />
        </div>
      </DataDisplay>
    </div>
  )
}
