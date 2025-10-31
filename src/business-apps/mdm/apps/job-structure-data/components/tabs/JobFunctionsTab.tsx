import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobFunctions } from '../../hooks/useJobFunctions'
import { JobFunction } from '../../types'
import {
  Card,
  CardContent,
  Button,
  Input,
  Alert,
  AlertTitle,
  AlertDescription,
  DataTable,
  Badge,
  Spinner
} from '@newwork/nw-design-system'
import { CardTabHeaderComponent } from '../../../generic-components/card/CardTabHeaderComponent'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import {
  EyeIcon,
  UsersIcon,
  BookOpenIcon,
  WrenchIcon,
  XCircleIcon,
  ArrowsDownUpIcon,
  FileCodeIcon,
  InfoIcon,
  UserListIcon,
  PlusIcon,
  PencilSimpleLineIcon
} from '@phosphor-icons/react'
import SheetWrapperComponent from '../../../generic-components/sheet-wrapper/SheetWrapperComponent'
import JobFunctionForm from '@/business-apps/mdm/forms/job-function-form'
import { DeleteButton } from '../../../generic-components/delete-button/DeleteButton'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'

export interface JobFunctionsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const JobFunctionsTab: React.FC<JobFunctionsTabProps> = context => {
  const { t } = useTranslation()
  const { prefixDataTestId } = context
  const dataTestId = formatDataTestId(prefixDataTestId, '')

  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const { jobFunctions, jobFamilies, jobLevelGroups, isLoading, error, refetch, searchJobFunctions } =
    useJobFunctions(context)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFunction, setSelectedFunction] = useState<JobFunction | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])

  useEffect(() => {
    if (selectedFunction) {
      const newJobFunction = jobFunctions.find(jobFunction => jobFunction.id === selectedFunction.id)

      if (newJobFunction) {
        setSelectedFunction(newJobFunction)
      }
    }
  }, [jobFunctions])

  const filteredFunctions = searchTerm ? searchJobFunctions(searchTerm) : jobFunctions

  const handleView = (record: JobFunction) => {
    const targetJobFunction = jobFunctions.find(jobFunction => jobFunction.id === record.id)

    if (targetJobFunction) {
      setSelectedFunction(targetJobFunction)
      setIsDrawerOpen(true)
    }
  }

  const handleDelete = async (item: JobFunction) => {
    await restClient.post(
      '/employee/saveJobFunction',
      {
        changeMode: 'DELETE',
        jobFunction: {
          id: item.id,
          version: item.version ?? 0
        }
      },
      {
        headers: { Authorization: `Bearer ${context.accessToken}` }
      }
    )

    await refetch()
  }

  const renderJobFunctionsTable = () => {
    const columns: ColumnDef<JobFunction>[] = [
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
            <div className="gba:flex gba:items-center">
              <div className="gba:font-semibold">{name as string}</div>
            </div>
          )
        }
      },
      {
        accessorKey: 'jobFamily',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Job Family
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const jobFamily = row.original.jobFamily?.value
          return jobFamily ?? 'Not assigned'
        }
      },
      {
        accessorKey: 'jobLevelGroup',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Job Level Group
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const jobLevelGroup = row.original.jobLevelGroup?.value
          return jobLevelGroup ?? 'Not assigned'
        }
      },
      {
        accessorKey: 'description',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Description
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const description = getValue()
          return (
            <div className="gba:flex gba:items-center">
              <div className="gba:max-w-xs gba:truncate" title={description as string}>
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
          <div className="gba:flex gba:items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleView(row.original)}
              data-testid={`${dataTestId}-view-function-${row.original.id}`}
            >
              <EyeIcon className="gba:h-4 gba:w-4" />
            </Button>

            <JobFunctionForm
              childAddButton={
                <Button variant="ghost" size="sm">
                  <PencilSimpleLineIcon />
                </Button>
              }
              prefixDataTestId={`${prefixDataTestId}`}
              accessToken={context.accessToken}
              refetch={refetch}
              jobFamilies={jobFamilies}
              jobLevelGroups={jobLevelGroups}
              jobFunction={row.original}
            />

            <DeleteButton
              onDelete={() => handleDelete(row.original)}
              itemName={row.original.name}
              itemTitle={'Job Function'}
            />
          </div>
        )
      }
    ]

    const dataTable = filteredFunctions.map(jobFunction => ({
      id: jobFunction.id,
      code: jobFunction.code,
      name: jobFunction.name,
      description: jobFunction.description,
      jobFamily: jobFunction.jobFamily,
      jobLevelGroup: jobFunction.jobLevelGroup,
      version: jobFunction.version,
      nameI18n: jobFunction.nameI18n,
      descriptionI18n: jobFunction.descriptionI18n
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

  const navigationItems = useMemo(() => {
    if (!selectedFunction) return []

    const items = []

    // Conditionally add Job Family Details if jobFamilyRef exists
    if (selectedFunction.jobFamilyRef) {
      items.push({
        redirectLink: `/platform/mdm/job-structure-data/job-families/${selectedFunction.jobFamilyRef}`,
        color: 'green',
        icon: UsersIcon,
        title: selectedFunction.jobFamily?.value ?? 'Job Family Details',
        description: 'View complete job family information, structure and related positions'
      })
    }

    // Conditionally add Level Group Details if jobLevelGroupRef exists
    if (selectedFunction.jobLevelGroupRef) {
      items.push({
        redirectLink: `/platform/mdm/job-structure-data/job-level-groups/${selectedFunction.jobLevelGroupRef}`,
        color: 'blue',
        icon: UserListIcon,
        title: selectedFunction.jobLevelGroup?.value ?? 'Level Group Details',
        description: 'View job level grouping, career progression paths and categorization'
      })
    }

    items.push(
      {
        redirectLink: `/platform/mdm/job-structure-data/job-profiles?function=${selectedFunction.id}`,
        color: 'purple',
        icon: BookOpenIcon,
        title: 'Related Job Profiles',
        description: `View all job profiles using the ${selectedFunction.name} function`
      },
      {
        redirectLink: `/platform/mdm/competencies-data/skills?jobFunction=${selectedFunction.id}`,
        color: 'orange',
        icon: WrenchIcon,
        title: 'Skills & Competencies',
        description: `Explore skills and competencies associated with ${selectedFunction.name}`
      }
    )

    return items
  }, [selectedFunction])

  const drawerItems = useMemo(() => {
    if (!selectedFunction) return []

    return [
      {
        icon: <InfoIcon />,
        title: 'Basic Information',
        verticalTable: true,
        items: [
          {
            label: 'Name',
            value: selectedFunction.name
          },
          {
            label: 'Code',
            value: selectedFunction.code ?? '-'
          },
          {
            label: 'Description',
            value: selectedFunction.description ?? '-'
          }
        ]
      },
      {
        icon: <InfoIcon />,
        title: 'Classifications',
        items: [
          {
            label: 'Job Family',
            value: selectedFunction.jobFamily?.value ?? '-'
          },
          {
            label: 'Job Level Group',
            value: selectedFunction.jobLevelGroup?.value ?? '-'
          }
        ]
      }
    ]
  }, [selectedFunction])

  if (error) {
    return (
      <div className="gba:p-6 gba:text-center">
        <Alert className="gba:w-full gba:!flex gba:justify-between gba:!items-center" variant="destructive">
          <AlertTitle className="gba:flex gba:items-center gba:justify-center gba:gap-2">
            <XCircleIcon className="h-4 w-4" />
            Error Loading Job Functions
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
      <div data-testid={`${dataTestId}`} className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spinner />
      </div>
    )
  }

  return (
    <Card className="gba:rounded-lg gba:border gba:bg-card gba:text-card-foreground gba:shadow-sm gba:overflow-hidden">
      {!isLoading && (
        <CardTabHeaderComponent
          addButton={
            <JobFunctionForm
              childAddButton={
                <Button>
                  <PlusIcon />
                  Add Job Function
                </Button>
              }
              prefixDataTestId={`${prefixDataTestId}`}
              accessToken={context.accessToken}
              refetch={refetch}
              jobFamilies={jobFamilies}
              jobLevelGroups={jobLevelGroups}
            />
          }
          cardTitle={`${t('hr.job_functions', 'Job Functions')} (${jobFunctions.length})`}
          cardDescription="Manage and explore job functions across the organization"
        />
      )}

      <CardContent className="gba:relative">
        <div className="gba:mb-6 gba:relative gba:max-w-sm">
          <Input
            placeholder="Search job functions..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="gba:pl-10"
            data-testid={`${dataTestId}-search-input`}
          />
        </div>

        {isLoading ? (
          <div className="gba:text-center gba:py-8">
            <div className="gba:animate-spin gba:inline-block gba:w-8 gba:h-8 gba:border-4 gba:border-blue-600 gba:border-t-transparent gba:rounded-full"></div>
            <p className="gba:mt-2 gba:text-gray-600">Loading job functions...</p>
          </div>
        ) : (
          renderJobFunctionsTable()
        )}
      </CardContent>

      {selectedFunction && (
        <SheetWrapperComponent
          prefixDataTestId={dataTestId}
          isDrawerVisible={isDrawerOpen}
          onOpenChange={openStatus => {
            if (!openStatus) {
              setSelectedFunction(null)
            }
            setIsDrawerOpen(openStatus)
          }}
          title="Job Function Details"
          titleIcon={FileCodeIcon}
          drawerItems={drawerItems}
          navigationItems={navigationItems}
          footerButtons={[
            <JobFunctionForm
              childAddButton={
                <Button>
                  <PencilSimpleLineIcon /> Edit
                </Button>
              }
              prefixDataTestId={`${prefixDataTestId}`}
              accessToken={context.accessToken}
              refetch={refetch}
              jobFamilies={jobFamilies}
              jobLevelGroups={jobLevelGroups}
              jobFunction={selectedFunction}
              isDrawerActive={isDrawerOpen}
            />
          ]}
        />
      )}
    </Card>
  )
}

export { JobFunctionsTab }
