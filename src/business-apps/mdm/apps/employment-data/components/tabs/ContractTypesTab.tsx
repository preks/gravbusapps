import React, { useState, useEffect, useMemo } from 'react'
import {
  Button,
  Card,
  CardContent,
  Spinner,
  DataTable,
  Icon,
  Badge,
  toast,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../_i18n'
import {
  EyeIcon,
  PlusIcon,
  PencilSimpleLineIcon,
  FileCodeIcon,
  TagIcon,
  InfoIcon,
  MagnifyingGlassIcon
} from '@phosphor-icons/react'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { useUserLocale } from '@/common/locale/useUserLocale'
import CardTabHeaderComponent from '../../../generic-components/card'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { DeleteButton } from '../../../generic-components/delete-button/DeleteButton'
import ContractTypeForm from '@/business-apps/mdm/forms/contract-type-form/ContractTypeForm'
import SheetWrapperComponent from '../../../generic-components/sheet-wrapper/SheetWrapperComponent'
import { useGetContractTypesData } from '../../queries/ContractTypesQueries'
import {
  CONTRACT_TYPE_CATALOG,
  CONTRACT_TYPE_VERSION
} from '@/business-apps/hr/core/forms/job-position/hooks/useContractTypes'
import { DebouncedInput } from '@/components/debounced-input/DebouncedInput'
import {
  formatProbationFromJson,
  mergeCatalogEntryForPut,
  parseContractTypeJson,
  serializeContractTypeAdditionalJson
} from '../../utils/catalogEntryMetadata'

export interface ContractType {
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

export interface ContractTypeTable {
  id: string
  code: string
  value: string
  description: string | undefined
  /** Raw `additionalValue2`: JSON with probation, payroll_relevant, is_deleted */
  probationPeriod?: string
  payrollRelevant?: boolean
}

export interface ContractTypesTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'ContractTypesTab'

const ContractTypesTab: React.FC<ContractTypesTabProps> = ({ accessToken, prefixDataTestId }) => {
  const { t } = useTranslation(translations)
  const userLocale = useUserLocale() ?? 'en-US'
  const catalogClient = useCatalogManagerClient(accessToken)
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)

  const { fetchContractTypes } = useGetContractTypesData(catalogClient, userLocale)

  const [contractTypes, setContractTypes] = useState<ContractType[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<ContractType | null>(null)
  const [isDrawerVisible, setIsDrawerVisible] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])

  const loadContractTypes = async () => {
    try {
      setLoading(true)

      const types = (await fetchContractTypes()) ?? []
      setContractTypes(types)
    } catch {
      toast.error(t('ct-toast-load-error'))
    } finally {
      setLoading(false)
    }
  }

  const usedCodes = useMemo(() => {
    return contractTypes.map(contractType => contractType.code)
  }, [contractTypes])
  useEffect(() => {
    if (selectedType) {
      const newContractType = contractTypes.find(contractType => contractType.id === selectedType.id)

      if (newContractType) {
        setSelectedType(newContractType)
      }
    }
  }, [contractTypes])

  useEffect(() => {
    loadContractTypes()
  }, [userLocale])

  const filteredContractTypes = useMemo(() => {
    return contractTypes.filter(
      contractType =>
        contractType.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contractType.code.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [contractTypes, searchTerm])

  const handleSoftDelete = async (record: ContractTypeTable) => {
    const fresh = await catalogClient.getCatalogEntryById(record.id)
    const parsed = parseContractTypeJson(fresh.additionalValue2)
    const additionalValue2 = serializeContractTypeAdditionalJson({
      ...parsed,
      is_deleted: true
    })
    const payload = mergeCatalogEntryForPut(fresh, { additionalValue2 })
    await catalogClient.updateCatalogEntry(
      CONTRACT_TYPE_CATALOG,
      CONTRACT_TYPE_VERSION,
      record.id,
      payload as Parameters<typeof catalogClient.updateCatalogEntry>[3]
    )
    await loadContractTypes()
  }

  const handleViewDetails = (record: ContractTypeTable) => {
    const contractType = contractTypes.find(contractType => contractType.id === record.id)
    if (!contractType) return

    setSelectedType(contractType)
    setIsDrawerVisible(true)
  }

  const drawerItems = useMemo(() => {
    if (!selectedType) return []
    const items = [
      {
        icon: <InfoIcon />,
        title: t('ct-drawer-section-basic-info'),
        items: [
          {
            label: t('ct-drawer-label-name'),
            value: selectedType.value
          },
          {
            label: t('ct-drawer-label-code'),
            value: selectedType.code || '-'
          },
          {
            label: t('ct-drawer-label-description'),
            value: selectedType.additionalValue1 ?? '-'
          },
          {
            label: t('ct-drawer-label-probation-period'),
            value: formatProbationFromJson(selectedType.additionalValue2)
          },
          {
            label: 'Payroll relevant',
            value: parseContractTypeJson(selectedType.additionalValue2).payroll_relevant ? 'Yes' : 'No'
          }
        ],
        verticalTable: true
      }
    ]

    return items
  }, [selectedType, t])

  const renderContractTypesTable = () => {
    const columns: ColumnDef<ContractTypeTable>[] = [
      {
        accessorKey: 'code',
        header: t('ct-table-header-code'),
        enableSorting: true,
        cell: ({ getValue }) => {
          const code = getValue()
          return (
            <div className="gba:flex gba:items-center gba:w-[80px]">
              <Badge variant="info">{(code as string) ?? 'N/A'}</Badge>
            </div>
          )
        }
      },
      {
        accessorKey: 'value',
        header: t('ct-table-header-name'),
        enableSorting: true,
        cell: ({ getValue }) => {
          const name = getValue() as string
          return (
            <div className="gba:min-w-0 gba:max-w-full gba:overflow-hidden">
              <div className="gba:whitespace-normal gba:break-all gba:font-semibold" title={name}>
                {name}
              </div>
            </div>
          )
        }
      },
      {
        accessorKey: 'description',
        header: t('ct-table-header-description'),
        enableSorting: true,
        cell: ({ getValue }) => {
          const description = (getValue() as string | undefined) ?? '-'
          return (
            <div className="gba:min-w-0 gba:max-w-full gba:overflow-hidden">
              <div className="gba:whitespace-normal gba:break-all" title={description}>
                {description}
              </div>
            </div>
          )
        }
      },
      {
        accessorKey: 'probationPeriod',
        header: t('ct-table-header-probation-period'),
        enableSorting: true,
        cell: ({ getValue }) => {
          const probationPeriod = getValue() as string | undefined
          return (
            <div className="gba:flex gba:items-center">
              <span>{formatProbationFromJson(probationPeriod)}</span>
            </div>
          )
        }
      },
      {
        accessorKey: 'payrollRelevant',
        header: 'Payroll relevant',
        enableSorting: true,
        cell: ({ getValue }) => (
          <Badge variant={getValue() ? 'default' : 'secondary'}>{getValue() ? 'Yes' : 'No'}</Badge>
        )
      },
      {
        id: 'actions',
        header: () => <div className="gba:flex gba:w-[115px]">{t('ct-table-header-actions')}</div>,
        enableSorting: false,
        enableHiding: true,
        cell: ({ row }) => (
          <div className="gba:flex">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewDetails(row.original)}
              data-testid={`${dataTestId}-view-contract-type-${row.original.id}`}
            >
              <EyeIcon className="gba:h-4 gba:w-4" />
            </Button>
            <ContractTypeForm
              childAddButton={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation()
                  }}
                >
                  <PencilSimpleLineIcon />
                </Button>
              }
              refetch={loadContractTypes}
              accessToken={accessToken}
              prefixDataTestId={prefixDataTestId}
              contractType={row.original}
            />
            <DeleteButton
              onDelete={() => handleSoftDelete(row.original)}
              itemName={row.original.value}
              itemTitle={t('ct-delete-item-title')}
            />
          </div>
        )
      }
    ]

    const dataTable: ContractTypeTable[] = filteredContractTypes.map(contractType => {
      const parsed = parseContractTypeJson(contractType.additionalValue2)
      return {
        id: contractType.id,
        code: contractType.code,
        value: contractType.value,
        description: contractType.additionalValue1,
        probationPeriod: contractType.additionalValue2,
        payrollRelevant: parsed.payroll_relevant === true
      }
    })

    return (
      <div className="gba:min-w-0 gba:w-full gba:[&_td]:overflow-hidden gba:[&_td]:align-top">
        <DataTable
          data={dataTable}
          columns={columns as ColumnDef<ContractTypeTable>[]}
          sorting={sorting}
          onSortingChange={setSorting}
          enableSorting
          enablePagination
          enableResizing={false}
          tableLayout="fixed"
        />
      </div>
    )
  }

  return (
    <Card data-testid={`${dataTestId}`} className="gba:overflow-hidden">
      {!loading && (
        <CardTabHeaderComponent
          addButton={
            <ContractTypeForm
              usedCodes={usedCodes}
              childAddButton={
                <Button
                  onClick={e => {
                    e.stopPropagation()
                  }}
                  data-testid={`${dataTestId}-add-button`}
                >
                  <PlusIcon /> {t('ct-add-button')}
                </Button>
              }
              refetch={loadContractTypes}
              accessToken={accessToken}
              prefixDataTestId={prefixDataTestId}
            />
          }
          cardTitle={`${t('ct-card-title')} (${contractTypes.length})`}
          cardDescription={t('ct-card-description')}
        />
      )}

      <CardContent>
        <div className="gba:mb-6 gba:pt-4 gba:relative gba:max-w-sm">
          <DebouncedInput
            key="search-input"
            value={searchTerm}
            onChange={value => setSearchTerm(value)}
            placeholder={t('ct-search-placeholder')}
            className="gba:w-full gba:pr-10"
            debounceDelay={300}
            ariaLabel={t('ct-search-placeholder')}
            data-testid="asset-search-input"
            icon={
              <MagnifyingGlassIcon
                className="gba:w-4 gba:h-4 gba:text-muted-foreground"
                data-testid="asset-search-icon"
              />
            }
          />
        </div>

        {loading && contractTypes.length === 0 ? (
          <div data-testid={`${dataTestId}`} className="gba:flex gba:justify-center gba:items-center gba:h-64">
            <Spinner />
          </div>
        ) : (
          <div className="gba:overflow-hidden">{renderContractTypesTable()}</div>
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
            title={t('ct-sheet-title')}
            titleIcon={FileCodeIcon}
            drawerItems={drawerItems}
            extraContent={
              <div className="gba:text-xs gba:text-gray-500 gba:flex gba:items-center gba:justify-center gba:gap-2">
                <Icon icon={TagIcon} className="gba:w-4! gba:h-4!" />
                {t('ct-sheet-extra-content')}
              </div>
            }
            footerButtons={[
              <ContractTypeForm
                childAddButton={
                  <Button
                    onClick={e => {
                      e.stopPropagation()
                    }}
                  >
                    <PencilSimpleLineIcon /> {t('ct-edit-button')}
                  </Button>
                }
                refetch={loadContractTypes}
                accessToken={accessToken}
                prefixDataTestId={prefixDataTestId}
                contractType={{
                  id: selectedType.id,
                  code: selectedType.code,
                  value: selectedType.value,
                  description: selectedType.additionalValue1,
                  probationPeriod: selectedType.additionalValue2
                }}
                isDrawerActive={true}
                key={selectedType.id}
              />
            ]}
          />
        )}
      </CardContent>
    </Card>
  )
}

export { ContractTypesTab }
