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
import JobProfileForm from '@/business-apps/mdm/forms/job-profile-form/JobProfileForm'
import SheetWrapperComponent from '../../../generic-components/sheet-wrapper/SheetWrapperComponent'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useJobProfiles } from '../../hooks/useJobProfiles'
import { JobProfile } from '../../utils/JobProfile.types'
import {
  SortableHeader,
  ActionsColumnHeader,
  BadgeCell,
  TextCell,
  DescriptionCell,
  ActionsCell
} from '@/business-apps/mdm/utils/tableUtils'
import { ErrorBoundary } from '@/business-apps/core/every/apps/every-box/components/ErrorBoundary'
import {
  FileCodeIcon,
  InfoIcon,
  PencilSimpleLineIcon,
  PlusIcon,
  ReadCvLogoIcon,
  XCircleIcon
} from '@phosphor-icons/react'

export interface JobProfilesTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'JobProfilesTab'

export default function JobProfilesTab(context: Readonly<JobProfilesTabProps>) {
  // ─── Component State ────────────────────────────────────────────────────────
  const [sorting, setSorting] = useState<SortingState>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProfile, setSelectedProfile] = useState<JobProfile | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState<string | null>(null)

  // ─── Context & Configuration ───────────────────────────────────────────────
  const { prefixDataTestId, accessToken } = context
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)

  // ─── Data & Actions Hook ───────────────────────────────────────────────────
  const {
    jobProfiles,
    isLoading,
    error,
    refetch,
    searchJobProfiles,
    removeJobProfile,
    jobFunctions,
    jobLevels,
    referenceDataLoading
  } = useJobProfiles(context)

  // ─── Computed Values & Effects ─────────────────────────────────────────────
  const usedCodes = useMemo(() => jobProfiles.map(p => p.code), [jobProfiles])

  const filteredProfiles = useMemo(
    () => (searchTerm ? searchJobProfiles(searchTerm) : jobProfiles),
    [searchTerm, searchJobProfiles, jobProfiles]
  )

  // Update selected profile when data changes
  useEffect(() => {
    if (selectedProfile) {
      const updated = jobProfiles.find(p => p.id === selectedProfile.id)
      if (updated) setSelectedProfile(updated)
    }
  }, [jobProfiles])

  // ─── Event Handlers ────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    async (profile: JobProfile) => {
      await removeJobProfile({ id: profile.id, version: profile.version })
    },
    [removeJobProfile]
  )

  const handleView = useCallback((profile: JobProfile) => {
    setSelectedProfile(profile)
    setIsDrawerOpen(true)
  }, [])

  // ─── Table Configuration ───────────────────────────────────────────────────
  const columns: ColumnDef<JobProfile>[] = [
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
      id: 'jobFunction',
      accessorKey: 'jobFunction',
      header: ({ column }) => SortableHeader({ column, children: 'Job Function' }),
      enableSorting: true,
      sortingFn: (a, b) => {
        const nameA = a.original.jobFunction?.name ?? ''
        const nameB = b.original.jobFunction?.name ?? ''
        return nameA.localeCompare(nameB)
      },
      cell: ({ row }) => BadgeCell({ value: row.original.jobFunction, variant: 'secondary' })
    },
    {
      id: 'jobLevel',
      accessorKey: 'jobLevel',
      header: ({ column }) => SortableHeader({ column, children: 'Job Level' }),
      enableSorting: true,
      sortingFn: (a, b) => {
        const nameA = a.original.jobLevel?.name ?? ''
        const nameB = b.original.jobLevel?.name ?? ''
        return nameA.localeCompare(nameB)
      },
      cell: ({ row }) => BadgeCell({ value: row.original.jobLevel, variant: 'secondary' })
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
          itemTitle: 'Job Profile'
        })
    }
  ]

  // ─── Drawer Configuration ──────────────────────────────────────────────────
  const drawerItems = useMemo(() => {
    if (!selectedProfile) return []

    const items = [
      {
        icon: <InfoIcon />,
        title: 'Basic Information',
        verticalTable: true,
        items: [
          { label: 'Name', value: selectedProfile.name ?? selectedProfile.title },
          { label: 'Code', value: <Badge variant="info">{selectedProfile.code}</Badge> },
          { label: 'Description', value: selectedProfile.description ?? '—' },
          {
            label: 'Job Function',
            value: selectedProfile.jobFunction ? (
              <Badge variant="outline">
                {selectedProfile.jobFunction.name} ({selectedProfile.jobFunction.code})
              </Badge>
            ) : (
              '—'
            )
          },
          {
            label: 'Job Level',
            value: selectedProfile.jobLevel ? (
              <Badge variant="outline">
                {selectedProfile.jobLevel.name} ({selectedProfile.jobLevel.code}) - Level{' '}
                {selectedProfile.jobLevel.hierarchyOrder}
              </Badge>
            ) : (
              '—'
            )
          },
          {
            label: 'Status',
            value: (
              <Badge variant={selectedProfile.isActive ? 'success' : 'destructive'}>
                {selectedProfile.isActive ? 'Active' : 'Inactive'}
              </Badge>
            )
          }
        ]
      }
    ]

    // Add Required Skills and Levels section if skills exist
    const profileSkills = selectedProfile.jobProfileSkills || []
    if (profileSkills.length > 0) {
      items.push({
        icon: <InfoIcon />,
        title: 'Required Skills and Levels',
        verticalTable: true,
        items: profileSkills.map(skillItem => ({
          label: skillItem.skill?.name || 'Unknown Skill',
          value: skillItem.requiredLevel ? (
            <Badge variant="outline">Level {skillItem.requiredLevel}</Badge>
          ) : (
            <Badge variant="secondary">Level not specified</Badge>
          )
        }))
      })
    }

    return items
  }, [selectedProfile])

  // ─── Loading & Error States ────────────────────────────────────────────────
  if (error) {
    return (
      <div data-testid={`${prefixDataTestId}-JobProfilesTab2`} className="gba:p-4">
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

  if ((isLoading || referenceDataLoading) && jobProfiles.length === 0) {
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
                <JobProfileForm
                  usedCodes={usedCodes}
                  childAddButton={
                    <Button
                      variant="default"
                      onClick={e => e.stopPropagation()}
                      data-testid={`${dataTestId}-add-profile`}
                    >
                      <PlusIcon /> Add Job Profile
                    </Button>
                  }
                  prefixDataTestId={dataTestId}
                  accessToken={accessToken}
                  refetch={refetch}
                  jobFunctions={jobFunctions}
                  jobLevels={jobLevels}
                />
              </ErrorBoundary>
            }
            cardTitle={`Job Profiles (${jobProfiles.length})`}
            cardDescription="Manage job profiles and their classifications"
          />
        )}

        <CardContent className="gba:relative">
          <div className="gba:mb-6 gba:relative gba:max-w-sm">
            <Input
              placeholder="Search job profiles..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              data-testid={`${dataTestId}-search-input`}
            />
          </div>

          {jobProfiles.length === 0 && !isLoading ? (
            <div className="gba:text-center gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8">
              <ReadCvLogoIcon className="gba:h-12 gba:w-12 gba:text-gray-400" />
              <p className="gba:font-normal gba:text-gray-500">No job profiles found</p>
              <div className="gba:mt-2">
                <ErrorBoundary>
                  <JobProfileForm
                    usedCodes={usedCodes}
                    childAddButton={
                      <Button
                        variant="default"
                        onClick={e => e.stopPropagation()}
                        data-testid={`${prefixDataTestId}-create-first-profile`}
                      >
                        <PlusIcon /> Create First Job Profile
                      </Button>
                    }
                    prefixDataTestId={`${prefixDataTestId}`}
                    accessToken={accessToken}
                    refetch={refetch}
                    jobFunctions={jobFunctions}
                    jobLevels={jobLevels}
                  />
                </ErrorBoundary>
              </div>
            </div>
          ) : (
            <ErrorBoundary>
              <DataTable
                data={filteredProfiles}
                columns={columns}
                sorting={sorting}
                onSortingChange={setSorting}
                enableSorting
                enablePagination
              />
            </ErrorBoundary>
          )}
        </CardContent>

        {selectedProfile && (
          <ErrorBoundary>
            <SheetWrapperComponent
              prefixDataTestId={dataTestId}
              isDrawerVisible={isDrawerOpen}
              onOpenChange={openStatus => {
                if (!openStatus) setSelectedProfile(null)
                setIsDrawerOpen(openStatus)
              }}
              title="Job Profile Details"
              titleIcon={FileCodeIcon}
              drawerItems={drawerItems}
              footerButtons={[
                <ErrorBoundary key="edit-form">
                  <JobProfileForm
                    usedCodes={usedCodes}
                    childAddButton={
                      <Button data-testid={`${prefixDataTestId || ''}-JobProfilesTab2-EditButton`}>
                        <PencilSimpleLineIcon /> Edit
                      </Button>
                    }
                    jobProfile={selectedProfile}
                    prefixDataTestId={`${prefixDataTestId}`}
                    accessToken={accessToken}
                    refetch={refetch}
                    isDrawerActive={isDrawerOpen}
                    jobFunctions={jobFunctions}
                    jobLevels={jobLevels}
                    key={selectedProfile.id}
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
          const recordToEdit = jobProfiles.find(l => l.id === editDialogOpen) ?? null
          if (!recordToEdit) return null
          return (
            <ErrorBoundary>
              <JobProfileForm
                key={editDialogOpen}
                jobProfile={recordToEdit}
                jobFunctions={jobFunctions}
                jobLevels={jobLevels}
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
