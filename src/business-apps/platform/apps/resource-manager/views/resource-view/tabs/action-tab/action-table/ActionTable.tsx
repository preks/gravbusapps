import React, { useCallback, useMemo, useState } from 'react'
import { DataTable } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useUpdateAction } from '@/common/data/resources/hooks/useUpdateAction'
import { useCreateAction } from '@/common/data/resources/hooks/useCreateAction'
import type { ActionWithContexts } from '@/common/data/resources/types/action.types'
import { DescriptionDialog } from '../../../../../components/DescriptionDialog'
import { useEditableState } from '../../../../../hooks/useEditableState'
import type { ActionDTO } from '@/common/data/resources/types/action.types'
import { useComponents } from '@/common/data/resources/hooks/useComponents'
import { createActionTableColumns } from './ActionTableColumns'
import { useResourceManagerContext } from '../../../../../contexts/ResourceManagerContext'
import { Button, ButtonGroup } from '@newwork/nw-design-system'
import { Save, X, Trash } from 'lucide-react'

interface ActionTableProps extends BusinessAppContextProps {
  actions: ActionWithContexts[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetchActions: () => Promise<void>
  searchValue: string
  sorting: Array<{ id: string; desc: boolean }>
  onSearchChange: (value: string) => void
  onSortingChange: (sorting: Array<{ id: string; desc: boolean }>) => void
  pagination: { pageIndex: number; pageSize: number }
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void
  roleOptions: Array<{ id: string; name: string }>
  featureOptions: Array<{ id: string; name: string }>
  rolesLoading: boolean
  featuresLoading: boolean
  rolesError: string | null
  featuresError: string | null
  refetchRoles: () => Promise<void>
  refetchFeatures: () => Promise<void>
  onDelete: (action: ActionWithContexts) => void
  isUpdating: boolean
  isDeleting: boolean
  onAddActionRef?: React.MutableRefObject<(() => void) | null>
  'data-testid'?: string
}

export const ActionTable: React.FC<ActionTableProps> = ({
  actions,
  totalCount,
  isLoading,
  error,
  refetchActions,
  searchValue,
  sorting,
  onSearchChange,
  onSortingChange,
  pagination,
  onPaginationChange,
  roleOptions,
  featureOptions,
  rolesLoading,
  featuresLoading,
  rolesError,
  featuresError,
  refetchRoles,
  refetchFeatures,
  onDelete,
  isUpdating,
  isDeleting,
  onAddActionRef,
  'data-testid': dataTestId = 'action-table',
  ...context
}) => {
  // Draft actions state (managed locally)
  const [draftActions, setDraftActions] = useState<ActionWithContexts[]>([])

  // Merge draft actions with regular actions (drafts at the top)
  const allActions = useMemo(() => {
    return [...draftActions, ...actions]
  }, [draftActions, actions])

  // Editable state for inline editing
  const actionEntries = useMemo(() => allActions.map(item => item.action), [allActions])

  // Get domain/process data from context
  const { domains, getProcessesForDomain } = useResourceManagerContext()

  // Create action hook
  const { createAction } = useCreateAction(context)

  // Components for targetDesktop/targetMobile - lazy loaded (only component list, no Azure Blobs)
  const {
    components: screenResources,
    isLoading: screenResourcesLoading,
    refetch: refetchScreenResources
  } = useComponents(context)

  // Convert screen resources to combobox options (using form key from screenComponents.key)
  // Also include any values from actions that are not in screenResources
  const screenComponentOptions = useMemo(() => {
    const options = screenResources.map(resource => {
      const formKey = resource.screenComponents?.key || ''
      return {
        id: formKey,
        name: formKey || resource.screenKey || ''
      }
    })

    // Add any targetDesktop/targetMobile values from actions that are not in screenResources
    const actionValues = new Set<string>()
    actions.forEach(item => {
      if (item.action.targetDesktop) actionValues.add(item.action.targetDesktop)
      if (item.action.targetMobile) actionValues.add(item.action.targetMobile)
    })

    actionValues.forEach(value => {
      if (!options.find(opt => opt.id === value)) {
        options.push({ id: value, name: value })
      }
    })

    return options.sort((a, b) => a.name.localeCompare(b.name))
  }, [screenResources, actions])

  // Search function for screen components
  const searchScreenComponents = useCallback(() => {
    // The EditableComboboxCell will handle filtering internally
    // This is just a placeholder for the onSearch prop
  }, [])

  const editableState = useEditableState<ActionDTO>(actionEntries)
  const { updateAction } = useUpdateAction(context)

  // Description dialog state
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false)
  const [descriptionActionId, setDescriptionActionId] = useState<string | null>(null)

  // Handle add action - create draft row
  const handleAddAction = useCallback(() => {
    const draftId = `draft:${Date.now()}`
    const draftAction: ActionWithContexts = {
      action: {
        id: draftId,
        flowName: '',
        flowType: '',
        processName: '',
        domain: '',
        targetDesktop: '',
        targetMobile: '',
        description: ''
      } as ActionDTO,
      roleContexts: [],
      featureContexts: []
    }

    setDraftActions(prev => [draftAction, ...prev])

    // Seed edits so Save/Discard buttons appear
    editableState.setState(prev => {
      const newEdited = new Map(prev.editedEntries)
      newEdited.set(draftId, { flowName: '', flowType: '' })
      const newDrafts = new Set(prev.draftEntryIds)
      newDrafts.add(draftId)
      return {
        ...prev,
        editedEntries: newEdited,
        draftEntryIds: newDrafts
      }
    })
  }, [editableState])

  // Expose handleAddAction via ref
  React.useEffect(() => {
    if (onAddActionRef) {
      onAddActionRef.current = handleAddAction
    }
  }, [onAddActionRef, handleAddAction])

  // Save handler for inline editing
  const handleSaveEntry = useCallback(
    async (actionId: string) => {
      const edits = editableState.state.editedEntries.get(actionId)
      if (!edits || Object.keys(edits).length === 0) return

      editableState.setSaving(actionId, true)
      try {
        const isDraft = editableState.isDraft(actionId)

        if (isDraft) {
          // Create new action via API
          const result = await createAction(edits)
          if (result) {
            // Remove draft from local state
            setDraftActions(prev => prev.filter(d => d.action.id !== actionId))
            editableState.setState(prev => {
              const newEdited = new Map(prev.editedEntries)
              newEdited.delete(actionId)
              const newDrafts = new Set(prev.draftEntryIds)
              newDrafts.delete(actionId)
              return { ...prev, editedEntries: newEdited, draftEntryIds: newDrafts }
            })
            await refetchActions()
          }
        } else {
          // Update existing action
          const result = await updateAction(actionId, edits)
          if (result) {
            editableState.onDiscardEntry(actionId)
            await refetchActions()
          }
        }
      } catch {
        // Error handled
      } finally {
        editableState.setSaving(actionId, false)
      }
    },
    [editableState, updateAction, createAction, refetchActions, setDraftActions]
  )

  // Handle discard entry
  const handleDiscardEntry = useCallback(
    (actionId: string) => {
      const isDraft = editableState.isDraft(actionId)
      if (isDraft) {
        // Remove draft from local state
        setDraftActions(prev => prev.filter(d => d.action.id !== actionId))
      }
      editableState.onDiscardEntry(actionId)
    },
    [editableState, setDraftActions]
  )

  // Render actions for DataTable actions prop
  const renderActions = useCallback(
    (row: any) => {
      const actionId = row.original.action.id
      const hasEdits = editableState.hasEdits(actionId)
      const isSaving = editableState.state.savingEntryId === actionId && editableState.state.isSaving

      return (
        <ButtonGroup onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} className="gba:h-6">
          <Button
            size="iconSm"
            variant="secondary"
            className="gba:h-6"
            onClick={e => {
              e.stopPropagation()
              handleSaveEntry(actionId)
            }}
            disabled={!hasEdits || isSaving || isUpdating || isDeleting}
            data-testid={`${dataTestId}-save-action-${actionId}`}
            title="Save changes"
          >
            <Save className="gba:h-4 gba:w-4" />
          </Button>
          <Button
            size="iconSm"
            variant="secondary"
            className="gba:h-6"
            onClick={e => {
              e.stopPropagation()
              handleDiscardEntry(actionId)
            }}
            disabled={!hasEdits || isSaving || isUpdating || isDeleting}
            data-testid={`${dataTestId}-discard-action-${actionId}`}
            title="Discard changes"
          >
            <X className="gba:h-4 gba:w-4" />
          </Button>
          <Button
            size="iconSm"
            variant="secondary"
            className="gba:h-6"
            onClick={e => {
              e.stopPropagation()
              onDelete(row.original)
            }}
            disabled={isUpdating || isDeleting}
            data-testid={`${dataTestId}-delete-action-${actionId}`}
            title="Delete"
          >
            <Trash className="gba:h-4 gba:w-4" />
          </Button>
        </ButtonGroup>
      )
    },
    [editableState, handleSaveEntry, handleDiscardEntry, isUpdating, isDeleting, onDelete, dataTestId]
  )

  // Filter and sort data
  const safeData = useMemo(() => {
    if (!Array.isArray(allActions)) return []
    let filtered = allActions
      .filter(item => item?.action?.id)
      .map(item => ({
        ...item,
        id: item.action.id
      }))

    // Apply search filter (DataTable handles sorting via enableSorting)
    if (searchValue.trim()) {
      const searchLower = searchValue.toLowerCase()
      filtered = filtered.filter(
        item =>
          item.action.flowName?.toLowerCase().includes(searchLower) ||
          item.action.processName?.toLowerCase().includes(searchLower) ||
          item.action.flowType?.toLowerCase().includes(searchLower) ||
          item.action.domain?.toLowerCase().includes(searchLower) ||
          item.action.targetDesktop?.toLowerCase().includes(searchLower) ||
          item.action.targetMobile?.toLowerCase().includes(searchLower)
      )
    }

    // Note: Sorting is handled by DataTable via enableSorting prop
    return filtered
  }, [allActions, searchValue])

  // Use filtered data directly (API handles pagination)
  const paginatedData = useMemo(() => {
    return safeData
  }, [safeData])

  const tableKey = useMemo(() => {
    const hasData = safeData.length > 0
    const isLoaded = !isLoading && hasData
    return `action-table-${isLoaded ? 'loaded' : 'loading'}-${hasData ? safeData.length : 0}`
  }, [safeData.length, isLoading])

  // Create columns using the column definitions
  const columns = useMemo(
    () =>
      createActionTableColumns({
        dataTestId,
        actionEntries,
        editableState,
        onDelete,
        handleSaveEntry,
        isUpdating,
        isDeleting,
        setDescriptionActionId,
        setDescriptionDialogOpen,
        domains,
        getProcessesForDomain,
        screenComponentOptions,
        screenResourcesLoading,
        screenResourcesLength: screenResources.length,
        refetchScreenResources,
        searchScreenComponents,
        roleOptions,
        featureOptions,
        rolesLoading,
        featuresLoading,
        rolesError,
        featuresError,
        refetchRoles,
        refetchFeatures
      }).filter(col => col.id !== 'table-actions'),
    [
      dataTestId,
      actionEntries,
      editableState,
      onDelete,
      handleSaveEntry,
      isUpdating,
      isDeleting,
      setDescriptionActionId,
      setDescriptionDialogOpen,
      domains,
      getProcessesForDomain,
      screenComponentOptions,
      screenResourcesLoading,
      screenResources.length,
      refetchScreenResources,
      searchScreenComponents,
      roleOptions,
      featureOptions,
      rolesLoading,
      featuresLoading,
      rolesError,
      featuresError,
      refetchRoles,
      refetchFeatures
    ]
  )

  if (!columns || columns.length === 0) return null

  const hasValidData = safeData.length === 0 || safeData.every(item => item?.action?.id)

  if (!hasValidData && safeData.length > 0) {
    return (
      <div className="gba:p-6">
        <p className="gba:text-destructive">Error: Some action resources have invalid data structure.</p>
      </div>
    )
  }

  if (isLoading && safeData.length === 0) {
    return (
      <div className="gba:p-6">
        <p className="gba:text-muted-foreground">Loading action resources...</p>
      </div>
    )
  }

  return (
    <>
      <DataTable<ActionWithContexts & { id: string }>
        key={tableKey}
        variant="compact"
        data={paginatedData}
        columns={columns as any}
        actions={renderActions}
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
        tableLayout="fixed"
        enableResizing={true}
        enableColumnPinning
        emptyMessage="No Action resources found"
        data-testid={`${dataTestId}-actions-view`}
      />
      {descriptionActionId && (
        <DescriptionDialog
          open={descriptionDialogOpen}
          onOpenChange={setDescriptionDialogOpen}
          description={actionEntries.find(a => a.id === descriptionActionId)?.description || ''}
          descriptionTranslation={{}}
          onSave={async description => {
            const actionId = descriptionActionId
            await handleSaveEntry(actionId)
            // Also save description separately if needed
            await updateAction(actionId, { description })
            await refetchActions()
          }}
          data-testid={`${dataTestId}-description-dialog`}
          {...context}
        />
      )}
    </>
  )
}
