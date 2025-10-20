import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Card,
  CardContent,
  Button,
  Input,
  Spinner,
  Alert,
  AlertDescription,
  AlertTitle,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetClose,
  DataTable
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useUserLocale } from '@/common/locale/useUserLocale'
import { useCompensationDataIntegration } from '../../hooks/useCompensationDataIntegration'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { PayGrade } from './PayGradesTab'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import CardTabHeaderComponent from '../../../generic-components/card'
import PayGradeForm from '@/business-apps/mdm/forms/pay-grade-form'
import { DeleteButton } from '../../../generic-components/delete-button/DeleteButton'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import {
  EyeIcon,
  ArrowsDownUpIcon,
  PlusIcon,
  PencilSimpleLineIcon,
  CurrencyCircleDollarIcon,
  XCircleIcon,
  InfoIcon
} from '@phosphor-icons/react'
import { VerticalTable } from '../../../generic-components/table/VerticalTable'
import type { PayGradeVisualization } from '../../types'

const DATA_TEST_ID_PREFIX = 'CompensationBandsTab'

export interface CompensationBandsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const CompensationBandsTab: React.FC<CompensationBandsTabProps> = context => {
  const { prefixDataTestId } = context
  const userLocale = useUserLocale() ?? 'en-US'
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)

  // Use real data integration
  const { payGrades, isLoading, error, refetch } = useCompensationDataIntegration(context)
  const [selectedBand, setSelectedBand] = useState<PayGrade | null>(null)
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedRows, setSelectedRows] = useState<PayGradeVisualization[]>([])

  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  useEffect(() => {
    if (selectedBand) {
      const updatedSelectedBand = payGrades.find(payGrade => payGrade.id === selectedBand.id)

      if (updatedSelectedBand) {
        setSelectedBand(updatedSelectedBand)
      }
    }
  }, [payGrades])

  const formatCurrency = useCallback(
    (amount: number, currency?: { id: string; value: string } | string) => {
      let currencyCode = typeof currency === 'string' ? currency : currency?.id || 'EUR'

      // Extract currency code from format like "Currency:v1:EUR" -> "EUR"
      if (currencyCode.includes(':')) {
        const parts = currencyCode.split(':')
        currencyCode = parts[parts.length - 1] // Get the last part
      }

      return new Intl.NumberFormat(userLocale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2
      }).format(amount)
    },
    [userLocale]
  )

  // Filter data based on search term
  const filteredData = useMemo(() => {
    return payGrades.filter(band => band.name.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [payGrades, searchTerm])

  const handleRowClick = useCallback((record: PayGrade) => {
    setSelectedBand(record)
    setDrawerVisible(true)
  }, [])

  const handleDeletePayGrade = async (payGrade: PayGrade) => {
    await restClient.post(
      '/employee/saveCompensationBand',
      {
        changeMode: 'DELETE',
        compensationBand: {
          id: payGrade.id,
          version: payGrade.version
        }
      },
      {
        headers: { Authorization: `Bearer ${context.accessToken}` }
      }
    )

    await refetch()
  }

  const drawerItems = useMemo(() => {
    if (!selectedBand) return []

    return [
      {
        icon: <InfoIcon />,
        title: 'Basic Information',
        items: [
          {
            label: 'Name',
            value: selectedBand.name
          },
          {
            label: 'Pay Grade',
            value: selectedBand.payGrade
          },
          {
            label: 'Currency',
            value:
              typeof selectedBand.currency === 'string'
                ? selectedBand.currency
                : selectedBand.currency?.value || selectedBand.currency?.id || '-'
          }
        ]
      },
      {
        icon: <InfoIcon />,
        title: 'Salary Information',
        items: [
          {
            label: 'Minimum Salary',
            value: formatCurrency(selectedBand.minSalary, selectedBand.currency)
          },
          {
            label: 'Standard Salary',
            value: formatCurrency(selectedBand.standardSalary, selectedBand.currency)
          },
          {
            label: 'Maximum Salary',
            value: formatCurrency(selectedBand.maxSalary, selectedBand.currency)
          },
          {
            label: 'Salary Range',
            value: formatCurrency(selectedBand.maxSalary - selectedBand.minSalary, selectedBand.currency)
          }
        ]
      }
    ]
  }, [selectedBand])

  const dataTable = useMemo(() => filteredData.map(compensationBand => compensationBand), [filteredData])

  const renderCompensationBandsTable = () => {
    const columns: ColumnDef<PayGrade>[] = [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Name
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const name = getValue()
          return (
            <div className="gba:flex gba:items-center">
              <div className="gba:font-semibold">{name as string}</div>
            </div>
          )
        }
      },
      {
        accessorKey: 'minSalary',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Minimum Salary
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const minSalary = row.original.minSalary
          const currency = row.original.currency
          return formatCurrency(minSalary, currency)
        }
      },
      {
        accessorKey: 'standardSalary',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Standard Salary
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const standardSalary = row.original.standardSalary
          const currency = row.original.currency
          return formatCurrency(standardSalary, currency)
        }
      },
      {
        accessorKey: 'maxSalary',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Maximum Salary
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const maxSalary = row.original.maxSalary
          const currency = row.original.currency
          return formatCurrency(maxSalary, currency)
        }
      },
      {
        accessorKey: 'range',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Range
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const minSalary = row.original.minSalary
          const maxSalary = row.original.maxSalary
          const currency = row.original.currency
          return formatCurrency(maxSalary - minSalary, currency)
        }
      },
      {
        id: 'actions',
        header: () => <div className="gba:flex gba:w-[115px]">Actions</div>,
        enableSorting: false,
        enableHiding: true,
        cell: ({ row }) => {
          return (
            <div className="gba:flex gba:items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRowClick(row.original)}
                data-testid={`${dataTestId}-view-function-${row.original.id}`}
              >
                <EyeIcon className="gba:h-4 gba:w-4" />
              </Button>

              <PayGradeForm
                prefixDataTestId={prefixDataTestId}
                accessToken={context.accessToken}
                refetch={refetch}
                childAddButton={
                  <Button size="sm" variant="ghost">
                    <PencilSimpleLineIcon className="h-4 w-4" />
                  </Button>
                }
                payGradeLevel={row.original.payGrade}
                payGrade={row.original}
              />

              <DeleteButton
                onDelete={() => handleDeletePayGrade(row.original)}
                itemName={row.original.name}
                itemTitle={'Job Function'}
              />
            </div>
          )
        }
      }
    ]

    return (
      <DataTable
        data={dataTable}
        columns={columns}
        sorting={sorting}
        onSortingChange={setSorting}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        enableSorting
        enableSelection
        enablePagination
      />
    )
  }

  if (filteredData.length === 0 && isLoading) {
    return (
      <div data-testid={`${dataTestId}`} className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div data-testid={`${dataTestId}`} className="gba:p-4">
        <Alert variant="destructive">
          <XCircleIcon className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>
            <div className="gba:flex gba:justify-between gba:items-center">
              <span>{error}</span>
              <Button size="sm" variant="destructive" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <>
      <Card
        data-testid={`${dataTestId}-CompensationBands`}
        className="gba:rounded-lg gba:border gba:bg-card gba:text-card-foreground gba:shadow-sm gba:overflow-hidden"
      >
        <CardTabHeaderComponent
          addButton={
            <PayGradeForm
              prefixDataTestId={prefixDataTestId}
              accessToken={context.accessToken}
              refetch={refetch}
              childAddButton={
                <Button className="gba:flex gba:justify-center gba:items-center">
                  <PlusIcon /> Add Compensation Band
                </Button>
              }
              payGradeLevel={payGrades.length + 1}
            />
          }
          cardTitle="Compensation Bands"
          cardDescription="Manage compensation bands and salary ranges for different pay
                grades"
        />

        <CardContent>
          <div className="gba:mb-6 gba:relative gba:max-w-sm">
            <Input
              placeholder="Search compensation bands..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="gba:pl-10"
              data-testid={`${dataTestId}-search-input`}
            />
          </div>
          {renderCompensationBandsTable()}
        </CardContent>
      </Card>

      {/* Compensation Band Details Sheet */}
      <Sheet
        title="Compensation Band Details"
        open={drawerVisible}
        onOpenChange={openStatus => {
          if (!openStatus) {
            setSelectedBand(null)
          }
          setDrawerVisible(openStatus)
        }}
      >
        <style jsx>{`
          [data-slot='sheet-overlay'] {
            z-index: 1000 !important;
          }
          [data-slot='sheet-content'] {
            z-index: 1001 !important;
          }
          [data-slot='select-content'] {
            z-index: 1002 !important;
          }
        `}</style>
        <SheetContent side="right" data-testid={`${dataTestId}-details-sheet`}>
          <SheetHeader>
            <div className="gba:flex gba:items-center gba:gap-2">
              <CurrencyCircleDollarIcon className="h-5 w-5" />
              <SheetTitle>Compensation Band Details</SheetTitle>
            </div>
          </SheetHeader>

          <div className="gba:flex-1 gba:overflow-auto gba:px-4 gba:pb-4">
            {selectedBand && (
              <div className="gba:space-y-6">
                {drawerItems.map((item, index) => {
                  return (
                    <VerticalTable icon={item.icon} title={item.title} items={item.items} key={item.title + index} />
                  )
                })}
              </div>
            )}
          </div>

          <SheetFooter>
            <div className="gba:flex gba:justify-end gba:gap-2">
              <PayGradeForm
                prefixDataTestId={prefixDataTestId}
                accessToken={context.accessToken}
                refetch={refetch}
                childAddButton={
                  <Button>
                    <PencilSimpleLineIcon className="h-4 w-4 gba:mr-2" /> Edit
                  </Button>
                }
                payGradeLevel={selectedBand?.payGrade}
                payGrade={selectedBand!}
                isDrawerActive={true}
              />
              <SheetClose asChild>
                <Button variant="outline">Close</Button>
              </SheetClose>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}

export { CompensationBandsTab }
