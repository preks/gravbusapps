import { useCallback, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  DataTable,
  Input,
  Spinner
} from '@newwork/nw-design-system'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import { CardTabHeaderComponent } from '@/business-apps/mdm/apps/generic-components/card'
import CompensationBandForm from '@/business-apps/mdm/forms/compensation-band-form/CompensationBandForm.tsx'
import SheetWrapperComponent from '../../../generic-components/sheet-wrapper/SheetWrapperComponent'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useCompensationBands } from '../../hooks/useCompensationBands.ts'
import { CompensationBand } from '../../utils/CompensationBand.types'
import {
  SortableHeader,
  ActionsColumnHeader,
  BadgeCell,
  CurrencyCell,
  ActionsCell
} from '@/business-apps/mdm/utils/tableUtils'
import { ErrorBoundary } from '@/business-apps/core/every/apps/every-box/components/ErrorBoundary'
import { useUserLocale } from '@/common/locale/useUserLocale'
import {
  FileCodeIcon,
  InfoIcon,
  PencilSimpleLineIcon,
  PlusIcon,
  CurrencyCircleDollarIcon,
  XCircleIcon
} from '@phosphor-icons/react'

export interface CompensationBandsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'CompensationBandsTab'

export default function CompensationBandsTab(context: Readonly<CompensationBandsTabProps>) {
  // ─── Component State ────────────────────────────────────────────────────────
  const [sorting, setSorting] = useState<SortingState>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBand, setSelectedBand] = useState<CompensationBand | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState<string | null>(null)

  // ─── Context & Configuration ───────────────────────────────────────────────
  const { prefixDataTestId, accessToken } = context
  const userLocale = useUserLocale() ?? 'en-US'
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)

  // ─── Data & Actions Hook ───────────────────────────────────────────────────
  const { compensationBands, isLoading, error, refetch, searchCompensationBands, removeCompensationBand } =
    useCompensationBands(context)

  // ─── Computed Values & Effects ─────────────────────────────────────────────
  const usedNames = useMemo(() => compensationBands.map(b => b.name), [compensationBands])

  const filteredBands = useMemo(
    () => (searchTerm ? searchCompensationBands(searchTerm) : compensationBands),
    [searchTerm, searchCompensationBands, compensationBands]
  )

  // Update selected band when data changes
  useEffect(() => {
    if (selectedBand) {
      const updated = compensationBands.find(b => b.id === selectedBand.id)
      if (updated) setSelectedBand(updated)
    }
  }, [compensationBands])

  // ─── Event Handlers ────────────────────────────────────────────────────────
  const formatCurrency = useCallback(
    (amount: number, currencyCode?: string) => {
      return new Intl.NumberFormat(userLocale, {
        style: 'currency',
        currency: currencyCode || 'EUR',
        minimumFractionDigits: 2
      }).format(amount)
    },
    [userLocale]
  )

  const handleDelete = useCallback(
    async (band: CompensationBand) => {
      await removeCompensationBand({ id: band.id, version: band.version })
    },
    [removeCompensationBand]
  )

  const handleView = useCallback((band: CompensationBand) => {
    setSelectedBand(band)
    setIsDrawerOpen(true)
  }, [])

  // ─── Table Configuration ───────────────────────────────────────────────────

  const columns: ColumnDef<CompensationBand>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => SortableHeader({ column, children: 'Name' }),
      enableSorting: true,
      cell: ({ getValue }) => BadgeCell({ value: getValue() as string, variant: 'info' })
    },
    {
      accessorKey: 'minSalary',
      header: ({ column }) => SortableHeader({ column, children: 'Minimum Salary' }),
      enableSorting: true,
      cell: ({ row }) =>
        CurrencyCell({
          amount: row.original.minSalary,
          currencyCode: row.original.currencyCode,
          formatCurrency
        })
    },
    {
      accessorKey: 'standardSalary',
      header: ({ column }) => SortableHeader({ column, children: 'Standard Salary' }),
      enableSorting: true,
      cell: ({ row }) =>
        CurrencyCell({
          amount: row.original.standardSalary,
          currencyCode: row.original.currencyCode,
          formatCurrency
        })
    },
    {
      accessorKey: 'maxSalary',
      header: ({ column }) => SortableHeader({ column, children: 'Maximum Salary' }),
      enableSorting: true,
      cell: ({ row }) =>
        CurrencyCell({
          amount: row.original.maxSalary,
          currencyCode: row.original.currencyCode,
          formatCurrency
        })
    },
    {
      id: 'range',
      header: ({ column }) => SortableHeader({ column, children: 'Range' }),
      enableSorting: true,
      cell: ({ row }) =>
        CurrencyCell({
          amount: row.original.maxSalary - row.original.minSalary,
          currencyCode: row.original.currencyCode,
          formatCurrency
        })
    },
    {
      id: 'actions',
      header: () => ActionsColumnHeader(),
      enableSorting: false,
      cell: ({ row }) =>
        ActionsCell({
          record: row.original,
          dataTestId,
          onView: handleView,
          onEdit: setEditDialogOpen,
          onDelete: handleDelete,
          itemNameGetter: record => record.name,
          itemTitle: 'Compensation Band'
        })
    }
  ]

  // ─── Drawer Configuration ──────────────────────────────────────────────────
  const drawerItems = useMemo(() => {
    if (!selectedBand) return []
    return [
      {
        icon: <InfoIcon />,
        title: 'Basic Information',
        verticalTable: true,
        items: [
          { label: 'Name', value: <Badge variant="info">{selectedBand.name}</Badge> },
          { label: 'Description', value: selectedBand.description ?? '—' },
          { label: 'Currency', value: <Badge variant="default">{selectedBand.currencyCode}</Badge> }
        ]
      },
      {
        icon: <CurrencyCircleDollarIcon />,
        title: 'Salary Information',
        verticalTable: true,
        items: [
          { label: 'Minimum Salary', value: formatCurrency(selectedBand.minSalary, selectedBand.currencyCode) },
          { label: 'Standard Salary', value: formatCurrency(selectedBand.standardSalary, selectedBand.currencyCode) },
          { label: 'Maximum Salary', value: formatCurrency(selectedBand.maxSalary, selectedBand.currencyCode) },
          {
            label: 'Salary Range',
            value: formatCurrency(selectedBand.maxSalary - selectedBand.minSalary, selectedBand.currencyCode)
          }
        ]
      }
    ]
  }, [selectedBand, formatCurrency])

  // ─── Loading & Error States ────────────────────────────────────────────────
  if (error) {
    return (
      <div data-testid={`${prefixDataTestId}-CompensationBandsTab2`} className="gba:p-4">
        <Alert className="gba:w-full gba:!flex gba:justify-between gba:!items-center" variant="destructive">
          <AlertTitle className="gba:flex gba:items-center gba:justify-center gba:gap-2">
            <XCircleIcon className="h-4 w-4" />
            Error Loading Data
          </AlertTitle>
          <AlertDescription>
            <Button size="sm" variant="destructive" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isLoading && compensationBands.length === 0) {
    return (
      <div data-testid={dataTestId} className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spinner />
      </div>
    )
  }

  // ─── Main Render ───────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <Card className="gba:rounded-lg gba:border gba:bg-card gba:text-card-foreground gba:shadow-sm gba:overflow-hidden">
        {!isLoading && (
          <CardTabHeaderComponent
            addButton={
              <ErrorBoundary>
                <CompensationBandForm
                  usedNames={usedNames}
                  childAddButton={
                    <Button variant="default" onClick={e => e.stopPropagation()} data-testid={`${dataTestId}-add-band`}>
                      <PlusIcon /> Add Compensation Band
                    </Button>
                  }
                  prefixDataTestId={dataTestId}
                  accessToken={accessToken}
                  refetch={refetch}
                />
              </ErrorBoundary>
            }
            cardTitle={`Compensation Bands (${compensationBands.length})`}
            cardDescription="Manage compensation bands and salary ranges"
          />
        )}

        <CardContent className="gba:relative">
          <div className="gba:mb-6 gba:relative gba:max-w-sm">
            <Input
              placeholder="Search compensation bands..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              data-testid={`${dataTestId}-search-input`}
            />
          </div>

          {compensationBands.length === 0 && !isLoading ? (
            <div className="gba:text-center gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8">
              <CurrencyCircleDollarIcon className="gba:h-12 gba:w-12 gba:text-gray-400" />
              <p className="gba:font-normal gba:text-gray-500">No compensation bands found</p>
              <div className="gba:mt-2">
                <ErrorBoundary>
                  <CompensationBandForm
                    usedNames={usedNames}
                    childAddButton={
                      <Button
                        variant="default"
                        onClick={e => e.stopPropagation()}
                        data-testid={`${prefixDataTestId}-create-first-band`}
                      >
                        <PlusIcon /> Create First Compensation Band
                      </Button>
                    }
                    prefixDataTestId={`${prefixDataTestId}`}
                    accessToken={accessToken}
                    refetch={refetch}
                  />
                </ErrorBoundary>
              </div>
            </div>
          ) : (
            <ErrorBoundary>
              <DataTable
                data={filteredBands}
                columns={columns}
                sorting={sorting}
                onSortingChange={setSorting}
                enableSorting
                enablePagination
              />
            </ErrorBoundary>
          )}
        </CardContent>

        {selectedBand && (
          <ErrorBoundary>
            <SheetWrapperComponent
              prefixDataTestId={dataTestId}
              isDrawerVisible={isDrawerOpen}
              onOpenChange={openStatus => {
                if (!openStatus) setSelectedBand(null)
                setIsDrawerOpen(openStatus)
              }}
              title="Compensation Band Details"
              titleIcon={FileCodeIcon}
              drawerItems={drawerItems}
              footerButtons={[
                <ErrorBoundary key="edit-form">
                  <CompensationBandForm
                    usedNames={usedNames}
                    childAddButton={
                      <Button data-testid={`${prefixDataTestId || ''}-CompensationBandsTab2-EditButton`}>
                        <PencilSimpleLineIcon /> Edit
                      </Button>
                    }
                    compensationBand={selectedBand}
                    prefixDataTestId={`${prefixDataTestId}`}
                    accessToken={accessToken}
                    refetch={refetch}
                    isDrawerActive={isDrawerOpen}
                    key={selectedBand.id}
                  />
                </ErrorBoundary>
              ]}
            />
          </ErrorBoundary>
        )}
      </Card>

      {/* Edit dialog rendered outside the DataTable so it is never unmounted by table re-renders */}
      {editDialogOpen &&
        (() => {
          const recordToEdit = compensationBands.find(b => b.id === editDialogOpen) ?? null
          if (!recordToEdit) return null
          return (
            <ErrorBoundary>
              <CompensationBandForm
                key={editDialogOpen}
                compensationBand={recordToEdit}
                usedNames={usedNames}
                prefixDataTestId={dataTestId}
                accessToken={accessToken}
                refetch={refetch}
                open={true}
                setOpen={open => setEditDialogOpen(open ? editDialogOpen : null)}
              />
            </ErrorBoundary>
          )
        })()}
    </ErrorBoundary>
  )
}
