import React, { useCallback, useState, useEffect, useLayoutEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useActions } from '@/common/data/resources/hooks/useActions'
import { useContexts } from '@/common/data/resources/hooks/useContexts'
import { useUpdateAction } from '@/common/data/resources/hooks/useUpdateAction'
import { useDeleteAction } from '@/common/data/resources/hooks/useDeleteAction'
import { useCreateContext } from '@/common/data/resources/hooks/useCreateContext'
import { useDeleteContext } from '@/common/data/resources/hooks/useDeleteContext'
import { useUpdateActionAssignment } from '@/common/data/resources/hooks/useUpdateActionAssignment'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { ActionWithContexts } from '@/common/data/resources/types/action.types'
import type { ContextDTO } from '@/common/data/resources/types/context.types'
import { ActionTable } from './action-table/ActionTable'
import { ContextTable } from './context-table/ContextTable'
import { ContextDialog } from './context-table/components/ContextDialog'
import { useRolesCatalog } from '@/common/data/resources/hooks/useRolesCatalog'
import { useFeaturesCatalog } from '@/common/data/resources/hooks/useFeaturesCatalog'

interface ActionTabProps extends BusinessAppContextProps {
  'data-testid'?: string
  onCountChange?: (count: number) => void
  onLoadingChange?: (isLoading: boolean) => void
  currentView?: string
  onViewChange?: (view: string) => void
  onViewCountChange?: (counts: { items: number; contexts: number }) => void
  onViewLoadingChange?: (loading: { items: boolean; contexts: boolean }) => void
  onActionRefetchChange?: (refetch: () => void) => void
  onContextRefetchChange?: (refetch: () => void) => void
  onActionLoadingChange?: (loading: boolean) => void
  onContextLoadingChange?: (loading: boolean) => void
  contextDialogOpen?: boolean
  onContextDialogOpenChange?: (open: boolean) => void
  isActive?: boolean
  shouldInitialLoad?: boolean
  onAddActionChange?: (addAction: () => void) => void
  onAddContextChange?: (addContext: () => void) => void
}

const ActionTabComponent: React.FC<ActionTabProps> = ({
  'data-testid': dataTestId = 'action-tab',
  actionsSearchValue: externalActionsSearchValue,
  contextsSearchValue: externalContextsSearchValue,
  onActionsSearchChange,
  onContextsSearchChange,
  onCountChange,
  onLoadingChange,
  currentView: externalCurrentView,
  onViewCountChange,
  onViewLoadingChange,
  onActionRefetchChange,
  onContextRefetchChange,
  onActionLoadingChange,
  onContextLoadingChange,
  contextDialogOpen: externalContextDialogOpen,
  onContextDialogOpenChange: externalOnContextDialogOpenChange,
  isActive = true,
  shouldInitialLoad = false,
  onAddActionChange,
  onAddContextChange,
  ...context
}) => {
  // Ref to hold addAction function from ActionTable
  const addActionRef = React.useRef<(() => void) | null>(null)
  // Ref to hold addContext function from ContextTable
  const addContextRef = React.useRef<(() => void) | null>(null)

  // Get initial view from URL or default to 'items'
  const getInitialView = useCallback(() => {
    if (globalThis.window === undefined) return 'items'
    const urlParams = new URLSearchParams(globalThis.window.location.search)
    const viewFromUrl = urlParams.get('subview')

    // Default to 'items' if no view is specified or if invalid view
    if (viewFromUrl === 'contexts') {
      return 'contexts'
    }

    return 'items'
  }, [])

  const [internalCurrentView] = useState<string>(getInitialView())
  const currentView = externalCurrentView ?? internalCurrentView

  // Search state - separate for each sub-view (controlled or uncontrolled)
  const [internalActionsSearchValue, setInternalActionsSearchValue] = useState<string>('')
  const [internalContextsSearchValue, setInternalContextsSearchValue] = useState<string>('')
  const actionsSearchValue = externalActionsSearchValue ?? internalActionsSearchValue
  const contextsSearchValue = externalContextsSearchValue ?? internalContextsSearchValue
  const setActionsSearchValue = onActionsSearchChange ?? setInternalActionsSearchValue
  const setContextsSearchValue = onContextsSearchChange ?? setInternalContextsSearchValue

  // Pagination state for API-based pagination - separate for each view
  const [actionsPagination, setActionsPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [contextsPagination, setContextsPagination] = useState({ pageIndex: 0, pageSize: 20 })

  // Sorting state (shared across views) - MUST be declared before useEffects that use it
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([])

  // Track what has been loaded to prevent duplicate requests
  const loadedRef = useRef({
    items: false,
    contexts: false,
    initialLoadDone: false
  })

  // Always create hooks with current pagination and search (data persists when section is hidden)
  const {
    actions,
    totalCount: actionsTotalCount,
    isLoading: actionsLoading,
    error: actionsError,
    refetch: refetchActions,
    loadMore: loadMoreActions,
    hasMore: hasMoreActions,
    removeAction
  } = useActions(context, {
    flowName: actionsSearchValue.trim() || undefined,
    sort: (() => {
      if (sorting.length === 0) return undefined
      const sortPrefix = sorting[0].desc ? '-' : '+'
      return `${sortPrefix}${sorting[0].id}`
    })(),
    limit: actionsPagination.pageSize,
    offset: actionsPagination.pageIndex * actionsPagination.pageSize,
    returnTotalRecords: true
  })

  const {
    contexts,
    totalCount: contextsTotalCount,
    isLoading: contextsLoading,
    error: contextsError,
    refetch: refetchContexts,
    loadMore: loadMoreContexts,
    hasMore: hasMoreContexts,
    removeContext
  } = useContexts(context, {
    searchItem: contextsSearchValue.trim() || undefined,
    sort: (() => {
      if (sorting.length === 0) return undefined
      const sortPrefix = sorting[0].desc ? '-' : '+'
      return `${sortPrefix}${sorting[0].id}`
    })(),
    limit: contextsPagination.pageSize,
    offset: contextsPagination.pageIndex * contextsPagination.pageSize,
    returnTotalRecords: true
  })

  // Track when data has been successfully loaded (not just requested)
  useEffect(() => {
    if (!actionsLoading && actions.length > 0) {
      loadedRef.current.items = true
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
      if (!loadedRef.current.items && !actionsLoading) {
        refetchActions().catch(() => {})
      }
      if (!loadedRef.current.contexts && !contextsLoading) {
        refetchContexts().catch(() => {})
      }
      loadedRef.current.initialLoadDone = true
    }
  }, [shouldInitialLoad, actionsLoading, contextsLoading, refetchActions, refetchContexts])

  // DO NOT reload when sub-view changes - data is already loaded initially

  // Refetch actions when search or sorting changes (for server-side updates)
  useEffect(() => {
    if (currentView === 'items' && loadedRef.current.initialLoadDone) {
      refetchActions().catch(() => {})
    }
  }, [actionsSearchValue, sorting, currentView, refetchActions])

  // Refetch contexts when search or sorting changes (for server-side updates)
  useEffect(() => {
    if (currentView === 'contexts' && loadedRef.current.initialLoadDone) {
      refetchContexts().catch(() => {})
    }
  }, [contextsSearchValue, sorting, currentView, refetchContexts])

  // CUD hooks
  const { isLoading: isUpdating } = useUpdateAction(context) // Only used for isUpdating state
  const { deleteAction, isLoading: isDeleting } = useDeleteAction(context)
  const { deleteContext, isLoading: isDeletingContext } = useDeleteContext(context)
  const { createContext } = useCreateContext(context)
  const { createActionAssignment } = useUpdateActionAssignment(context)
  const resourceClient = useResourceClient(context.accessToken)

  // Roles and Features catalogs - loaded at top level (like NavigationTab)
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

  // Track what has been preloaded to prevent duplicate requests
  const preloadedRef = useRef({
    roles: false,
    features: false
  })

  // Preload roles/features ONCE when actions are loaded (similar to NavigationTab)
  // Load always when actions are present, not just when they have roles/features
  useEffect(() => {
    if (!isActive || currentView !== 'items' || actions.length === 0) return

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
  const [internalContextDialogOpen, setInternalContextDialogOpen] = useState(false)
  const contextDialogOpen = externalContextDialogOpen ?? internalContextDialogOpen
  const setContextDialogOpen = externalOnContextDialogOpenChange ?? setInternalContextDialogOpen

  // Determine initial loading state (only when data hasn't been loaded yet)
  const isActionsInitialLoading = actionsLoading && !loadedRef.current.items
  const isContextsInitialLoading = contextsLoading && !loadedRef.current.contexts

  // Central count and loading update based on current view
  useEffect(() => {
    if (currentView === 'items') {
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
  const prevCountsRef = useRef<{ items: number; contexts: number }>({ items: 0, contexts: 0 })
  const prevLoadingRef = useRef<{ items: boolean; contexts: boolean }>({ items: false, contexts: false })
  const prevActionLoadingRef = useRef<boolean>(false)
  const prevContextLoadingRef = useRef<boolean>(false)

  // Batch all parent updates in a single useLayoutEffect to minimize re-renders
  useLayoutEffect(() => {
    // Use totalCount from hooks (null = not loaded yet)
    // Only use actual count if data has been loaded, otherwise use 0 (DataDisplay will show loading via isLoading)
    const newCounts = {
      items: actionsTotalCount ?? 0, // Use 0 if not loaded yet (isLoading will show spinner)
      contexts: contextsTotalCount ?? 0 // Use 0 if not loaded yet (isLoading will show spinner)
    }
    const newLoading = {
      items: isActionsInitialLoading || actionsTotalCount === null, // Show loading if initial loading OR not loaded yet
      contexts: isContextsInitialLoading || contextsTotalCount === null // Show loading if initial loading OR not loaded yet
    }

    // Only update if values actually changed
    const countsChanged =
      newCounts.items !== prevCountsRef.current.items || newCounts.contexts !== prevCountsRef.current.contexts
    const loadingChanged =
      newLoading.items !== prevLoadingRef.current.items || newLoading.contexts !== prevLoadingRef.current.contexts
    const actionLoadingChanged = actionsLoading !== prevActionLoadingRef.current
    const contextLoadingChanged = contextsLoading !== prevContextLoadingRef.current

    if (countsChanged || loadingChanged || actionLoadingChanged || contextLoadingChanged) {
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

    // Set refetch functions (direct callbacks)
    if (onActionRefetchChange) {
      onActionRefetchChange(refetchActions)
    }

    if (onContextRefetchChange) {
      onContextRefetchChange(refetchContexts)
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
    refetchActions,
    refetchContexts
  ])

  // Handle delete action
  const handleDelete = useCallback(
    async (action: ActionWithContexts) => {
      if (!globalThis.window.confirm(`Are you sure you want to delete action "${action.action.flowName}"?`)) {
        return
      }

      const success = await deleteAction(action.action.id)
      if (success) {
        removeAction(action.action.id)
      }
    },
    [deleteAction, removeAction]
  )

  // Handle add action - call the function from ActionTable via ref
  const handleAddAction = useCallback(() => {
    if (addActionRef.current) {
      addActionRef.current()
    }
  }, [])

  // Handle add context - call the function from ContextTable via ref
  const handleAddContext = useCallback(() => {
    if (addContextRef.current) {
      addContextRef.current()
    }
  }, [])

  // Expose handleAddAction to parent via callback
  React.useEffect(() => {
    if (onAddActionChange) {
      onAddActionChange(handleAddAction)
    }
  }, [onAddActionChange, handleAddAction])

  // Expose handleAddContext to parent via callback
  React.useEffect(() => {
    if (onAddContextChange) {
      onAddContextChange(handleAddContext)
    }
  }, [onAddContextChange, handleAddContext])

  // Handle delete context
  const handleDeleteContext = useCallback(
    async (contextToDelete: any) => {
      if (
        !globalThis.window.confirm(`Are you sure you want to delete context "${contextToDelete.context.contextName}"?`)
      ) {
        return
      }

      const success = await deleteContext(contextToDelete.context.id)
      if (success) {
        removeContext(contextToDelete.context.id)
      }
    },
    [deleteContext, removeContext]
  )

  // Handle create context
  const handleCreateContext = useCallback(
    async (contextData: Omit<ContextDTO, 'id'>, actionIds: string[], permissions?: string[]) => {
      // Create context first
      const createdContext = await createContext(contextData)
      if (!createdContext) {
        return
      }

      // Create action assignment (always, even if no actions, to ensure context appears in list)
      // Backend returns only the ID as string, so fetch full context object to get contextData IDs
      const fullContextResponse = await resourceClient.action.getContext(createdContext)
      if (!fullContextResponse) {
        return
      }

      const fullContext: ContextDTO = {
        id: fullContextResponse.id,
        contextName: fullContextResponse.contextName,
        contextData: fullContextResponse.contextData || [],
        permissionSchema: fullContextResponse.permissionSchema,
        rank: fullContextResponse.rank ?? 0,
        version: fullContextResponse.version ?? 0
      }

      await createActionAssignment({
        context: fullContext,
        assignments:
          actionIds.length > 0
            ? (actionIds
                .map((actionId, index) => {
                  const action = actions.find(a => a.action.id === actionId)
                  if (!action) return null
                  return {
                    flowItem: action.action,
                    permission: permissions?.[index] || 'execute',
                    rank: index
                  }
                })
                .filter(Boolean) as any)
            : []
      })

      // Refetch contexts to show the new one
      await refetchContexts()
    },
    [createContext, createActionAssignment, actions, refetchContexts, resourceClient]
  )

  return (
    <>
      {currentView === 'items' && (
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
          onSearchRoles={onSearchRoles}
          loadMoreRoles={loadMoreRoles}
          hasMoreRoles={hasMoreRoles}
          actions={actions}
          totalCount={actionsTotalCount}
          isLoading={isActionsInitialLoading}
          error={actionsError}
          pagination={actionsPagination}
          onPaginationChange={setActionsPagination}
          loadMore={loadMoreActions}
          hasMore={hasMoreActions}
          onDelete={handleDelete}
          isUpdating={isUpdating}
          isDeleting={isDeleting}
          refetchActions={refetchActions}
          onAddActionRef={addActionRef}
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
          loadMore={loadMoreContexts}
          hasMore={hasMoreContexts}
          contextDialogOpen={contextDialogOpen}
          setContextDialogOpen={setContextDialogOpen}
          onCreateContext={handleCreateContext}
          onDelete={handleDeleteContext}
          isDeleting={isDeletingContext}
          actions={actions.map(a => ({ action: a.action }))}
          onAddContextRef={addContextRef}
          data-testid={dataTestId}
          {...context}
        />
      )}

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
  // IMPORTANT: Include search values so that hooks recalculate when search changes
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.currentView === nextProps.currentView &&
    prevProps.shouldInitialLoad === nextProps.shouldInitialLoad &&
    prevProps.contextDialogOpen === nextProps.contextDialogOpen &&
    prevProps['data-testid'] === nextProps['data-testid'] &&
    prevProps.accessToken === nextProps.accessToken &&
    prevProps.actionsSearchValue === nextProps.actionsSearchValue &&
    prevProps.contextsSearchValue === nextProps.contextsSearchValue
  )
})
