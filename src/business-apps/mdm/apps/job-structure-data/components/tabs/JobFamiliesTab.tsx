import { ErrorBoundary } from '@/business-apps/core/every/apps/every-box/components/ErrorBoundary'
import { CardTabHeaderComponent } from '@/business-apps/mdm/apps/generic-components/card'
import useJobFamilies from '@/business-apps/mdm/apps/job-structure-data/hooks/useJobFamilies.ts'
import JobFamilyForm from '@/business-apps/mdm/forms/job-family-form/JobFamilyForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
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
import { FolderSimpleIcon, InfoIcon, PencilSimpleLineIcon, PlusIcon, XCircleIcon } from '@phosphor-icons/react'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useState } from 'react'
import SheetWrapperComponent from '../../../generic-components/sheet-wrapper/SheetWrapperComponent'
import { JobFamily } from '../../utils/JobFamily.types'
import {
  SortableHeader,
  ActionsColumnHeader,
  BadgeCell,
  TextCell,
  DescriptionCell,
  ActionsCell
} from '@/business-apps/mdm/utils/tableUtils'

export interface JobFamiliesTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'JobFamiliesTab'

export default function JobFamiliesTab(context: Readonly<JobFamiliesTabProps>) {
  // ─── Component State ────────────────────────────────────────────────────────
  const [sorting, setSorting] = useState<SortingState>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFamily, setSelectedFamily] = useState<JobFamily | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState<string | null>(null)

  // ─── Context & Configuration ───────────────────────────────────────────────
  const { prefixDataTestId, accessToken } = context
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)

  // ─── Data & Actions Hook ───────────────────────────────────────────────────
  const { jobFamilies, isLoading, error, refetch, searchJobFamilies, removeJobFamily } = useJobFamilies(context)

  // ─── Computed Values & Effects ─────────────────────────────────────────────
  const usedCodes = useMemo(() => jobFamilies.map(f => f.code), [jobFamilies])

  const filteredFamilies = useMemo(
    () => (searchTerm ? searchJobFamilies(searchTerm) : jobFamilies),
    [searchTerm, searchJobFamilies, jobFamilies]
  )

  // Update selected family when data changes
  useEffect(() => {
    if (selectedFamily) {
      const updated = jobFamilies.find(f => f.id === selectedFamily.id)
      if (updated) setSelectedFamily(updated)
    }
  }, [jobFamilies])

  // ─── Event Handlers ────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    async (family: JobFamily) => {
      await removeJobFamily({ id: family.id, version: family.version })
    },
    [removeJobFamily]
  )

  const handleView = useCallback((family: JobFamily) => {
    setSelectedFamily(family)
    setIsDrawerOpen(true)
  }, [])

  // ─── Table Configuration ───────────────────────────────────────────────────
  const columns: ColumnDef<JobFamily>[] = [
    {
      accessorKey: 'code',
      header: ({ column }) => SortableHeader({ column, children: 'Code' }),
      enableSorting: true,
      cell: ({ getValue }) => BadgeCell({ value: getValue() as string, variant: 'info' })
    },
    {
      accessorKey: 'name',
      header: ({ column }) => SortableHeader({ column, children: 'Name' }),
      enableSorting: true,
      cell: ({ getValue }) => TextCell({ value: getValue() as string, className: 'gba:font-semibold' })
    },
    {
      accessorKey: 'description',
      header: 'Description',
      enableSorting: false,
      cell: ({ getValue }) => DescriptionCell({ value: getValue() as string | undefined })
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
          itemTitle: 'Job Family'
        })
    }
  ]

  // ─── Drawer Configuration ──────────────────────────────────────────────────
  const drawerItems = useMemo(() => {
    if (!selectedFamily) return []
    return [
      {
        icon: <InfoIcon />,
        title: 'Basic Information',
        verticalTable: true,
        items: [
          { label: 'Name', value: selectedFamily.name },
          { label: 'Code', value: <Badge variant="info">{selectedFamily.code}</Badge> },
          { label: 'Description', value: selectedFamily.description || '—' },
          {
            label: 'Status',
            value: (
              <Badge variant={selectedFamily.isActive ? 'success' : 'destructive'}>
                {selectedFamily.isActive ? 'Active' : 'Inactive'}
              </Badge>
            )
          }
        ]
      }
    ]
  }, [selectedFamily])

  // ─── Loading & Error States ────────────────────────────────────────────────
  if (error) {
    return (
      <div data-testid={`${prefixDataTestId}-JobFamiliesTab2`} className="gba:p-4">
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

  if (isLoading && jobFamilies.length === 0) {
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
                <JobFamilyForm
                  usedCodes={usedCodes}
                  childAddButton={
                    <Button
                      variant="default"
                      onClick={e => e.stopPropagation()}
                      data-testid={`${dataTestId}-add-family`}
                    >
                      <PlusIcon /> Add Job Family
                    </Button>
                  }
                  prefixDataTestId={dataTestId}
                  accessToken={accessToken}
                  refetch={refetch}
                />
              </ErrorBoundary>
            }
            cardTitle={`Job Families (${jobFamilies.length})`}
            cardDescription="Manage job families and their classifications"
          />
        )}

        <CardContent className="gba:relative">
          <div className="gba:mb-6 gba:relative gba:max-w-sm">
            <Input
              placeholder="Search job families..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              data-testid={`${dataTestId}-search-input`}
            />
          </div>

          {jobFamilies.length === 0 && !isLoading ? (
            <div className="gba:text-center gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8">
              <FolderSimpleIcon className="gba:h-12 gba:w-12 gba:text-gray-400" />
              <p className="gba:font-normal gba:text-gray-500">No job families found</p>
              <div className="gba:mt-2">
                <ErrorBoundary>
                  <JobFamilyForm
                    usedCodes={usedCodes}
                    childAddButton={
                      <Button
                        variant="default"
                        onClick={e => e.stopPropagation()}
                        data-testid={`${prefixDataTestId}-create-first-family`}
                      >
                        <PlusIcon /> Create First Job Family
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
                data={filteredFamilies}
                columns={columns}
                sorting={sorting}
                onSortingChange={setSorting}
                enableSorting
                enablePagination
              />
            </ErrorBoundary>
          )}
        </CardContent>

        {selectedFamily && (
          <ErrorBoundary>
            <SheetWrapperComponent
              prefixDataTestId={dataTestId}
              isDrawerVisible={isDrawerOpen}
              onOpenChange={openStatus => {
                if (!openStatus) setSelectedFamily(null)
                setIsDrawerOpen(openStatus)
              }}
              title="Job Family Details"
              titleIcon={FolderSimpleIcon}
              drawerItems={drawerItems}
              footerButtons={[
                <ErrorBoundary key="edit-form">
                  <JobFamilyForm
                    usedCodes={usedCodes}
                    childAddButton={
                      <Button data-testid={`${prefixDataTestId || ''}-JobFamiliesTab2-EditButton`}>
                        <PencilSimpleLineIcon /> Edit
                      </Button>
                    }
                    jobFamily={selectedFamily}
                    prefixDataTestId={`${prefixDataTestId}`}
                    accessToken={accessToken}
                    refetch={refetch}
                    isDrawerActive={isDrawerOpen}
                    key={selectedFamily.id}
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
          const recordToEdit = jobFamilies.find(f => f.id === editDialogOpen) ?? null
          if (!recordToEdit) return null
          return (
            <ErrorBoundary>
              <JobFamilyForm
                key={editDialogOpen}
                jobFamily={recordToEdit}
                usedCodes={usedCodes}
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
