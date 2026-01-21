import React, { useCallback, useMemo, useState, useEffect } from 'react'
import { DataTable, Button, ButtonGroup } from '@newwork/nw-design-system'
import type { ExpandedState, Row } from '@tanstack/react-table'
import { useEditableState } from '../../../../../hooks/useEditableState'
import type { NavigationDTO } from '@/common/data/resources/types/navigation.types'
import { createNavigationTableColumns, type NavigationWithMenuItems } from './NavigationTableColumns'
import { Save, X } from 'lucide-react'

interface NavigationTableProps {
  enrichedNavigations: NavigationWithMenuItems[]
  navigations: NavigationDTO[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetchNavigations: () => Promise<void>
  searchValue: string
  sorting: Array<{ id: string; desc: boolean }>
  onSearchChange: (value: string) => void
  onSortingChange: (sorting: Array<{ id: string; desc: boolean }>) => void
  roleOptions: Array<{ id: string; name: string }>
  featureOptions: Array<{ id: string; name: string }>
  rolesLoading: boolean
  featuresLoading: boolean
  rolesError: string | null
  featuresError: string | null
  refetchRoles: () => Promise<void>
  refetchFeatures: () => Promise<void>
  setDescriptionNavigationId: (id: string | null) => void
  setDescriptionDialogOpen: (open: boolean) => void
  updateNavigation: (id: string, data: Partial<NavigationDTO>) => Promise<void>
  createNavigation: (data: Partial<NavigationDTO>) => Promise<void>
  pagination: { pageIndex: number; pageSize: number }
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void
  dataTestId: string
  onCountChange?: (count: number) => void
  currentView: string
  onAddNavigationRef?: React.MutableRefObject<(() => void) | null>
}

export const NavigationTable: React.FC<NavigationTableProps> = ({
  enrichedNavigations,
  totalCount,
  isLoading,
  refetchNavigations,
  searchValue,
  sorting,
  onSearchChange,
  onSortingChange,
  roleOptions,
  featureOptions,
  rolesLoading,
  featuresLoading,
  rolesError,
  featuresError,
  refetchRoles,
  refetchFeatures,
  setDescriptionNavigationId,
  setDescriptionDialogOpen,
  updateNavigation,
  createNavigation,
  pagination,
  onPaginationChange,
  dataTestId,
  onCountChange,
  currentView,
  onAddNavigationRef
}) => {
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [openedComboboxes, setOpenedComboboxes] = useState<Set<string>>(new Set())

  // Draft navigations state (managed locally)
  const [draftNavigations, setDraftNavigations] = useState<NavigationWithMenuItems[]>([])

  // Merge draft navigations with regular navigations (drafts at the top)
  const allEnrichedNavigations = useMemo(() => {
    return [...draftNavigations, ...enrichedNavigations]
  }, [draftNavigations, enrichedNavigations])

  // Editable state for inline editing
  const navigationEntries = useMemo(
    () =>
      allEnrichedNavigations.map(item => ({
        id: item.id || '',
        code: item.code,
        name: item.name,
        url: item.url,
        name_i18n: item.name_i18n || {},
        description_i18n: item.description_i18n || {},
        roles: item.roles || [],
        features: item.features || [],
        isSearchable: item.isSearchable ?? false
      })),
    [allEnrichedNavigations]
  )

  const editableState = useEditableState(navigationEntries)

  // Handle add navigation - create draft row
  const handleAddNavigation = useCallback(() => {
    const draftId = `draft:${Date.now()}`
    const draftNavigation: NavigationWithMenuItems = {
      id: draftId,
      code: '',
      name: '',
      url: '',
      name_i18n: {},
      description_i18n: {},
      roles: [],
      features: [],
      isSearchable: false,
      menuItems: []
    }

    setDraftNavigations(prev => [draftNavigation, ...prev])

    // Seed edits so Save/Discard buttons appear
    editableState.setState(prev => {
      const newEdited = new Map(prev.editedEntries)
      newEdited.set(draftId, { code: '', name: '', url: '' })
      const newDrafts = new Set(prev.draftEntryIds)
      newDrafts.add(draftId)
      return {
        ...prev,
        editedEntries: newEdited,
        draftEntryIds: newDrafts
      }
    })
  }, [editableState])

  // Expose handleAddNavigation via ref
  React.useEffect(() => {
    if (onAddNavigationRef) {
      onAddNavigationRef.current = handleAddNavigation
    }
  }, [onAddNavigationRef, handleAddNavigation])

  // Handle save entry
  const handleSaveEntry = useCallback(
    async (navigationId: string) => {
      if (!navigationId) return

      const edits = editableState.state.editedEntries.get(navigationId)
      if (!edits || Object.keys(edits).length === 0) return

      editableState.setSaving(navigationId, true)

      try {
        const isDraft = editableState.isDraft(navigationId)

        if (isDraft) {
          // Create new navigation via API
          const updateData: Partial<NavigationDTO> = {}
          if (edits.code !== undefined) updateData.code = edits.code as string
          if (edits.name !== undefined) updateData.name = edits.name as string
          if (edits.url !== undefined) updateData.url = edits.url as string
          if (edits.name_i18n !== undefined) updateData.name_i18n = edits.name_i18n as Record<string, string>
          if (edits.description_i18n !== undefined)
            updateData.description_i18n = edits.description_i18n as Record<string, string>
          if (edits.roles !== undefined) updateData.roles = edits.roles as string[]
          if (edits.features !== undefined) updateData.features = edits.features as string[]
          if (edits.isSearchable !== undefined) updateData.isSearchable = edits.isSearchable as boolean

          await createNavigation(updateData)

          // Remove draft from local state
          setDraftNavigations(prev => prev.filter(d => d.id !== navigationId))
          editableState.setState(prev => {
            const newEdited = new Map(prev.editedEntries)
            newEdited.delete(navigationId)
            const newDrafts = new Set(prev.draftEntryIds)
            newDrafts.delete(navigationId)
            return { ...prev, editedEntries: newEdited, draftEntryIds: newDrafts }
          })
          await refetchNavigations()
        } else {
          // Update existing navigation
          const updateData: Partial<NavigationDTO> = {}

          if (edits.code !== undefined) updateData.code = edits.code as string
          if (edits.name !== undefined) updateData.name = edits.name as string
          if (edits.url !== undefined) updateData.url = edits.url as string
          if (edits.name_i18n !== undefined) updateData.name_i18n = edits.name_i18n as Record<string, string>
          if (edits.description_i18n !== undefined)
            updateData.description_i18n = edits.description_i18n as Record<string, string>
          if (edits.roles !== undefined) updateData.roles = edits.roles as string[]
          if (edits.features !== undefined) updateData.features = edits.features as string[]
          if (edits.isSearchable !== undefined) updateData.isSearchable = edits.isSearchable as boolean

          await updateNavigation(navigationId, updateData)
          await refetchNavigations()
          editableState.onDiscardEntry(navigationId)
        }
      } catch {
        // Error handled
      } finally {
        editableState.setSaving(navigationId, false)
      }
    },
    [editableState, updateNavigation, createNavigation, refetchNavigations]
  )

  // Handle discard entry
  const handleDiscardEntry = useCallback(
    (navigationId: string) => {
      const isDraft = editableState.isDraft(navigationId)
      if (isDraft) {
        // Remove draft from local state
        setDraftNavigations(prev => prev.filter(d => d.id !== navigationId))
      }
      editableState.onDiscardEntry(navigationId)
    },
    [editableState]
  )

  const columns = useMemo(
    () =>
      createNavigationTableColumns({
        dataTestId,
        navigationEntries,
        editableState,
        roleOptions,
        featureOptions,
        rolesLoading,
        featuresLoading,
        rolesError,
        featuresError,
        refetchRoles,
        refetchFeatures,
        openedComboboxes,
        setOpenedComboboxes,
        setDescriptionNavigationId,
        setDescriptionDialogOpen,
        handleSaveEntry,
        isUpdating: false
      }).filter(col => col.id !== 'table-actions'),
    [
      dataTestId,
      navigationEntries,
      editableState,
      roleOptions,
      featureOptions,
      rolesLoading,
      featuresLoading,
      rolesError,
      featuresError,
      refetchRoles,
      refetchFeatures,
      openedComboboxes,
      setOpenedComboboxes,
      setDescriptionNavigationId,
      setDescriptionDialogOpen,
      handleSaveEntry
    ]
  )

  const renderActions = useCallback(
    (row: any) => {
      const navigationId = row.original.id || ''
      const hasEdits = editableState.hasEdits(navigationId)
      const isSaving = editableState.state.savingEntryId === navigationId && editableState.state.isSaving

      return (
        <ButtonGroup onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} className="gba:h-6">
          <Button
            size="iconSm"
            variant="secondary"
            className="gba:h-6"
            onClick={e => {
              e.stopPropagation()
              handleSaveEntry(navigationId)
            }}
            disabled={!hasEdits || isSaving}
            data-testid={`${dataTestId}-save-navigation-${navigationId}`}
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
              handleDiscardEntry(navigationId)
            }}
            disabled={!hasEdits || isSaving}
            data-testid={`${dataTestId}-discard-navigation-${navigationId}`}
            title="Discard changes"
          >
            <X className="gba:h-4 gba:w-4" />
          </Button>
        </ButtonGroup>
      )
    },
    [editableState, handleSaveEntry, handleDiscardEntry, dataTestId]
  )

  const getRowCanExpand = useCallback((row: NavigationWithMenuItems) => {
    const allMenuItems = row.allMenuItems || [...(row.hubs || []), ...(row.menuItems || [])]
    return allMenuItems.length > 0
  }, [])

  const renderExpandedRow = useCallback(
    (row: Row<NavigationWithMenuItems>) => {
      const nav = row.original
      const allMenuItems = nav.allMenuItems || [...(nav.hubs || []), ...(nav.menuItems || [])]

      if (allMenuItems.length === 0) {
        return (
          <div className="gba:bg-muted/30 gba:p-4 gba:rounded-md" data-testid={`${dataTestId}-expanded-${nav.id}`}>
            <p className="gba:text-sm gba:text-muted-foreground">No menu items assigned</p>
          </div>
        )
      }

      return (
        <div className="gba:bg-muted/30 gba:p-4 gba:rounded-md" data-testid={`${dataTestId}-expanded-${nav.id}`}>
          <h4 className="gba:font-semibold gba:mb-3 gba:text-sm">Menu Items for {nav.name}</h4>
          <div className="gba:space-y-2">
            {allMenuItems.map(item => (
              <div
                key={item.id}
                className="gba:flex gba:items-center gba:gap-2 gba:py-2 gba:px-3 gba:bg-background gba:rounded gba:border"
              >
                <span className="gba:font-medium gba:text-sm">{item.name}</span>
                {item.code && (
                  <code className="gba:text-xs gba:bg-muted gba:px-2 gba:py-1 gba:rounded">{item.code}</code>
                )}
                {item.type && (
                  <span className="gba:text-xs gba:px-2 gba:py-0.5 gba:bg-muted gba:rounded">{item.type}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    },
    [dataTestId]
  )

  const safeData = useMemo(() => {
    return allEnrichedNavigations.filter(item => item.id)
  }, [allEnrichedNavigations])

  useEffect(() => {
    if (onCountChange && currentView === 'items') {
      onCountChange(totalCount)
    }
  }, [totalCount, currentView, onCountChange])

  if (!columns.length || safeData.some(item => !item.id)) {
    return null
  }

  const getRowId = useCallback((row: NavigationWithMenuItems) => {
    return row.id || `fallback-${Math.random()}`
  }, [])

  return (
    <DataTable<NavigationWithMenuItems>
      key={`urls-view-${safeData.length}`}
      variant="compact"
      data={safeData}
      columns={columns}
      actions={renderActions}
      getRowId={getRowId}
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
      emptyMessage="No URL resources found"
      data-testid={`${dataTestId}-urls-table`}
    />
  )
}
