import React, { useState, useEffect, useMemo } from 'react'
import {
  Button,
  Card,
  Spinner,
  Icon,
  DataTable,
  CardContent,
  Badge,
  toast,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../_i18n'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { useUserLocale } from '@/common/locale/useUserLocale'
import CardTabHeaderComponent from '../../../generic-components/card'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { DeleteButton } from '../../../generic-components/delete-button/DeleteButton'
import EmploymentTypeForm from '@/business-apps/mdm/forms/employment-type-form/EmploymentTypeForm'
import SheetWrapperComponent from '../../../generic-components/sheet-wrapper/SheetWrapperComponent'
import {
  EyeIcon,
  IdentificationCardIcon,
  InfoIcon,
  MagnifyingGlassIcon,
  PencilSimpleLineIcon,
  PlusIcon,
  TagIcon
} from '@phosphor-icons/react'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import { useGetEmploymentTypesData } from '../../queries/EmploymentTypesQueries'
import {
  EMPLOYMENT_TYPE_CATALOG,
  EMPLOYMENT_TYPE_VERSION
} from '@/business-apps/hr/core/forms/job-position/hooks/useEmploymentTypes'
import { DebouncedInput } from '@/components/debounced-input/DebouncedInput'
import { mergeCatalogEntryForPut, parseEmploymentMetadata } from '../../utils/catalogEntryMetadata'
import { CatalogLookupDataTableShell } from '../CatalogLookupDataTableShell'
import { CatalogMultilineCellText } from '../CatalogMultilineCellText'

export interface EmploymentType {
  id: string
  code: string
  value: string
  alternativeCode?: string
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
  translations: Array<{
    localeCode: string
    value: string
  }>
}

export interface EmploymentTypesTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'EmploymentTypesTab'

const EmploymentTypesTab: React.FC<EmploymentTypesTabProps> = ({ accessToken, prefixDataTestId }) => {
  const { t } = useTranslation(translations)
  const userLocale = useUserLocale() ?? 'en-US'
  const catalogClient = useCatalogManagerClient(accessToken)
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)

  const { fetchEmploymentTypes } = useGetEmploymentTypesData(catalogClient, userLocale)

  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<EmploymentType | null>(null)
  const [isDrawerVisible, setIsDrawerVisible] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])

  const loadEmploymentTypes = async () => {
    try {
      setLoading(true)

      const types = (await fetchEmploymentTypes()) ?? []
      const sortedTypes = [...types].sort((a, b) => a.value.localeCompare(b.value))

      setEmploymentTypes(sortedTypes)
    } catch {
      toast.error(t('toast-load-error'))
    } finally {
      setLoading(false)
    }
  }

  const usedCodes = useMemo(() => {
    return employmentTypes.map(employmentType => employmentType.code)
  }, [employmentTypes])

  useEffect(() => {
    if (selectedType) {
      const newEmploymentType = employmentTypes.find(employmentType => employmentType.id === selectedType.id)

      if (newEmploymentType) {
        setSelectedType(newEmploymentType)
      }
    }
  }, [employmentTypes])

  useEffect(() => {
    loadEmploymentTypes()
  }, [userLocale])

  const filteredEmploymentTypes = useMemo(() => {
    return employmentTypes.filter(
      employmentType =>
        employmentType.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employmentType.code.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [employmentTypes, searchTerm])

  const drawerItems = useMemo(() => {
    if (!selectedType) return []
    const items = [
      {
        icon: <InfoIcon />,
        title: t('drawer-section-basic-info'),
        items: [
          {
            label: t('drawer-label-name'),
            value: selectedType.value
          },
          {
            label: t('drawer-label-code'),
            value: selectedType.code || '-'
          },
          {
            label: t('drawer-label-description'),
            value: selectedType.additionalValue1 ?? '-'
          }
        ]
      }
    ]

    return items
  }, [selectedType])

  const handleSoftDelete = async (record: {
    id: string
    code: string
    value: string
    description?: string
    additionalValue2?: string
  }) => {
    const fresh = await catalogClient.getCatalogEntryById(record.id)
    const meta = parseEmploymentMetadata(fresh.additionalValue2)
    const payload = mergeCatalogEntryForPut(fresh, {
      additionalValue2: JSON.stringify({ ...meta, is_deleted: true })
    })
    await catalogClient.updateCatalogEntry(
      EMPLOYMENT_TYPE_CATALOG,
      EMPLOYMENT_TYPE_VERSION,
      record.id,
      payload as Parameters<typeof catalogClient.updateCatalogEntry>[3]
    )
    await loadEmploymentTypes()
  }

  const handleViewDetails = (record: EmploymentType) => {
    const employmentType = employmentTypes.find(employmentType => employmentType.id === record.id)
    if (!employmentType) return

    setSelectedType(employmentType)
    setIsDrawerVisible(true)
  }

  const dataTable = useMemo(
    () =>
      filteredEmploymentTypes.map(employmentType => ({
        id: employmentType.id,
        code: employmentType.code,
        value: employmentType.value,
        description: employmentType.additionalValue1,
        additionalValue2: employmentType.additionalValue2
      })),
    [filteredEmploymentTypes]
  )

  const renderEmploymentTypesTable = () => {
    const columns: ColumnDef<EmploymentType & { description: string }>[] = [
      {
        accessorKey: 'code',
        header: t('table-header-code'),
        enableSorting: true,
        cell: ({ getValue }) => {
          const code = getValue()
          return (
            <div className="gba:flex gba:items-center gba:w-[100px]">
              <Badge variant="info">{(code as string) ?? 'N/A'}</Badge>
            </div>
          )
        }
      },
      {
        accessorKey: 'value',
        header: t('table-header-name'),
        enableSorting: true,
        cell: ({ getValue }) => <CatalogMultilineCellText text={getValue() as string} bold />
      },
      {
        accessorKey: 'description',
        header: t('table-header-description'),
        enableSorting: true,
        cell: ({ getValue }) => <CatalogMultilineCellText text={(getValue() as string | undefined) ?? '-'} />
      },
      {
        id: 'actions',
        header: () => <div className="gba:flex gba:w-[115px]">{t('table-header-actions')}</div>,
        enableSorting: false,
        enableHiding: true,
        cell: ({ row }) => (
          <div className="gba:flex">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewDetails(row.original)}
              data-testid={`${dataTestId}-view-employment-type-${row.original.id}`}
            >
              <EyeIcon className="gba:h-4 gba:w-4" />
            </Button>
            <EmploymentTypeForm
              childAddButton={
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={e => {
                    e.stopPropagation()
                  }}
                  data-testid={`${dataTestId}-edit-button`}
                >
                  <Icon icon={PencilSimpleLineIcon} />
                </Button>
              }
              refetch={loadEmploymentTypes}
              accessToken={accessToken}
              prefixDataTestId={prefixDataTestId}
              employmentType={{
                id: row.original.id,
                code: row.original.code,
                value: row.original.value,
                description: row.original.description ?? '',
                additionalValue2: row.original.additionalValue2
              }}
              usedCodes={usedCodes}
            />
            <DeleteButton
              onDelete={() => handleSoftDelete(row.original)}
              itemName={row.original.value}
              itemTitle={t('delete-item-title')}
            />
          </div>
        )
      }
    ]

    return (
      <CatalogLookupDataTableShell>
        <DataTable
          data={dataTable}
          columns={columns as ColumnDef<(typeof dataTable)[number]>[]}
          sorting={sorting}
          onSortingChange={setSorting}
          enableSorting
          enablePagination
          enableResizing={false}
          tableLayout="fixed"
        />
      </CatalogLookupDataTableShell>
    )
  }

  return (
    <Card className="gba:overflow-hidden">
      {!loading && (
        <CardTabHeaderComponent
          addButton={
            <EmploymentTypeForm
              childAddButton={
                <Button
                  onClick={e => {
                    e.stopPropagation()
                  }}
                  data-testid={`${dataTestId}-add-button`}
                >
                  <Icon icon={PlusIcon} /> {t('add-button')}
                </Button>
              }
              refetch={loadEmploymentTypes}
              accessToken={accessToken}
              prefixDataTestId={prefixDataTestId}
              usedCodes={usedCodes}
            />
          }
          cardTitle={`${t('card-title')} (${employmentTypes.length})`}
          cardDescription={t('card-description')}
        />
      )}

      <CardContent>
        <div className="gba:mb-6 gba:pt-4 gba:relative gba:max-w-sm">
          <DebouncedInput
            key="search-input"
            value={searchTerm}
            onChange={value => setSearchTerm(value)}
            placeholder={t('search-placeholder')}
            className="gba:w-full gba:pr-10"
            debounceDelay={300}
            ariaLabel={t('search-placeholder')}
            data-testid="asset-search-input"
            icon={
              <MagnifyingGlassIcon
                className="gba:w-4 gba:h-4 gba:text-muted-foreground"
                data-testid="asset-search-icon"
              />
            }
          />
        </div>

        {loading && employmentTypes.length === 0 ? (
          <div data-testid={`${dataTestId}-loading`} className="gba:flex gba:justify-center gba:items-center gba:h-64">
            <Spinner />
          </div>
        ) : (
          <div className="gba:overflow-hidden">{renderEmploymentTypesTable()}</div>
        )}

        {selectedType && (
          <SheetWrapperComponent
            prefixDataTestId={dataTestId}
            isDrawerVisible={isDrawerVisible}
            onOpenChange={openStatus => {
              if (!openStatus) {
                setSelectedType(null)
              }
              setIsDrawerVisible(openStatus)
            }}
            title={t('sheet-title')}
            titleIcon={IdentificationCardIcon}
            drawerItems={drawerItems}
            extraContent={
              <div className="gba:text-xs gba:text-gray-500 gba:flex gba:items-center gba:justify-center gba:gap-2">
                <Icon icon={TagIcon} className="gba:w-4! gba:h-4!" />
                {t('sheet-extra-content')}
              </div>
            }
            footerButtons={[
              <EmploymentTypeForm
                childAddButton={
                  <Button
                    onClick={e => {
                      e.stopPropagation()
                    }}
                    data-testid={`${dataTestId}-edit-button`}
                  >
                    <Icon icon={PencilSimpleLineIcon} /> {t('edit-button')}
                  </Button>
                }
                refetch={loadEmploymentTypes}
                accessToken={accessToken}
                prefixDataTestId={prefixDataTestId}
                employmentType={{
                  id: selectedType.id,
                  code: selectedType.code,
                  value: selectedType.value,
                  description: selectedType.additionalValue1 ?? '',
                  additionalValue2: selectedType.additionalValue2
                }}
                isDrawerActive={true}
                usedCodes={usedCodes}
                key={selectedType?.id}
              />
            ]}
          />
        )}
      </CardContent>
    </Card>
  )
}

export { EmploymentTypesTab }
