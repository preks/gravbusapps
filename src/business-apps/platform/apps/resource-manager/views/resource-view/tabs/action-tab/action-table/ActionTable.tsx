import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Spinner } from '@newwork/nw-design-system'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useUpdateAction } from '@/common/data/resources/hooks/useUpdateAction'
import { useCreateAction } from '@/common/data/resources/hooks/useCreateAction'
import type { ActionWithContexts, ActionDTO } from '@/common/data/resources/types/action.types'
import { DescriptionDialog } from '../../../../../components/DescriptionDialog'
import { useEditableState } from '../../../../../hooks/useEditableState'
import { useComponents } from '@/common/data/resources/hooks/useComponents'
import { useResourceData } from '../../../../../contexts/ResourceManagerContext'
import { ActionTableRow } from './components/ActionTableRow'

interface ActionTableProps extends BusinessAppContextProps {
  actions: ActionWithContexts[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetchActions: () => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
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
  refetchActions,
  loadMore,
  hasMore,
  searchValue,
  sorting,
  onSortingChange,
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

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<
    Map<string, { roles?: boolean; features?: boolean; builderType?: boolean }>
  >(new Map())

  // Merge draft actions with regular actions (drafts at the top)
  const allActions = useMemo(() => {
    return [...draftActions, ...actions]
  }, [draftActions, actions])

  // Editable state for inline editing
  const actionEntries = useMemo(() => allActions.map(item => item.action), [allActions])

  // Get domain/process data from context
  const { domains, getProcessesForDomain } = useResourceData()

  // Create action hook
  const { createAction } = useCreateAction(context)

  // Components for targetDesktop/targetMobile - lazy loaded (only component list, no Azure Blobs)
  const {
    components: screenResources,
    isLoading: screenResourcesLoading,
    refetch: refetchScreenResources
  } = useComponents(context)

  // Convert screen resources to combobox options (using form key from screenComponents.key)
  // EditableComboboxCell allows custom values, so we only need screenResources as options
  const screenComponentOptions = useMemo(() => {
    return screenResources
      .map(resource => {
        const formKey = resource.screenComponents?.key || ''
        return {
          id: formKey,
          name: formKey || resource.screenKey || ''
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [screenResources])

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
        description: '',
        builderType: 'NATIVE_SCREEN'
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

  // Helper: Clear validation errors for an action
  const clearValidationErrors = useCallback((actionId: string) => {
    setValidationErrors(prev => {
      const newMap = new Map(prev)
      newMap.delete(actionId)
      return newMap
    })
  }, [])

  // Helper: Validate action fields
  const validateActionFields = useCallback(
    (actionId: string): { roles?: boolean; features?: boolean; builderType?: boolean } | null => {
      const roles = editableState.getFieldValue(actionId, 'roles') as string[] | undefined
      const features = editableState.getFieldValue(actionId, 'features') as string[] | undefined
      const builderType = editableState.getFieldValue(actionId, 'builderType') as string | undefined
      const errors: { roles?: boolean; features?: boolean; builderType?: boolean } = {}

      if (!roles || roles.length === 0) {
        errors.roles = true
      }
      if (!features || features.length === 0) {
        errors.features = true
      }
      if (!builderType || builderType.trim() === '') {
        errors.builderType = true
      }

      if (Object.keys(errors).length > 0) {
        return errors
      }
      return null
    },
    [editableState]
  )

  // Helper: Transform role/feature IDs to names
  const transformIdsToNames = useCallback((ids: string[], options: Array<{ id: string; name: string }>): string[] => {
    return ids.map(id => {
      const option = options.find(opt => opt.id === id)
      return option?.name ?? id
    })
  }, [])

  // Helper: Create new action
  const createNewAction = useCallback(
    async (actionId: string, edits: Partial<ActionDTO>) => {
      const transformedEdits: any = { ...edits }
      if (edits.roles !== undefined && Array.isArray(edits.roles)) {
        transformedEdits.roles = transformIdsToNames(edits.roles, roleOptions)
      }
      if (edits.features !== undefined && Array.isArray(edits.features)) {
        transformedEdits.features = transformIdsToNames(edits.features, featureOptions)
      }

      if (transformedEdits.builderType === undefined) {
        const originalAction = allActions.find(a => a.action.id === actionId)
        if (originalAction?.action.builderType) {
          transformedEdits.builderType = originalAction.action.builderType
        }
      }

      const result = await createAction(transformedEdits)
      if (result) {
        setDraftActions(prev => prev.filter(d => d.action.id !== actionId))
        editableState.setState(prev => {
          const newEdited = new Map(prev.editedEntries)
          newEdited.delete(actionId)
          const newDrafts = new Set(prev.draftEntryIds)
          newDrafts.delete(actionId)
          return { ...prev, editedEntries: newEdited, draftEntryIds: newDrafts }
        })
        clearValidationErrors(actionId)
        await refetchActions()
      }
    },
    [
      createAction,
      refetchActions,
      setDraftActions,
      editableState,
      allActions,
      roleOptions,
      featureOptions,
      transformIdsToNames,
      clearValidationErrors
    ]
  )

  // Helper: Update existing action
  const updateExistingAction = useCallback(
    async (actionId: string, edits: Partial<ActionDTO>) => {
      const originalAction = allActions.find(a => a.action.id === actionId)
      if (!originalAction) {
        editableState.setSaving(actionId, false)
        return
      }

      const fullActionData: Partial<ActionDTO> = { ...originalAction.action }
      Object.keys(edits).forEach(key => {
        const field = key as keyof ActionDTO
        const editedValue = edits[field]
        if (editedValue !== undefined) {
          fullActionData[field] = editedValue as any
        }
      })

      if (fullActionData.roles !== undefined && Array.isArray(fullActionData.roles)) {
        fullActionData.roles = transformIdsToNames(fullActionData.roles, roleOptions)
      }
      if (fullActionData.features !== undefined && Array.isArray(fullActionData.features)) {
        fullActionData.features = transformIdsToNames(fullActionData.features, featureOptions)
      }

      fullActionData.id = originalAction.action.id
      if (originalAction.action.version !== undefined) {
        fullActionData.version = originalAction.action.version
      }

      const result = await updateAction(actionId, fullActionData)
      if (result) {
        editableState.onDiscardEntry(actionId)
        clearValidationErrors(actionId)
        await refetchActions()
      }
    },
    [
      updateAction,
      refetchActions,
      editableState,
      allActions,
      roleOptions,
      featureOptions,
      transformIdsToNames,
      clearValidationErrors
    ]
  )

  // Save handler for inline editing
  const handleSaveEntry = useCallback(
    async (actionId: string) => {
      const edits = editableState.state.editedEntries.get(actionId)
      if (!edits || Object.keys(edits).length === 0) return

      const validationErrors = validateActionFields(actionId)
      if (validationErrors) {
        setValidationErrors(prev => new Map(prev).set(actionId, validationErrors))
        editableState.setSaving(actionId, false)
        return
      }

      clearValidationErrors(actionId)
      editableState.setSaving(actionId, true)
      try {
        const isDraft = editableState.isDraft(actionId)
        if (isDraft) {
          await createNewAction(actionId, edits)
        } else {
          await updateExistingAction(actionId, edits)
        }
      } catch {
        // Error handled
      } finally {
        editableState.setSaving(actionId, false)
      }
    },
    [editableState, validateActionFields, clearValidationErrors, createNewAction, updateExistingAction]
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
      // Clear validation errors on discard
      setValidationErrors(prev => {
        const newMap = new Map(prev)
        newMap.delete(actionId)
        return newMap
      })
    },
    [editableState, setDraftActions]
  )

  // Server-side filtering via searchValue prop - no client-side filtering needed
  const filteredData = allActions.filter(item => item?.action?.id)

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
      if (!sort) {
        // Unsorted: show both icons stacked with low opacity
        return (
          <div className="gba:w-4 gba:h-4 gba:opacity-30 gba:relative gba:shrink-0">
            <ChevronUp className="gba:h-4 gba:w-4 gba:absolute" size={16} />
            <ChevronDown className="gba:h-4 gba:w-4 gba:absolute gba:translate-y-1" size={16} />
          </div>
        )
      }
      // Sorted: show single icon with full opacity and primary color
      return sort.desc ? (
        <ChevronDown className="gba:h-4 gba:w-4 gba:opacity-100 gba:text-primary gba:shrink-0" size={16} />
      ) : (
        <ChevronUp className="gba:h-4 gba:w-4 gba:opacity-100 gba:text-primary gba:shrink-0" size={16} />
      )
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
  }, [loadMore, actions.length])

  if (isLoading && filteredData.length === 0) {
    return (
      <div className="gba:p-6 gba:flex gba:justify-center">
        <Spinner size="md" />
      </div>
    )
  }

  return (
    <>
      <div className="gba:flex gba:flex-col gba:h-full gba:overflow-auto gba:border gba:rounded-lg">
        <Table className="gba:table-fixed gba:w-full">
          <TableHeader>
            <TableRow>
              <TableHead
                style={{ width: '300px' }}
                onClick={() => handleSort('flowName')}
                className="gba:select-none gba:cursor-pointer gba:px-2"
              >
                <div className="gba:flex gba:items-center gba:gap-1">
                  Name
                  {getSortIcon('flowName')}
                </div>
              </TableHead>
              <TableHead style={{ width: '120px' }} className="gba:px-2">
                Description
              </TableHead>
              <TableHead
                style={{ width: '216px' }}
                onClick={() => handleSort('domain')}
                className="gba:select-none gba:cursor-pointer gba:px-2"
              >
                <div className="gba:flex gba:items-center gba:gap-1">
                  Service
                  {getSortIcon('domain')}
                </div>
              </TableHead>
              <TableHead
                style={{ width: '216px' }}
                onClick={() => handleSort('processName')}
                className="gba:select-none gba:cursor-pointer gba:px-2"
              >
                <div className="gba:flex gba:items-center gba:gap-1">
                  Process Name
                  {getSortIcon('processName')}
                </div>
              </TableHead>
              <TableHead
                style={{ width: '120px' }}
                onClick={() => handleSort('flowType')}
                className="gba:select-none gba:cursor-pointer gba:px-2"
              >
                <div className="gba:flex gba:items-center gba:gap-1">
                  Flow Type
                  {getSortIcon('flowType')}
                </div>
              </TableHead>
              <TableHead
                style={{ width: '216px' }}
                onClick={() => handleSort('targetDesktop')}
                className="gba:select-none gba:cursor-pointer gba:px-2"
              >
                <div className="gba:flex gba:items-center gba:gap-1">
                  Target Desktop
                  {getSortIcon('targetDesktop')}
                </div>
              </TableHead>
              <TableHead
                style={{ width: '216px' }}
                onClick={() => handleSort('targetMobile')}
                className="gba:select-none gba:cursor-pointer gba:px-2"
              >
                <div className="gba:flex gba:items-center gba:gap-1">
                  Target Mobile
                  {getSortIcon('targetMobile')}
                </div>
              </TableHead>
              <TableHead className="gba:text-center gba:px-2" style={{ width: '100px' }}>
                Searchable
              </TableHead>
              <TableHead style={{ width: '350px' }} className="gba:px-2">
                Roles
              </TableHead>
              <TableHead style={{ width: '350px' }} className="gba:px-2">
                Features
              </TableHead>
              <TableHead
                style={{ width: '150px' }}
                onClick={() => handleSort('builderType')}
                className="gba:select-none gba:cursor-pointer gba:px-2"
              >
                <div className="gba:flex gba:items-center gba:gap-1">
                  Builder Type
                  {getSortIcon('builderType')}
                </div>
              </TableHead>
              <TableHead className="gba:sticky gba:right-0 gba:bg-muted gba:z-10 gba:px-2 gba:w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="gba:text-center gba:py-8 gba:text-muted-foreground">
                  {searchValue ? 'No actions found matching your search.' : 'No Action resources found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map(action => (
                <ActionTableRow
                  key={action.action.id}
                  action={action}
                  editableState={editableState}
                  onFieldEdit={editableState.onFieldEdit}
                  onSaveEntry={handleSaveEntry}
                  onDiscardEntry={handleDiscardEntry}
                  onDelete={onDelete}
                  isUpdating={isUpdating}
                  isDeleting={isDeleting}
                  setDescriptionActionId={setDescriptionActionId}
                  setDescriptionDialogOpen={setDescriptionDialogOpen}
                  domains={domains}
                  getProcessesForDomain={getProcessesForDomain}
                  screenComponentOptions={screenComponentOptions}
                  screenResourcesLoading={screenResourcesLoading}
                  refetchScreenResources={refetchScreenResources}
                  roleOptions={roleOptions}
                  featureOptions={featureOptions}
                  rolesLoading={rolesLoading}
                  featuresLoading={featuresLoading}
                  rolesError={rolesError}
                  featuresError={featuresError}
                  refetchRoles={refetchRoles}
                  refetchFeatures={refetchFeatures}
                  dataTestId={dataTestId}
                  validationErrors={validationErrors}
                  {...context}
                />
              ))
            )}
            {/* Infinite Scroll Loader */}
            {hasMore && (
              <TableRow ref={loadMoreRef}>
                <TableCell colSpan={12} className="gba:text-center gba:py-4">
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
          Showing {filteredData.length} of {totalCount} actions
        </div>
      )}

      {descriptionActionId && (
        <DescriptionDialog
          open={descriptionDialogOpen}
          onOpenChange={setDescriptionDialogOpen}
          description={actionEntries.find(a => a.id === descriptionActionId)?.description || ''}
          descriptionTranslation={{}}
          onSave={description => {
            editableState.onFieldEdit(descriptionActionId, 'description', description)
          }}
          data-testid={`${dataTestId}-description-dialog`}
          {...context}
        />
      )}
    </>
  )
}
