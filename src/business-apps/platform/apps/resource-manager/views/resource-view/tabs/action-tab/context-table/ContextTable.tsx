import React, { useCallback, useMemo, useState, useEffect } from 'react'
import {
  DataTable,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge
} from '@newwork/nw-design-system'
import { DndContext, closestCenter, DragEndEvent, useSensors, useSensor, PointerSensor } from '@dnd-kit/core'
import { useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash, Plus } from '@phosphor-icons/react'
import type { ExpandedState, Row } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { ContextWithActions, ContextDTO } from '@/common/data/resources/types/context.types'
import { ContextDialog } from './components/ContextDialog'
import { EditableSelectCell } from '@/components/editable-cell'
import { useEditableState } from '../../../../../hooks/useEditableState'
import type { ActionDTO } from '@/common/data/resources/types/action.types'
import { createContextTableColumns } from './ContextTableColumns'

interface ContextTableProps extends BusinessAppContextProps {
  contexts: ContextWithActions[]
  totalCount: number
  isLoading: boolean
  error: string | null
  searchValue: string
  sorting: Array<{ id: string; desc: boolean }>
  onSearchChange: (value: string) => void
  onSortingChange: (sorting: Array<{ id: string; desc: boolean }>) => void
  pagination: { pageIndex: number; pageSize: number }
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void
  contextDialogOpen: boolean
  setContextDialogOpen: (open: boolean) => void
  onCreateContext: (contextData: Omit<ContextDTO, 'id'>, actionIds: string[]) => Promise<void>
  actions: Array<{ action: ActionDTO }>
  onAddContextRef?: React.MutableRefObject<(() => void) | null>
  'data-testid'?: string
}

export const ContextTable: React.FC<ContextTableProps> = ({
  contexts,
  totalCount,
  isLoading,
  error,
  searchValue,
  sorting,
  onSearchChange,
  onSortingChange,
  pagination,
  onPaginationChange,
  contextDialogOpen,
  setContextDialogOpen,
  onCreateContext,
  actions,
  onAddContextRef,
  'data-testid': dataTestId = 'context-table',
  ...context
}) => {
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [contextDataDialogOpen, setContextDataDialogOpen] = useState<string | null>(null)

  // Draft contexts state (managed locally)
  const [draftContexts, setDraftContexts] = useState<ContextWithActions[]>([])

  // Merge draft contexts with regular contexts (drafts at the top)
  const allContexts = useMemo(() => {
    return [...draftContexts, ...contexts]
  }, [draftContexts, contexts])

  // Editable state for contexts
  const contextEntries = useMemo(() => allContexts.map(item => item.context), [allContexts])
  const editableState = useEditableState<ContextDTO>(contextEntries)

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

  // Filter and sort data
  const safeData = useMemo(() => {
    if (!Array.isArray(allContexts)) return []
    let filtered = allContexts
      .filter(item => item?.context?.id)
      .map(item => ({
        ...item,
        id: item.context.id
      }))

    // Apply search filter
    if (searchValue.trim()) {
      const searchLower = searchValue.toLowerCase()
      filtered = filtered.filter(
        item =>
          item.context.contextName?.toLowerCase().includes(searchLower) ||
          item.context.contextData?.some(data => data.contextDataName?.toLowerCase().includes(searchLower))
      )
    }

    // Apply sorting
    if (sorting.length > 0) {
      const sort = sorting[0]
      filtered = [...filtered].sort((a, b) => {
        let aValue: any
        let bValue: any

        if (sort.id === 'contextName') {
          aValue = a.context.contextName || ''
          bValue = b.context.contextName || ''
        } else {
          return 0
        }

        const aStr = String(aValue).toLowerCase()
        const bStr = String(bValue).toLowerCase()
        const comparison = aStr.localeCompare(bStr)
        return sort.desc ? -comparison : comparison
      })
    }

    return filtered
  }, [allContexts, searchValue, sorting])

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = pagination.pageIndex * pagination.pageSize
    const endIndex = startIndex + pagination.pageSize
    return safeData.slice(startIndex, endIndex)
  }, [safeData, pagination.pageIndex, pagination.pageSize])

  // Removed unused getRowId

  const tableKey = useMemo(() => {
    const hasData = safeData.length > 0
    const isLoaded = !isLoading && hasData
    return `context-table-${isLoaded ? 'loaded' : 'loading'}-${hasData ? safeData.length : 0}`
  }, [safeData.length, isLoading])

  const columns = useMemo(
    () =>
      createContextTableColumns({
        dataTestId,
        contextEntries,
        editableState,
        contextDataDialogOpen,
        setContextDataDialogOpen
      }),
    [dataTestId, contextEntries, editableState, contextDataDialogOpen, setContextDataDialogOpen]
  )

  const getRowCanExpand = useCallback(() => {
    return true // Always allow expansion to manage actions
  }, [])

  // Helper function to get badge variant for flowType
  const getFlowTypeBadgeVariant = (flowType?: string): 'default' | 'secondary' | 'outline' | 'info' => {
    switch (flowType) {
      case 'ACTION':
        return 'info'
      case 'NAVIGATION':
        return 'secondary'
      case 'REPORT':
        return 'outline'
      default:
        return 'default'
    }
  }

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

    return (
      <TableRow ref={setNodeRef} style={style} className="gba:[&>td]:py-1 gba:[&>td]:px-2">
        <TableCell {...attributes} {...listeners} className="gba:cursor-grab gba:active:cursor-grabbing gba:w-[40px]">
          <span className="gba:text-xs gba:text-muted-foreground">⋮⋮</span>
        </TableCell>
        <TableCell>
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:font-medium gba:text-sm">{actionItem.action.flowName}</span>
            {actionItem.action.flowType && (
              <Badge variant={getFlowTypeBadgeVariant(actionItem.action.flowType)} size="sm">
                {actionItem.action.flowType}
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          <code className="gba:text-xs gba:bg-muted gba:px-2 gba:py-1 gba:rounded">
            {actionItem.action.processName}
          </code>
        </TableCell>
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
            <Trash className="gba:h-4 gba:w-4" />
          </Button>
        </TableCell>
      </TableRow>
    )
  }

  // Expanded Row Component with Drag & Drop
  const ExpandedActionsRow: React.FC<{
    item: ContextWithActions
    contextId: string
  }> = ({ item, contextId }) => {
    const contextWithActions = contexts.find(c => c.context.id === contextId)
    const [localActions, setLocalActions] = useState(contextWithActions?.actions || [])
    const isSaving = editableState.state.savingEntryId === contextId && editableState.state.isSaving

    // Update local actions when context changes
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
          // TODO: Update rank/order via ActionAssignment API
          // TODO: Save via updateActionAssignment
        }
      },
      [localActions]
    )

    const handleRemoveAction = useCallback(
      async (actionId: string) => {
        // TODO: Remove action from assignment via ActionAssignment API
        const newActions = localActions.filter(a => a.action.id !== actionId)
        setLocalActions(newActions)
      },
      [localActions, contextId]
    )

    const handlePermissionChange = useCallback(
      (actionId: string, permission: string) => {
        // TODO: Update permission via ActionAssignment API
        const newActions = localActions.map(a =>
          a.action.id === actionId ? { ...a, permission: permission || undefined } : a
        )
        setLocalActions(newActions)
      },
      [localActions]
    )

    return (
      <div
        className="gba:bg-muted/30 gba:p-4 gba:rounded-md"
        data-testid={`${dataTestId}-expanded-context-${item.context.id}`}
      >
        <h4 className="gba:font-semibold gba:mb-3 gba:text-sm">Actions for {item.context.contextName}</h4>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <Table>
            <TableHeader>
              <TableRow className="gba:[&>th]:py-1 gba:[&>th]:px-2">
                <TableHead className="gba:w-[40px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Process</TableHead>
                <TableHead>Permission</TableHead>
                <TableHead className="gba:w-[100px]">Actions</TableHead>
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
              // TODO: Open dialog to select and add action
            }}
            disabled={isSaving}
            data-testid={`${dataTestId}-add-action-${contextId}`}
          >
            <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
            Add Action
          </Button>
        </div>
      </div>
    )
  }

  const renderExpandedRow = useCallback((row: Row<ContextWithActions & { id: string }>) => {
    const item = row.original
    const contextId = item.context.id

    return <ExpandedActionsRow item={item} contextId={contextId} />
  }, [])

  if (!columns || columns.length === 0) return null

  const hasValidData = safeData.length === 0 || safeData.every(item => item?.context?.id)

  if (!hasValidData && safeData.length > 0) {
    return (
      <div className="gba:p-6">
        <p className="gba:text-destructive">Error: Some context resources have invalid data structure.</p>
      </div>
    )
  }

  if (isLoading && safeData.length === 0) {
    return (
      <div className="gba:p-6">
        <p className="gba:text-muted-foreground">Loading context resources...</p>
      </div>
    )
  }

  return (
    <>
      <DataTable<ContextWithActions & { id: string }>
        key={tableKey}
        variant="compact"
        data={paginatedData}
        columns={columns}
        loading={isLoading}
        error={error || undefined}
        totalCount={totalCount}
        enablePagination
        pagination={pagination}
        onPaginationChange={onPaginationChange}
        rowsPerPageOptions={[10, 20, 50, 100]}
        enableSorting
        enableSelection={false}
        sorting={sorting}
        onSortingChange={onSortingChange}
        globalFilter={searchValue}
        onGlobalFilterChange={onSearchChange}
        enableGlobalFilter
        enableExpansion
        expanded={expanded}
        onExpandedChange={setExpanded}
        getRowCanExpand={getRowCanExpand}
        renderExpandedRow={renderExpandedRow}
        tableLayout="fixed"
        enableResizing={true}
        enableColumnPinning
        emptyMessage="No Context resources found"
        data-testid={`${dataTestId}-contexts-view`}
      />
      {contextDialogOpen && (
        <ContextDialog
          open={contextDialogOpen}
          onOpenChange={setContextDialogOpen}
          onSubmit={onCreateContext}
          actions={actions.map(a => a.action) || []}
          mode="create"
          data-testid={`${dataTestId}-context-dialog`}
          {...context}
        />
      )}
    </>
  )
}
