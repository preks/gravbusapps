import React, { useMemo, useState, useCallback } from 'react'
import {
  DataDisplay,
  DataTable,
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import { CheckIcon, XIcon, PlusIcon, DotsThreeIcon } from '@phosphor-icons/react'
import type { ExpandedState, Row } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCreateComponent } from '@/common/data/resources/hooks/useCreateComponent'
import { useUpdateComponent } from '@/common/data/resources/hooks/useUpdateComponent'
import { useDeleteComponent } from '@/common/data/resources/hooks/useDeleteComponent'
import { useComponentResources } from '@/common/data/resources/hooks/useComponentResources'
import type { ComponentResource, Component, AzureBlobVersions } from '@/common/data/resources/types/component.types'
import { ComponentDialog } from './ComponentDialog'
import { combineBuildAndScreenType } from '../../utils/componentKeyUtils'
import { useAzureData } from '../../contexts/ResourceManagerContext'
import { env } from '@/common/env/EnvUtils'

interface ComponentsViewProps extends BusinessAppContextProps {
  'data-testid'?: string
}

// Helper function to check if Azure Storage credentials are configured
const isAzureConfigured = (): boolean => {
  const devAccountName = env('NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT_DEV')
  const devSasToken = env('NEXT_PUBLIC_AZURE_STORAGE_SAS_TOKEN_DEV')
  const prodAccountName = env('NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT_PROD')
  const prodSasToken = env('NEXT_PUBLIC_AZURE_STORAGE_SAS_TOKEN_PROD')

  // Azure is configured if at least DEV or PROD credentials are available
  const hasDevConfig = !!(devAccountName && devSasToken)
  const hasProdConfig = !!(prodAccountName && prodSasToken)

  return hasDevConfig || hasProdConfig
}

export const ComponentsView: React.FC<ComponentsViewProps> = ({
  'data-testid': dataTestId = 'components-view',
  ...context
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'updatedAt', desc: true }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'update'>('create')
  const [selectedComponent, setSelectedComponent] = useState<Component | undefined>()

  // Check if Azure Storage is configured
  const azureConfigured = useMemo(() => isAzureConfigured(), [])

  // Get Azure Storage data from context
  const { devComponentPathVersions, prodComponentPathVersions } = useAzureData()

  // Fetch components with server-side pagination, sorting, and filtering
  const { components, totalCount, isLoading, refetch } = useComponentResources(context, {
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
    searchParameter: searchTerm,
    sort: sorting.length > 0 ? { field: sorting[0].id, order: sorting[0].desc ? 'DESC' : 'ASC' } : undefined
  })

  // Merge component data with Azure Storage versions from context
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
        azureVersions: {
          dev: devAzureVersions,
          prod: prodAzureVersions
        }
      }
    })
  }, [components, devComponentPathVersions, prodComponentPathVersions])

  const { createComponent } = useCreateComponent(context)
  const { updateComponent } = useUpdateComponent(context)
  const { deleteComponent } = useDeleteComponent(context)

  // Handlers for component actions
  const handleCreate = useCallback(() => {
    setSelectedComponent(undefined)
    setDialogMode('create')
    setDialogOpen(true)
  }, [])

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

      try {
        await deleteComponent(component.id)
        // Refetch current page
        await refetch({
          limit: pagination.pageSize,
          offset: pagination.pageIndex * pagination.pageSize,
          searchParameter: searchTerm,
          sort: sorting.length > 0 ? { field: sorting[0].id, order: sorting[0].desc ? 'DESC' : 'ASC' } : undefined
        })
      } catch (error) {
        console.error('Failed to delete component:', error)
      }
    },
    [deleteComponent, refetch, pagination, searchTerm, sorting]
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

        // Refetch current page
        await refetch({
          limit: pagination.pageSize,
          offset: pagination.pageIndex * pagination.pageSize,
          searchParameter: searchTerm,
          sort: sorting.length > 0 ? { field: sorting[0].id, order: sorting[0].desc ? 'DESC' : 'ASC' } : undefined
        })
      } catch (error) {
        console.error('Failed to submit component:', error)
        throw error
      }
    },
    [dialogMode, createComponent, updateComponent, refetch, pagination, searchTerm, sorting]
  )

  const handleSortingChange = useCallback((newSorting: Array<{ id: string; desc: boolean }>) => {
    setSorting(newSorting)
    setPagination(prev => ({ ...prev, pageIndex: 0 })) // Reset to first page on sort change
  }, [])

  // Helper functions for DataTable
  const getRowId = (row: ComponentResource) => row.id || row.screenKey || ''

  const getRowCanExpand = (row: ComponentResource) => {
    if (!azureConfigured) return false
    const prodVersions = row.azureVersions?.prod?.versions || []
    return prodVersions.length > 0
  }

  const renderExpandedRow = (row: Row<ComponentResource>) => {
    const component = row.original
    const prodVersions = component.azureVersions?.prod?.versions || []
    const sortedVersions = [...prodVersions].sort((a, b) => Number.parseInt(b) - Number.parseInt(a))

    return (
      <div className="gba:p-4 gba:bg-muted/20 gba:space-y-3">
        <div>
          <span className="gba:font-medium gba:text-sm">Available PROD Versions:</span>
          <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mt-2">
            {sortedVersions.map((version, index) => (
              <Badge key={version} variant={index === 0 ? 'default' : 'secondary'} size="sm">
                {version}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const formatComponentPath = (path?: string) => {
    if (!path) return '-'
    return path.startsWith('/') ? path.substring(1) : path
  }

  // Define columns for DataTable
  const columns = useMemo(() => {
    const baseColumns = [
      {
        id: 'type',
        accessorKey: 'type',
        header: 'Type',
        size: 130,
        enableResizing: false,
        cell: ({ row }: { row: { original: ComponentResource } }) => {
          const builderType = row.original.screenComponents?.builderType || 'NATIVE_SCREEN'
          const screenType = row.original.type || 'SCREEN'
          const combinedType = combineBuildAndScreenType(builderType, screenType)

          // Map combined type to label and color
          const typeConfig: Record<string, { label: string; color: string }> = {
            'native-screen': { label: 'Native Screen', color: 'gba:bg-blue-100 gba:text-blue-700 gba:border-blue-200' },
            'native-form': { label: 'Native Form', color: 'gba:bg-green-100 gba:text-green-700 gba:border-green-200' },
            'native-popup': {
              label: 'Native Popup',
              color: 'gba:bg-purple-100 gba:text-purple-700 gba:border-purple-200'
            },
            'native-window': { label: 'Native Window', color: 'gba:bg-cyan-100 gba:text-cyan-700 gba:border-cyan-200' },
            'lowcoder-screen': {
              label: 'Lowcoder Screen',
              color: 'gba:bg-orange-100 gba:text-orange-700 gba:border-orange-200'
            },
            'lowcoder-form': {
              label: 'Lowcoder Form',
              color: 'gba:bg-yellow-100 gba:text-yellow-700 gba:border-yellow-200'
            },
            'formio-form': { label: 'FormIO Form', color: 'gba:bg-pink-100 gba:text-pink-700 gba:border-pink-200' }
          }

          const config = typeConfig[combinedType] || {
            label: combinedType,
            color: 'gba:bg-muted gba:text-foreground gba:border-border'
          }

          return (
            <span
              className={`gba:inline-flex gba:items-center gba:px-2 gba:py-1 gba:rounded gba:text-xs gba:border gba:truncate ${config.color}`}
            >
              {config.label}
            </span>
          )
        }
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        size: 350,
        minSize: 200,
        maxSize: 500,
        enableResizing: true,
        cell: ({ row }: { row: { original: ComponentResource } }) => (
          <div className="gba:overflow-hidden">
            <div className="gba:font-medium gba:truncate">{row.original.name}</div>
            <code className="gba:text-xs gba:text-muted-foreground gba:truncate gba:block">
              {row.original.screenKey}
            </code>
          </div>
        )
      },
      {
        id: 'componentPath',
        accessorKey: 'componentPath',
        header: 'Component Path',
        size: 350,
        minSize: 200,
        maxSize: 600,
        enableResizing: true,
        cell: ({ row }: { row: { original: ComponentResource } }) => {
          return (
            <code className="gba:text-xs gba:bg-muted gba:px-2 gba:py-1 gba:rounded gba:truncate gba:block">
              {formatComponentPath(row.original.screenComponents?.formDefinition?.componentPath)}
            </code>
          )
        }
      }
    ]

    // Only add DEV and PROD columns if Azure is configured
    if (azureConfigured) {
      baseColumns.push(
        {
          id: 'devVersion',
          accessorKey: 'devVersion',
          header: 'DEV',
          size: 100,
          enableResizing: false,
          cell: ({ row }: { row: { original: ComponentResource } }) => {
            const hasUnversioned = row.original.azureVersions.dev.hasUnversioned

            return (
              <div className="gba:flex gba:items-center gba:justify-center gba:gap-2">
                {hasUnversioned ? (
                  <CheckIcon className="gba:w-4 gba:h-4 gba:text-success" weight="bold" />
                ) : (
                  <XIcon className="gba:w-4 gba:h-4 gba:text-destructive" weight="bold" />
                )}
              </div>
            )
          }
        },
        {
          id: 'prodVersion',
          accessorKey: 'prodVersion',
          header: 'PROD',
          size: 100,
          enableResizing: false,
          cell: ({ row }: { row: { original: ComponentResource } }) => {
            const prodVersions = row.original.azureVersions.prod?.versions || []
            const sortedVersions = [...prodVersions].sort((a, b) => Number.parseInt(b) - Number.parseInt(a))
            const latestVersion = sortedVersions[0]
            const remainingVersionsCount = sortedVersions.length - 1

            // If no versions, show X
            if (!latestVersion) {
              return (
                <div className="gba:flex gba:items-center gba:justify-center gba:gap-2">
                  <XIcon className="gba:w-4 gba:h-4 gba:text-destructive" weight="bold" />
                </div>
              )
            }

            return (
              <div className="gba:flex gba:items-center gba:justify-center gba:gap-2">
                <div className="gba:relative gba:inline-block">
                  <span className="gba:inline-flex gba:items-center gba:px-2 gba:py-1 gba:rounded gba:text-xs gba:border">
                    {latestVersion}
                  </span>
                  {remainingVersionsCount > 0 && (
                    <Badge size="xs" variant="default" className="gba:absolute gba:-top-2 gba:-right-2">
                      +{remainingVersionsCount}
                    </Badge>
                  )}
                </div>
              </div>
            )
          }
        }
      )
    }

    // Add Updated column at the end
    baseColumns.push({
      id: 'updatedAt',
      accessorKey: 'updatedAt',
      header: 'Updated',
      size: 110,
      enableResizing: false,
      cell: ({ row }: { row: { original: ComponentResource } }) => {
        const date = row.original.updatedAt || row.original.createdAt
        return (
          <span className="gba:text-sm gba:text-muted-foreground">
            {date ? new Date(date).toLocaleDateString() : '-'}
          </span>
        )
      }
    })

    return baseColumns
  }, [azureConfigured, handleEdit, handleDelete])

  const sortableColumns = [
    { id: 'name', label: 'Name' },
    { id: 'screenKey', label: 'Screen Key' },
    { id: 'type', label: 'Type' },
    { id: 'updatedAt', label: 'Updated' },
    { id: 'createdAt', label: 'Created' }
  ]

  const availableColumns = useMemo(() => {
    const cols = [
      { id: 'type', label: 'Type' },
      { id: 'name', label: 'Name' },
      { id: 'componentPath', label: 'Component Path' }
    ]

    if (azureConfigured) {
      cols.push({ id: 'devVersion', label: 'DEV' }, { id: 'prodVersion', label: 'PROD' })
    }

    cols.push({ id: 'updatedAt', label: 'Updated' })

    return cols
  }, [azureConfigured])

  const visibleColumns = useMemo(() => availableColumns.map(col => col.id), [availableColumns])

  // Actions renderer for DataTable - automatically creates pinned actions column
  const renderActions = useCallback(
    (row: { original: ComponentResource }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <DotsThreeIcon className="gba:h-4 gba:w-4" weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleEdit(row.original)}>Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDelete(row.original)}>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    [handleEdit, handleDelete]
  )

  return (
    <>
      <DataDisplay
        titleSections={[
          {
            id: 'components',
            label: 'Components',
            metadata: {
              count: totalCount,
              isLoading: isLoading
            }
          }
        ]}
        currentSection="components"
        searchValue={searchTerm}
        searchPlaceholder="Search screens..."
        onSearchChange={setSearchTerm}
        sorting={sorting}
        sortableColumns={sortableColumns}
        onSortingChange={handleSortingChange}
        availableColumns={availableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={() => {}}
        primaryAction={
          <div className="gba:flex gba:gap-2">
            <Button variant="default" size="sm" onClick={handleCreate}>
              <PlusIcon className="gba:h-4 gba:w-4" />
              Create Component
            </Button>
          </div>
        }
        toolbarDensity="default"
        enableLiveFiltering
      >
        <DataTable<ComponentResource>
          variant="compact"
          data={componentsWithAzureData}
          columns={columns}
          getRowId={getRowId}
          loading={isLoading}
          totalCount={totalCount}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          pagination={pagination}
          onPaginationChange={setPagination}
          enablePagination
          enableSorting
          enableSelection={false}
          enableExpansion
          expanded={expanded}
          onExpandedChange={setExpanded}
          getRowCanExpand={getRowCanExpand}
          renderExpandedRow={renderExpandedRow}
          rowsPerPageOptions={[10, 20, 50, 100]}
          showPageNumbers
          maxVisiblePages={7}
          tableLayout="fixed"
          enableResizing={true}
          enableColumnPinning
          actions={renderActions}
          emptyMessage="No screens found"
          data-testid={`${dataTestId}-table`}
        />
      </DataDisplay>

      <ComponentDialog
        open={dialogOpen}
        mode={dialogMode}
        component={selectedComponent}
        onClose={() => {
          setDialogOpen(false)
          setSelectedComponent(undefined)
        }}
        onSubmit={data => handleSubmit({ ...data, id: selectedComponent?.id } as Component)}
        context={context}
      />
    </>
  )
}
