import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Button, DataDisplay } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo } from '@/common/utils/navigationUtils'
import { ContactListLayout } from './ContactListLayout'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { DefaultContactRowActions } from './ContactLayoutHelpers'

// Helper: Update filter options
const updateFilterOptions = (
  filterConfig: FilterConfiguration,
  groupId: string,
  filterId: string,
  options: Array<{ id: string; label: string }>
) => {
  if (options.length === 0) return

  const group = filterConfig.groups.find(g => g.id === groupId)
  if (!group) return

  const filter = group.filters.find(f => f.id === filterId)
  if (filter?.config && 'options' in filter.config) {
    filter.config.options = options
  }
}

export interface ContactViewConfig<TContact extends { id: string }, TQueryVariables> {
  contextType: 'customer' | 'investment'

  fetchContacts: (variables: TQueryVariables) => Promise<{
    contacts?: TContact[]
    total?: number
  }>

  filterDataHook: (context: BusinessAppContextProps) => {
    owners: Array<{ id: string; label: string }>
    contactTypes?: Array<{ id: string; label: string }>
    accounts?: Array<{ id: string; label: string }>
    genders?: Array<{ id: string; label: string }>
    academicTitles?: Array<{ id: string; label: string }>
    professionalTitles?: Array<{ id: string; label: string }>
    departments?: Array<{ id: string; label: string }>
    countries?: Array<{ id: string; label: string }>
    regions?: Array<{ id: string; label: string }>
    cities?: Array<{ id: string; label: string }>
  }

  createColumns: (buildAccountUrl?: (id: string) => string) => ColumnDef<TContact>[]
  createSortableColumns: () => Array<{ id: string; label: string }>
  mapColumnToGraphQLField: (columnId: string) => string

  baseFilterConfig: FilterConfiguration

  buildQueryVariables: (params: {
    pagination: { pageIndex: number; pageSize: number }
    searchTerm: string
    selectedFilters: Record<string, any>
    sorting: Array<{ id: string; desc: boolean }>
    mapColumnToGraphQLField: (columnId: string) => string
  }) => TQueryVariables

  flowContexts: {
    entityContext: FlowContextName
    createContext: FlowContextName
    createContextData?: Record<string, any>
  }

  buildRecordUrl?: (id: string) => string
  buildAccountUrl?: (id: string) => string

  renderStatistics: (props: { context: BusinessAppContextProps; onRefresh: () => void }) => React.ReactNode

  processCompletionEvents?: string[]

  renderRowActions?: (row: { original: TContact }, accessToken: string) => React.ReactNode
}

export interface ContactLayoutProps<TContact extends { id: string } = any, TQueryVariables = any> {
  context: BusinessAppContextProps
  config: ContactViewConfig<TContact, TQueryVariables>
  dataTestId?: string
  initialFilters?: Record<string, any>
  hideFilters?: boolean
  hideStatistics?: boolean
  hideCreate?: boolean
  customPrimaryAction?: React.ReactNode
}

const ConfigContactLayout = <TContact extends { id: string } = any, TQueryVariables = any>(
  props: ContactLayoutProps<TContact, TQueryVariables>
) => {
  const {
    context,
    config,
    dataTestId = 'contact-view',
    initialFilters = {},
    hideFilters = false,
    hideStatistics = false,
    hideCreate = false,
    customPrimaryAction
  } = props
  const { accessToken } = context

  // List View State
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>(initialFilters)
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'createdAt', desc: true }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'firstName',
    'email',
    'account',
    'type',
    'jobPosition',
    'department',
    'ownerEmployee',
    'createdAt'
  ])

  // Data State
  const [contacts, setContacts] = useState<TContact[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Dynamic Filter Data
  const filterData = config.filterDataHook(context)
  const {
    owners,
    contactTypes,
    accounts,
    genders,
    academicTitles,
    professionalTitles,
    departments,
    countries,
    regions,
    cities
  } = filterData

  // Dynamic Filter Configuration
  const dynamicFilterConfig = useMemo(() => {
    const filterConfig = { ...config.baseFilterConfig }

    updateFilterOptions(
      filterConfig,
      'contact-filters',
      'owners',
      owners.map(o => ({ id: o.id, label: o.label }))
    )

    if (contactTypes && contactTypes.length > 0) {
      updateFilterOptions(
        filterConfig,
        'contact-filters',
        'contactTypes',
        contactTypes.map(t => ({ id: t.id, label: t.label }))
      )
    }

    if (accounts && accounts.length > 0) {
      updateFilterOptions(
        filterConfig,
        'contact-filters',
        'accounts',
        accounts.map(a => ({ id: a.id, label: a.label }))
      )
    }

    if (genders && genders.length > 0) {
      updateFilterOptions(
        filterConfig,
        'contact-filters',
        'genders',
        genders.map(g => ({ id: g.id, label: g.label }))
      )
    }

    if (academicTitles && academicTitles.length > 0) {
      updateFilterOptions(
        filterConfig,
        'contact-filters',
        'academicTitles',
        academicTitles.map(a => ({ id: a.id, label: a.label }))
      )
    }

    if (professionalTitles && professionalTitles.length > 0) {
      updateFilterOptions(
        filterConfig,
        'contact-filters',
        'professionalTitles',
        professionalTitles.map(p => ({ id: p.id, label: p.label }))
      )
    }

    if (departments && departments.length > 0) {
      updateFilterOptions(
        filterConfig,
        'contact-filters',
        'departments',
        departments.map(d => ({ id: d.id, label: d.label }))
      )
    }

    // Geography filters
    if (countries && countries.length > 0) {
      updateFilterOptions(
        filterConfig,
        'geography-group',
        'countries',
        countries.map(c => ({ id: c.id, label: c.label }))
      )
    }
    if (regions && regions.length > 0) {
      updateFilterOptions(
        filterConfig,
        'geography-group',
        'regions',
        regions.map(r => ({ id: r.id, label: r.label }))
      )
    }
    if (cities && cities.length > 0) {
      updateFilterOptions(
        filterConfig,
        'geography-group',
        'cities',
        cities.map(c => ({ id: c.id, label: c.label }))
      )
    }

    return filterConfig
  }, [
    owners,
    contactTypes,
    accounts,
    genders,
    academicTitles,
    professionalTitles,
    departments,
    countries,
    regions,
    cities,
    config.baseFilterConfig
  ])

  // Query Variables
  const queryVariables = useMemo(
    () =>
      config.buildQueryVariables({
        pagination,
        searchTerm,
        selectedFilters,
        sorting,
        mapColumnToGraphQLField: config.mapColumnToGraphQLField
      }),
    [pagination, searchTerm, selectedFilters, sorting, config]
  )

  // Load Data
  const loadData = useCallback(
    async (showLoading: boolean = true) => {
      if (!accessToken) return

      if (showLoading) setIsLoading(true)
      setError(null)

      try {
        const result = await config.fetchContacts(queryVariables)
        setContacts(result.contacts || [])
        setTotalCount(result.total || 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        if (showLoading) setIsLoading(false)
        setIsInitialLoad(false)
      }
    },
    [accessToken, config, queryVariables]
  )

  // Initial load
  useEffect(() => {
    if (!accessToken || !isInitialLoad) return
    loadData(true)
  }, [accessToken, isInitialLoad, loadData])

  // Reload data when filters/search/sort change (skip initial load)
  useEffect(() => {
    if (isInitialLoad || !accessToken) return
    loadData(false)
  }, [queryVariables, isInitialLoad, accessToken, loadData])

  // Process Completion Handlers
  const handleProcessComplete = useCallback(() => {
    loadData(false)
  }, [loadData])

  useProcessCompletion({ onSuccess: handleProcessComplete })

  useEffect(() => {
    const events = config.processCompletionEvents || ['taskCompletion', 'contactCompletion']
    const handlers = events.map(eventName => {
      const handler = () => handleProcessComplete()
      globalThis.addEventListener(eventName, handler)
      return { eventName, handler }
    })

    return () => {
      for (const { eventName, handler } of handlers) {
        globalThis.removeEventListener(eventName, handler)
      }
    }
  }, [handleProcessComplete, config.processCompletionEvents])

  // Event Handlers
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleFilterUpdate = useCallback((filters: Record<string, any>) => {
    setSelectedFilters(filters)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleRowClick = useCallback(
    (contact: TContact) => {
      if (config.buildRecordUrl) {
        const url = config.buildRecordUrl(contact.id)
        navigateTo(url)
      }
    },
    [config]
  )

  const handleRefreshStatistics = useCallback(() => {
    loadData(false)
  }, [loadData])

  // Columns
  const columns = useMemo(() => config.createColumns(config.buildAccountUrl), [config])
  const availableColumns = useMemo(
    () => [
      { id: 'firstName', label: 'Contact' },
      { id: 'email', label: 'Contact Info' },
      { id: 'account', label: 'Account' },
      { id: 'type', label: 'Type' },
      { id: 'jobPosition', label: 'Position' },
      { id: 'department', label: 'Department' },
      { id: 'ownerEmployee', label: 'Owner' },
      { id: 'createdAt', label: 'Created' }
    ],
    []
  )

  // Row actions
  const rowActions = useMemo(
    () =>
      config.renderRowActions
        ? (row: { original: TContact }) => config.renderRowActions!(row, accessToken)
        : (row: { original: TContact }) => (
            <DefaultContactRowActions
              row={row}
              accessToken={accessToken}
              entityContext={config.flowContexts.entityContext}
            />
          ),
    [config, accessToken]
  )

  return (
    <div data-testid={dataTestId}>
      {/* Statistics */}
      {!hideStatistics && config.renderStatistics({ context, onRefresh: handleRefreshStatistics })}

      {/* DataDisplay */}
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: getTranslationFromI18nKeyAndLabel('common:allContacts', 'All Contacts'),
            metadata: {
              count: totalCount,
              isLoading: isLoading
            }
          }
        ]}
        currentSection="all"
        searchValue={searchTerm}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel('common:searchContacts', 'Search contacts...')}
        onSearchChange={handleSearch}
        filters={hideFilters ? undefined : selectedFilters}
        filterConfiguration={hideFilters ? undefined : dynamicFilterConfig}
        onFilterChange={hideFilters ? undefined : handleFilterUpdate}
        sorting={sorting}
        sortableColumns={config.createSortableColumns()}
        onSortingChange={setSorting}
        availableColumns={availableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        primaryAction={
          customPrimaryAction ||
          (hideCreate ? undefined : (
            <AppAction
              contextsArray={[config.flowContexts.createContext]}
              externalContextData={config.flowContexts.createContextData}
              accessToken={accessToken}
              data-testid="add-contact-action"
              emptyStateBehavior="hide"
            >
              <Button size="sm" variant="default" data-testid="add-contact-button" type="button">
                <Plus size={16} />
                {getTranslationFromI18nKeyAndLabel('crm:contact.addContact', 'Add Contact')}
              </Button>
            </AppAction>
          ))
        }
        toolbarDensity="default"
        enableLiveFiltering={true}
        filterSheetTitle={getTranslationFromI18nKeyAndLabel('common:filterContacts', 'Filter Contacts')}
        filterSheetDescription={getTranslationFromI18nKeyAndLabel(
          'common:filterContactsDescription',
          'Apply filters to narrow down the contact list'
        )}
      >
        <ContactListLayout<TContact>
          data={contacts}
          loading={isLoading}
          error={error}
          totalCount={totalCount}
          columns={columns.filter(col => visibleColumns.includes(col.id as string))}
          sorting={sorting}
          onSortingChange={setSorting}
          pagination={pagination}
          onPaginationChange={setPagination}
          actions={rowActions}
          onRowClick={handleRowClick}
          dataTestId={`${dataTestId}-list`}
        />
      </DataDisplay>
    </div>
  )
}

export const ContactLayout = ConfigContactLayout
export default ContactLayout
