import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Spinner } from '@newwork/nw-design-system'
import { TableSkeleton } from '../../../../components/TableSkeleton'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCreateComponent } from '@/common/data/resources/hooks/useCreateComponent'
import { useUpdateComponent } from '@/common/data/resources/hooks/useUpdateComponent'
import { useDeleteComponent } from '@/common/data/resources/hooks/useDeleteComponent'
import { useComponentResources } from '@/common/data/resources/hooks/useComponentResources'
import type { ComponentResource, Component, AzureBlobVersions } from '@/common/data/resources/types/component.types'
import { ComponentDialog } from '../../ComponentDialog'
import { useAzureData } from '../../../../contexts/ResourceManagerContext'
import { env } from '@/common/env/EnvUtils'
import { useEditableState } from '../../../../hooks/useEditableState'
import { ComponentTableRow, type ComponentEntry } from './components/ComponentTableRow'

interface ComponentTabProps extends BusinessAppContextProps {
  'data-testid'?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  sorting?: Array<{ id: string; desc: boolean }>
  onSortingChange?: (sorting: Array<{ id: string; desc: boolean }>) => void
  visibleColumns?: string[]
  onVisibleColumnsChange?: (visibleColumns: string[]) => void
  onCountChange?: (count: number | undefined) => void
  onLoadingChange?: (loading: boolean) => void
  onAddComponentChange?: (addComponent: (() => void) | null) => void
  onToolbarConfigChange?: (config: {
    sortableColumns: Array<{ id: string; label: string }>
    availableColumns: Array<{ id: string; label: string }>
  }) => void
}

const isAzureConfigured = (): boolean => {
  const devAccountName = env('NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT_DEV')
  const devSasToken = env('NEXT_PUBLIC_AZURE_STORAGE_SAS_TOKEN_DEV')
  const prodAccountName = env('NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT_PROD')
  const prodSasToken = env('NEXT_PUBLIC_AZURE_STORAGE_SAS_TOKEN_PROD')
  const hasDevConfig = !!(devAccountName && devSasToken)
  const hasProdConfig = !!(prodAccountName && prodSasToken)
  return hasDevConfig || hasProdConfig
}

const DEFAULT_SORTING: Array<{ id: string; desc: boolean }> = [{ id: 'updatedAt', desc: true }]
const DEFAULT_VISIBLE_COLUMNS = ['type', 'name', 'componentPath', 'version', 'updatedAt']
const PAGE_SIZE = 20

export const ComponentTab: React.FC<ComponentTabProps> = ({
  'data-testid': dataTestId = 'component-tab',
  searchValue = '',
  sorting: controlledSorting,
  onSortingChange,
  visibleColumns: controlledVisibleColumns,
  onCountChange,
  onLoadingChange,
  onAddComponentChange,
  onToolbarConfigChange,
  ...context
}) => {
  const [internalSorting, setInternalSorting] = useState<Array<{ id: string; desc: boolean }>>(DEFAULT_SORTING)
  const sorting = controlledSorting ?? internalSorting
  const setSorting = onSortingChange ?? setInternalSorting

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'update'>('create')
  const [selectedComponent, setSelectedComponent] = useState<Component | undefined>()
  const [isDeleting, setIsDeleting] = useState(false)

  const azureConfigured = useMemo(() => isAzureConfigured(), [])
  const { devComponentPathVersions, prodComponentPathVersions, isLoadingAzure } = useAzureData()

  const { components, totalCount, isLoading, refetch, loadMore, hasMore } = useComponentResources(context, {
    limit: PAGE_SIZE,
    searchParameter: searchValue,
    sort: sorting.length > 0 ? { field: sorting[0].id, order: sorting[0].desc ? 'DESC' : 'ASC' } : undefined
  })

  const loadMoreRef = useRef<HTMLTableRowElement>(null)
  const isLoadingRef = useRef(isLoading)
  const hasMoreRef = useRef(hasMore)
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
  }, [loadMore, components.length])

  const componentsWithAzureData = useMemo<ComponentResource[]>(() => {
    return components.map(component => {
      const componentPath = component.screenComponents?.formDefinition?.componentPath
      const pathWithoutSlash = componentPath?.startsWith('/') ? componentPath.substring(1) : componentPath || ''
      const devComponentPathInfo = devComponentPathVersions.get(pathWithoutSlash)
      const devAzureVersions: AzureBlobVersions = devComponentPathInfo
        ? { versions: devComponentPathInfo.versions, hasUnversioned: devComponentPathInfo.hasUnversioned }
        : { versions: [], hasUnversioned: false }
      const prodComponentPathInfo = prodComponentPathVersions.get(pathWithoutSlash)
      const prodAzureVersions: AzureBlobVersions = prodComponentPathInfo
        ? { versions: prodComponentPathInfo.versions, hasUnversioned: prodComponentPathInfo.hasUnversioned }
        : { versions: [], hasUnversioned: false }
      return {
        ...component,
        azureVersions: { dev: devAzureVersions, prod: prodAzureVersions }
      }
    })
  }, [components, devComponentPathVersions, prodComponentPathVersions])

  const componentEntries = useMemo<ComponentEntry[]>(
    () =>
      componentsWithAzureData.map(c => ({
        id: c.id ?? '',
        componentPath: (c.screenComponents?.formDefinition?.componentPath ?? '').replace(/^\//, ''),
        version: c.screenComponents?.formDefinition?.version ?? ''
      })),
    [componentsWithAzureData]
  )
  const editableState = useEditableState(componentEntries)

  useEffect(() => {
    onCountChange?.(totalCount)
  }, [totalCount, onCountChange])

  useEffect(() => {
    onLoadingChange?.(isLoading)
  }, [isLoading, onLoadingChange])

  const availableColumnsForToolbar = useMemo(() => {
    const cols = [
      { id: 'type', label: 'Type' },
      { id: 'name', label: 'Name' },
      { id: 'componentPath', label: 'Component Path' },
      { id: 'version', label: 'Tenant Version' }
    ]
    if (azureConfigured) cols.push({ id: 'devVersion', label: 'DEV' }, { id: 'prodVersion', label: 'PROD' })
    cols.push({ id: 'updatedAt', label: 'Updated' })
    return cols
  }, [azureConfigured])

  const sortableColumnsForToolbar = useMemo(
    () => [
      { id: 'name', label: 'Name' },
      { id: 'screenKey', label: 'Screen Key' },
      { id: 'type', label: 'Type' },
      { id: 'updatedAt', label: 'Updated' },
      { id: 'createdAt', label: 'Created' }
    ],
    []
  )

  useEffect(() => {
    onToolbarConfigChange?.({
      sortableColumns: sortableColumnsForToolbar,
      availableColumns: availableColumnsForToolbar
    })
  }, [onToolbarConfigChange, sortableColumnsForToolbar, availableColumnsForToolbar])

  const visibleColumns = controlledVisibleColumns ?? DEFAULT_VISIBLE_COLUMNS

  const { createComponent } = useCreateComponent(context)
  const { updateComponent } = useUpdateComponent(context)
  const { deleteComponent } = useDeleteComponent(context)

  const handleCreate = useCallback(() => {
    setSelectedComponent(undefined)
    setDialogMode('create')
    setDialogOpen(true)
  }, [])

  useEffect(() => {
    onAddComponentChange?.(handleCreate)
    return () => onAddComponentChange?.(null)
  }, [onAddComponentChange, handleCreate])

  const handleEdit = useCallback((component: Component) => {
    setSelectedComponent(component)
    setDialogMode('update')
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(
    async (component: Component) => {
      if (!component.id) return
      const confirmed = globalThis.window.confirm(`Are you sure you want to delete "${component.name}"?`)
      if (!confirmed) return
      setIsDeleting(true)
      try {
        await deleteComponent(component.id)
        await refetch()
      } catch (error) {
        console.error('Failed to delete component:', error)
      } finally {
        setIsDeleting(false)
      }
    },
    [deleteComponent, refetch]
  )

  const handleSubmit = useCallback(
    async (component: Component) => {
      try {
        if (dialogMode === 'create') {
          await createComponent(component)
        } else if (dialogMode === 'update' && component.id) {
          await updateComponent(component.id, component)
        }
        setDialogOpen(false)
        setSelectedComponent(undefined)
        await refetch()
      } catch (error) {
        console.error('Failed to submit component:', error)
        throw error
      }
    },
    [dialogMode, createComponent, updateComponent, refetch]
  )

  const handleSaveEntry = useCallback(
    async (component: ComponentResource) => {
      const entryId = component.id ?? ''
      if (!editableState.hasEdits(entryId)) return
      editableState.setSaving(entryId, true)
      try {
        const pathRaw = (editableState.getFieldValue(entryId, 'componentPath') as string) ?? ''
        const path = pathRaw.trim() ? (pathRaw.startsWith('/') ? pathRaw : `/${pathRaw}`) : ''
        const version = (editableState.getFieldValue(entryId, 'version') as string) ?? ''
        const screenComponents = component.screenComponents
        const updatedScreenComponents = screenComponents
          ? {
              ...screenComponents,
              formDefinition: {
                ...screenComponents.formDefinition,
                componentPath: path,
                version
              },
              release: screenComponents.release ?? ''
            }
          : undefined
        if (!updatedScreenComponents) return
        await updateComponent(component.id!, {
          ...component,
          screenComponents: updatedScreenComponents
        })
        editableState.onDiscardEntry(entryId)
        await refetch()
      } finally {
        editableState.setSaving(entryId, false)
      }
    },
    [editableState, updateComponent, refetch]
  )

  const handleDiscardEntry = useCallback((entryId: string) => editableState.onDiscardEntry(entryId), [editableState])

  const handleSort = useCallback(
    (columnId: string) => {
      const existingSort = sorting.find(s => s.id === columnId)
      if (existingSort) {
        setSorting(existingSort.desc ? [{ id: columnId, desc: false }] : [])
      } else {
        setSorting([{ id: columnId, desc: true }])
      }
    },
    [sorting, setSorting]
  )

  const getSortIcon = useCallback(
    (columnId: string) => {
      const sort = sorting.find(s => s.id === columnId)
      if (!sort) {
        return (
          <div className="gba:w-4 gba:h-4 gba:opacity-30 gba:relative gba:shrink-0">
            <ChevronUp className="gba:h-4 gba:w-4 gba:absolute" size={16} />
            <ChevronDown className="gba:h-4 gba:w-4 gba:absolute gba:translate-y-1" size={16} />
          </div>
        )
      }
      return sort.desc ? (
        <ChevronDown className="gba:h-4 gba:w-4 gba:opacity-100 gba:text-primary gba:shrink-0" size={16} />
      ) : (
        <ChevronUp className="gba:h-4 gba:w-4 gba:opacity-100 gba:text-primary gba:shrink-0" size={16} />
      )
    },
    [sorting]
  )

  const sortableColumnIds = useMemo(() => ['name', 'screenKey', 'type', 'updatedAt', 'createdAt'], [])
  const columnHeader = (id: string, label: string, width: string) => {
    const isSortable = sortableColumnIds.includes(id)
    return (
      <TableHead
        key={id}
        style={{ width }}
        className="gba:px-2"
        {...(isSortable && {
          onClick: () => handleSort(id),
          className: 'gba:select-none gba:cursor-pointer gba:px-2'
        })}
      >
        {isSortable ? (
          <div className="gba:flex gba:items-center gba:gap-1">
            {label}
            {getSortIcon(id)}
          </div>
        ) : (
          label
        )}
      </TableHead>
    )
  }

  if (isLoading && componentsWithAzureData.length === 0) {
    return <TableSkeleton rowCount={10} columnCount={6} />
  }

  return (
    <>
      <div className="gba:flex gba:flex-col gba:h-full gba:overflow-auto gba:border gba:rounded-lg">
        <Table className="gba:table-fixed gba:w-full" data-testid={`${dataTestId}-table`}>
          <TableHeader>
            <TableRow>
              {visibleColumns.includes('type') && columnHeader('type', 'Type', '130px')}
              {visibleColumns.includes('name') && columnHeader('name', 'Name', '350px')}
              {visibleColumns.includes('componentPath') && columnHeader('componentPath', 'Component Path', '350px')}
              {visibleColumns.includes('version') && columnHeader('version', 'Tenant Version', '120px')}
              {azureConfigured && visibleColumns.includes('devVersion') && (
                <TableHead key="devVersion" style={{ width: '100px' }} className="gba:px-2">
                  DEV
                </TableHead>
              )}
              {azureConfigured && visibleColumns.includes('prodVersion') && (
                <TableHead key="prodVersion" style={{ width: '100px' }} className="gba:px-2">
                  PROD
                </TableHead>
              )}
              {visibleColumns.includes('updatedAt') && columnHeader('updatedAt', 'Updated', '110px')}
              <TableHead key="actions" className="gba:sticky gba:right-0 gba:bg-muted gba:z-10 gba:px-2 gba:w-36" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {componentsWithAzureData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length + 1}
                  className="gba:text-center gba:py-8 gba:text-muted-foreground"
                >
                  No screens found
                </TableCell>
              </TableRow>
            ) : (
              <>
                {componentsWithAzureData.map(component => {
                  const entry = componentEntries.find(e => e.id === (component.id ?? ''))
                  if (!entry) return null
                  return (
                    <ComponentTableRow
                      key={component.id}
                      component={component}
                      entry={entry}
                      editableState={editableState}
                      onFieldEdit={editableState.onFieldEdit}
                      onSaveEntry={handleSaveEntry}
                      onDiscardEntry={handleDiscardEntry}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      isDeleting={isDeleting}
                      visibleColumns={visibleColumns}
                      azureConfigured={azureConfigured}
                      isLoadingAzure={isLoadingAzure}
                      dataTestId={dataTestId}
                    />
                  )
                })}
                {hasMore && (
                  <TableRow ref={loadMoreRef}>
                    <TableCell colSpan={visibleColumns.length + 1} className="gba:text-center gba:py-4">
                      {isLoading ? (
                        <Spinner size="sm" />
                      ) : (
                        <span className="gba:text-sm gba:text-muted-foreground">Loading more...</span>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
        {componentsWithAzureData.length > 0 && (
          <div className="gba:px-4 gba:py-3 gba:border-t gba:text-sm gba:text-muted-foreground">
            Showing {componentsWithAzureData.length} of {totalCount ?? 0}
          </div>
        )}
      </div>
      <ComponentDialog
        open={dialogOpen}
        mode={dialogMode}
        initialData={selectedComponent}
        onOpenChange={open => {
          if (!open) {
            setDialogOpen(false)
            setSelectedComponent(undefined)
          }
        }}
        onSubmit={data => handleSubmit({ ...data, id: selectedComponent?.id } as Component)}
        {...context}
      />
    </>
  )
}
