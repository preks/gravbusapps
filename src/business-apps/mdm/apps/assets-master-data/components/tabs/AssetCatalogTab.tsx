import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, CardContent, DataTable, Spinner, toast, useTranslation } from '@newwork/nw-design-system'
import { EyeIcon, MagnifyingGlassIcon, PencilSimpleLineIcon, PlusIcon } from '@phosphor-icons/react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useUserLocale } from '@/common/locale/useUserLocale'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { DebouncedInput } from '@/components/debounced-input/DebouncedInput'
import CardTabHeaderComponent from '@/business-apps/mdm/apps/generic-components/card'
import { DeleteButton } from '@/business-apps/mdm/apps/generic-components/delete-button/DeleteButton'
import AssetCatalogEntryForm from '@/business-apps/mdm/forms/asset-catalog-entry-form/AssetCatalogEntryForm'
import { CatalogLookupDataTableShell } from '@/business-apps/mdm/apps/employment-data/components/CatalogLookupDataTableShell'
import { CatalogMultilineCellText } from '@/business-apps/mdm/apps/employment-data/components/CatalogMultilineCellText'
import { useGetAssetCatalogEntriesData } from '../../queries/AssetCatalogQueries'
import { type AssetCatalogConfig, type AssetCatalogEntry } from '../../types'
import { mergeAssetCatalogEntryForPut } from '../../utils/catalogEntryMetadata'
import translations from '../../_i18n'
import { AssetCatalogDetailDrawer } from './AssetCatalogDetailDrawer'

interface AssetCatalogTabProps extends BusinessAppContextProps {
  config: AssetCatalogConfig
  prefixDataTestId?: string
}

interface AssetCatalogEntryTable {
  id: string
  code: string
  value: string
  description?: string
}

const DATA_TEST_ID_PREFIX = 'AssetCatalogTab'

interface AssetActionsCellProps extends BusinessAppContextProps {
  config: AssetCatalogConfig
  dataTestId: string
  loadEntries: () => void
  onDelete: (record: AssetCatalogEntryTable) => Promise<void>
  onViewDetails: (record: AssetCatalogEntryTable) => void
  prefixDataTestId?: string
  record: AssetCatalogEntryTable
  t: (key: string) => string
  usedCodes: string[]
}

interface BuildAssetCatalogColumnsParams extends BusinessAppContextProps {
  config: AssetCatalogConfig
  dataTestId: string
  loadEntries: () => void
  onDelete: (record: AssetCatalogEntryTable) => Promise<void>
  onViewDetails: (record: AssetCatalogEntryTable) => void
  prefixDataTestId?: string
  t: (key: string) => string
  usedCodes: string[]
}

const AssetCodeCell: React.FC<{ code: string }> = ({ code }) => (
  <div className="gba:flex gba:w-24 gba:items-center">
    <Badge variant="info">{code || 'N/A'}</Badge>
  </div>
)

const AssetValueCell: React.FC<{ value: string }> = ({ value }) => <CatalogMultilineCellText text={value} bold />

const AssetDescriptionCell: React.FC<{ description?: string }> = ({ description }) => (
  <CatalogMultilineCellText text={description ?? '-'} />
)

const AssetActionsHeader: React.FC<{ label: string }> = ({ label }) => <div className="gba:flex gba:w-28">{label}</div>

const AssetActionsCell: React.FC<AssetActionsCellProps> = ({
  accessToken,
  config,
  dataTestId,
  loadEntries,
  onDelete,
  onViewDetails,
  prefixDataTestId,
  record,
  t,
  usedCodes
}) => (
  <div className="gba:flex">
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onViewDetails(record)}
      data-testid={`${dataTestId}-view-${config.viewActionPrefix}-${record.id}`}
    >
      <EyeIcon className="gba:h-4 gba:w-4" />
    </Button>
    <AssetCatalogEntryForm
      childAddButton={
        <Button
          variant="ghost"
          size="sm"
          onClick={event => {
            event.stopPropagation()
          }}
          data-testid={`${dataTestId}-edit-button`}
        >
          <PencilSimpleLineIcon />
        </Button>
      }
      refetch={loadEntries}
      accessToken={accessToken}
      prefixDataTestId={prefixDataTestId}
      catalogIdentifier={config.catalogIdentifier}
      catalogVersion={config.version}
      catalogName={t(config.titleKey)}
      assetCatalogEntry={record}
      usedCodes={usedCodes}
    />
    <DeleteButton onDelete={() => onDelete(record)} itemName={record.value} itemTitle={t(config.deleteTitleKey)} />
  </div>
)

const buildAssetCatalogColumns = ({
  accessToken,
  config,
  dataTestId,
  loadEntries,
  onDelete,
  onViewDetails,
  prefixDataTestId,
  t,
  usedCodes
}: BuildAssetCatalogColumnsParams): ColumnDef<AssetCatalogEntryTable>[] => [
  {
    accessorKey: 'code',
    header: t('table-header-code'),
    enableSorting: true,
    cell: ({ row }) => <AssetCodeCell code={row.original.code} />
  },
  {
    accessorKey: 'value',
    header: t('table-header-name'),
    enableSorting: true,
    cell: ({ row }) => <AssetValueCell value={row.original.value} />
  },
  {
    accessorKey: 'description',
    header: t('table-header-description'),
    enableSorting: true,
    cell: ({ row }) => <AssetDescriptionCell description={row.original.description} />
  },
  {
    id: 'actions',
    header: () => <AssetActionsHeader label={t('table-header-actions')} />,
    enableSorting: false,
    enableHiding: true,
    cell: ({ row }) => (
      <AssetActionsCell
        accessToken={accessToken}
        config={config}
        dataTestId={dataTestId}
        loadEntries={loadEntries}
        onDelete={onDelete}
        onViewDetails={onViewDetails}
        prefixDataTestId={prefixDataTestId}
        record={row.original}
        t={t}
        usedCodes={usedCodes}
      />
    )
  }
]

const AssetCatalogTab: React.FC<AssetCatalogTabProps> = ({ accessToken, config, prefixDataTestId }) => {
  const { t } = useTranslation(translations)
  const userLocale = useUserLocale() ?? 'en-US'
  const catalogClient = useCatalogManagerClient(accessToken)
  const dataTestId = formatDataTestId(prefixDataTestId, `${DATA_TEST_ID_PREFIX}-${config.formName}`)
  const { fetchAssetCatalogEntries } = useGetAssetCatalogEntriesData(
    catalogClient,
    userLocale,
    config.catalogIdentifier
  )

  const [entries, setEntries] = useState<AssetCatalogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<AssetCatalogEntry | null>(null)
  const [isDrawerVisible, setIsDrawerVisible] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true)
      const catalogEntries = (await fetchAssetCatalogEntries()) ?? []
      setEntries([...catalogEntries].sort((a, b) => a.value.localeCompare(b.value)))
    } catch {
      toast.error(t(config.loadErrorKey))
    } finally {
      setLoading(false)
    }
  }, [fetchAssetCatalogEntries, t, config.loadErrorKey])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  useEffect(() => {
    if (!selectedEntry) return

    const updatedEntry = entries.find(entry => entry.id === selectedEntry.id)
    if (updatedEntry) {
      setSelectedEntry(updatedEntry)
    }
  }, [entries, selectedEntry?.id])

  const usedCodes = useMemo(() => entries.map(entry => entry.code), [entries])

  const filteredEntries = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase()

    return entries.filter(
      entry =>
        entry.value.toLowerCase().includes(normalizedSearch) || entry.code.toLowerCase().includes(normalizedSearch)
    )
  }, [entries, searchTerm])

  const dataTable = useMemo(
    () =>
      filteredEntries.map(entry => ({
        id: entry.id,
        code: entry.code,
        value: entry.value,
        description: entry.additionalValue1
      })),
    [filteredEntries]
  )

  const handleSoftDelete = useCallback(
    async (record: AssetCatalogEntryTable) => {
      const fresh = await catalogClient.getCatalogEntryById(record.id)
      const payload = mergeAssetCatalogEntryForPut(fresh, { isDeleted: true })

      await catalogClient.updateCatalogEntry(config.catalogIdentifier, config.version, record.id, payload)
      await loadEntries()
    },
    [catalogClient, config.catalogIdentifier, config.version, loadEntries]
  )

  const handleViewDetails = useCallback(
    (record: AssetCatalogEntryTable) => {
      const entry = entries.find(item => item.id === record.id)
      if (!entry) return

      setSelectedEntry(entry)
      setIsDrawerVisible(true)
    },
    [entries]
  )

  const columns = useMemo(
    () =>
      buildAssetCatalogColumns({
        accessToken,
        config,
        dataTestId,
        loadEntries,
        onDelete: handleSoftDelete,
        onViewDetails: handleViewDetails,
        prefixDataTestId,
        t,
        usedCodes
      }),
    [accessToken, config, dataTestId, handleSoftDelete, handleViewDetails, loadEntries, prefixDataTestId, t, usedCodes]
  )

  return (
    <Card data-testid={dataTestId} className="gba:overflow-hidden">
      {!loading && (
        <CardTabHeaderComponent
          addButton={
            <AssetCatalogEntryForm
              childAddButton={
                <Button
                  onClick={event => {
                    event.stopPropagation()
                  }}
                  data-testid={`${dataTestId}-add-button`}
                >
                  <PlusIcon /> {t(config.addButtonKey)}
                </Button>
              }
              refetch={loadEntries}
              accessToken={accessToken}
              prefixDataTestId={prefixDataTestId}
              catalogIdentifier={config.catalogIdentifier}
              catalogVersion={config.version}
              catalogName={t(config.titleKey)}
              usedCodes={usedCodes}
            />
          }
          cardTitle={`${t(config.titleKey)} (${entries.length})`}
          cardDescription={t(config.descriptionKey)}
        />
      )}

      <CardContent>
        <div className="gba:relative gba:mb-6 gba:max-w-sm gba:pt-4">
          <DebouncedInput
            key={`${config.formName}-search-input`}
            value={searchTerm}
            onChange={value => setSearchTerm(value)}
            placeholder={t(config.searchPlaceholderKey)}
            className="gba:w-full gba:pr-10"
            debounceDelay={300}
            ariaLabel={t(config.searchPlaceholderKey)}
            data-testid={`${dataTestId}-search-input`}
            icon={<MagnifyingGlassIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />}
          />
        </div>

        {loading && entries.length === 0 ? (
          <div data-testid={`${dataTestId}-loading`} className="gba:flex gba:h-64 gba:items-center gba:justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="gba:overflow-hidden">
            <CatalogLookupDataTableShell>
              <DataTable
                data={dataTable}
                columns={columns}
                sorting={sorting}
                onSortingChange={setSorting}
                enableSorting
                enablePagination
                enableResizing={false}
                tableLayout="fixed"
              />
            </CatalogLookupDataTableShell>
          </div>
        )}

        {selectedEntry && (
          <AssetCatalogDetailDrawer
            accessToken={accessToken}
            config={config}
            dataTestId={dataTestId}
            isDrawerVisible={isDrawerVisible}
            onOpenChange={openStatus => {
              if (!openStatus) {
                setSelectedEntry(null)
              }
              setIsDrawerVisible(openStatus)
            }}
            loadEntries={loadEntries}
            prefixDataTestId={prefixDataTestId}
            selectedEntry={selectedEntry}
            usedCodes={usedCodes}
          />
        )}
      </CardContent>
    </Card>
  )
}

export { AssetCatalogTab }
