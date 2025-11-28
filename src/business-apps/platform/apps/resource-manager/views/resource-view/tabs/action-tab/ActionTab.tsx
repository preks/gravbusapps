import React, { useCallback, useState, useEffect, useLayoutEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useActions } from '@/common/data/resources/hooks/useActions'
import { useContexts } from '@/common/data/resources/hooks/useContexts'
import { useCreateAction } from '@/common/data/resources/hooks/useCreateAction'
import { useUpdateAction } from '@/common/data/resources/hooks/useUpdateAction'
import { useDeleteAction } from '@/common/data/resources/hooks/useDeleteAction'
import { useCreateContext } from '@/common/data/resources/hooks/useCreateContext'
import { useUpdateActionAssignment } from '@/common/data/resources/hooks/useUpdateActionAssignment'
import type { ActionWithContexts } from '@/common/data/resources/types/action.types'
import type { ContextDTO } from '@/common/data/resources/types/context.types'
import { ActionDialog } from './ActionDialog'
import { ActionTable } from './ActionTable'
import { ContextTable } from './ContextTable'
import { ContextDialog } from './ContextDialog'
import { useRolesCatalog } from '@/common/data/resources/hooks/useRolesCatalog'
import { useFeaturesCatalog } from '@/common/data/resources/hooks/useFeaturesCatalog'

interface ActionTabProps extends BusinessAppContextProps {
  'data-testid'?: string
  onCountChange?: (count: number) => void
  onLoadingChange?: (isLoading: boolean) => void
  currentView?: string
  onViewChange?: (view: string) => void
  onViewCountChange?: (counts: { actions: number; contexts: number }) => void
  onViewLoadingChange?: (loading: { actions: boolean; contexts: boolean }) => void
  onActionRefetchChange?: (refetch: () => void) => void
  onContextRefetchChange?: (refetch: () => void) => void
  onActionLoadingChange?: (loading: boolean) => void
  onContextLoadingChange?: (loading: boolean) => void
  dialogOpen?: boolean
  onDialogOpenChange?: (open: boolean) => void
  contextDialogOpen?: boolean
  onContextDialogOpenChange?: (open: boolean) => void
  isActive?: boolean
  shouldInitialLoad?: boolean
}

const ActionTabComponent: React.FC<ActionTabProps> = ({
  'data-testid': dataTestId = 'action-tab',
  onCountChange,
  onLoadingChange,
  currentView: externalCurrentView,
  onViewChange: externalOnViewChange,
  onViewCountChange,
  onViewLoadingChange,
  onActionRefetchChange,
  onContextRefetchChange,
  onActionLoadingChange,
  onContextLoadingChange,
  dialogOpen: externalDialogOpen,
  onDialogOpenChange: externalOnDialogOpenChange,
  contextDialogOpen: externalContextDialogOpen,
  onContextDialogOpenChange: externalOnContextDialogOpenChange,
  isActive = true,
  shouldInitialLoad = false,
  ...context
}) => {
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
      console.log(`[ActionTab] Render #${renderCountRef.current}`, {
        propsChanged,
        currentProps,
        timestamp: new Date().toISOString()
      })
      prevPropsRef.current = currentProps
    }
  }
  // Get initial view from URL or default to 'actions'
  const getInitialView = useCallback(() => {
    if (typeof window === 'undefined') return 'actions'
    const urlParams = new URLSearchParams(window.location.search)
    const viewFromUrl = urlParams.get('actionView')

    // Default to 'actions' if no view is specified or if invalid view
    if (viewFromUrl === 'contexts') {
      return 'contexts'
    }

    return 'actions'
  }, [])

  const [internalCurrentView, setInternalCurrentView] = useState<string>(getInitialView())
  const currentView = externalCurrentView ?? internalCurrentView
  const setCurrentView = externalOnViewChange ?? setInternalCurrentView

  // Search state - separate for each sub-view
  const [actionsSearchValue, setActionsSearchValue] = useState<string>('')
  const [contextsSearchValue, setContextsSearchValue] = useState<string>('')

  // Pagination state for API-based pagination - separate for each view
  const [actionsPagination, setActionsPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [contextsPagination, setContextsPagination] = useState({ pageIndex: 0, pageSize: 20 })

  // Track what has been loaded to prevent duplicate requests
  const loadedRef = useRef({
    actions: false,
    contexts: false,
    initialLoadDone: false
  })

  // Always create hooks with current pagination and search (data persists when section is hidden)
  const {
    actions,
    totalCount: actionsTotalCount,
    isLoading: actionsLoading,
    error: actionsError,
    refetch: refetchActions
  } = useActions(context, {
    flowName: actionsSearchValue.trim() || undefined,
    limit: actionsPagination.pageSize,
    offset: actionsPagination.pageIndex * actionsPagination.pageSize,
    returnTotalRecords: true
  })

  const {
    contexts,
    totalCount: contextsTotalCount,
    isLoading: contextsLoading,
    error: contextsError,
    refetch: refetchContexts
  } = useContexts(context, {
    contextName: contextsSearchValue.trim() || undefined,
    limit: contextsPagination.pageSize,
    offset: contextsPagination.pageIndex * contextsPagination.pageSize,
    returnTotalRecords: true
  })

  // Track when data has been successfully loaded (not just requested)
  useEffect(() => {
    if (!actionsLoading && actions.length > 0) {
      loadedRef.current.actions = true
    }
  }, [actionsLoading, actions.length])

  useEffect(() => {
    if (!contextsLoading && contexts.length > 0) {
      loadedRef.current.contexts = true
    }
  }, [contextsLoading, contexts.length])

  // Initial load: Load ALL data when view opens (both actions and contexts) - not waiting for section to be active
  useEffect(() => {
    if (shouldInitialLoad && !loadedRef.current.initialLoadDone) {
      // Load both views for initial counts - load immediately when view opens
      if (!loadedRef.current.actions && !actionsLoading) {
        refetchActions().catch(() => {})
      }
      if (!loadedRef.current.contexts && !contextsLoading) {
        refetchContexts().catch(() => {})
      }
      loadedRef.current.initialLoadDone = true
    }
  }, [shouldInitialLoad, actionsLoading, contextsLoading, refetchActions, refetchContexts])

  // DO NOT reload when sub-view changes - data is already loaded initially

  // Refetch actions when pagination or search changes (only if actions view is active)
  const lastActionsParamsRef = useRef({ pageIndex: -1, pageSize: -1, search: '' })
  useEffect(() => {
    if (!isActive || currentView !== 'actions' || !loadedRef.current.actions) return
    if (actionsLoading) return // Don't refetch if already loading

    // Only refetch if pagination or search actually changed
    const paramsChanged =
      lastActionsParamsRef.current.pageIndex !== actionsPagination.pageIndex ||
      lastActionsParamsRef.current.pageSize !== actionsPagination.pageSize ||
      lastActionsParamsRef.current.search !== actionsSearchValue

    if (paramsChanged) {
      lastActionsParamsRef.current = {
        pageIndex: actionsPagination.pageIndex,
        pageSize: actionsPagination.pageSize,
        search: actionsSearchValue
      }
      refetchActions().catch(() => {})
    }
  }, [
    isActive,
    currentView,
    actionsPagination.pageIndex,
    actionsPagination.pageSize,
    actionsSearchValue,
    actionsLoading,
    refetchActions
  ])

  // Refetch contexts when pagination or search changes (only if contexts view is active)
  const lastContextsParamsRef = useRef({ pageIndex: -1, pageSize: -1, search: '' })
  useEffect(() => {
    if (!isActive || currentView !== 'contexts' || !loadedRef.current.contexts) return
    if (contextsLoading) return // Don't refetch if already loading

    // Only refetch if pagination or search actually changed
    const paramsChanged =
      lastContextsParamsRef.current.pageIndex !== contextsPagination.pageIndex ||
      lastContextsParamsRef.current.pageSize !== contextsPagination.pageSize ||
      lastContextsParamsRef.current.search !== contextsSearchValue

    if (paramsChanged) {
      lastContextsParamsRef.current = {
        pageIndex: contextsPagination.pageIndex,
        pageSize: contextsPagination.pageSize,
        search: contextsSearchValue
      }
      refetchContexts().catch(() => {})
    }
  }, [
    isActive,
    currentView,
    contextsPagination.pageIndex,
    contextsPagination.pageSize,
    contextsSearchValue,
    contextsLoading,
    refetchContexts
  ])

  // CUD hooks
  const { createAction } = useCreateAction(context)
  const { isLoading: isUpdating } = useUpdateAction(context) // Only used for isUpdating state
  const { deleteAction, isLoading: isDeleting } = useDeleteAction(context)
  const { createContext } = useCreateContext(context)
  const { createActionAssignment } = useUpdateActionAssignment(context)

  // Roles and Features catalogs - loaded at top level (like NavigationTab)
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

  // Track what has been preloaded to prevent duplicate requests
  const preloadedRef = useRef({
    roles: false,
    features: false
  })

  // Preload roles/features ONCE when actions are loaded (similar to NavigationTab)
  // Load always when actions are present, not just when they have roles/features
  useEffect(() => {
    if (!isActive || currentView !== 'actions' || actions.length === 0) return

    // Always preload roles/features if not already loaded (like NavigationTab does)
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
    actions.length,
    roleOptions.length,
    rolesLoading,
    rolesError,
    featuresLoading,
    featuresError,
    featureOptions.length,
    refetchRoles,
    refetchFeatures
  ])

  // Dialog state - use external if provided, otherwise internal
  const [internalDialogOpen, setInternalDialogOpen] = useState(false)
  const [internalContextDialogOpen, setInternalContextDialogOpen] = useState(false)
  const dialogOpen = externalDialogOpen ?? internalDialogOpen
  const setDialogOpen = externalOnDialogOpenChange ?? setInternalDialogOpen
  const contextDialogOpen = externalContextDialogOpen ?? internalContextDialogOpen
  const setContextDialogOpen = externalOnContextDialogOpenChange ?? setInternalContextDialogOpen

  // Update URL when view changes
  const updateUrl = useCallback((view: string) => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.set('actionView', view)
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }, [])

  // Update URL when view changes
  useEffect(() => {
    if (currentView) {
      updateUrl(currentView)
    }
  }, [currentView, updateUrl])

  // Ensure URL always has actionView parameter on initial load
  useEffect(() => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)
    if (!urlParams.has('actionView')) {
      updateUrl(currentView)
    }
  }, [currentView, updateUrl])

  // Listen for browser back/forward navigation
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handlePopState = () => {
      const newView = getInitialView()
      setCurrentView(newView)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [getInitialView])

  // Determine initial loading state (only when data hasn't been loaded yet)
  const isActionsInitialLoading = actionsLoading && !loadedRef.current.actions
  const isContextsInitialLoading = contextsLoading && !loadedRef.current.contexts

  // Central count and loading update based on current view
  useEffect(() => {
    if (currentView === 'actions') {
      onCountChange?.(actionsTotalCount)
      onLoadingChange?.(isActionsInitialLoading)
    } else if (currentView === 'contexts') {
      onCountChange?.(contextsTotalCount)
      onLoadingChange?.(isContextsInitialLoading)
    }
  }, [
    currentView,
    actionsTotalCount,
    contextsTotalCount,
    isActionsInitialLoading,
    isContextsInitialLoading,
    onCountChange,
    onLoadingChange
  ])

  // Store previous values to avoid unnecessary updates
  const prevCountsRef = useRef<{ actions: number; contexts: number }>({ actions: 0, contexts: 0 })
  const prevLoadingRef = useRef<{ actions: boolean; contexts: boolean }>({ actions: false, contexts: false })
  const prevActionLoadingRef = useRef<boolean>(false)
  const prevContextLoadingRef = useRef<boolean>(false)
  const actionRefetchFnRef = useRef<(() => void) | null>(null)
  const contextRefetchFnRef = useRef<(() => void) | null>(null)

  // Create stable refetch functions
  const actionRefetchFn = useCallback(() => refetchActions(), [refetchActions])
  const contextRefetchFn = useCallback(() => refetchContexts(), [refetchContexts])

  // Update refetch function refs when they change
  useEffect(() => {
    actionRefetchFnRef.current = actionRefetchFn
  }, [actionRefetchFn])

  useEffect(() => {
    contextRefetchFnRef.current = contextRefetchFn
  }, [contextRefetchFn])

  // Batch all parent updates in a single useLayoutEffect to minimize re-renders
  useLayoutEffect(() => {
    // Use totalCount from hooks (null = not loaded yet)
    // Only use actual count if data has been loaded, otherwise use 0 (DataDisplay will show loading via isLoading)
    const newCounts = {
      actions: actionsTotalCount !== null ? actionsTotalCount : 0, // Use 0 if not loaded yet (isLoading will show spinner)
      contexts: contextsTotalCount !== null ? contextsTotalCount : 0 // Use 0 if not loaded yet (isLoading will show spinner)
    }
    const newLoading = {
      actions: isActionsInitialLoading || actionsTotalCount === null, // Show loading if initial loading OR not loaded yet
      contexts: isContextsInitialLoading || contextsTotalCount === null // Show loading if initial loading OR not loaded yet
    }

    // Only update if values actually changed
    const countsChanged =
      newCounts.actions !== prevCountsRef.current.actions || newCounts.contexts !== prevCountsRef.current.contexts
    const loadingChanged =
      newLoading.actions !== prevLoadingRef.current.actions || newLoading.contexts !== prevLoadingRef.current.contexts
    const actionLoadingChanged = actionsLoading !== prevActionLoadingRef.current
    const contextLoadingChanged = contextsLoading !== prevContextLoadingRef.current

    if (countsChanged || loadingChanged || actionLoadingChanged || contextLoadingChanged) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[ActionTab] Batch updating parent', {
          countsChanged,
          loadingChanged,
          actionLoadingChanged,
          contextLoadingChanged,
          newCounts,
          newLoading
        })
      }

      if (countsChanged && onViewCountChange) {
        prevCountsRef.current = newCounts
        onViewCountChange(newCounts)
      }

      if (loadingChanged && onViewLoadingChange) {
        prevLoadingRef.current = newLoading
        onViewLoadingChange(newLoading)
      }

      if (actionLoadingChanged && onActionLoadingChange) {
        prevActionLoadingRef.current = actionsLoading
        onActionLoadingChange(actionsLoading)
      }

      if (contextLoadingChanged && onContextLoadingChange) {
        prevContextLoadingRef.current = contextsLoading
        onContextLoadingChange(contextsLoading)
      }
    }

    // Set refetch functions once (stable references)
    if (onActionRefetchChange && actionRefetchFnRef.current !== actionRefetchFn) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[ActionTab] Setting action refetch function')
      }
      onActionRefetchChange(() => {
        actionRefetchFnRef.current?.()
      })
      actionRefetchFnRef.current = actionRefetchFn
    }

    if (onContextRefetchChange && contextRefetchFnRef.current !== contextRefetchFn) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[ActionTab] Setting context refetch function')
      }
      onContextRefetchChange(() => {
        contextRefetchFnRef.current?.()
      })
      contextRefetchFnRef.current = contextRefetchFn
    }
  }, [
    actionsTotalCount,
    contextsTotalCount,
    isActionsInitialLoading,
    isContextsInitialLoading,
    actionsLoading,
    contextsLoading,
    onViewCountChange,
    onViewLoadingChange,
    onActionLoadingChange,
    onContextLoadingChange,
    onActionRefetchChange,
    onContextRefetchChange,
    actionRefetchFn,
    contextRefetchFn
  ])

  // Sorting state (shared across views)
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([])

  // Handle delete action
  const handleDelete = useCallback(
    async (action: ActionWithContexts) => {
      if (!window.confirm(`Are you sure you want to delete action "${action.action.flowName}"?`)) {
        return
      }

      const success = await deleteAction(action.action.id)
      if (success) {
        await refetchActions()
      }
    },
    [deleteAction, refetchActions]
  )

  // Handle dialog submit (only for create)
  const handleDialogSubmit = useCallback(
    async (data: any) => {
      const result = await createAction(data)
      if (result) {
        await refetchActions()
      }
    },
    [createAction, refetchActions]
  )

  // Handle create context
  const handleCreateContext = useCallback(
    async (contextData: Omit<ContextDTO, 'id'>, actionIds: string[]) => {
      // Create context first
      const createdContext = await createContext(contextData)
      if (!createdContext) {
        return
      }

      // Create action assignment (even if no actions, to ensure context appears in list)
      await createActionAssignment({
        context: createdContext,
        assignments: actionIds
          .map((actionId, index) => {
            const action = actions.find(a => a.action.id === actionId)
            if (!action) return null
            return {
              id: `temp-${index}`,
              flowItem: action.action,
              permission: 'execute',
              rank: index
            }
          })
          .filter(Boolean) as any
      })

      // Refetch contexts to show the new one
      await refetchContexts()
    },
    [createContext, createActionAssignment, actions, refetchContexts]
  )

  return (
    <>
      {currentView === 'actions' && (
        <ActionTable
          searchValue={actionsSearchValue}
          sorting={sorting}
          onSearchChange={setActionsSearchValue}
          onSortingChange={setSorting}
          roleOptions={roleOptions}
          featureOptions={featureOptions}
          rolesLoading={rolesLoading}
          featuresLoading={featuresLoading}
          rolesError={rolesError}
          featuresError={featuresError}
          refetchRoles={refetchRoles}
          refetchFeatures={refetchFeatures}
          actions={actions}
          totalCount={actionsTotalCount}
          isLoading={isActionsInitialLoading}
          error={actionsError}
          pagination={actionsPagination}
          onPaginationChange={setActionsPagination}
          onDelete={handleDelete}
          isUpdating={isUpdating}
          isDeleting={isDeleting}
          refetchActions={refetchActions}
          data-testid={dataTestId}
          {...context}
        />
      )}
      {currentView === 'contexts' && (
        <ContextTable
          searchValue={contextsSearchValue}
          sorting={sorting}
          onSearchChange={setContextsSearchValue}
          onSortingChange={setSorting}
          contexts={contexts}
          totalCount={contextsTotalCount}
          isLoading={isContextsInitialLoading}
          error={contextsError}
          pagination={contextsPagination}
          onPaginationChange={setContextsPagination}
          contextDialogOpen={contextDialogOpen}
          setContextDialogOpen={setContextDialogOpen}
          onCreateContext={handleCreateContext}
          actions={actions.map(a => ({ action: a.action }))}
          data-testid={dataTestId}
          {...context}
        />
      )}

      <ActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleDialogSubmit}
        mode="create"
        {...context}
        data-testid={`${dataTestId}-dialog`}
      />
      {contextDialogOpen && (
        <ContextDialog
          open={contextDialogOpen}
          onOpenChange={setContextDialogOpen}
          onSubmit={handleCreateContext}
          actions={actions.map(a => a.action)}
          mode="create"
          data-testid={`${dataTestId}-context-dialog`}
          {...context}
        />
      )}
    </>
  )
}

// Memoize to prevent unnecessary re-renders when props haven't changed
export const ActionTab = React.memo(ActionTabComponent, (prevProps, nextProps) => {
  // Only re-render if critical props change
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.currentView === nextProps.currentView &&
    prevProps.shouldInitialLoad === nextProps.shouldInitialLoad &&
    prevProps.dialogOpen === nextProps.dialogOpen &&
    prevProps.contextDialogOpen === nextProps.contextDialogOpen &&
    prevProps['data-testid'] === nextProps['data-testid'] &&
    prevProps.accessToken === nextProps.accessToken
  )
})
