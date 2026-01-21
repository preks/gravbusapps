import React, { useCallback, useMemo, useState, useEffect, useLayoutEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useNavigations } from '@/common/data/resources/hooks/useNavigations'
import { useMenuItems } from '@/common/data/resources/hooks/useMenuItems'
import { useUpdateNavigation } from '@/common/data/resources/hooks/useUpdateNavigation'
import { useCreateNavigation } from '@/common/data/resources/hooks/useCreateNavigation'
import { useRolesCatalog } from '@/common/data/resources/hooks/useRolesCatalog'
import { useFeaturesCatalog } from '@/common/data/resources/hooks/useFeaturesCatalog'
import { DescriptionDialog } from '../../../../components/DescriptionDialog'
import type { GetNavigationsParams } from '@/common/data/resources/types/navigation.types'
import type { MenuItemDTO } from '@/common/data/resources/types/menuItem.types'
import { NavigationTable } from './navigation-table/NavigationTable'
import { MenuTable } from './menu-table/MenuTable'
import type { NavigationWithMenuItems } from './navigation-table/NavigationTableColumns'

interface NavigationTabProps extends BusinessAppContextProps {
  'data-testid'?: string
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
}

const NavigationTabComponent: React.FC<NavigationTabProps> = ({
  'data-testid': dataTestId = 'navigation-tab',
  onCountChange,
  onLoadingChange,
  currentView: externalCurrentView,
  onViewCountChange,
  onViewLoadingChange,
  onRefetchChange,
  isActive = true,
  shouldInitialLoad = false,
  onAddNavigationChange,
  onAddMenuItemChange,
  ...context
}) => {
  // Refs to hold add functions from tables
  const addNavigationRef = React.useRef<(() => void) | null>(null)
  const addMenuItemRef = React.useRef<(() => void) | null>(null)

  // Performance logging (only in dev, limited)
  const renderCountRef = useRef(0)
  const prevPropsRef = useRef<{ isActive: boolean; currentView: string }>({ isActive: false, currentView: '' })

  if (process.env.NODE_ENV === 'development') {
    renderCountRef.current++
    const currentProps = { isActive, currentView: externalCurrentView ?? '' }
    const propsChanged =
      currentProps.isActive !== prevPropsRef.current.isActive ||
      currentProps.currentView !== prevPropsRef.current.currentView

    if (propsChanged || renderCountRef.current <= 3) {
      prevPropsRef.current = currentProps
    }
  }
  // Get initial view from URL or default to 'items'
  const getInitialView = useCallback(() => {
    if (typeof window === 'undefined') return 'items'
    const urlParams = new URLSearchParams(window.location.search)
    const viewFromUrl = urlParams.get('subview')

    if (viewFromUrl === 'menu' || viewFromUrl === 'items') {
      return viewFromUrl
    }

    return 'items'
  }, [])

  const [internalCurrentView] = useState<string>(getInitialView())
  const currentView = externalCurrentView ?? internalCurrentView
  const [searchValue, setSearchValue] = useState<string>('')
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
    if (searchValue.trim()) {
      params.search = searchValue.trim()
    }
    if (sorting.length > 0) {
      const sort = sorting[0]
      params.sort = `${sort.id},${sort.desc ? 'DESC' : 'ASC'}`
    }
    // Add pagination parameters
    params.limit = urlsPagination.pageSize
    params.offset = urlsPagination.pageIndex * urlsPagination.pageSize

    return params
  }, [currentView, searchValue, sorting, urlsPagination])

  // Always create hooks (data persists when section is hidden)
  const {
    navigations,
    totalCount: navigationsTotalCount,
    isLoading: navigationsLoading,
    error: navigationsError,
    refetch: refetchNavigations
  } = useNavigations(context, navigationParams)

  const {
    menuItems,
    isLoading: menuItemsLoading,
    error: menuItemsError,
    refetch: refetchMenuItems
  } = useMenuItems(context)

  const { updateNavigation, error: updateError } = useUpdateNavigation(context)
  const { createNavigation } = useCreateNavigation(context)

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
    refetch: refetchRoles
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

  // Refetch navigations when pagination changes (for server-side pagination)
  useEffect(() => {
    if (currentView === 'items' && loadedRef.current.initialLoadDone) {
      refetchNavigations().catch(() => {})
    }
  }, [urlsPagination, searchValue, sorting, currentView, refetchNavigations])

  // DO NOT reload when sub-view changes - data is already loaded initially

  // Track what has been preloaded to prevent duplicate requests
  const preloadedRef = useRef({
    roles: false,
    features: false
  })

  // Preload roles/features ONCE if any navigation has them
  useEffect(() => {
    if (!isActive || currentView !== 'urls' || navigations.length === 0) return

    const hasRoles = navigations.some(nav => nav.roles && nav.roles.length > 0)
    const hasFeatures = navigations.some(nav => nav.features && nav.features.length > 0)

    // Only preload once if no error and data not already loaded
    if (hasRoles && !preloadedRef.current.roles && roleOptions.length === 0 && !rolesLoading && !rolesError) {
      preloadedRef.current.roles = true
      refetchRoles().catch(() => {
        // Silently handle errors - hasError flag will prevent retries
      })
    }
    if (
      hasFeatures &&
      !preloadedRef.current.features &&
      featureOptions.length === 0 &&
      !featuresLoading &&
      !featuresError
    ) {
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

  // Description dialog state
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false)
  const [descriptionNavigationId, setDescriptionNavigationId] = useState<string | null>(null)

  // URL is now managed by parent (ResourceView) via subview parameter
  // No need for updateUrl callback

  // Store previous values to avoid unnecessary updates
  const prevCountsRef = useRef<{ items: number; menu: number }>({ items: 0, menu: 0 })
  const prevLoadingRef = useRef<{ items: boolean; menu: boolean }>({ items: false, menu: false })
  const refetchFnRef = useRef<(() => void) | null>(null)

  // Create stable refetch function
  const refetchFn = useCallback(() => {
    refetchNavigations()
    refetchMenuItems()
  }, [refetchNavigations, refetchMenuItems])

  // Update refetch function ref when it changes
  useEffect(() => {
    refetchFnRef.current = refetchFn
  }, [refetchFn])

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

    // Set refetch function once (stable reference)
    if (onRefetchChange && refetchFnRef.current !== refetchFn) {
      onRefetchChange(() => {
        refetchFnRef.current?.()
      })
      refetchFnRef.current = refetchFn
    }
  }, [
    navigations.length,
    menuItems.length,
    isNavigationsInitialLoading,
    isMenuItemsInitialLoading,
    onViewCountChange,
    onViewLoadingChange,
    onRefetchChange,
    refetchFn
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
          searchValue={searchValue}
          sorting={sorting}
          onSearchChange={setSearchValue}
          onSortingChange={setSorting}
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
          setDescriptionNavigationId={setDescriptionNavigationId}
          setDescriptionDialogOpen={setDescriptionDialogOpen}
          updateNavigation={updateNavigation}
          createNavigation={createNavigation}
          onAddNavigationRef={addNavigationRef}
          dataTestId={dataTestId}
          onCountChange={onCountChange}
          currentView={currentView}
        />
      )}
      {currentView === 'menu' && (
        <MenuTable
          menuItems={menuItems}
          isLoading={isMenuItemsInitialLoading}
          error={error}
          dataTestId={dataTestId}
          onCountChange={onCountChange}
          currentView={currentView}
          refetchMenuItems={refetchMenuItems}
          onAddMenuItemRef={addMenuItemRef}
          {...context}
        />
      )}

      {descriptionNavigationId && (
        <DescriptionDialog
          open={descriptionDialogOpen}
          onOpenChange={setDescriptionDialogOpen}
          description={enrichedNavigations.find(n => n.id === descriptionNavigationId)?.description_i18n?.['en'] || ''}
          descriptionTranslation={
            enrichedNavigations.find(n => n.id === descriptionNavigationId)?.description_i18n || {}
          }
          onSave={async (description, translations) => {
            const navigationId = descriptionNavigationId
            if (navigationId) {
              await updateNavigation(navigationId, { description_i18n: translations })
              await refetchNavigations()
            }
          }}
          data-testid={`${dataTestId}-description-dialog`}
          {...context}
        />
      )}
    </>
  )
}

// Memoize to prevent unnecessary re-renders when props haven't changed
export const NavigationTab = React.memo(NavigationTabComponent, (prevProps, nextProps) => {
  // Only re-render if critical props change
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.currentView === nextProps.currentView &&
    prevProps.shouldInitialLoad === nextProps.shouldInitialLoad &&
    prevProps['data-testid'] === nextProps['data-testid'] &&
    prevProps.accessToken === nextProps.accessToken
  )
})
