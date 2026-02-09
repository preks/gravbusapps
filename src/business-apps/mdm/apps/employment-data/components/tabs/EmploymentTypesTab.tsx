import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, Spinner, Icon, DataTable, CardContent, Badge, toast } from '@newwork/nw-design-system'
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
  const { t } = useTranslation()
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
      toast.error('Failed to load employment types')
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
          }
        ]
      }
    ]

    return items
  }, [selectedType])

  const handleDelete = async (record: EmploymentType) => {
    await catalogClient.deleteCatalogEntry(EMPLOYMENT_TYPE_CATALOG, EMPLOYMENT_TYPE_VERSION, record.id)
    setEmploymentTypes(prev => prev.filter(employmentType => employmentType.id !== record.id))
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
        description: employmentType.additionalValue1
      })),
    [filteredEmploymentTypes]
  )

  const renderEmploymentTypesTable = () => {
    const columns: ColumnDef<EmploymentType & { description: string }>[] = [
      {
        accessorKey: 'code',
        header: 'Code',
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
        header: 'Name',
        enableSorting: true,
        cell: ({ getValue }) => {
          const name = getValue()
          return (
            <div className="gba:flex gba:items-center gba:w-[150px] gba:md:w-[250px] gba:lg:w-[350px] gba:xl:w-[420px] gba:2xl:w-[420px]">
              <div className="gba:w-full gba:truncate gba:font-semibold" title={name as string}>
                {name as string}
              </div>
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
            <div
              className="gba:flex gba:items-center gba:w-[100px] gba:md:w-[150px] gba:lg:w-[200px] gba:xl:w-[310px]"
              style={{
                width: 'clamp(310px, 45vw, 900px)'
              }}
            >
              <div className="gba:w-full gba:truncate" title={description as string}>
                {(description as string) ?? '-'}
              </div>
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
              employmentType={row.original}
              usedCodes={usedCodes}
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

    return (
      <DataTable
        data={dataTable}
        columns={columns as ColumnDef<(typeof dataTable)[number]>[]}
        sorting={sorting}
        onSortingChange={setSorting}
        enableSorting
        enablePagination
      />
    )
  }

  return (
    <Card>
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
                  <Icon icon={PlusIcon} /> Add Employment Type
                </Button>
              }
              refetch={loadEmploymentTypes}
              accessToken={accessToken}
              prefixDataTestId={prefixDataTestId}
              usedCodes={usedCodes}
            />
          }
          cardTitle={`${t('hr.employment_types', 'Employment Types')} (${employmentTypes.length})`}
          cardDescription="Manage employment types to classify different types of employment relationships."
        />
      )}

      <CardContent>
        <div className="gba:mb-6 gba:pt-4 gba:relative gba:max-w-sm">
          <DebouncedInput
            key="search-input"
            value={searchTerm}
            onChange={value => setSearchTerm(value)}
            placeholder="Search employment types..."
            className="gba:w-full gba:pr-10"
            debounceDelay={300}
            ariaLabel="Search employment types..."
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
            title="Employment Type Details"
            titleIcon={IdentificationCardIcon}
            drawerItems={drawerItems}
            extraContent={
              <div className="gba:text-xs gba:text-gray-500 gba:flex gba:items-center gba:justify-center gba:gap-2">
                <Icon icon={TagIcon} className="gba:!w-4 gba:!h-4" />
                This employment type can be used to classify employees and job profiles.
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
                    <Icon icon={PencilSimpleLineIcon} /> Edit
                  </Button>
                }
                refetch={loadEmploymentTypes}
                accessToken={accessToken}
                prefixDataTestId={prefixDataTestId}
                employmentType={selectedType as EmploymentType & { description: string }}
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
