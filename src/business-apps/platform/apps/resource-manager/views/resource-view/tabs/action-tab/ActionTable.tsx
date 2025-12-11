import React, { useCallback, useMemo, useState } from 'react'
import { DataTable } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useUpdateAction } from '@/common/data/resources/hooks/useUpdateAction'
import type { ActionWithContexts } from '@/common/data/resources/types/action.types'
import { DescriptionDialog } from '../../../../components/DescriptionDialog'
import { useEditableState } from '../../../../hooks/useEditableState'
import type { ActionDTO } from '@/common/data/resources/types/action.types'
import { useDomainProcesses } from '@/common/data/resources/hooks/useDomainProcesses'
import { useComponents } from '@/common/data/resources/hooks/useComponents'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import { createActionTableColumns } from './ActionTableColumns'

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
  'data-testid': dataTestId = 'action-table',
  ...context
}) => {
  // Editable state for inline editing
  const actionEntries = useMemo(() => actions.map(item => item.action), [actions])

  // Services state - loaded when combobox opens
  const [services, setServices] = useState<Array<{ id: string; name: string }>>([])
  const [servicesLoading, setServicesLoading] = useState(false)

  // Extract services from loaded actions as fallback (for initial display)
  const servicesFromActions = useMemo(() => {
    const domainSet = new Set<string>()
    actions.forEach(item => {
      if (item.action.domain) {
        domainSet.add(item.action.domain)
      }
    })
    return Array.from(domainSet)
      .sort()
      .map(domain => ({ id: domain, name: domain }))
  }, [actions])

  // Use services from API if loaded, otherwise use services from actions
  const availableServices = services.length > 0 ? services : servicesFromActions

  // Resource client for loading services
  const resourceClient = useResourceClient(context.accessToken)

  // Load services from API
  const loadServices = useCallback(async () => {
    if (servicesLoading || services.length > 0) return

    setServicesLoading(true)
    try {
      const servicesData = await resourceClient.action.getServices()
      setServices(servicesData)
    } catch (error) {
      console.error('Error loading services:', error)
    } finally {
      setServicesLoading(false)
    }
  }, [resourceClient, servicesLoading, services.length])

  // Domain Processes hook - lazy loaded (only when combobox opens)
  const {
    getProcessesForDomain,
    isLoading: domainProcessesLoading,
    refetch: refetchDomainProcesses
  } = useDomainProcesses(context)

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

  // Save handler for inline editing
  const handleSaveEntry = useCallback(
    async (actionId: string) => {
      const edits = editableState.state.editedEntries.get(actionId)
      if (!edits || Object.keys(edits).length === 0) return

      editableState.setSaving(actionId, true)
      try {
        const result = await updateAction(actionId, edits)
        if (result) {
          editableState.onDiscardEntry(actionId)
          await refetchActions()
        }
      } catch (error) {
        console.error('Error saving action:', error)
      } finally {
        editableState.setSaving(actionId, false)
      }
    },
    [editableState, updateAction, refetchActions]
  )

  // Filter and sort data
  const safeData = useMemo(() => {
    if (!Array.isArray(actions)) return []
    let filtered = actions
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
  }, [actions, searchValue])

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
        availableServices,
        servicesLoading,
        loadServices,
        getProcessesForDomain,
        domainProcessesLoading,
        refetchDomainProcesses,
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
      }),
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
      availableServices,
      servicesLoading,
      loadServices,
      getProcessesForDomain,
      domainProcessesLoading,
      refetchDomainProcesses,
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
