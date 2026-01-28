import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Button, DataDisplay, type FilterConfiguration } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo } from '@/common/utils/navigationUtils'
import { ContactListLayout } from './components/ContactListLayout'
import { ContactStatisticsLayout, type ContactStatisticsData } from './components/ContactStatisticsLayout'
import type { Contact } from '@/common/data/relations/types/contactTypes'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { deriveSortableColumns, deriveAvailableColumns } from '@/common/network/graphql/descriptorUtils'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { buildDynamicFilterConfig } from './utils/filterHelpers'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'

export interface ContactViewConfig<TContact extends Contact = Contact, TQueryVariables = any> {
  fetchContacts: (variables: TQueryVariables) => Promise<{
    contacts?: TContact[]
    total?: number
  }>

  createColumns: () => ColumnDef<TContact>[]
  descriptors: Descriptor[]
  columnLabels?: Record<string, string>
  entityName: string

  baseFilterConfig: FilterConfiguration

  buildQueryVariables: (params: {
    pagination: { pageIndex: number; pageSize: number }
    searchTerm: string
    selectedFilters: Record<string, any>
    sorting: Array<{ id: string; desc: boolean }>
  }) => TQueryVariables

  flowContexts: {
    entityContext: FlowContextName
    createContext: FlowContextName
    createContextData?: Record<string, any>
  }

  buildRecordUrl: (id: string) => string

  contactStatistics?: ContactStatisticsData

  rowActionsContextArray: FlowContextName[]
  buildRowActionsExternalContextData: (row: { original: TContact }) => Record<string, string>

  translations: {
    allContacts: { key: string; default: string }
    searchContacts: { key: string; default: string }
    filterContacts: { key: string; default: string }
    filterContactsDescription: { key: string; default: string }
    addContact: { key: string; default: string }
  }
}

export interface ContactLayoutProps<TContact extends Contact = Contact, TQueryVariables = any> {
  readonly context: BusinessAppContextProps
  readonly config: ContactViewConfig<TContact, TQueryVariables>
  readonly dataTestId?: string
  readonly initialFilters?: Record<string, any>
  readonly hideFilters?: boolean
  readonly customPrimaryAction?: React.ReactNode
}

// Row Actions Component
const ContactRowActions = <TContact extends Contact = Contact, TQueryVariables = any>({
  row,
  config,
  accessToken
}: {
  row: { original: TContact }
  config: ContactViewConfig<TContact, TQueryVariables>
  accessToken: string
}) => (
  <AppActionMenu
    contextsArray={config.rowActionsContextArray}
    externalContextData={config.buildRowActionsExternalContextData(row)}
    prefixDataTestId="contact-actions"
    accessToken={accessToken}
    emptyStateBehavior="enable"
    deferMainContextRequestsUntilClick
  >
    <Button variant="ghost" size="icon" data-testid={`contact-actions-${row.original.id}`}>
      <svg className="gba:h-4 gba:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
        />
      </svg>
    </Button>
  </AppActionMenu>
)

function ConfigContactLayout<TContact extends Contact = Contact, TQueryVariables = any>(
  props: Readonly<ContactLayoutProps<TContact, TQueryVariables>>
): React.ReactElement {
  const {
    context,
    config,
    dataTestId = 'contact-view',
    initialFilters = {},
    hideFilters = false,
    customPrimaryAction
  } = props

  // View State
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>(initialFilters)
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'createdAt', desc: true }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>([])

  // Data State
  const [contacts, setContacts] = useState<TContact[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Use centralized filter groups hook
  const filterGroups = useFilterGroups(
    context || ({} as BusinessAppContextProps),
    config.entityName,
    config.descriptors,
    { limit: 100 }
  )

  // Dynamic Filter Configuration
  const dynamicFilterConfig = useMemo(() => {
    return buildDynamicFilterConfig(config.baseFilterConfig, config.descriptors, filterGroups)
  }, [config.baseFilterConfig, config.descriptors, filterGroups])

  // Query Variables
  const queryVariables = useMemo(
    () =>
      config.buildQueryVariables({
        pagination,
        searchTerm,
        selectedFilters,
        sorting
      }),
    [pagination, searchTerm, selectedFilters, sorting, config]
  )

  // Load Data
  const loadData = useCallback(
    async (showLoading: boolean = true) => {
      if (!context?.accessToken) return

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
    [context?.accessToken, config, queryVariables]
  )

  // Initial load
  useEffect(() => {
    if (!context?.accessToken || !isInitialLoad) return
    loadData(true)
  }, [context?.accessToken, isInitialLoad])

  // Reload data when filters/search/sort change (skip initial load)
  useEffect(() => {
    if (isInitialLoad || !context?.accessToken) return
    loadData(false)
  }, [queryVariables, context?.accessToken, loadData])

  // Process Completion Handlers
  const handleProcessComplete = useCallback(() => {
    loadData(false)
    // Also refresh statistics when process completes
    config.contactStatistics?.refetch?.()
  }, [loadData, config.contactStatistics?.refetch])

  useProcessCompletion({ onSuccess: handleProcessComplete })

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
      if (!contact.id) return
      const url = config.buildRecordUrl(contact.id)
      navigateTo(url)
    },
    [config]
  )

  // Columns
  const columns = useMemo(() => config.createColumns(), [config])
  const availableColumns = useMemo(() => deriveAvailableColumns(columns), [columns])
  const availableColumnIds = useMemo(() => availableColumns.map(col => col.id), [availableColumns])
  const sortableColumns = useMemo(
    () => deriveSortableColumns(config.descriptors, config.columnLabels, availableColumnIds),
    [config.descriptors, config.columnLabels, availableColumnIds]
  )

  // Initialize visible columns from available columns if empty
  useEffect(() => {
    if (visibleColumns.length === 0 && availableColumns.length > 0) {
      setVisibleColumns(availableColumns.map(col => col.id))
    }
  }, [availableColumns, visibleColumns.length])

  // Row actions - rendered internally
  // Row actions - rendered internally (only if actions are configured)
  const rowActions = useMemo(() => {
    // Hide actions column if no actions are configured
    if (!config.rowActionsContextArray || config.rowActionsContextArray.length === 0) {
      return undefined
    }
    return (row: { original: TContact }) => (
      <ContactRowActions row={row} config={config} accessToken={context?.accessToken || ''} />
    )
  }, [config, context?.accessToken])

  if (!context) {
    console.error('ContactLayout: context is required')
    return null
  }

  const accessToken = context.accessToken

  return (
    <div data-testid={dataTestId}>
      {/* Statistics */}
      {config.contactStatistics && (
        <ContactStatisticsLayout statistics={config.contactStatistics} data-testid={`${dataTestId}-statistics`} />
      )}

      {/* DataDisplay */}
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: getTranslationFromI18nKeyAndLabel(
              config.translations.allContacts.key,
              config.translations.allContacts.default
            ),
            metadata: {
              count: totalCount,
              isLoading: isLoading
            }
          }
        ]}
        currentSection="all"
        searchValue={searchTerm}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel(
          config.translations.searchContacts.key,
          config.translations.searchContacts.default
        )}
        onSearchChange={handleSearch}
        filters={hideFilters ? undefined : selectedFilters}
        filterConfiguration={hideFilters ? undefined : dynamicFilterConfig}
        onFilterChange={hideFilters ? undefined : handleFilterUpdate}
        sorting={sorting}
        sortableColumns={sortableColumns}
        onSortingChange={setSorting}
        availableColumns={availableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        primaryAction={
          customPrimaryAction ||
          (config.flowContexts.createContext ? (
            <AppAction
              contextsArray={[config.flowContexts.createContext]}
              externalContextData={config.flowContexts.createContextData}
              accessToken={accessToken}
              data-testid="add-contact-action"
              emptyStateBehavior="hide"
            >
              <Button size="sm" variant="default" data-testid="add-contact-button" type="button">
                <Plus size={16} />
                {getTranslationFromI18nKeyAndLabel(
                  config.translations.addContact.key,
                  config.translations.addContact.default
                )}
              </Button>
            </AppAction>
          ) : undefined)
        }
        toolbarDensity="default"
        enableLiveFiltering={true}
        filterSheetTitle={getTranslationFromI18nKeyAndLabel(
          config.translations.filterContacts.key,
          config.translations.filterContacts.default
        )}
        filterSheetDescription={getTranslationFromI18nKeyAndLabel(
          config.translations.filterContactsDescription.key,
          config.translations.filterContactsDescription.default
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
