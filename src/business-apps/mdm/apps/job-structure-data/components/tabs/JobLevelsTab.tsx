import JobLevelForm from '@/business-apps/mdm/forms/job-level-form'
import { useCallback, useMemo, useState } from 'react'
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
import { useJobLevels } from '../../hooks/useJobLevels'
import { JobLevel } from '../../utils/JobLevel.types'
import {
  SortableHeader,
  BadgeCell,
  TextCell,
  StatusCell,
  ActionsColumnHeader,
  HierarchyOrderCell,
  ActionsCell,
  DescriptionCell
} from '@/business-apps/mdm/utils/tableUtils'
import { ErrorBoundary } from '@/business-apps/core/every/apps/every-box/components/ErrorBoundary'
import {
  FileCodeIcon,
  InfoIcon,
  ListBulletsIcon,
  PencilSimpleLineIcon,
  PlusIcon,
  XCircleIcon
} from '@phosphor-icons/react'

export interface JobLevelsTab2Props extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'JobLevelsTab'

export default function JobLevelsTab(context: Readonly<JobLevelsTab2Props>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLevel, setSelectedLevel] = useState<JobLevel | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState<string | null>(null)

  const { prefixDataTestId, accessToken } = context
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)

  const { jobLevels, isLoading, error, refetch, searchJobLevels, removeJobLevel } = useJobLevels(context)

  // Get used codes for validation
  const usedCodes = useMemo(() => jobLevels.map(level => level.code), [jobLevels])

  // Filter job levels based on search term
  const filteredLevels = useMemo(
    () => (searchTerm ? searchJobLevels(searchTerm) : jobLevels),
    [searchTerm, searchJobLevels, jobLevels]
  )

  const handleDelete = useCallback(
    async (level: JobLevel) => {
      await removeJobLevel({ id: level.id, version: level.version })
    },
    [removeJobLevel]
  )

  const handleView = useCallback((level: JobLevel) => {
    setSelectedLevel(level)
    setIsDrawerOpen(true)
  }, [])

  // Drawer items for job level details
  const drawerItems = useMemo(() => {
    if (!selectedLevel) return []
    return [
      {
        icon: <InfoIcon />,
        title: 'Basic Information',
        verticalTable: true,
        items: [
          { label: 'Name', value: selectedLevel.name },
          { label: 'Code', value: <Badge variant="info">{selectedLevel.code}</Badge> },
          { label: 'Hierarchy Order', value: selectedLevel.hierarchyOrder },
          { label: 'Description', value: selectedLevel.description ?? '—' },
          {
            label: 'Status',
            value: (
              <Badge variant={selectedLevel.isActive ? 'success' : 'destructive'}>
                {selectedLevel.isActive ? 'Active' : 'Inactive'}
              </Badge>
            )
          }
        ]
      }
    ]
  }, [selectedLevel])

  const columns: ColumnDef<JobLevel>[] = [
    {
      accessorKey: 'hierarchyOrder',
      header: ({ column }) => SortableHeader({ column, children: 'Level' }),
      enableSorting: true,
      enableResizing: false,
      maxSize: 70,
      cell: ({ getValue }) => HierarchyOrderCell({ value: getValue() as number })
    },
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
      cell: ({ getValue }) => TextCell({ value: getValue() as string, className: 'gba:font-medium' })
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
      header: ActionsColumnHeader,
      enableSorting: false,
      cell: ({ row }) =>
        ActionsCell({
          record: row.original,
          dataTestId,
          onView: handleView,
          onEdit: setEditDialogOpen,
          onDelete: handleDelete,
          itemNameGetter: record => record.name ?? '',
          itemTitle: 'Job Level'
        })
    }
  ]

  if (error) {
    console.error(error)
    return (
      <div data-testid={`${prefixDataTestId}-JobLevelsTab2`} className="gba:p-4">
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

  if (isLoading && jobLevels.length === 0) {
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
                <JobLevelForm
                  usedCodes={usedCodes}
                  childAddButton={
                    <Button
                      variant="default"
                      onClick={e => e.stopPropagation()}
                      data-testid={`${dataTestId}-add-level`}
                    >
                      <PlusIcon /> Add Job Level
                    </Button>
                  }
                  prefixDataTestId={dataTestId}
                  accessToken={context.accessToken}
                  refetch={refetch}
                />
              </ErrorBoundary>
            }
            cardTitle={`Job Levels (${jobLevels.length})`}
            cardDescription="Manage job levels and career progression stages"
          />
        )}

        <CardContent className="gba:relative">
          <div className="gba:mb-6 gba:relative gba:max-w-sm">
            <Input
              placeholder="Search job levels..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              data-testid={`${dataTestId}-search-input`}
            />
          </div>

          {jobLevels.length === 0 && !isLoading ? (
            <div className="gba:text-center gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8">
              <ListBulletsIcon className="gba:h-12 gba:w-12 gba:text-gray-400" />
              <p className="gba:font-normal gba:text-gray-500">No job levels found</p>
              <div className="gba:mt-2">
                <ErrorBoundary>
                  <JobLevelForm
                    usedCodes={usedCodes}
                    childAddButton={
                      <Button
                        variant="default"
                        onClick={e => e.stopPropagation()}
                        data-testid={`${prefixDataTestId}-create-first-level`}
                      >
                        <PlusIcon /> Create First Job Level
                      </Button>
                    }
                    prefixDataTestId={`${prefixDataTestId}`}
                    accessToken={context.accessToken}
                    refetch={refetch}
                  />
                </ErrorBoundary>
              </div>
            </div>
          ) : (
            <ErrorBoundary>
              <div className="gba:w-full">
                <style>{`
                  [data-slot="table-cell"]:has([data-hierarchy-order-cell="true"]) {
                    width: 70px !important;
                  }
                `}</style>
                <DataTable
                  data={filteredLevels}
                  columns={columns}
                  sorting={sorting}
                  onSortingChange={setSorting}
                  enableSorting
                  enablePagination
                />
              </div>
            </ErrorBoundary>
          )}
        </CardContent>

        {selectedLevel && (
          <ErrorBoundary>
            <SheetWrapperComponent
              prefixDataTestId={dataTestId}
              isDrawerVisible={isDrawerOpen}
              onOpenChange={openStatus => {
                if (!openStatus) setSelectedLevel(null)
                setIsDrawerOpen(openStatus)
              }}
              title="Job Level Details"
              titleIcon={FileCodeIcon}
              drawerItems={drawerItems}
              footerButtons={[
                <ErrorBoundary key="edit-form">
                  <JobLevelForm
                    usedCodes={usedCodes}
                    childAddButton={
                      <Button data-testid={`${prefixDataTestId || ''}-JobLevelsTab2-EditButton`}>
                        <PencilSimpleLineIcon /> Edit
                      </Button>
                    }
                    jobLevel={selectedLevel}
                    prefixDataTestId={`${prefixDataTestId}`}
                    accessToken={context.accessToken}
                    refetch={refetch}
                    isDrawerActive={isDrawerOpen}
                    key={selectedLevel.id}
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
          const levelToEdit = jobLevels.find(l => l.id === editDialogOpen) ?? null
          if (!levelToEdit) return null
          return (
            <ErrorBoundary>
              <JobLevelForm
                key={editDialogOpen}
                jobLevel={levelToEdit}
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
