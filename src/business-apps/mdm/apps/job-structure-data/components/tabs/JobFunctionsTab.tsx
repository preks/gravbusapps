import { useEffect, useMemo, useState } from 'react'
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
import { ErrorBoundary } from '@/business-apps/core/every/apps/every-box/components/ErrorBoundary'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import { CardTabHeaderComponent } from '@/business-apps/mdm/apps/generic-components/card'
import JobFunctionForm from '@/business-apps/mdm/forms/job-function-form/JobFunctionForm'
import SheetWrapperComponent from '../../../generic-components/sheet-wrapper/SheetWrapperComponent'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import {
  BriefcaseIcon,
  FileCodeIcon,
  InfoIcon,
  PencilSimpleLineIcon,
  PlusIcon,
  XCircleIcon
} from '@phosphor-icons/react'
import { useJobFunctions } from '@/business-apps/mdm/apps/job-structure-data/hooks/useJobFunctions.ts'
import { JobFunction } from '@/business-apps/mdm/apps/job-structure-data/utils/JobFunction.types.ts'
import {
  SortableHeader,
  ActionsColumnHeader,
  BadgeCell,
  TextCell,
  DescriptionCell,
  StatusCell,
  ActionsCell
} from '@/business-apps/mdm/utils/tableUtils'

export interface JobFunctionsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'JobFunctionsTab'

export default function JobFunctionsTab(context: Readonly<JobFunctionsTabProps>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFunction, setSelectedFunction] = useState<JobFunction | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState<string | null>(null)

  const { prefixDataTestId, accessToken } = context
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)

  const { jobFunctions, jobFamilies, isLoading, error, refetch, searchJobFunctions, removeJobFunction } =
    useJobFunctions(context)

  // Keep drawer in sync after refetch
  useEffect(() => {
    if (selectedFunction) {
      const updated = jobFunctions.find(f => f.id === selectedFunction.id)
      if (updated) setSelectedFunction(updated)
    }
  }, [jobFunctions])

  const usedCodes = useMemo(() => jobFunctions.map(f => f.code ?? '-'), [jobFunctions])

  const filteredFunctions = useMemo(
    () => (searchTerm ? searchJobFunctions(searchTerm) : jobFunctions),
    [searchTerm, searchJobFunctions, jobFunctions]
  )

  const handleDelete = async (fn: JobFunction) => {
    await removeJobFunction({ id: fn.id, version: fn.version ?? 0 })
    await refetch()
  }

  const handleView = (fn: JobFunction) => {
    setSelectedFunction(fn)
    setIsDrawerOpen(true)
  }

  const columns: ColumnDef<JobFunction>[] = [
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
      id: 'jobFamily',
      accessorKey: 'jobFamily',
      header: ({ column }) => SortableHeader({ column, children: 'Job Family' }),
      enableSorting: true,
      sortingFn: (a, b) => {
        if (!a.original.jobFamily || !b.original.jobFamily) return 1
        return a.original.jobFamily?.name.localeCompare(b.original.jobFamily?.name)
      },
      cell: ({ row }) => BadgeCell({ value: row.original.jobFamily, variant: 'secondary' })
    },
    {
      accessorKey: 'description',
      header: 'Description',
      enableSorting: false,
      cell: ({ getValue }) => DescriptionCell({ value: getValue() as string | undefined })
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      enableSorting: false,
      cell: ({ getValue }) => StatusCell({ isActive: getValue() as boolean })
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
          itemNameGetter: record => record.name ?? '',
          itemTitle: 'Job Function'
        })
    }
  ]

  const drawerItems = useMemo(() => {
    if (!selectedFunction) return []
    return [
      {
        icon: <InfoIcon />,
        title: 'Basic Information',
        verticalTable: true,
        items: [
          { label: 'Name', value: selectedFunction.name },
          { label: 'Code', value: <Badge variant="info">{selectedFunction.code}</Badge> },
          { label: 'Description', value: selectedFunction.description ?? '—' },
          {
            label: 'Status',
            value: (
              <Badge variant={selectedFunction.isActive ? 'success' : 'destructive'}>
                {selectedFunction.isActive ? 'Active' : 'Inactive'}
              </Badge>
            )
          }
        ]
      },
      {
        icon: <InfoIcon />,
        title: 'Classification',
        verticalTable: true,
        items: [
          {
            label: 'Job Family',
            value: selectedFunction.jobFamily ? (
              <Badge variant="secondary">
                {selectedFunction.jobFamily.name} ({selectedFunction.jobFamily.code})
              </Badge>
            ) : (
              '—'
            )
          }
        ]
      }
    ]
  }, [selectedFunction])

  if (error) {
    return (
      <div data-testid={`${prefixDataTestId}-JobFunctionsTab2`} className="gba:p-4">
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

  if (isLoading && jobFunctions.length === 0) {
    return (
      <div data-testid={dataTestId} className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spinner />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Card className="gba:rounded-lg gba:border gba:bg-card gba:text-card-foreground gba:shadow-sm gba:overflow-hidden">
        {!isLoading && (
          <CardTabHeaderComponent
            addButton={
              <ErrorBoundary>
                <JobFunctionForm
                  usedCodes={usedCodes}
                  childAddButton={
                    <Button
                      variant="default"
                      onClick={e => e.stopPropagation()}
                      data-testid={`${dataTestId}-add-function`}
                    >
                      <PlusIcon /> Add Job Function
                    </Button>
                  }
                  prefixDataTestId={dataTestId}
                  // loading={isLoading}
                  accessToken={accessToken}
                  refetch={refetch}
                  jobFamilies={jobFamilies}
                />
              </ErrorBoundary>
            }
            cardTitle={`Job Functions (${jobFunctions.length})`}
            cardDescription="Manage job functions and their associated job families"
          />
        )}

        <CardContent className="gba:relative">
          <div className="gba:mb-6 gba:relative gba:max-w-sm">
            <Input
              placeholder="Search job functions..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              data-testid={`${dataTestId}-search-input`}
            />
          </div>

          {jobFunctions.length === 0 && !isLoading ? (
            <div className="gba:text-center gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8">
              <BriefcaseIcon className="gba:h-12 gba:w-12 gba:text-gray-400" />
              <p className="gba:font-normal gba:text-gray-500">No job functions found</p>
              <div className="gba:mt-2">
                <ErrorBoundary>
                  <JobFunctionForm
                    usedCodes={usedCodes}
                    childAddButton={
                      <Button
                        variant="default"
                        onClick={e => e.stopPropagation()}
                        data-testid={`${prefixDataTestId}-create-first-function`}
                      >
                        <PlusIcon /> Create First Job Function
                      </Button>
                    }
                    prefixDataTestId={`${prefixDataTestId}`}
                    // loading={isLoading}
                    accessToken={accessToken}
                    refetch={refetch}
                    jobFamilies={jobFamilies}
                  />
                </ErrorBoundary>
              </div>
            </div>
          ) : (
            <ErrorBoundary>
              <DataTable
                data={filteredFunctions}
                columns={columns}
                sorting={sorting}
                onSortingChange={setSorting}
                enableSorting
                enablePagination
              />
            </ErrorBoundary>
          )}
        </CardContent>

        {selectedFunction && (
          <ErrorBoundary>
            <SheetWrapperComponent
              prefixDataTestId={dataTestId}
              isDrawerVisible={isDrawerOpen}
              onOpenChange={openStatus => {
                if (!openStatus) setSelectedFunction(null)
                setIsDrawerOpen(openStatus)
              }}
              title="Job Function Details"
              titleIcon={FileCodeIcon}
              drawerItems={drawerItems}
              footerButtons={[
                <ErrorBoundary key="edit-form">
                  <JobFunctionForm
                    usedCodes={usedCodes}
                    childAddButton={
                      <Button data-testid={`${prefixDataTestId || ''}-JobFunctionsTab2-EditButton`}>
                        <PencilSimpleLineIcon /> Edit
                      </Button>
                    }
                    jobFunction={selectedFunction}
                    prefixDataTestId={`${prefixDataTestId}`}
                    // loading={isLoading}
                    accessToken={accessToken}
                    refetch={refetch}
                    isDrawerActive={isDrawerOpen}
                    jobFamilies={jobFamilies}
                    key={selectedFunction.id}
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
          const recordToEdit = jobFunctions.find(l => l.id === editDialogOpen) ?? null
          if (!recordToEdit) return null
          return (
            <ErrorBoundary>
              <JobFunctionForm
                key={editDialogOpen}
                jobFunction={recordToEdit}
                jobFamilies={jobFamilies}
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
