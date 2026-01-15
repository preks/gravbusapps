import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, CardContent, Input, Spinner, DataTable, Icon, Badge, toast } from '@newwork/nw-design-system'
import { EyeIcon, PlusIcon, PencilSimpleLineIcon, FileCodeIcon, TagIcon, InfoIcon } from '@phosphor-icons/react'
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
  probationPeriod?: string // JSON string: {value: number, unit: string}
}

export interface ContractTypesTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'ContractTypesTab'

const ContractTypesTab: React.FC<ContractTypesTabProps> = ({ accessToken, prefixDataTestId }) => {
  const { t } = useTranslation()
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
      toast.error('Failed to load contract types')
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

  const handleDelete = async (record: ContractTypeTable) => {
    await catalogClient.deleteCatalogEntry(CONTRACT_TYPE_CATALOG, CONTRACT_TYPE_VERSION, record.id)

    setContractTypes(prev => prev.filter(contractType => contractType.id !== record.id))
  }

  const handleViewDetails = (record: ContractTypeTable) => {
    const contractType = contractTypes.find(contractType => contractType.id === record.id)
    if (!contractType) return

    setSelectedType(contractType)
    setIsDrawerVisible(true)
  }

  const formatProbationPeriod = (additionalValue2?: string): string => {
    if (!additionalValue2) return '-'
    try {
      const parsed = JSON.parse(additionalValue2)
      if (!parsed.value || !parsed.unit) return '-'
      const unitLabel = parsed.unit === 'day' ? 'Day(s)' : parsed.unit === 'week' ? 'Week(s)' : 'Month(s)'
      return `${parsed.value} ${unitLabel}`
    } catch {
      return '-'
    }
  }

  const drawerItems = useMemo(() => {
    if (!selectedType) return []
    const items = [
      {
        icon: <InfoIcon />,
        title: 'Basic Information',
        items: [
          {
            label: 'Name',
            value: selectedType.value
          },
          {
            label: 'Code',
            value: selectedType.code || '-'
          },
          {
            label: 'Description',
            value: selectedType.additionalValue1 ?? '-'
          },
          {
            label: 'Probation Period',
            value: formatProbationPeriod(selectedType.additionalValue2)
          }
        ],
        verticalTable: true
      }
    ]

    return items
  }, [selectedType])

  const renderContractTypesTable = () => {
    const columns: ColumnDef<ContractTypeTable>[] = [
      {
        accessorKey: 'code',
        header: 'Code',
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
        header: 'Name',
        enableSorting: true,
        cell: ({ getValue }) => {
          const name = getValue()
          return (
            <div className="gba:flex gba:items-center gba:w-[500px]">
              <div className="gba:w-full gba:truncate gba:font-semibold">{name as string}</div>
            </div>
          )
        }
      },
      {
        accessorKey: 'description',
        header: 'Description',
        enableSorting: true,
        cell: ({ getValue }) => {
          const description = getValue()
          return (
            <div className="gba:flex gba:items-center gba:w-[300px]">
              <div className="gba:w-full gba:truncate" title={description as string}>
                {(description as string) ?? '-'}
              </div>
            </div>
          )
        }
      },
      {
        accessorKey: 'probationPeriod',
        header: 'Probation Period',
        enableSorting: true,
        cell: ({ getValue }) => {
          const probationPeriod = getValue() as string | undefined
          return (
            <div className="gba:flex gba:items-center">
              <span>{formatProbationPeriod(probationPeriod)}</span>
            </div>
          )
        }
      },
      {
        id: 'actions',
        header: () => <div className="gba:flex gba:w-[115px]">Actions</div>,
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
              contractType={{
                ...row.original,
                probationPeriod: row.original.probationPeriod
              }}
            />
            <DeleteButton
              onDelete={() => handleDelete(row.original)}
              itemName={row.original.value}
              itemTitle="Employment Type"
            />
          </div>
        )
      }
    ]

    const dataTable: ContractTypeTable[] = filteredContractTypes.map(contractType => ({
      id: contractType.id,
      code: contractType.code,
      value: contractType.value,
      description: contractType.additionalValue1,
      probationPeriod: contractType.additionalValue2
    }))

    return (
      <DataTable
        data={dataTable}
        columns={columns as ColumnDef<ContractTypeTable>[]}
        sorting={sorting}
        onSortingChange={setSorting}
        enableSorting
        enablePagination
      />
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
                  <PlusIcon /> Add Contract Type
                </Button>
              }
              refetch={loadContractTypes}
              accessToken={accessToken}
              prefixDataTestId={prefixDataTestId}
            />
          }
          cardTitle={`${t('hr.contract_types', 'Contract Types')} (${contractTypes.length})`}
          cardDescription="Manage contract types and their classifications. Contract types define the employment agreements and terms."
        />
      )}

      <CardContent>
        <div className="gba:mb-6 gba:relative gba:max-w-sm">
          <Input
            placeholder="Search contract types..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="gba:pl-10"
            data-testid={`${dataTestId}-search-input`}
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
            title="Contract Type Details"
            titleIcon={FileCodeIcon}
            drawerItems={drawerItems}
            extraContent={
              <div className="gba:text-xs gba:text-gray-500 gba:flex gba:items-center gba:justify-center gba:gap-2">
                <Icon icon={TagIcon} className="gba:w-4! gba:h-4!" />
                This contract type can be used to classify employees and job positions.
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
                    <PencilSimpleLineIcon /> Edit
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
