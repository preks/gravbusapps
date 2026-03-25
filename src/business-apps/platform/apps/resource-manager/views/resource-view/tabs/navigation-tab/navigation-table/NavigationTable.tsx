import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Spinner } from '@newwork/nw-design-system'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { useEditableState } from '../../../../../hooks/useEditableState'
import type { NavigationDTO } from '@/common/data/resources/types/navigation.types'
import type { NavigationWithMenuItems } from './types/NavigationTypes'
import { NavigationTableRow } from './components/NavigationTableRow'
import { DescriptionDialog } from '../../../../../components/DescriptionDialog'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface NavigationTableProps extends BusinessAppContextProps {
  enrichedNavigations: NavigationWithMenuItems[]
  navigations: NavigationDTO[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetchNavigations: () => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
  searchValue: string
  sorting: Array<{ id: string; desc: boolean }>
  onSearchChange: (value: string) => void
  onSortingChange: (sorting: Array<{ id: string; desc: boolean }>) => void
  onDelete: (navigation: NavigationWithMenuItems) => void
  isDeleting: boolean
  roleOptions: Array<{ id: string; name: string }>
  featureOptions: Array<{ id: string; name: string }>
  rolesLoading: boolean
  featuresLoading: boolean
  rolesError: string | null
  featuresError: string | null
  refetchRoles: () => Promise<void>
  refetchFeatures: () => Promise<void>
  onSearchRoles: (searchTerm: string) => void
  loadMoreRoles: () => Promise<void>
  hasMoreRoles: boolean
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
  error,
  refetchNavigations,
  loadMore,
  hasMore,
  searchValue,
  sorting,
  onSortingChange,
  onDelete,
  isDeleting,
  roleOptions,
  featureOptions,
  rolesLoading,
  featuresLoading,
  rolesError,
  featuresError,
  refetchRoles,
  refetchFeatures,
  onSearchRoles,
  loadMoreRoles,
  hasMoreRoles,
  updateNavigation,
  createNavigation,
  dataTestId,
  onCountChange,
  currentView,
  onAddNavigationRef,
  ...context
}) => {
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false)
  const [descriptionNavigationId, setDescriptionNavigationId] = useState<string | null>(null)

  // Draft navigations state (managed locally)
  const [draftNavigations, setDraftNavigations] = useState<NavigationWithMenuItems[]>([])

  // Merge draft navigations with regular navigations (drafts at the top)
  // No client-side sorting - sorting is server-side
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
        description: item.description || '',
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

  // Map roles/features to DTO shape { name: string }[] (handles string[] ids or existing { name }[])
  const mapRolesToDto = useCallback(
    (value: unknown): { name: string }[] => {
      if (!Array.isArray(value)) return []
      return value.map(item =>
        typeof item === 'string'
          ? { name: roleOptions.find(r => r.id === item)?.name ?? item }
          : { name: (item as { name?: string }).name ?? '' }
      )
    },
    [roleOptions]
  )
  const mapFeaturesToDto = useCallback(
    (value: unknown): { name: string }[] => {
      if (!Array.isArray(value)) return []
      return value.map(item =>
        typeof item === 'string'
          ? { name: featureOptions.find(f => f.id === item)?.name ?? item }
          : { name: (item as { name?: string }).name ?? '' }
      )
    },
    [featureOptions]
  )

  // Build payload: with currentEntry (update) merges and returns full DTO; without (create) returns only fields from edits
  const buildNavigationUpdateData = useCallback(
    (edits: Record<string, unknown>, currentEntry?: (typeof navigationEntries)[number]): Partial<NavigationDTO> => {
      const source = currentEntry ? { ...currentEntry, ...edits } : edits
      if (currentEntry) {
        return {
          code: (source.code ?? '') as string,
          name: (source.name ?? '') as string,
          url: (source.url ?? '') as string,
          name_i18n: (source.name_i18n ?? {}) as Record<string, string>,
          description: (source.description ?? '') as string,
          description_i18n: (source.description_i18n ?? {}) as Record<string, string>,
          roles: mapRolesToDto(source.roles),
          features: mapFeaturesToDto(source.features),
          isSearchable: (source.isSearchable ?? false) as boolean
        }
      }
      const updateData: Partial<NavigationDTO> = {}
      if (source.code !== undefined) updateData.code = source.code as string
      if (source.name !== undefined) updateData.name = source.name as string
      if (source.url !== undefined) updateData.url = source.url as string
      if (source.name_i18n !== undefined) updateData.name_i18n = source.name_i18n as Record<string, string>
      if (source.description !== undefined) updateData.description = source.description as string
      if (source.description_i18n !== undefined)
        updateData.description_i18n = source.description_i18n as Record<string, string>
      if (source.roles !== undefined) updateData.roles = mapRolesToDto(source.roles)
      if (source.features !== undefined) updateData.features = mapFeaturesToDto(source.features)
      if (source.isSearchable !== undefined) updateData.isSearchable = source.isSearchable as boolean
      return updateData
    },
    [mapRolesToDto, mapFeaturesToDto]
  )

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
          const updateData = buildNavigationUpdateData(edits)
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
          const currentEntry = navigationEntries.find(e => e.id === navigationId)
          if (!currentEntry) return
          const updateData = buildNavigationUpdateData(edits, currentEntry)
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
    [
      editableState,
      updateNavigation,
      createNavigation,
      refetchNavigations,
      buildNavigationUpdateData,
      navigationEntries
    ]
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

  // Get sort icon for column (matching DataTable design)
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

  useEffect(() => {
    if (onCountChange && currentView === 'items') {
      onCountChange(totalCount)
    }
  }, [totalCount, currentView, onCountChange])

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

  if (isLoading && allEnrichedNavigations.length === 0) {
    return (
      <div className="gba:p-6 gba:flex gba:justify-center">
        <Spinner size="md" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6">
        <p className="gba:text-destructive">{error}</p>
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
                style={{ width: '180px' }}
                onClick={() => handleSort('code')}
                className="gba:select-none gba:cursor-pointer gba:px-2"
              >
                <div className="gba:flex gba:items-center gba:gap-1">
                  Code
                  {getSortIcon('code')}
                </div>
              </TableHead>
              <TableHead
                style={{ width: '250px' }}
                onClick={() => handleSort('name')}
                className="gba:select-none gba:cursor-pointer gba:px-2"
              >
                <div className="gba:flex gba:items-center gba:gap-1">
                  Name
                  {getSortIcon('name')}
                </div>
              </TableHead>
              <TableHead
                style={{ width: '300px' }}
                onClick={() => handleSort('url')}
                className="gba:select-none gba:cursor-pointer gba:px-2"
              >
                <div className="gba:flex gba:items-center gba:gap-1">
                  URL
                  {getSortIcon('url')}
                </div>
              </TableHead>
              <TableHead style={{ width: '120px' }} className="gba:px-2">
                Description
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
              <TableHead className="gba:sticky gba:right-0 gba:bg-muted gba:z-10 gba:px-2 gba:w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allEnrichedNavigations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="gba:text-center gba:py-8 gba:text-muted-foreground gba:px-2">
                  {searchValue ? 'No navigations found matching your search.' : 'No URL resources found'}
                </TableCell>
              </TableRow>
            ) : (
              allEnrichedNavigations.map(nav => {
                const navId = nav.id || ''

                return (
                  <React.Fragment key={navId}>
                    <NavigationTableRow
                      navigation={nav}
                      editableState={editableState}
                      onFieldEdit={editableState.onFieldEdit as (navId: string, field: string, value: any) => void}
                      onSaveEntry={handleSaveEntry}
                      onDiscardEntry={handleDiscardEntry}
                      onDelete={onDelete}
                      isDeleting={isDeleting}
                      setDescriptionNavigationId={setDescriptionNavigationId}
                      setDescriptionDialogOpen={setDescriptionDialogOpen}
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
                      dataTestId={`navigation-table-row-${navId}`}
                    />
                  </React.Fragment>
                )
              })
            )}
            {/* Infinite Scroll Loader */}
            {hasMore && (
              <TableRow ref={loadMoreRef}>
                <TableCell colSpan={8} className="gba:text-center gba:py-4 gba:px-2">
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
      {allEnrichedNavigations.length > 0 && (
        <div className="gba:px-4 gba:py-3 gba:border-t gba:text-sm gba:text-muted-foreground">
          Showing {allEnrichedNavigations.length} of {totalCount} navigations
        </div>
      )}

      {/* Description Dialog */}
      {descriptionNavigationId && (
        <DescriptionDialog
          open={descriptionDialogOpen}
          onOpenChange={setDescriptionDialogOpen}
          description={navigationEntries.find(n => n.id === descriptionNavigationId)?.description || ''}
          descriptionTranslation={navigationEntries.find(n => n.id === descriptionNavigationId)?.description_i18n || {}}
          onSave={(description, translations) => {
            editableState.onFieldEdit(descriptionNavigationId, 'description', description)
            editableState.onFieldEdit(descriptionNavigationId, 'description_i18n', translations)
          }}
          data-testid={`${dataTestId}-description-dialog`}
          {...context}
        />
      )}
    </>
  )
}
