import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
  Spinner
} from '@newwork/nw-design-system'
import { TableSkeleton } from '../../../../../components/TableSkeleton'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { DndContext, closestCenter, DragEndEvent, useSensors, useSensor, PointerSensor } from '@dnd-kit/core'
import { useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TrashIcon, PlusIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { ContextWithActions, ContextDTO, ContextDataDTO } from '@/common/data/resources/types/context.types'
import { ContextDialog } from './components/ContextDialog'
import { ContextDataDialog } from './components/ContextDataDialog'
import { AddActionDialog } from './components/AddActionDialog'
import { EditableSelectCell } from '@/components/editable-cell'
import { useEditableState } from '../../../../../hooks/useEditableState'
import { useUpdateActionAssignment } from '@/common/data/resources/hooks/useUpdateActionAssignment'
import { useUpdateContext } from '@/common/data/resources/hooks/useUpdateContext'
import type { ActionDTO } from '@/common/data/resources/types/action.types'
import { ContextTableRow } from './components/ContextTableRow'

interface ContextTableProps extends BusinessAppContextProps {
  contexts: ContextWithActions[]
  totalCount: number
  isLoading: boolean
  error: string | null
  loadMore: () => Promise<void>
  hasMore: boolean
  searchValue: string
  sorting: Array<{ id: string; desc: boolean }>
  onSearchChange: (value: string) => void
  onSortingChange: (sorting: Array<{ id: string; desc: boolean }>) => void
  pagination: { pageIndex: number; pageSize: number }
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void
  contextDialogOpen: boolean
  setContextDialogOpen: (open: boolean) => void
  onCreateContext: (contextData: Omit<ContextDTO, 'id'>, actionIds: string[], permissions?: string[]) => Promise<void>
  onDelete: (context: ContextWithActions) => void
  isDeleting: boolean
  actions: Array<{ action: ActionDTO }>
  onAddContextRef?: React.MutableRefObject<(() => void) | null>
  'data-testid'?: string
}

export const ContextTable: React.FC<ContextTableProps> = ({
  contexts,
  totalCount,
  isLoading,
  error,
  loadMore,
  hasMore,
  searchValue,
  sorting,
  onSortingChange,
  contextDialogOpen,
  setContextDialogOpen,
  onCreateContext,
  onDelete,
  isDeleting,
  actions,
  onAddContextRef,
  'data-testid': dataTestId = 'context-table',
  ...context
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [contextDataDialogOpen, setContextDataDialogOpen] = useState<string | null>(null)
  const [addActionDialogOpen, setAddActionDialogOpen] = useState<string | null>(null)

  // Draft contexts state (managed locally)
  const [draftContexts, setDraftContexts] = useState<ContextWithActions[]>([])

  // Draft actions state - Map<contextId, Array<{action: ActionDTO, permission: string}>>
  const [draftActions, setDraftActions] = useState<Map<string, Array<{ action: ActionDTO; permission: string }>>>(
    new Map()
  )

  // Merge draft contexts with regular contexts (drafts at the top)
  const allContexts = useMemo(() => {
    return [...draftContexts, ...contexts].map(contextItem => {
      const draftActionsForContext = draftActions.get(contextItem.context.id)
      if (draftActionsForContext && draftActionsForContext.length > 0) {
        return {
          ...contextItem,
          actions: [
            ...contextItem.actions,
            ...draftActionsForContext.map(da => ({
              action: da.action,
              permission: da.permission,
              rank: (contextItem.actions?.length || 0) + draftActionsForContext.indexOf(da)
            }))
          ]
        }
      }
      return contextItem
    })
  }, [draftContexts, contexts, draftActions])

  // Editable state for contexts
  const contextEntries = useMemo(() => allContexts.map(item => item.context), [allContexts])
  const editableState = useEditableState<ContextDTO>(contextEntries)
  const { createActionAssignment, updateActionAssignment } = useUpdateActionAssignment(context)
  const { updateContext } = useUpdateContext(context)

  // Handle add context - create draft row
  const handleAddContext = useCallback(() => {
    const draftId = `draft:${Date.now()}`
    const draftContext: ContextWithActions = {
      context: {
        id: draftId,
        contextName: '',
        contextData: []
      } as ContextDTO,
      actions: []
    }

    setDraftContexts(prev => [draftContext, ...prev])

    // Seed edits so Save/Discard buttons appear
    editableState.setState(prev => {
      const newEdited = new Map(prev.editedEntries)
      newEdited.set(draftId, { contextName: '' })
      const newDrafts = new Set(prev.draftEntryIds)
      newDrafts.add(draftId)
      return {
        ...prev,
        editedEntries: newEdited,
        draftEntryIds: newDrafts
      }
    })
  }, [editableState])

  // Expose handleAddContext via ref
  React.useEffect(() => {
    if (onAddContextRef) {
      onAddContextRef.current = handleAddContext
    }
  }, [onAddContextRef, handleAddContext])

  // Toggle expansion
  const handleToggleExpansion = useCallback((contextId: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(contextId)) {
        next.delete(contextId)
      } else {
        next.add(contextId)
      }
      return next
    })
  }, [])

  // Helper to prepare context data for API
  const prepareContextData = (
    contextDataEdit: unknown,
    fallbackData: ContextDataDTO[] | undefined
  ): ContextDataDTO[] => {
    return ((contextDataEdit as ContextDataDTO[]) ?? fallbackData ?? [])
      .filter(data => data.contextDataName && data.contextDataType)
      .map(data => ({
        contextDataName: data.contextDataName,
        contextDataType: data.contextDataType,
        mainContext: data.mainContext ?? false
      })) as ContextDataDTO[]
  }

  // Helper to build full context DTO for draft creation
  const buildDraftContextDTO = (
    edits: Record<string, unknown>,
    draftContext: ContextDTO
  ): Omit<ContextDTO, 'id' | 'rank' | 'version'> => {
    const contextData = prepareContextData(edits.contextData, draftContext.contextData)
    return {
      contextName: (edits.contextName as string) ?? draftContext.contextName ?? '',
      contextData: contextData,
      permissionSchema: (edits.permissionSchema as string) ?? draftContext.permissionSchema
    }
  }

  // Handle save entry
  const handleSaveEntry = useCallback(
    async (contextId: string) => {
      const edits = editableState.state.editedEntries.get(contextId)
      if (!edits || Object.keys(edits).length === 0) return

      editableState.setSaving(contextId, true)
      try {
        const isDraft = editableState.isDraft(contextId)

        if (isDraft) {
          // Create new context via API - Build full ContextDTO from draft + edits
          const draftContext = draftContexts.find(d => d.context.id === contextId)?.context
          if (!draftContext) return

          // Get draft actions for this context
          const draftActionsForContext = draftActions.get(contextId) || []
          const actionIds = draftActionsForContext.map(da => da.action.id)

          const fullContextData = buildDraftContextDTO(edits, draftContext)

          // Create context first, then create assignment with draft actions
          await onCreateContext(
            fullContextData,
            actionIds,
            draftActionsForContext.map(da => da.permission)
          )

          // Remove draft from local state
          setDraftContexts(prev => prev.filter(d => d.context.id !== contextId))
          setDraftActions(prev => {
            const newMap = new Map(prev)
            newMap.delete(contextId)
            return newMap
          })
          editableState.setState(prev => {
            const newEdited = new Map(prev.editedEntries)
            newEdited.delete(contextId)
            const newDrafts = new Set(prev.draftEntryIds)
            newDrafts.delete(contextId)
            return { ...prev, editedEntries: newEdited, draftEntryIds: newDrafts }
          })
          return
        }

        const originalContext = allContexts.find(c => c.context.id === contextId)?.context
        if (!originalContext) return

        const contextData = ((edits.contextData as ContextDataDTO[]) ?? originalContext.contextData ?? [])
          .filter(data => data.contextDataName && data.contextDataType)
          .map(data => {
            // Keep real IDs, remove temp IDs
            const result: Partial<ContextDataDTO> = {
              contextDataName: data.contextDataName,
              contextDataType: data.contextDataType,
              mainContext: data.mainContext ?? false
            }
            // Only include id if it's not a temp ID
            if (data.id && !data.id.startsWith('temp-')) {
              result.id = data.id
            }
            return result
          }) as ContextDataDTO[]

        const fullContextData: Omit<ContextDTO, 'rank'> = {
          id: originalContext.id,
          contextName: (edits.contextName as string) ?? originalContext.contextName,
          contextData,
          permissionSchema: (edits.permissionSchema as string) ?? originalContext.permissionSchema,
          version: originalContext.version ?? 0
        }

        const result = await updateContext(contextId, fullContextData)
        if (!result) return
        // Get draft actions for this context
        const draftActionsForContext = draftActions.get(contextId) || []
        if (draftActionsForContext.length > 0) {
          const persistedContext = contexts.find(c => c.context.id === contextId)
          if (!persistedContext) {
            throw new Error('Unable to find persisted context assignment')
          }

          const fullContext: ContextDTO = {
            ...fullContextData,
            rank: originalContext.rank ?? 0
          }

          const allAssignments = [
            ...(persistedContext.actions || []).map(a => ({
              id: a.assignmentEntryId,
              flowItem: a.action,
              permission: a.permission || 'execute',
              rank: a.rank || 0
            })),
            ...draftActionsForContext.map((da, index) => ({
              flowItem: da.action,
              permission: da.permission,
              rank: (persistedContext.actions?.length || 0) + index
            }))
          ]

          const assignmentPayload = {
            context: fullContext,
            assignments: allAssignments
          }

          const assignmentResult = persistedContext.assignmentId
            ? await updateActionAssignment(persistedContext.assignmentId, {
                id: persistedContext.assignmentId,
                ...assignmentPayload
              })
            : await createActionAssignment(assignmentPayload)

          if (!assignmentResult) {
            throw new Error('Failed to save action assignment')
          }

          setDraftActions(prev => {
            const newMap = new Map(prev)
            newMap.delete(contextId)
            return newMap
          })
        }

        editableState.onDiscardEntry(contextId)
        // Reload contexts to get updated data
        await loadMore()
      } catch {
        // Error handled by mutation hooks
      } finally {
        editableState.setSaving(contextId, false)
      }
    },
    [
      editableState,
      onCreateContext,
      setDraftContexts,
      draftContexts,
      draftActions,
      allContexts,
      contexts,
      updateContext,
      updateActionAssignment,
      createActionAssignment,
      loadMore
    ]
  )

  // Handle discard entry
  const handleDiscardEntry = useCallback(
    (contextId: string) => {
      const isDraft = editableState.isDraft(contextId)
      if (isDraft) {
        // Remove draft from local state
        setDraftContexts(prev => prev.filter(d => d.context.id !== contextId))
      }
      // Remove draft actions for this context
      setDraftActions(prev => {
        const newMap = new Map(prev)
        newMap.delete(contextId)
        return newMap
      })
      editableState.onDiscardEntry(contextId)
    },
    [editableState, setDraftContexts]
  )

  // Server-side filtering via searchValue prop - no client-side filtering needed
  const filteredData = useMemo(() => {
    // Only filter out items without an ID if necessary, otherwise directly use allContexts
    return allContexts.filter(item => item?.context?.id)
  }, [allContexts])

  // Handle column sort
  const handleSort = useCallback(
    (columnId: string) => {
      const existingSort = sorting.find(s => s.id === columnId)
      if (existingSort) {
        // Toggle desc/asc or remove
        if (existingSort.desc) {
          onSortingChange([{ id: columnId, desc: false }])
        } else {
          onSortingChange([])
        }
      } else {
        onSortingChange([{ id: columnId, desc: true }])
      }
    },
    [sorting, onSortingChange]
  )

  // Get sort icon for column
  const getSortIcon = useCallback(
    (columnId: string) => {
      const sort = sorting.find(s => s.id === columnId)
      if (!sort) return null
      return sort.desc ? <ChevronDown className="gba:h-4 gba:w-4" /> : <ChevronUp className="gba:h-4 gba:w-4" />
    },
    [sorting]
  )

  // Infinite scroll setup
  const loadMoreRef = useRef<HTMLTableRowElement>(null)
  const isLoadingRef = useRef(isLoading)
  const hasMoreRef = useRef(hasMore)

  // Sync refs with current state
  useEffect(() => {
    isLoadingRef.current = isLoading
    hasMoreRef.current = hasMore
  }, [isLoading, hasMore])

  useEffect(() => {
    if (!loadMoreRef.current) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !isLoadingRef.current && hasMoreRef.current) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [loadMore])

  // Sortable Row Component for Actions
  const SortableActionRow: React.FC<{
    actionItem: ContextWithActions['actions'][0]
    contextId: string
    isSaving: boolean
    onRemove: (actionId: string) => void
    onPermissionChange: (actionId: string, permission: string) => void
  }> = ({ actionItem, contextId, isSaving, onRemove, onPermissionChange }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: actionItem.action.id
    })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1
    }

    const subtitle = (() => {
      if (actionItem.action.flowType === 'ACTION') {
        return actionItem.action.processName || ''
      }
      const parts: string[] = []
      if (actionItem.action.targetDesktop) parts.push(actionItem.action.targetDesktop)
      if (actionItem.action.targetMobile) parts.push(actionItem.action.targetMobile)
      return parts.join(' | ')
    })()

    return (
      <TableRow ref={setNodeRef} style={style} className="gba:[&>td]:py-1 gba:[&>td]:px-2">
        <TableCell {...attributes} {...listeners} className="gba:cursor-grab gba:active:cursor-grabbing gba:w-[40px]">
          <span className="gba:text-xs gba:text-muted-foreground">⋮⋮</span>
        </TableCell>
        <TableCell>
          <div className="gba:flex gba:flex-col">
            <span className="gba:font-semibold">{actionItem.action.flowName}</span>
            {subtitle && <span className="gba:text-sm gba:text-muted-foreground">{subtitle}</span>}
          </div>
        </TableCell>
        <TableCell>{actionItem.action.flowType}</TableCell>
        <TableCell>
          <EditableSelectCell
            value={actionItem.permission || ''}
            onChange={value => onPermissionChange(actionItem.action.id, value)}
            options={[
              { value: 'execute', label: 'Execute' },
              { value: 'read', label: 'Read' },
              { value: 'create', label: 'Create' },
              { value: 'update', label: 'Update' },
              { value: 'delete', label: 'Delete' },
              { value: 'approve', label: 'Approve' }
            ]}
            testId={`${dataTestId}-action-permission-${contextId}-${actionItem.action.id}`}
            isEdited={false}
            disabled={isSaving}
            placeholder="Select permission"
          />
        </TableCell>
        <TableCell>
          <Button
            size="sm"
            variant="ghost"
            onClick={async e => {
              e.stopPropagation()
              onRemove(actionItem.action.id)
            }}
            disabled={isSaving}
            data-testid={`${dataTestId}-remove-action-${contextId}-${actionItem.action.id}`}
          >
            <TrashIcon className="gba:h-4 gba:w-4" />
          </Button>
        </TableCell>
      </TableRow>
    )
  }

  // Handle add actions to context (adds to draft, doesn't save yet)
  const handleAddActions = useCallback(
    (contextId: string, actionPermissions: Map<string, string>) => {
      const context = allContexts.find(c => c.context.id === contextId)
      if (!context) return

      // Get existing action IDs (both from context and draft)
      const existingActionIds = new Set(context.actions?.map(a => a.action.id) || [])

      const newDraftActions: Array<{ action: ActionDTO; permission: string }> = []

      actionPermissions.forEach((permission, actionId) => {
        // Skip if action already exists
        if (existingActionIds.has(actionId)) {
          return
        }

        const action = actions.find(a => a.action.id === actionId)
        if (action) {
          newDraftActions.push({
            action: action.action,
            permission
          })
        }
      })

      if (newDraftActions.length > 0) {
        setDraftActions(prev => {
          const newMap = new Map(prev)
          const existing = newMap.get(contextId) || []
          // Also check for duplicates in existing draft actions
          const existingDraftIds = new Set(existing.map(da => da.action.id))
          const uniqueNewActions = newDraftActions.filter(da => !existingDraftIds.has(da.action.id))
          newMap.set(contextId, [...existing, ...uniqueNewActions])
          return newMap
        })

        editableState.setState(prev => {
          const newEdited = new Map(prev.editedEntries)
          const currentEdits = newEdited.get(contextId) || {}
          if (currentEdits.contextName === undefined) {
            newEdited.set(contextId, {
              ...currentEdits,
              contextName: context.context.contextName
            })
          }
          return {
            ...prev,
            editedEntries: newEdited
          }
        })
      }
    },
    [actions, allContexts, editableState]
  )

  // Expanded Row Component with Drag & Drop
  const ExpandedActionsRow: React.FC<{
    item: ContextWithActions
    contextId: string
  }> = ({ item, contextId }) => {
    const contextWithActions = allContexts.find(c => c.context.id === contextId)
    const [localActions, setLocalActions] = useState(contextWithActions?.actions || [])
    const isSaving = editableState.state.savingEntryId === contextId && editableState.state.isSaving

    // Update local actions when context changes (including draft actions)
    useEffect(() => {
      if (contextWithActions?.actions) {
        setLocalActions(contextWithActions.actions)
      }
    }, [contextWithActions?.actions])

    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8
        }
      })
    )

    const handleDragEnd = useCallback(
      (event: DragEndEvent) => {
        const { active, over } = event

        if (!over || active.id === over.id) return

        const oldIndex = localActions.findIndex(a => a.action.id === active.id)
        const newIndex = localActions.findIndex(a => a.action.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          const newActions = arrayMove(localActions, oldIndex, newIndex)
          setLocalActions(newActions)
        }
      },
      [localActions]
    )

    const handleRemoveAction = useCallback(
      async (actionId: string) => {
        const newActions = localActions.filter(a => a.action.id !== actionId)
        setLocalActions(newActions)
      },
      [localActions]
    )

    const handlePermissionChange = useCallback(
      (actionId: string, permission: string) => {
        const newActions = localActions.map(a =>
          a.action.id === actionId ? { ...a, permission: permission || undefined } : a
        )
        setLocalActions(newActions)
      },
      [localActions]
    )

    return (
      <div className="gba-w-full" data-testid={`${dataTestId}-expanded-context-${item.context.id}`}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <Table>
            <TableHeader>
              <TableRow className="gba:[&>th]:py-1 gba:[&>th]:px-2">
                <TableHead className="gba:w-[40px]"></TableHead>
                <TableHead>Actions</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Permission</TableHead>
                <TableHead className="gba:w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localActions.length === 0 ? (
                <TableRow className="gba:[&>td]:py-1 gba:[&>td]:px-2">
                  <TableCell colSpan={5} className="gba:text-center gba:text-muted-foreground">
                    No actions assigned
                  </TableCell>
                </TableRow>
              ) : (
                localActions.map(actionItem => (
                  <SortableActionRow
                    key={actionItem.action.id}
                    actionItem={actionItem}
                    contextId={contextId}
                    isSaving={isSaving}
                    onRemove={handleRemoveAction}
                    onPermissionChange={handlePermissionChange}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </DndContext>
        <div className="gba:mt-4 gba:flex gba:justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setAddActionDialogOpen(contextId)
            }}
            disabled={isSaving}
            data-testid={`${dataTestId}-add-action-${contextId}`}
          >
            <PlusIcon className="gba:h-4 gba:w-4 gba:mr-1" />
            Add Action
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading && filteredData.length === 0) {
    return <TableSkeleton rowCount={10} columnCount={6} />
  }

  if (error && filteredData.length === 0) {
    return (
      <div className="gba:p-6">
        <p className="gba:text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="gba:mb-3 gba:p-3 gba:border gba:border-destructive gba:bg-destructive/10 gba:rounded-lg gba:text-destructive gba:text-sm">
          {error}
        </div>
      )}
      <div className="gba:flex gba:flex-col gba:h-full gba:overflow-auto gba:border gba:rounded-lg">
        <Table className="gba:table-fixed gba:w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="gba:w-8 gba:px-2"></TableHead>
              <TableHead
                style={{ width: '250px' }}
                onClick={() => handleSort('contextName')}
                className="gba:select-none gba:cursor-pointer gba:px-2"
              >
                <div className="gba:flex gba:items-center gba:gap-1">
                  Context Name
                  {getSortIcon('contextName')}
                </div>
              </TableHead>
              <TableHead style={{ width: '200px' }} className="gba:px-2">
                Permission Schema
              </TableHead>
              <TableHead className="gba:text-center gba:px-2" style={{ width: '100px' }}>
                Actions
              </TableHead>
              <TableHead style={{ width: '200px' }} className="gba:px-2">
                Context Data
              </TableHead>
              <TableHead className="gba:sticky gba:right-0 gba:bg-muted gba:z-10 gba:px-2 gba:w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="gba:text-center gba:py-8 gba:text-muted-foreground gba:px-2">
                  {searchValue ? 'No contexts found matching your search.' : 'No Context resources found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map(contextItem => (
                <React.Fragment key={contextItem.context.id}>
                  <ContextTableRow
                    context={contextItem}
                    editableState={editableState}
                    onFieldEdit={editableState.onFieldEdit}
                    onSaveEntry={handleSaveEntry}
                    onDiscardEntry={handleDiscardEntry}
                    onDelete={onDelete}
                    onToggleExpansion={handleToggleExpansion}
                    isExpanded={expanded.has(contextItem.context.id)}
                    isDeleting={isDeleting}
                    setContextDataDialogOpen={setContextDataDialogOpen}
                    dataTestId={dataTestId}
                    {...context}
                  />
                  {expanded.has(contextItem.context.id) && (
                    <TableRow>
                      <TableCell colSpan={5} className="gba:bg-muted/30 gba:p-4">
                        <ExpandedActionsRow item={contextItem} contextId={contextItem.context.id} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
            {/* Infinite Scroll Loader */}
            {hasMore && (
              <TableRow ref={loadMoreRef}>
                <TableCell colSpan={5} className="gba:text-center gba:py-4 gba:px-2">
                  {isLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    <span className="gba:text-sm gba:text-muted-foreground">Loading more...</span>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Status Info */}
      {filteredData.length > 0 && (
        <div className="gba:px-4 gba:py-3 gba:border-t gba:text-sm gba:text-muted-foreground">
          Showing {filteredData.length} of {totalCount} contexts
        </div>
      )}

      {contextDialogOpen && (
        <ContextDialog
          open={contextDialogOpen}
          onOpenChange={setContextDialogOpen}
          onSubmit={onCreateContext}
          actions={actions.map(a => a.action) || []}
          data-testid={`${dataTestId}-context-dialog`}
          {...context}
        />
      )}

      {contextDataDialogOpen && (
        <ContextDataDialog
          open={true}
          onOpenChange={open => !open && setContextDataDialogOpen(null)}
          contextId={contextDataDialogOpen}
          contextName={allContexts.find(c => c.context.id === contextDataDialogOpen)?.context.contextName}
          contextData={
            (editableState.getFieldValue(contextDataDialogOpen, 'contextData') as ContextDataDTO[]) ||
            allContexts.find(c => c.context.id === contextDataDialogOpen)?.context.contextData ||
            []
          }
          onSave={contextData => {
            if (contextDataDialogOpen) {
              editableState.onFieldEdit(contextDataDialogOpen, 'contextData', contextData)
              setContextDataDialogOpen(null)
            }
          }}
          isSaving={editableState.state.savingEntryId === contextDataDialogOpen && editableState.state.isSaving}
          dataTestId={`${dataTestId}-context-data-dialog`}
        />
      )}

      {addActionDialogOpen && (
        <AddActionDialog
          open={true}
          onOpenChange={open => !open && setAddActionDialogOpen(null)}
          onAddActions={async actionPermissions => {
            if (addActionDialogOpen) {
              handleAddActions(addActionDialogOpen, actionPermissions)
              setAddActionDialogOpen(null)
            }
          }}
          existingActionIds={(() => {
            const context = allContexts.find(c => c.context.id === addActionDialogOpen)
            if (!context) return []
            return context.actions?.map(a => a.action.id) || []
          })()}
          data-testid={`${dataTestId}-add-action-dialog`}
          {...context}
        />
      )}
    </>
  )
}
