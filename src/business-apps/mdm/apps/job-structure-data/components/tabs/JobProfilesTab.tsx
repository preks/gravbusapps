import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Badge,
  Card,
  CardContent,
  Input,
  DataTable,
  Alert,
  AlertTitle,
  AlertDescription,
  Spinner
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobProfiles } from '../../hooks/useJobProfiles'
import { JobProfile } from '../../types'
import CardTabHeaderComponent from '../../../generic-components/card'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import {
  EyeIcon,
  XCircleIcon,
  ArrowsDownUpIcon,
  FileCodeIcon,
  InfoIcon,
  PlusIcon,
  PencilSimpleLineIcon,
  UsersIcon,
  GitBranchIcon,
  TreeStructureIcon,
  UserIcon,
  AddressBookTabsIcon,
  ReadCvLogoIcon
} from '@phosphor-icons/react'
import SheetWrapperComponent from '../../../generic-components/sheet-wrapper/SheetWrapperComponent'
import JobProfileForm from '@/business-apps/mdm/forms/job-profile-form'
import { useJobLevels } from '../../hooks'
import { useGetEmploymentTypesData } from '../../../employment-data/queries/EmploymentTypesQueries'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { useUserLocale } from '@/common/locale/useUserLocale'
import { ContractType, EmploymentType } from '../../../employment-data'
import { useGetContractTypesData } from '../../../employment-data/queries/ContractTypesQueries'
import { DeleteButton } from '../../../generic-components/delete-button/DeleteButton'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'

export interface JobProfilesTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'JobProfilesTab'

const JobProfilesTab: React.FC<JobProfilesTabProps> = context => {
  const { t } = useTranslation()
  const { prefixDataTestId, accessToken } = context
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const catalogClient = useCatalogManagerClient(accessToken)
  const userLocale = useUserLocale() ?? 'en-US'
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const [allTypesLoading, setAllTypesLoading] = useState(false)
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>([])
  const [contractTypes, setContractTypes] = useState<ContractType[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isDrawerVisible, setIsDrawerVisible] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<JobProfile | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])

  const { fetchEmploymentTypes } = useGetEmploymentTypesData(catalogClient, userLocale)

  const { fetchContractTypes } = useGetContractTypesData(catalogClient, userLocale)

  const { jobProfiles, jobFunctions, isLoading, error, refetch, searchJobProfiles } = useJobProfiles(context)

  const { jobLevelGroups, isLoading: jobLevelLoading, error: jobLevelError } = useJobLevels(context)

  useEffect(() => {
    if (selectedProfile) {
      const newProfile = jobProfiles.find(profile => profile.id === selectedProfile.id)

      if (newProfile) {
        setSelectedProfile(newProfile)
      }
    }
  }, [jobProfiles])

  const selectedJobLevelGroup = useMemo(() => {
    const targetFunction = jobFunctions.find(jobFunction => jobFunction.id === selectedProfile?.jobFunctionId)
    const targetJobLevelGroup = jobLevelGroups.find(
      jobLevelGroup => jobLevelGroup.id === targetFunction?.jobLevelGroupRef
    )

    return targetJobLevelGroup
  }, [jobLevelGroups, selectedProfile, jobFunctions])

  const loadAllTypes = async () => {
    try {
      setAllTypesLoading(true)

      const [employmentTypes, contractTypes] = await Promise.all([fetchEmploymentTypes(), fetchContractTypes()])

      if (employmentTypes) {
        setEmploymentTypes(employmentTypes)
      }

      if (contractTypes) {
        setContractTypes(contractTypes)
      }
    } catch {
      console.error('Failed to load employment types')
    } finally {
      setAllTypesLoading(false)
    }
  }

  useEffect(() => {
    loadAllTypes()
  }, [userLocale])

  const filteredProfiles = searchTerm ? searchJobProfiles(searchTerm) : jobProfiles

  const handleView = (record: JobProfile) => {
    setSelectedProfile(record)
    setIsDrawerVisible(true)
  }

  const handleDelete = async (item: JobProfile) => {
    await restClient.post(
      '/employee/saveJobProfile',
      {
        changeMode: 'DELETE',
        jobProfile: {
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

  const getStatusColor = (recordState?: string) => {
    switch (recordState) {
      case 'active':
        return 'success'
      case 'inactive':
        return 'destructive'
      case 'draft':
        return 'warning'
      default:
        return 'offline'
    }
  }

  const dataTable = useMemo(
    () =>
      filteredProfiles.map(jobProfile => ({
        ...jobProfile
      })),
    [filteredProfiles]
  )

  const renderJobProfilesTable = () => {
    const columns: ColumnDef<JobProfile>[] = [
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
        accessorKey: 'jobFunction',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Job Function
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const jobFunction = row.original.jobFunction?.name
          return jobFunction ?? 'Not assigned'
        }
      },
      {
        accessorKey: 'jobLevel',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Job Level
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const jobLevel = row.original.jobLevel?.name
          return jobLevel ?? 'Not assigned'
        }
      },
      {
        accessorKey: 'contractType',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Contract Type
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const contractType = row.original.contractType?.value
          return contractType ?? 'Not assigned'
        }
      },
      {
        accessorKey: 'employmentType',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Employment Type
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const employmentType = row.original.employmentType?.value
          return employmentType ?? 'Not assigned'
        }
      },
      {
        accessorKey: 'recordState',
        header: 'Status',
        enableSorting: true,
        cell: ({ getValue }) => {
          const recordState = getValue() as string
          return (
            <Badge variant={getStatusColor(recordState)}>
              {recordState ? recordState.charAt(0).toUpperCase() + recordState.slice(1) : 'Unknown'}
            </Badge>
          )
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
              <div className="gba:max-w-[200px] gba:truncate" title={description as string}>
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
        cell: ({ row }) => {
          const targetFunction = jobFunctions.find(jobFunction => jobFunction.id === row.original.jobFunctionId)
          const targetJobLevelGroup = jobLevelGroups.find(
            jobLevelGroup => jobLevelGroup.id === targetFunction?.jobLevelGroupRef
          )

          return (
            <div className="gba:flex gba:items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleView(row.original)}
                data-testid={`${dataTestId}-view-function-${row.original.id}`}
              >
                <EyeIcon className="gba:h-4 gba:w-4" />
              </Button>

              <JobProfileForm
                childAddButton={
                  <Button variant="ghost" size="sm">
                    <PencilSimpleLineIcon />
                  </Button>
                }
                prefixDataTestId={dataTestId}
                accessToken={context.accessToken}
                refetch={refetch}
                jobProfile={row.original}
                jobFunctions={jobFunctions}
                jobLevelGroups={jobLevelGroups}
                contractTypes={contractTypes}
                employmentTypes={employmentTypes}
                defaultJobLevels={targetJobLevelGroup?.jobLevels}
                jobLevelGroupRef={targetJobLevelGroup?.id}
              />

              <DeleteButton
                onDelete={() => handleDelete(row.original)}
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
        enableSorting
        enablePagination
      />
    )
  }

  const drawerItems = useMemo(() => {
    if (!selectedProfile) return []

    const items = [
      {
        icon: <InfoIcon />,
        title: 'Basic Information',
        verticalTable: true,
        items: [
          {
            label: 'Name',
            value: selectedProfile.name
          },
          {
            label: 'Code',
            value: selectedProfile.code ?? '-'
          },
          {
            label: 'Status',
            value: (
              <Badge variant={getStatusColor(selectedProfile.recordState)}>
                {selectedProfile.recordState
                  ? selectedProfile.recordState.charAt(0).toUpperCase() + selectedProfile.recordState.slice(1)
                  : 'Unknown'}
              </Badge>
            )
          },
          {
            label: 'Description',
            value: selectedProfile.description ?? '-'
          }
        ]
      },
      {
        icon: <InfoIcon />,
        title: 'Classifications',
        verticalTable: true,
        items: [
          {
            label: 'Job Function Name',
            value: selectedProfile.jobFunction ? selectedProfile.jobFunction.name : '-'
          },
          {
            label: 'Job Level Name',
            value: selectedProfile.jobLevel ? selectedProfile.jobLevel.name : '-'
          },
          {
            label: 'Contract Type Name',
            value: selectedProfile.contractType ? selectedProfile.contractType.value : '-'
          },
          {
            label: 'Employment Type Name',
            value: selectedProfile.employmentType ? selectedProfile.employmentType.value : '-'
          }
        ]
      }
    ]

    return items
  }, [selectedProfile])

  const navigationItems = useMemo(() => {
    if (!selectedProfile) return []

    const items = []

    if (selectedProfile.jobFunctionId) {
      items.push({
        redirectLink: `/mdm/job-structure-data/job-functions/${selectedProfile.jobFunctionId}`,
        color: 'green',
        icon: TreeStructureIcon,
        title: selectedProfile.jobFunction?.name || 'Job Function Details',
        description: 'View complete job function information, structure and related positions'
      })
    }

    if (selectedProfile.jobLevelId) {
      items.push({
        redirectLink: `/mdm/job-structure-data/job-levels/${selectedProfile.jobLevelId}`,
        color: 'blue',
        icon: GitBranchIcon,
        title: selectedProfile.jobLevel?.name || 'Job Level Details',
        description: 'View job level information, requirements and progression paths'
      })
    }

    if (selectedProfile.contractTypeRef) {
      items.push({
        redirectLink: `/mdm/contract-data/contract-types/${selectedProfile.contractTypeRef}`,
        color: 'orange',
        icon: AddressBookTabsIcon,
        title: selectedProfile.contractType?.value || 'Contract Type Details',
        description: 'View contract type specifications, terms and associated job profiles'
      })
    }

    if (selectedProfile.employmentTypeRef) {
      items.push({
        redirectLink: `/mdm/employment-data/employment-types/${selectedProfile.employmentTypeRef}`,
        color: 'cyan',
        icon: UserIcon,
        title: selectedProfile.employmentType?.value || 'Employment Type Details',
        description: 'View employment type requirements, benefits, and regulations'
      })
    }

    items.push(
      {
        redirectLink: `/mdm/employee-data/employees?jobProfile=${selectedProfile.id}`,
        color: 'purple',
        icon: UsersIcon,
        title: 'Associated Employees',
        description: 'View employees currently assigned to this job profile'
      },
      {
        redirectLink: `/mdm/job-structure-data/position-history?jobProfile=${selectedProfile.id}`,
        color: 'gray',
        icon: ReadCvLogoIcon,
        title: 'Position History',
        description: 'View historical data and changes for this job profile'
      }
    )

    return items
  }, [selectedProfile])

  if (error || jobLevelError) {
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

  if (
    (isLoading || jobLevelLoading || allTypesLoading) &&
    (jobProfiles.length === 0 ||
      jobLevelGroups.length === 0 ||
      employmentTypes.length === 0 ||
      contractTypes.length === 0)
  ) {
    return (
      <div data-testid={`${dataTestId}-Spinner`} className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spinner />
      </div>
    )
  }

  return (
    <Card data-testid={`${prefixDataTestId || ''}-JobProfilesTab`} className="gba:overflow-hidden">
      {!isLoading && !jobLevelLoading && !allTypesLoading && (
        <CardTabHeaderComponent
          addButton={
            <JobProfileForm
              childAddButton={
                <Button>
                  <PlusIcon />
                  Add Job Profile
                </Button>
              }
              prefixDataTestId={dataTestId}
              accessToken={context.accessToken}
              refetch={refetch}
              jobFunctions={jobFunctions}
              jobLevelGroups={jobLevelGroups}
              contractTypes={contractTypes}
              employmentTypes={employmentTypes}
            />
          }
          cardTitle={`${t('hr.job_profiles', 'Job Profiles')} (${jobProfiles.length})`}
          cardDescription="Manage job profiles and their classifications. Job profiles define the roles, responsibilities, and requirements for different positions"
        />
      )}

      <CardContent>
        <div className="gba:mb-6 gba:relative gba:max-w-sm">
          <Input
            placeholder="Search job profiles..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="gba:pl-10"
            data-testid={`${dataTestId}-search-input`}
          />
        </div>

        {(isLoading || jobLevelLoading || allTypesLoading) && jobProfiles.length === 0 ? (
          <div data-testid={`${dataTestId}`} className="gba:flex gba:justify-center gba:items-center gba:h-64">
            <Spinner />
          </div>
        ) : (
          renderJobProfilesTable()
        )}

        {selectedProfile && (
          <SheetWrapperComponent
            prefixDataTestId={dataTestId}
            isDrawerVisible={isDrawerVisible}
            onOpenChange={openStatus => {
              if (!openStatus) {
                setSelectedProfile(null)
              }
              setIsDrawerVisible(openStatus)
            }}
            title="Job Profile Details"
            titleIcon={FileCodeIcon}
            drawerItems={drawerItems}
            navigationItems={navigationItems}
            footerButtons={[
              <JobProfileForm
                childAddButton={
                  <Button>
                    <PencilSimpleLineIcon /> Edit
                  </Button>
                }
                prefixDataTestId={dataTestId}
                accessToken={context.accessToken}
                refetch={refetch}
                jobProfile={selectedProfile}
                jobFunctions={jobFunctions}
                jobLevelGroups={jobLevelGroups}
                contractTypes={contractTypes}
                employmentTypes={employmentTypes}
                defaultJobLevels={selectedJobLevelGroup?.jobLevels}
                jobLevelGroupRef={selectedJobLevelGroup?.id}
                isDrawerActive={isDrawerVisible}
                key={selectedProfile.id}
              />
            ]}
          />
        )}
      </CardContent>
    </Card>
  )
}

export { JobProfilesTab }
