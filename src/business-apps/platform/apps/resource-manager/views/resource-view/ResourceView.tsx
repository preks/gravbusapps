import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { DataDisplay } from '@newwork/nw-design-system'
import { LinkIcon, TreeStructureIcon, LightningIcon, FolderIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { NavigationTab } from './tabs/navigation-tab/NavigationTab'
import { ActionTab } from './tabs/action-tab/ActionTab'
import { DebugTab } from './tabs/debug-tab/DebugTab'
import { NavigationItemsActions, MenuActions, ActionItemsActions, ContextActions } from './components/PrimaryActions'

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
  // Get initial tab from URL or default to first tab
  const getInitialTab = useCallback((): TabKey => {
    if (typeof globalThis.window === 'undefined') return 'navigations'
    const urlParams = new URLSearchParams(globalThis.window.location.search)
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
    if (typeof globalThis.window === 'undefined') return 'items'
    const urlParams = new URLSearchParams(globalThis.window.location.search)
    const subviewFromUrl = urlParams.get('subview')

    if (subviewFromUrl && VALID_NAV_SUBVIEWS.includes(subviewFromUrl as NavSubView)) {
      return subviewFromUrl as NavSubView
    }

    return 'items'
  }, [])

  // Get initial action subview from URL or default
  const getInitialActionSubview = useCallback((): ActionSubView => {
    if (typeof globalThis.window === 'undefined') return 'items'
    const urlParams = new URLSearchParams(globalThis.window.location.search)
    const subviewFromUrl = urlParams.get('subview')

    if (subviewFromUrl && VALID_ACTION_SUBVIEWS.includes(subviewFromUrl as ActionSubView)) {
      return subviewFromUrl as ActionSubView
    }

    return 'items'
  }, [])

  const [activeSection, setActiveSection] = useState<TabKey>(getInitialTab())

  // Track which tabs have been mounted to preserve their state
  const [mountedTabs, setMountedTabs] = useState<Set<TabKey>>(new Set([getInitialTab()]))

  const [urlResourcesViewCount, setUrlResourcesViewCount] = useState<number>(0)
  const [actionResourcesViewCount, setActionResourcesViewCount] = useState<number>(0)
  const [debugViewCount, setDebugViewCount] = useState<number>(0)
  const [urlResourcesLoading, setUrlResourcesLoading] = useState<boolean>(false)
  const [actionResourcesLoading, setActionResourcesLoading] = useState<boolean>(false)
  const [debugLoading] = useState<boolean>(false)

  // Sub-view state for NavigationTab
  const [navigationView, setNavigationView] = useState<NavSubView>(getInitialNavSubview())
  const [navigationItemsSearchValue, setNavigationItemsSearchValue] = useState<string>('')
  const [menuSearchValue, setMenuSearchValue] = useState<string>('')
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
  const [actionsSearchValue, setActionsSearchValue] = useState<string>('')
  const [contextsSearchValue, setContextsSearchValue] = useState<string>('')
  const [actionViewCounts, setActionViewCounts] = useState<{ items: number; contexts: number }>({
    items: 0,
    contexts: 0
  })
  const [actionViewLoading, setActionViewLoading] = useState<{ items: boolean; contexts: boolean }>({
    items: false,
    contexts: false
  })
  const [contextDialogOpen, setContextDialogOpen] = useState<boolean>(false)
  const [actionRefetch, setActionRefetch] = useState<(() => void) | null>(null)
  const [contextRefetch, setContextRefetch] = useState<(() => void) | null>(null)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [contextLoading, setContextLoading] = useState<boolean>(false)
  const [addAction, setAddAction] = useState<(() => void) | null>(null)
  const [addContext, setAddContext] = useState<(() => void) | null>(null)
  const [addNavigation, setAddNavigation] = useState<(() => void) | null>(null)
  const [, setAddMenuItem] = useState<(() => void) | null>(null)
  const [menuSaveAll, setMenuSaveAll] = useState<(() => Promise<void>) | null>(null)
  const [menuDiscardAll, setMenuDiscardAll] = useState<(() => void) | null>(null)
  const [menuHasChanges, setMenuHasChanges] = useState(false)
  const [menuIsSaving, setMenuIsSaving] = useState(false)

  // Update URL when tab or subview changes
  const updateUrl = useCallback((tab: string, subview?: string) => {
    if (typeof globalThis.window === 'undefined') return
    const urlParams = new URLSearchParams(globalThis.window.location.search)

    // Always set the tab parameter
    urlParams.set('tab', tab)

    // Set or clear subview parameter
    if (subview) {
      urlParams.set('subview', subview)
    } else {
      urlParams.delete('subview')
    }

    const newUrl = `${globalThis.window.location.pathname}?${urlParams.toString()}`
    globalThis.window.history.replaceState({}, '', newUrl)
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

  // Mark tab as mounted when it becomes active
  useEffect(() => {
    setMountedTabs(prev => {
      const newSet = new Set(prev)
      newSet.add(activeSection)
      return newSet
    })
  }, [activeSection])

  // Ensure URL always has tab parameter on initial load
  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return
    const urlParams = new URLSearchParams(globalThis.window.location.search)
    // Only set tab if we're in the resources view (view parameter should be set by parent)
    const viewParam = urlParams.get('view')
    if (viewParam === 'resources' && !urlParams.has('tab')) {
      const subview =
        activeSection === 'navigations' || activeSection === 'actions' ? navigationView || actionView : undefined
      updateUrl(activeSection, subview)
    }
  }, [activeSection, navigationView, actionView, updateUrl])

  // Listen for browser back/forward navigation
  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return
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

    globalThis.window.addEventListener('popstate', handlePopState)
    return () => globalThis.window.removeEventListener('popstate', handlePopState)
  }, [getInitialTab, getInitialNavSubview, getInitialActionSubview])

  // Get primary action based on active section and view
  const getPrimaryAction = useMemo(() => {
    if (activeSection === 'navigations') {
      if (navigationView === 'items') {
        return (
          <NavigationItemsActions
            addNavigation={addNavigation}
            navigationRefetch={navigationRefetch}
            urlResourcesLoading={urlResourcesLoading}
            dataTestId={dataTestId}
          />
        )
      } else if (navigationView === 'menu') {
        return (
          <MenuActions
            menuDiscardAll={menuDiscardAll}
            menuSaveAll={menuSaveAll}
            menuHasChanges={menuHasChanges}
            menuIsSaving={menuIsSaving}
            dataTestId={dataTestId}
          />
        )
      }
    } else if (activeSection === 'actions') {
      if (actionView === 'items') {
        return (
          <ActionItemsActions
            addAction={addAction}
            actionRefetch={actionRefetch}
            actionLoading={actionLoading}
            dataTestId={dataTestId}
          />
        )
      } else if (actionView === 'contexts') {
        return (
          <ContextActions
            addContext={addContext}
            contextRefetch={contextRefetch}
            contextLoading={contextLoading}
            dataTestId={dataTestId}
          />
        )
      }
    }
    return null
  }, [
    activeSection,
    navigationView,
    actionView,
    addNavigation,
    navigationRefetch,
    urlResourcesLoading,
    addAction,
    actionRefetch,
    actionLoading,
    addContext,
    contextRefetch,
    contextLoading,
    menuDiscardAll,
    menuSaveAll,
    menuHasChanges,
    menuIsSaving,
    dataTestId
  ])

  // View options for NavigationTab sub-views
  const navigationViewOptions = useMemo(() => {
    return [
      {
        value: 'items',
        label: 'URL Resources',
        icon: LinkIcon,
        metadata: {
          count: navigationViewCounts.items,
          isLoading: navigationViewLoading.items
        }
      },
      {
        value: 'menu',
        label: 'Menu Tree',
        icon: TreeStructureIcon,
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
        icon: LightningIcon,
        metadata: {
          count: actionViewCounts.items,
          isLoading: actionViewLoading.items
        }
      },
      {
        value: 'contexts',
        label: 'Context Items',
        icon: FolderIcon,
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
    setNavigationViewCounts(counts)
  }, [])

  const handleNavigationViewLoadingChange = useCallback((loading: { items: boolean; menu: boolean }) => {
    setNavigationViewLoading(loading)
  }, [])

  const handleActionViewCountChange = useCallback((counts: { items: number; contexts: number }) => {
    setActionViewCounts(counts)
  }, [])

  const handleActionViewLoadingChange = useCallback((loading: { items: boolean; contexts: boolean }) => {
    setActionViewLoading(loading)
  }, [])

  const handleNavigationRefetchChange = useCallback((refetch: () => void) => {
    setNavigationRefetch(() => refetch)
  }, [])

  const handleActionRefetchChange = useCallback((refetch: () => void) => {
    setActionRefetch(() => refetch)
  }, [])

  const handleContextRefetchChange = useCallback((refetch: () => void) => {
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
    setAddNavigation(() => addNavigationFn)
  }, [])

  const handleAddMenuItemChange = useCallback((addMenuItemFn: () => void) => {
    setAddMenuItem(() => addMenuItemFn)
  }, [])

  const handleMenuSaveAllChange = useCallback((saveAllFn: () => Promise<void>) => {
    setMenuSaveAll(() => saveAllFn)
  }, [])

  const handleMenuDiscardAllChange = useCallback((discardAllFn: () => void) => {
    setMenuDiscardAll(() => discardAllFn)
  }, [])

  const handleMenuHasChangesChange = useCallback((hasChanges: boolean) => {
    setMenuHasChanges(hasChanges)
  }, [])

  const handleMenuIsSavingChange = useCallback((isSaving: boolean) => {
    setMenuIsSaving(isSaving)
  }, [])

  // Get current search value and handler based on active section/view
  const currentSearchValue = useMemo(() => {
    if (activeSection === 'navigations') {
      return navigationView === 'items' ? navigationItemsSearchValue : menuSearchValue
    } else if (activeSection === 'actions') {
      return actionView === 'items' ? actionsSearchValue : contextsSearchValue
    }
    return ''
  }, [
    activeSection,
    navigationView,
    actionView,
    navigationItemsSearchValue,
    menuSearchValue,
    actionsSearchValue,
    contextsSearchValue
  ])

  const handleSearchChange = useCallback(
    (value: string) => {
      if (activeSection === 'navigations') {
        if (navigationView === 'items') {
          setNavigationItemsSearchValue(value)
        } else {
          setMenuSearchValue(value)
        }
      } else if (activeSection === 'actions') {
        if (actionView === 'items') {
          setActionsSearchValue(value)
        } else {
          setContextsSearchValue(value)
        }
      }
    },
    [activeSection, navigationView, actionView]
  )

  // Create a unique key for DataDisplay to force re-render when section/view changes
  // This ensures the searchValue prop is properly applied when switching between tables
  const dataDisplayKey = `${activeSection}-${currentView || ''}`

  return (
    <div data-testid={dataTestId}>
      <DataDisplay
        key={dataDisplayKey}
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
        searchValue={currentSearchValue}
        onSearchChange={handleSearchChange}
        viewOptions={currentViewOptions}
        currentView={currentView}
        onViewChange={activeSection === 'navigations' ? handleNavigationViewChange : handleActionViewChange}
        primaryAction={getPrimaryAction}
      >
        {/* Hybrid rendering: Mount tabs once, hide inactive ones to preserve state */}
        {mountedTabs.has('navigations') && (
          <div className={activeSection === 'navigations' ? '' : 'gba:hidden'}>
            <NavigationTab
              {...context}
              data-testid={`${dataTestId}-navigations`}
              itemsSearchValue={navigationItemsSearchValue}
              menuSearchValue={menuSearchValue}
              onItemsSearchValueChange={setNavigationItemsSearchValue}
              onMenuSearchValueChange={setMenuSearchValue}
              onCountChange={setUrlResourcesViewCount}
              onLoadingChange={setUrlResourcesLoading}
              currentView={navigationView}
              onViewChange={handleNavigationViewChange}
              onViewCountChange={handleNavigationViewCountChange}
              onViewLoadingChange={handleNavigationViewLoadingChange}
              onRefetchChange={handleNavigationRefetchChange}
              onAddNavigationChange={handleAddNavigationChange}
              onAddMenuItemChange={handleAddMenuItemChange}
              onMenuSaveAllChange={handleMenuSaveAllChange}
              onMenuDiscardAllChange={handleMenuDiscardAllChange}
              onMenuHasChangesChange={handleMenuHasChangesChange}
              onMenuIsSavingChange={handleMenuIsSavingChange}
              isActive={activeSection === 'navigations'}
              shouldInitialLoad={true}
            />
          </div>
        )}
        {mountedTabs.has('actions') && (
          <div className={activeSection === 'actions' ? '' : 'gba:hidden'}>
            <ActionTab
              {...context}
              data-testid={`${dataTestId}-actions`}
              actionsSearchValue={actionsSearchValue}
              contextsSearchValue={contextsSearchValue}
              onActionsSearchChange={setActionsSearchValue}
              onContextsSearchChange={setContextsSearchValue}
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
              contextDialogOpen={contextDialogOpen}
              onContextDialogOpenChange={setContextDialogOpen}
              isActive={activeSection === 'actions'}
              shouldInitialLoad={true}
            />
          </div>
        )}
        {mountedTabs.has('debug') && (
          <div className={activeSection === 'debug' ? '' : 'gba:hidden'}>
            <DebugTab
              {...context}
              data-testid={`${dataTestId}-debug`}
              onCountChange={setDebugViewCount}
              isActive={activeSection === 'debug'}
              shouldInitialLoad={true}
            />
          </div>
        )}
      </DataDisplay>
    </div>
  )
}
