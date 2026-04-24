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
import SheetWrapperComponent from '../../../generic-components/sheet-wrapper/SheetWrapperComponent'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { CompensationBandPolicy } from '../../utils/CompensationBandPolicy.types'
import { ErrorBoundary } from '@/business-apps/core/every/apps/every-box/components/ErrorBoundary'
import { CurrencyCircleDollarIcon, InfoIcon, PencilSimpleLineIcon, PlusIcon, XCircleIcon } from '@phosphor-icons/react'
import useCompensationBandPolicies from '@/business-apps/mdm/apps/compensation-data/hooks/useCompensationBandPolicies.ts'
import CompensationBandPolicyForm from '@/business-apps/mdm/forms/compensation-band-policy-form/CompensationBandPolicyForm.tsx'
import {
  SortableHeader,
  ActionsColumnHeader,
  BadgeCell,
  TextCell,
  ActionsCell
} from '@/business-apps/mdm/utils/tableUtils'

export interface CompensationBandPolicyTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'CompensationBandPolicyTab'

export default function CompensationBandPolicyTab(context: Readonly<CompensationBandPolicyTabProps>) {
  // ─── Component State ────────────────────────────────────────────────────────
  const [sorting, setSorting] = useState<SortingState>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPolicy, setSelectedPolicy] = useState<CompensationBandPolicy | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState<string | null>(null)

  // ─── Context & Configuration ───────────────────────────────────────────────
  const { prefixDataTestId, accessToken } = context
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)

  // ─── Data & Actions Hook ───────────────────────────────────────────────────
  const {
    compensationBandPolicies,
    isLoading,
    error,
    refetch,
    searchCompensationBandPolicies,
    removeCompensationBandPolicy,
    compensationBands,
    jobLevels,
    jobFamilies,
    geoZones,
    referenceDataLoading
  } = useCompensationBandPolicies(context)

  // ─── Computed Values & Effects ─────────────────────────────────────────────
  const filteredPolicies = useMemo(
    () => (searchTerm ? searchCompensationBandPolicies(searchTerm) : compensationBandPolicies),
    [searchTerm, searchCompensationBandPolicies, compensationBandPolicies]
  )

  // Update selected policy when data changes
  useEffect(() => {
    if (selectedPolicy) {
      const updated = compensationBandPolicies.find(p => p.id === selectedPolicy.id)
      if (updated) setSelectedPolicy(updated)
    }
  }, [compensationBandPolicies])

  // ─── Event Handlers ────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    async (policy: CompensationBandPolicy) => {
      await removeCompensationBandPolicy({ id: policy.id, version: policy.version })
    },
    [removeCompensationBandPolicy]
  )

  const handleView = useCallback((policy: CompensationBandPolicy) => {
    setSelectedPolicy(policy)
    setIsDrawerOpen(true)
  }, [])

  // ─── Table Configuration ───────────────────────────────────────────────────
  const columns: ColumnDef<CompensationBandPolicy>[] = [
    {
      accessorKey: 'compensationBand',
      header: ({ column }) => SortableHeader({ column, children: 'Compensation Band' }),
      enableSorting: true,
      sortingFn: (a, b) => {
        if (!a.original.compensationBand || !b.original.compensationBand) return 0
        return a.original.compensationBand?.name.localeCompare(b.original.compensationBand?.name)
      },
      cell: ({ row }) => BadgeCell({ value: row.original.compensationBand, variant: 'info' })
    },
    {
      id: 'jobLevel',
      accessorKey: 'jobLevel',
      header: ({ column }) => SortableHeader({ column, children: 'Job Level' }),
      enableSorting: true,
      sortingFn: (a, b) => {
        if (!a.original.jobLevel || !b.original.jobLevel) return 0
        return a.original.jobLevel?.name.localeCompare(b.original.jobLevel?.name)
      },
      cell: ({ row }) => BadgeCell({ value: row.original.jobLevel, variant: 'secondary' })
    },
    {
      id: 'jobFamily',
      accessorKey: 'jobFamily',
      header: ({ column }) => SortableHeader({ column, children: 'Job Family' }),
      enableSorting: true,
      sortingFn: (a, b) => {
        if (!a.original.jobFamily || !b.original.jobFamily) return 0
        return a.original.jobFamily?.name.localeCompare(b.original.jobFamily?.name)
      },
      cell: ({ row }) => BadgeCell({ value: row.original.jobFamily, variant: 'secondary' })
    },
    {
      id: 'geoZone',
      accessorKey: 'geoZone',
      header: ({ column }) => SortableHeader({ column, children: 'Geo Zone' }),
      enableSorting: true,
      sortingFn: (a, b) => {
        if (!a.original.geoZone || !b.original.geoZone) return 0
        return a.original.geoZone?.name.localeCompare(b.original.geoZone?.name)
      },
      cell: ({ row }) => BadgeCell({ value: row.original.geoZone, variant: 'secondary' })
    },
    {
      accessorKey: 'priority',
      header: ({ column }) => SortableHeader({ column, children: 'Priority' }),
      enableSorting: true,
      cell: ({ getValue }) => TextCell({ value: getValue() as number, className: 'gba:font-normal' })
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
          itemNameGetter: record => record.compensationBand?.name || record.id,
          itemTitle: 'Compensation Band Policy'
        })
    }
  ]

  // ─── Drawer Configuration ──────────────────────────────────────────────────
  const drawerItems = useMemo(() => {
    if (!selectedPolicy) return []
    return [
      {
        icon: <InfoIcon />,
        title: 'Policy Assignment',
        verticalTable: true,
        items: [
          {
            label: 'Compensation Band',
            value: selectedPolicy.compensationBand ? (
              <Badge variant="info">{selectedPolicy.compensationBand.name}</Badge>
            ) : (
              '—'
            )
          },
          {
            label: 'Job Level',
            value: selectedPolicy.jobLevel ? (
              <Badge variant="outline">
                {selectedPolicy.jobLevel.name} ({selectedPolicy.jobLevel.code}) - Level{' '}
                {selectedPolicy.jobLevel.hierarchyOrder}
              </Badge>
            ) : (
              '—'
            )
          },
          {
            label: 'Job Family',
            value: selectedPolicy.jobFamily ? (
              <Badge variant="outline">
                {selectedPolicy.jobFamily.name} ({selectedPolicy.jobFamily.code})
              </Badge>
            ) : (
              '—'
            )
          },
          {
            label: 'Geo Zone',
            value: selectedPolicy.geoZone ? <Badge variant="outline">{selectedPolicy.geoZone.name}</Badge> : '—'
          },
          {
            label: 'Priority',
            value: <Badge variant="secondary">{selectedPolicy.priority}</Badge>
          },
          {
            label: 'Status',
            value: (
              <Badge variant={selectedPolicy.isActive ? 'success' : 'destructive'}>
                {selectedPolicy.isActive ? 'Active' : 'Inactive'}
              </Badge>
            )
          }
        ]
      }
    ]
  }, [selectedPolicy])

  // ─── Loading & Error States ────────────────────────────────────────────────
  if (error) {
    return (
      <div data-testid={`${prefixDataTestId}-CompensationBandPolicyTab`} className="gba:p-4">
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

  if ((isLoading || referenceDataLoading) && compensationBandPolicies.length === 0) {
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
                <CompensationBandPolicyForm
                  childAddButton={
                    <Button
                      variant="default"
                      onClick={e => e.stopPropagation()}
                      data-testid={`${dataTestId}-add-policy`}
                    >
                      <PlusIcon /> Add Compensation Band Policy
                    </Button>
                  }
                  prefixDataTestId={dataTestId}
                  accessToken={accessToken}
                  refetch={refetch}
                  compensationBands={compensationBands}
                  jobLevels={jobLevels}
                  jobFamilies={jobFamilies}
                  geoZones={geoZones}
                />
              </ErrorBoundary>
            }
            cardTitle={`Compensation Band Policies (${compensationBandPolicies.length})`}
            cardDescription="Manage compensation band policy assignments"
          />
        )}

        <CardContent className="gba:relative">
          <div className="gba:mb-6 gba:relative gba:max-w-sm">
            <Input
              placeholder="Search compensation band policies..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              data-testid={`${dataTestId}-search-input`}
            />
          </div>

          {compensationBandPolicies.length === 0 && !isLoading ? (
            <div className="gba:text-center gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8">
              <CurrencyCircleDollarIcon className="gba:h-12 gba:w-12 gba:text-gray-400" />
              <p className="gba:font-normal gba:text-gray-500">No compensation band policies found</p>
              <div className="gba:mt-2">
                <ErrorBoundary>
                  <CompensationBandPolicyForm
                    childAddButton={
                      <Button
                        variant="default"
                        onClick={e => e.stopPropagation()}
                        data-testid={`${prefixDataTestId}-create-first-policy`}
                      >
                        <PlusIcon /> Create First Compensation Band Policy
                      </Button>
                    }
                    prefixDataTestId={`${prefixDataTestId}`}
                    accessToken={accessToken}
                    refetch={refetch}
                    compensationBands={compensationBands}
                    jobLevels={jobLevels}
                    jobFamilies={jobFamilies}
                    geoZones={geoZones}
                  />
                </ErrorBoundary>
              </div>
            </div>
          ) : (
            <ErrorBoundary>
              <DataTable
                data={filteredPolicies}
                columns={columns}
                sorting={sorting}
                onSortingChange={setSorting}
                enableSorting
                enablePagination
              />
            </ErrorBoundary>
          )}
        </CardContent>

        {selectedPolicy && (
          <ErrorBoundary>
            <SheetWrapperComponent
              prefixDataTestId={dataTestId}
              isDrawerVisible={isDrawerOpen}
              onOpenChange={openStatus => {
                if (!openStatus) setSelectedPolicy(null)
                setIsDrawerOpen(openStatus)
              }}
              title="Compensation Band Policy Details"
              titleIcon={CurrencyCircleDollarIcon}
              drawerItems={drawerItems}
              footerButtons={[
                <ErrorBoundary key="edit-form">
                  <CompensationBandPolicyForm
                    childAddButton={
                      <Button data-testid={`${prefixDataTestId || ''}-CompensationBandPolicyTab-EditButton`}>
                        <PencilSimpleLineIcon /> Edit
                      </Button>
                    }
                    compensationBandPolicy={selectedPolicy}
                    prefixDataTestId={`${prefixDataTestId}`}
                    accessToken={accessToken}
                    refetch={refetch}
                    isDrawerActive={isDrawerOpen}
                    compensationBands={compensationBands}
                    jobLevels={jobLevels}
                    jobFamilies={jobFamilies}
                    geoZones={geoZones}
                    key={selectedPolicy.id}
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
          const recordToEdit = compensationBandPolicies.find(p => p.id === editDialogOpen) ?? null
          if (!recordToEdit) return null
          return (
            <ErrorBoundary>
              <CompensationBandPolicyForm
                key={editDialogOpen}
                compensationBandPolicy={recordToEdit}
                compensationBands={compensationBands}
                jobLevels={jobLevels}
                jobFamilies={jobFamilies}
                geoZones={geoZones}
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
