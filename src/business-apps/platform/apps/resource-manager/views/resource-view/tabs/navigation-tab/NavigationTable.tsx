import React, { useCallback, useMemo, useState, useEffect } from 'react'
import { DataTable } from '@newwork/nw-design-system'
import type { ExpandedState, Row } from '@tanstack/react-table'
import { useEditableState } from '../../../../hooks/useEditableState'
import type { NavigationDTO } from '@/common/data/resources/types/navigation.types'
import { createNavigationTableColumns, type NavigationWithMenuItems } from './NavigationTableColumns'

interface NavigationTableProps {
  enrichedNavigations: NavigationWithMenuItems[]
  navigations: NavigationDTO[]
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
  dataTestId: string
  onCountChange?: (count: number) => void
  currentView: string
}

export const NavigationTable: React.FC<NavigationTableProps> = ({
  enrichedNavigations,
  navigations,
  isLoading,
  error,
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
  dataTestId,
  onCountChange,
  currentView
}) => {
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [openedComboboxes, setOpenedComboboxes] = useState<Set<string>>(new Set())

  // Editable state for inline editing
  const navigationEntries = useMemo(
    () =>
      enrichedNavigations.map(item => ({
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
    [enrichedNavigations]
  )

  const editableState = useEditableState(navigationEntries)

  // Handle save entry
  const handleSaveEntry = useCallback(
    async (navigationId: string) => {
      if (!navigationId) return

      const edits = editableState.state.editedEntries.get(navigationId)
      if (!edits || Object.keys(edits).length === 0) return

      editableState.setSaving(navigationId, true)

      try {
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
      } catch (error) {
        console.error('Error saving navigation:', error)
      } finally {
        editableState.setSaving(navigationId, false)
      }
    },
    [editableState, updateNavigation, refetchNavigations]
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
      }),
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
    return enrichedNavigations.filter(item => item.id)
  }, [enrichedNavigations])

  const paginatedData = useMemo(() => {
    const startIndex = pagination.pageIndex * pagination.pageSize
    const endIndex = startIndex + pagination.pageSize
    return safeData.slice(startIndex, endIndex)
  }, [safeData, pagination.pageIndex, pagination.pageSize])

  useEffect(() => {
    if (onCountChange && currentView === 'urls') {
      onCountChange(navigations.length)
    }
  }, [navigations.length, currentView, onCountChange])

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
      data={paginatedData}
      columns={columns}
      getRowId={getRowId}
      loading={isLoading}
      error={error || undefined}
      totalCount={navigations.length}
      enablePagination
      pagination={pagination}
      onPaginationChange={setPagination}
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
