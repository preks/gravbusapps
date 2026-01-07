import React, { useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobLevels } from '../../hooks'
import { JobLevel, JobLevelGroup } from '../../types'
import {
  CardContent,
  Card,
  Accordion,
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  DataTable,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Badge,
  Icon,
  Input
} from '@newwork/nw-design-system'
import { CardTabHeaderComponent } from '../../../generic-components/card/CardTabHeaderComponent'
import JobLevelForm from '@/business-apps/mdm/forms/job-level-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { DeleteButton } from '../../../generic-components/delete-button/DeleteButton'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import JobLevelGroupForm from '@/business-apps/mdm/forms/job-level-group-form'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { XCircleIcon, ArrowsDownUpIcon, UsersIcon, PlusIcon, PencilSimpleLineIcon } from '@phosphor-icons/react'
import { JOB_LEVEL_GROUP_CATALOG, JOB_LEVEL_GROUP_VERSION } from '../../../compensation-data/hooks/useJobLevelGroups'

const DATA_TEST_ID_PREFIX = 'JobLevelGroupDetails'

export interface JobLevelGroupDetailsProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

// Re-export types for external usage
export type { JobLevel, JobLevelGroup } from '../../types'

const JobLevelGroupDetails: React.FC<JobLevelGroupDetailsProps> = context => {
  const { prefixDataTestId, userInfo, accessToken } = context
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const catalogClient = useCatalogManagerClient(accessToken)

  const { jobLevelGroups, compensationBands, isLoading, error, refetch } = useJobLevels(context)
  const [accordionValue, setAccordionValue] = useState<string | string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])

  const handleDelete = async (type: 'group' | 'level', item: JobLevelGroup | JobLevel) => {
    const isJobLevel = type === 'level'

    if (isJobLevel) {
      await restClient.post(
        `/employee/${isJobLevel ? 'saveJobLevel' : ''}`,
        {
          changeMode: 'DELETE',
          jobLevel: {
            id: item.id,
            version: item.version ?? 0
          }
        },
        {
          headers: { Authorization: `Bearer ${context.accessToken}` }
        }
      )
    } else {
      await catalogClient.deleteCatalogEntry(JOB_LEVEL_GROUP_CATALOG, JOB_LEVEL_GROUP_VERSION, item.id)
    }

    await refetch()
  }

  const filteredJobLevelGroups = useMemo(() => {
    return jobLevelGroups.filter(
      jobLevelGroup =>
        jobLevelGroup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        jobLevelGroup.code.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [jobLevelGroups, searchTerm])

  const renderJobLevelTable = (group: JobLevelGroup) => {
    const columns: ColumnDef<JobLevel>[] = [
      {
        accessorKey: 'level',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Level
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const level = getValue()
          return level !== undefined ? (
            <Badge variant="info" className="gba:font-mono">
              {level as string}
            </Badge>
          ) : (
            <Badge variant="secondary">Not assigned</Badge>
          )
        }
      },
      {
        accessorKey: 'code',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Code
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const code = getValue()
          return (
            <div className="gba:flex gba:items-center">
              <Badge variant="info">{(code as string) ?? 'N/A'}</Badge>
            </div>
          )
        }
      },
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
            <div>
              <div className="gba:font-semibold">{name as string}</div>
            </div>
          )
        }
      },
      {
        accessorKey: 'compensationBand',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Compensation Band
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const compensationBand = getValue()
          return compensationBand ? (
            <Badge variant="success" className="gba:px-3 gba:py-1">
              {compensationBand as string}
            </Badge>
          ) : (
            <Badge variant="secondary">Not assigned</Badge>
          )
        }
      },
      {
        accessorKey: 'experienceYears',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Experience Required
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const years = getValue()
          return years !== undefined && typeof years === 'number' ? (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="warning">{years} years</Badge>
              </TooltipTrigger>
              <TooltipContent>{`${years} years of experience required`}</TooltipContent>
            </Tooltip>
          ) : (
            <Badge variant="secondary">Not specified</Badge>
          )
        }
      },
      {
        id: 'actions',
        header: () => <div className="gba:flex gba:w-[85px]">Actions</div>,
        enableSorting: false,
        enableHiding: true,
        cell: ({ row }) => {
          const record = row.original
          return (
            <div className="gba:flex">
              <JobLevelForm
                childAddButton={
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={e => {
                      e.stopPropagation()
                    }}
                    data-testid={`${dataTestId}-edit-level-${record.id}`}
                  >
                    <PencilSimpleLineIcon className="gba:h-4 gba:w-4" />
                  </Button>
                }
                jobLevel={record}
                refetch={refetch}
                groupId={group.id}
                accessToken={context.accessToken}
                prefixDataTestId={dataTestId}
                compensationBands={compensationBands}
              />

              <DeleteButton
                onDelete={() => handleDelete('level', record)}
                itemName={record.name}
                itemTitle={'Job Level'}
              />
            </div>
          )
        }
      }
    ]

    const dataTable = group.jobLevels.map(jobLevel => ({
      id: jobLevel.id,
      level: jobLevel.level,
      code: jobLevel.code,
      name: jobLevel.name,
      description: jobLevel.description,
      compensationBand: jobLevel.compensationBand?.name,
      compensationBandId: jobLevel.compensationBand?.id,
      version: jobLevel.version,
      experienceYears: jobLevel.experienceYears
    }))

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

  // Custom icon function that renders JobLevelForm
  const JobLevelFormIcon = ({ groupId }: { groupId: string }) => (
    <JobLevelForm
      childAddButton={
        <Button
          variant="ghost"
          size="sm"
          onClick={e => {
            e.stopPropagation()
            setAccordionValue(prev => {
              if (prev.includes(groupId)) {
                return prev
              }
              return [...prev, groupId]
            })
          }}
          data-testid={`${dataTestId}-add-level-${groupId}`}
        >
          <PlusIcon className="gba:h-4 gba:w-4" />
        </Button>
      }
      refetch={refetch}
      groupId={groupId}
      accessToken={context.accessToken}
      prefixDataTestId={dataTestId}
      compensationBands={compensationBands}
    />
  )

  const JobLevelGroupFormIcon = ({ group }: { group: JobLevelGroup }) => (
    <JobLevelGroupForm
      childAddButton={
        <Button
          size="sm"
          variant="ghost"
          onClick={e => {
            e.stopPropagation()
          }}
          data-testid={`${dataTestId}-edit-level-${group.id}`}
        >
          <PencilSimpleLineIcon className="gba:h-4 gba:w-4" />
        </Button>
      }
      jobLevelGroup={group}
      refetch={refetch}
      accessToken={context.accessToken}
      prefixDataTestId={dataTestId}
    />
  )

  // Helper functions to reduce nesting
  const createAddJobLevelButton = (groupId: string) => (
    <Tooltip>
      <TooltipTrigger>
        <JobLevelFormIcon groupId={groupId} />
      </TooltipTrigger>
      <TooltipContent>Add Job Level</TooltipContent>
    </Tooltip>
  )

  const createEditGroupButton = (group: JobLevelGroup) => (
    <Tooltip>
      <TooltipTrigger>
        <JobLevelGroupFormIcon group={group} />
      </TooltipTrigger>
      <TooltipContent>Edit Job Level Group</TooltipContent>
    </Tooltip>
  )

  const createDeleteGroupButton = (group: JobLevelGroup) => (
    <Tooltip>
      <TooltipTrigger>
        <DeleteButton onDelete={() => handleDelete('group', group)} itemName={group.name} itemTitle="Job Level Group" />
      </TooltipTrigger>
      <TooltipContent>Delete Job Level Group</TooltipContent>
    </Tooltip>
  )

  const groupItems = useMemo(
    () =>
      filteredJobLevelGroups.map(group => ({
        id: group.id,
        title: group.name,
        description: `Code: ${group.code}`,
        badgeText: `${group.jobLevelCount} levels`,
        badgeVariant: 'info' as const,
        buttons: [
          {
            icon: () => createAddJobLevelButton(group.id),
            onClick: () => {}
          },
          {
            icon: () => createEditGroupButton(group),
            onClick: () => {}
          },
          {
            icon: () => createDeleteGroupButton(group),
            onClick: () => {}
          }
        ],
        contentDescription: group.description,
        content: <div className="gba:space-y-4">{renderJobLevelTable(group)}</div>
      })),
    [
      jobLevelGroups,
      userInfo?.employeeDetails.employeeId,
      refetch,
      context.accessToken,
      dataTestId,
      compensationBands,
      filteredJobLevelGroups
    ]
  )

  if (error) {
    return (
      <div className="gba:p-6 gba:text-center">
        <Alert className="gba:w-full gba:!flex gba:justify-between gba:!items-center" variant="destructive">
          <AlertTitle className="gba:flex gba:items-center gba:justify-center gba:gap-2">
            <Icon icon={XCircleIcon} />
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

  return (
    <Card className="gba:rounded-lg gba:border gba:bg-card gba:text-card-foreground gba:shadow-sm gba:overflow-hidden">
      {!isLoading && (
        <CardTabHeaderComponent
          addButton={
            <JobLevelGroupForm
              childAddButton={
                <Button
                  variant="default"
                  onClick={e => {
                    e.stopPropagation()
                  }}
                  data-testid={`${dataTestId}-add-group`}
                >
                  <PlusIcon className="gba:h-4 gba:w-4" /> Add Job Level Group
                </Button>
              }
              refetch={refetch}
              accessToken={context.accessToken}
              prefixDataTestId={dataTestId}
              usedCodes={jobLevelGroups.map(group => group.code)}
            />
          }
          cardTitle={`Job Level Groups & Career Paths (${jobLevelGroups.length})`}
          cardDescription="Manage job levels organized by career groups and progression paths"
        />
      )}

      <CardContent className="gba:relative">
        <div className="gba:mb-6 gba:relative gba:max-w-sm">
          <Input
            placeholder="Search job level groups..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            data-testid={`${dataTestId}-search-input`}
          />
        </div>

        {jobLevelGroups.length === 0 && !isLoading ? (
          <div className="gba:text-center gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8">
            <UsersIcon className="gba:text-4xl gba:text-gray-400 gba:mb-4" />
            <h1 className="gba:font-bold gba:text-xl">No Job Level Groups Found</h1>
            <h2 className="gba:text-gray-500 gba:text-base">
              Create your first job level group to start organizing career paths
            </h2>
            <div className="gba:mt-4">
              <JobLevelGroupForm
                childAddButton={
                  <Button
                    variant="default"
                    onClick={e => {
                      e.stopPropagation()
                    }}
                    data-testid={`${dataTestId}-add-group`}
                  >
                    <PlusIcon className="gba:h-4 gba:w-4" /> Create First Group
                  </Button>
                }
                refetch={refetch}
                accessToken={context.accessToken}
                prefixDataTestId={dataTestId}
              />
            </div>
          </div>
        ) : (
          <Accordion
            className="gba:w-full"
            value={accordionValue}
            onValueChange={value => setAccordionValue(value)}
            items={groupItems}
          />
        )}
      </CardContent>
    </Card>
  )
}

export default JobLevelGroupDetails
