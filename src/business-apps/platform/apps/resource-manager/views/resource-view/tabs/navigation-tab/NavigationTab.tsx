import React, { useCallback, useMemo, useState, useEffect, useLayoutEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useNavigations } from '@/common/data/resources/hooks/useNavigations'
import { useMenuItems } from '@/common/data/resources/hooks/useMenuItems'
import { useUpdateNavigation } from '@/common/data/resources/hooks/useUpdateNavigation'
import { useCreateNavigation } from '@/common/data/resources/hooks/useCreateNavigation'
import { useDeleteNavigation } from '@/common/data/resources/hooks/useDeleteNavigation'
import { useRolesCatalog } from '@/common/data/resources/hooks/useRolesCatalog'
import { useFeaturesCatalog } from '@/common/data/resources/hooks/useFeaturesCatalog'
import type { GetNavigationsParams } from '@/common/data/resources/types/navigation.types'
import type { MenuItemDTO } from '@/common/data/resources/types/menuItem.types'
import { NavigationTable } from './navigation-table/NavigationTable'
import { MenuTable } from './menu-table/MenuTable'
import type { NavigationWithMenuItems } from './navigation-table/types/NavigationTypes'

interface NavigationTabProps extends BusinessAppContextProps {
  'data-testid'?: string
  itemsSearchValue?: string
  menuSearchValue?: string
  onItemsSearchValueChange?: (value: string) => void
  onMenuSearchValueChange?: (value: string) => void
  onCountChange?: (count: number) => void
  onLoadingChange?: (isLoading: boolean) => void
  currentView?: string
  onViewChange?: (view: string) => void
  onViewCountChange?: (counts: { items: number; menu: number }) => void
  onViewLoadingChange?: (loading: { items: boolean; menu: boolean }) => void
  onRefetchChange?: (refetch: () => void) => void
  isActive?: boolean
  shouldInitialLoad?: boolean
  onAddNavigationChange?: (addNavigation: () => void) => void
  onAddMenuItemChange?: (addMenuItem: () => void) => void
  onMenuSaveAllChange?: (saveAll: () => Promise<void>) => void
  onMenuDiscardAllChange?: (discardAll: () => void) => void
  onMenuHasChangesChange?: (hasChanges: boolean) => void
  onMenuIsSavingChange?: (isSaving: boolean) => void
}

const NavigationTabComponent: React.FC<NavigationTabProps> = ({
  'data-testid': dataTestId = 'navigation-tab',
  onCountChange,
  onLoadingChange,
  currentView: externalCurrentView,
  itemsSearchValue: externalItemsSearchValue,
  menuSearchValue: externalMenuSearchValue,
  onItemsSearchValueChange,
  onMenuSearchValueChange,
  onViewCountChange,
  onViewLoadingChange,
  onRefetchChange,
  isActive = true,
  shouldInitialLoad = false,
  onAddNavigationChange,
  onAddMenuItemChange,
  onMenuSaveAllChange,
  onMenuDiscardAllChange,
  onMenuHasChangesChange,
  onMenuIsSavingChange,
  ...context
}) => {
  // Refs to hold add functions from tables
  const addNavigationRef = React.useRef<(() => void) | null>(null)
  const addMenuItemRef = React.useRef<(() => void) | null>(null)

  // Get initial view from URL or default to 'items'
  const getInitialView = useCallback(() => {
    if (globalThis.window === undefined) return 'items'
    const urlParams = new URLSearchParams(globalThis.window.location.search)
    const viewFromUrl = urlParams.get('subview')

    if (viewFromUrl === 'menu' || viewFromUrl === 'items') {
      return viewFromUrl
    }

    return 'items'
  }, [])

  const [internalCurrentView] = useState<string>(getInitialView())
  const currentView = externalCurrentView ?? internalCurrentView

  // Separate search states for items and menu
  const [internalItemsSearchValue, setInternalItemsSearchValue] = useState<string>('')
  const [internalMenuSearchValue, setInternalMenuSearchValue] = useState<string>('')
  const itemsSearchValue = externalItemsSearchValue ?? internalItemsSearchValue
  const menuSearchValue = externalMenuSearchValue ?? internalMenuSearchValue
  const setItemsSearchValue = onItemsSearchValueChange ?? setInternalItemsSearchValue
  const setMenuSearchValue = onMenuSearchValueChange ?? setInternalMenuSearchValue

  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([])

  // Pagination state for URLs view
  const [urlsPagination, setUrlsPagination] = useState({ pageIndex: 0, pageSize: 20 })

  // Track what has been loaded to prevent duplicate requests
  const loadedRef = useRef({
    navigations: false,
    menuItems: false,
    initialLoadDone: false
  })

  // Build API params for search and sort
  const navigationParams = useMemo<GetNavigationsParams | undefined>(() => {
    if (currentView !== 'items') return undefined

    const params: GetNavigationsParams = {}
    if (itemsSearchValue.trim()) {
      params.search = itemsSearchValue.trim()
    }
    if (sorting.length > 0) {
      const sort = sorting[0]
      params.sort = `${sort.desc ? '-' : '+'}${sort.id}`
    }
    // Add pagination parameters
    params.limit = urlsPagination.pageSize
    params.offset = urlsPagination.pageIndex * urlsPagination.pageSize

    return params
  }, [currentView, itemsSearchValue, sorting, urlsPagination])

  // Always create hooks (data persists when section is hidden)
  const {
    navigations,
    totalCount: navigationsTotalCount,
    isLoading: navigationsLoading,
    error: navigationsError,
    refetch: refetchNavigations,
    loadMore: loadMoreNavigations,
    hasMore: hasMoreNavigations
  } = useNavigations(context, navigationParams)

  const {
    menuItems,
    isLoading: menuItemsLoading,
    error: menuItemsError,
    refetch: refetchMenuItems
  } = useMenuItems(context)

  const { updateNavigation, error: updateError } = useUpdateNavigation(context)
  const { createNavigation } = useCreateNavigation(context)
  const { deleteNavigation, isLoading: isDeleting } = useDeleteNavigation(context)

  // Handle add navigation - call the function from NavigationTable via ref
  const handleAddNavigation = useCallback(() => {
    if (addNavigationRef.current) {
      addNavigationRef.current()
    }
  }, [])

  // Handle add menu item - call the function from MenuTable via ref
  const handleAddMenuItem = useCallback(() => {
    if (addMenuItemRef.current) {
      addMenuItemRef.current()
    }
  }, [])

  // Expose handleAddNavigation to parent via callback
  React.useEffect(() => {
    if (onAddNavigationChange) {
      onAddNavigationChange(handleAddNavigation)
    }
  }, [onAddNavigationChange, handleAddNavigation])

  // Expose handleAddMenuItem to parent via callback
  React.useEffect(() => {
    if (onAddMenuItemChange) {
      onAddMenuItemChange(handleAddMenuItem)
    }
  }, [onAddMenuItemChange, handleAddMenuItem])

  // Roles and Features catalogs - lazy loaded
  const {
    roles: roleOptions,
    isLoading: rolesLoading,
    error: rolesError,
    refetch: refetchRoles,
    onSearch: onSearchRoles,
    loadMore: loadMoreRoles,
    hasMore: hasMoreRoles
  } = useRolesCatalog(context)
  const {
    features: featureOptions,
    isLoading: featuresLoading,
    error: featuresError,
    refetch: refetchFeatures
  } = useFeaturesCatalog(context)

  // Track when data has been successfully loaded (not just requested)
  useEffect(() => {
    if (!navigationsLoading && navigations.length > 0) {
      loadedRef.current.navigations = true
    }
  }, [navigationsLoading, navigations.length])

  useEffect(() => {
    if (!menuItemsLoading && menuItems.length > 0) {
      loadedRef.current.menuItems = true
    }
  }, [menuItemsLoading, menuItems.length])

  // Initial load: Load ALL data when view opens (both urls and menu) - not waiting for section to be active
  useEffect(() => {
    if (shouldInitialLoad && !loadedRef.current.initialLoadDone) {
      // Load both views for initial counts - load immediately when view opens
      if (!loadedRef.current.navigations && !navigationsLoading) {
        refetchNavigations().catch(() => {})
      }
      if (!loadedRef.current.menuItems && !menuItemsLoading) {
        refetchMenuItems().catch(() => {})
      }
      loadedRef.current.initialLoadDone = true
    }
  }, [shouldInitialLoad, navigationsLoading, menuItemsLoading, refetchNavigations, refetchMenuItems])

  // Refetch navigations when search, pagination, or sorting changes (for server-side pagination)
  useEffect(() => {
    if (currentView === 'items' && loadedRef.current.initialLoadDone) {
      refetchNavigations().catch(() => {})
    }
  }, [urlsPagination, itemsSearchValue, sorting, currentView, refetchNavigations, navigationParams])

  // DO NOT reload when sub-view changes - data is already loaded initially

  // Track what has been preloaded to prevent duplicate requests
  const preloadedRef = useRef({
    roles: false,
    features: false
  })

  // Preload roles/features ONCE when navigations are loaded (same as ActionTab)
  // Load always when navigations are present, not just when they have roles/features
  useEffect(() => {
    if (!isActive || currentView !== 'items' || navigations.length === 0) return

    // Always preload roles/features if not already loaded (like ActionTab does)
    // Only preload once if no error and data not already loaded
    if (!preloadedRef.current.roles && roleOptions.length === 0 && !rolesLoading && !rolesError) {
      preloadedRef.current.roles = true
      refetchRoles().catch(() => {
        // Silently handle errors - hasError flag will prevent retries
      })
    }
    if (!preloadedRef.current.features && featureOptions.length === 0 && !featuresLoading && !featuresError) {
      preloadedRef.current.features = true
      refetchFeatures().catch(() => {
        // Silently handle errors - hasError flag will prevent retries
      })
    }
  }, [
    isActive,
    currentView,
    navigations.length,
    roleOptions.length,
    rolesLoading,
    rolesError,
    featuresLoading,
    featuresError,
    featureOptions.length,
    refetchRoles,
    refetchFeatures
  ])

  const error = navigationsError || menuItemsError || updateError

  // Determine initial loading state (only when data hasn't been loaded yet)
  const isNavigationsInitialLoading = navigationsLoading && !loadedRef.current.navigations
  const isMenuItemsInitialLoading = menuItemsLoading && !loadedRef.current.menuItems

  // Update count and loading state based on current view
  useEffect(() => {
    if (currentView === 'items') {
      onCountChange?.(navigationsTotalCount)
      onLoadingChange?.(isNavigationsInitialLoading)
    } else if (currentView === 'menu') {
      onCountChange?.(menuItems.length)
      onLoadingChange?.(isMenuItemsInitialLoading)
    }
  }, [
    currentView,
    navigationsTotalCount,
    menuItems.length,
    isNavigationsInitialLoading,
    isMenuItemsInitialLoading,
    onCountChange,
    onLoadingChange
  ])

  // URL is now managed by parent (ResourceView) via subview parameter
  // No need for updateUrl callback

  // Store previous values to avoid unnecessary updates
  const prevCountsRef = useRef<{ items: number; menu: number }>({ items: 0, menu: 0 })
  const prevLoadingRef = useRef<{ items: boolean; menu: boolean }>({ items: false, menu: false })

  // Batch all parent updates in a single useLayoutEffect to minimize re-renders
  useLayoutEffect(() => {
    // Use totalCount from hooks if available, otherwise use length (for menu items which don't have totalCount)
    const newCounts = {
      items: navigationsTotalCount, // Use API totalCount
      menu: menuItems.length // Menu items don't have totalCount from API, use length
    }
    const newLoading = { items: isNavigationsInitialLoading, menu: isMenuItemsInitialLoading }

    // Only update if values actually changed
    const countsChanged =
      newCounts.items !== prevCountsRef.current.items || newCounts.menu !== prevCountsRef.current.menu
    const loadingChanged =
      newLoading.items !== prevLoadingRef.current.items || newLoading.menu !== prevLoadingRef.current.menu

    if (countsChanged || loadingChanged) {
      if (countsChanged && onViewCountChange) {
        prevCountsRef.current = newCounts
        onViewCountChange(newCounts)
      }

      if (loadingChanged && onViewLoadingChange) {
        prevLoadingRef.current = newLoading
        onViewLoadingChange(newLoading)
      }
    }

    // Set refetch function (direct callback)
    if (onRefetchChange) {
      onRefetchChange(() => {
        refetchNavigations()
        refetchMenuItems()
      })
    }
  }, [
    navigations.length,
    menuItems.length,
    isNavigationsInitialLoading,
    isMenuItemsInitialLoading,
    onViewCountChange,
    onViewLoadingChange,
    onRefetchChange,
    refetchNavigations,
    refetchMenuItems
  ])

  // Use navigations directly - menuItems and hubs come from the API response
  const enrichedNavigations = useMemo(() => {
    return navigations.map(nav => {
      // Combine hubs and menuItems from the navigation response
      // The API returns hubs and menuItems as separate arrays within each navigation
      const hubs: MenuItemDTO[] = (nav.hubs || []).map(
        hub =>
          ({
            id: hub.id,
            name: hub.name,
            code: hub.code,
            type: hub.type,
            resourceUrlId: nav.id,
            level: 0, // Hubs are level 0
            ...hub
          }) as MenuItemDTO
      )

      const menuItems: MenuItemDTO[] = (nav.menuItems || []).map(
        item =>
          ({
            ...item,
            resourceUrlId: nav.id,
            level: item.level ?? 1 // Menu items are level 1+
          }) as MenuItemDTO
      )

      // Combined list for easier access (no visual distinction between hubs and menu items)
      const allMenuItems: MenuItemDTO[] = [...hubs, ...menuItems]

      return {
        ...nav,
        hubs,
        menuItems,
        allMenuItems
      } as NavigationWithMenuItems
    })
  }, [navigations])

  // Handle delete navigation
  const handleDelete = useCallback(
    async (navigation: NavigationWithMenuItems) => {
      if (
        !globalThis.window.confirm(
          `Are you sure you want to delete navigation "${navigation.name || navigation.code}"?`
        )
      ) {
        return
      }

      const success = await deleteNavigation(navigation.id)
      if (success) {
        await refetchNavigations()
      }
    },
    [deleteNavigation, refetchNavigations]
  )

  return (
    <>
      {currentView === 'items' && (
        <NavigationTable
          enrichedNavigations={enrichedNavigations}
          navigations={navigations}
          totalCount={navigationsTotalCount}
          isLoading={isNavigationsInitialLoading}
          error={error}
          refetchNavigations={refetchNavigations}
          loadMore={loadMoreNavigations}
          hasMore={hasMoreNavigations}
          searchValue={itemsSearchValue}
          sorting={sorting}
          onSearchChange={setItemsSearchValue}
          onSortingChange={setSorting}
          onDelete={handleDelete}
          isDeleting={isDeleting}
          pagination={urlsPagination}
          onPaginationChange={setUrlsPagination}
          roleOptions={roleOptions}
          featureOptions={featureOptions}
          rolesLoading={rolesLoading}
          featuresLoading={featuresLoading}
          rolesError={rolesError}
          featuresError={featuresError}
          refetchRoles={refetchRoles}
          refetchFeatures={refetchFeatures}
          onSearchRoles={onSearchRoles}
          loadMoreRoles={loadMoreRoles}
          hasMoreRoles={hasMoreRoles}
          updateNavigation={updateNavigation}
          createNavigation={createNavigation}
          onAddNavigationRef={addNavigationRef}
          dataTestId={dataTestId}
          onCountChange={onCountChange}
          currentView={currentView}
          {...context}
        />
      )}
      {currentView === 'menu' && (
        <MenuTable
          menuItems={menuItems}
          isLoading={isMenuItemsInitialLoading}
          error={error}
          dataTestId={dataTestId}
          searchValue={menuSearchValue}
          onSearchChange={setMenuSearchValue}
          onCountChange={onCountChange}
          currentView={currentView}
          refetchMenuItems={refetchMenuItems}
          onAddMenuItemRef={addMenuItemRef}
          onSaveAllChange={onMenuSaveAllChange}
          onDiscardAllChange={onMenuDiscardAllChange}
          onHasChangesChange={onMenuHasChangesChange}
          onIsSavingChange={onMenuIsSavingChange}
          {...context}
        />
      )}
    </>
  )
}

// Memoize to prevent unnecessary re-renders when props haven't changed
export const NavigationTab = React.memo(NavigationTabComponent, (prevProps, nextProps) => {
  // Only re-render if critical props change
  // IMPORTANT: Include search values so that navigationParams useMemo recalculates when search changes
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.currentView === nextProps.currentView &&
    prevProps.shouldInitialLoad === nextProps.shouldInitialLoad &&
    prevProps['data-testid'] === nextProps['data-testid'] &&
    prevProps.accessToken === nextProps.accessToken &&
    prevProps.itemsSearchValue === nextProps.itemsSearchValue &&
    prevProps.menuSearchValue === nextProps.menuSearchValue
  )
})
