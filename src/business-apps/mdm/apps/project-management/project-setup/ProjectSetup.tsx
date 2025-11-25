import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  EyeIcon,
  InfoIcon,
  LinkIcon,
  PlusIcon,
  XCircleIcon,
  PencilSimpleLineIcon,
  UsersIcon,
  CalendarBlankIcon,
  KanbanIcon,
  CheckCircleIcon,
  ClockIcon,
  WarningIcon,
  WallIcon,
  FileIcon,
  IdentificationCardIcon,
  DotsThreeIcon,
  TrashIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useDebounce } from '@/common/hooks/useDebounce'
import { useProjects } from '../hooks'
import { Project } from '../types'
import {
  DataTable,
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  Badge,
  Card,
  Input,
  CardContent,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
  Spinner,
  Progress,
  CardHeader,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  Icon,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@newwork/nw-design-system'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import ProjectForm from '@/business-apps/mdm/forms/project-form'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { NavigationLinkCards, NavigationLinkCardsProps } from '../../generic-components/card/NavigationLinkCards'
import { VerticalTable, VerticalTableProps } from '../../generic-components/table/VerticalTable'
import CardTabHeaderComponent from '../../generic-components/card'
import { DeleteButton } from '../../generic-components/delete-button/DeleteButton'

export interface ProjectSetupProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'ProjectSetup'
const ORGCHART_BASE_URL = `${env('NEXT_PUBLIC_ORGCHART_API_URL')}/orgchart/api/v1`

// Helper function to get time status information for a project
const getProjectTimeStatus = (project: Project) => {
  const status = project.status

  if (status === 'Planned' && project.daysUntilStart !== undefined) {
    return {
      title: 'Time Until Start',
      daysText: `${project.daysUntilStart} days until start`,
      textColor: 'gba:text-[#1890ff]',
      progressValue:
        project.daysUntilStart > 90 ? 10 : project.daysUntilStart > 30 ? 30 : project.daysUntilStart > 7 ? 50 : 70
    }
  }

  if (status === 'Delayed' && project.daysDelayed !== undefined) {
    return {
      title: 'Delay Status',
      daysText: `Delayed with ${project.daysDelayed} days`,
      textColor: 'gba:text-red-500',
      progressValue: 100
    }
  }

  if (status === 'Active' && project.daysUntilExpiry !== undefined) {
    return {
      title: 'Time Remaining',
      daysText:
        project.daysUntilExpiry > 0
          ? `${project.daysUntilExpiry} days remaining`
          : `${Math.abs(project.daysUntilExpiry)} days ago`,
      textColor: project.daysUntilExpiry > 0 ? '' : 'gba:text-red-500',
      progressValue:
        project.daysUntilExpiry <= 0
          ? 100
          : project.daysUntilExpiry > 90
            ? 25
            : project.daysUntilExpiry > 30
              ? 50
              : project.daysUntilExpiry > 7
                ? 75
                : 90
    }
  }

  if (status === 'Closed') {
    return null
  }

  return null
}

const ProjectSetup: React.FC<ProjectSetupProps> = ({ prefixDataTestId, ...context }) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const { t } = useTranslation()
  const restClient = useRestClient(ORGCHART_BASE_URL)

  // Data integration
  const { projects, accounts, isLoading, error, refetch, totalProjects, filterProjects, structureId } =
    useProjects(context)
  // Local state
  const [searchInput, setSearchInput] = useState('')

  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false)
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false)
  const [isCloseProjectOpen, setIsCloseProjectOpen] = useState(false)
  const [isRemoveProjectOpen, setIsRemoveProjectOpen] = useState(false)
  const [isCreatingTeam, setIsCreatingTeam] = useState(false)

  const showNavigationItems = false

  // Debounce search input
  const debouncedSearchTerm = useDebounce(searchInput, 300)

  useEffect(() => {
    if (selectedProject) {
      const updatedSelectedProject = projects.find(project => project.id === selectedProject.id)

      if (updatedSelectedProject) {
        setSelectedProject(updatedSelectedProject)
      }
    }
  }, [projects])

  // Filter projects based on search and filters
  const filteredProjects = useMemo(() => {
    return filterProjects(debouncedSearchTerm)
  }, [filterProjects, debouncedSearchTerm])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value)
  }, [])

  const inactiveStatusIcon = useCallback((status: string) => {
    if (status === 'Delayed') return <WarningIcon />
    if (status === 'Planned') return <ClockIcon />
    if (status === 'Closed') return <XCircleIcon />
    return <ClockIcon />
  }, [])

  const inactiveStatusColor = useCallback((status: string) => {
    if (status === 'Delayed') return 'gba:text-[#f5222d]'
    if (status === 'Planned') return 'gba:text-[#1890ff]'
    if (status === 'Closed') return 'gba:text-muted-foreground'
    return 'gba:text-[#fa8c16]'
  }, [])

  const actions = useMemo(() => {
    return [
      {
        id: 'view',
        label: 'View Project',
        icon: EyeIcon,
        onClick: (targetProject: Project) => handleView(targetProject)
      },
      {
        id: 'edit',
        label: 'Edit Project',
        icon: PencilSimpleLineIcon,
        onClick: (targetProject: Project) => {
          setSelectedProject(targetProject)
          setIsEditProjectOpen(true)
        }
      },
      {
        id: 'addTeam',
        label: 'Add Team',
        icon: PlusIcon,
        disabled: (targetProject: Project) => !!targetProject.matrixTeam?.matrixId,
        onClick: (targetProject: Project) => {
          setSelectedProject(targetProject)
          setIsCreateTeamOpen(true)
        }
      },
      {
        id: 'close',
        label: 'Close Project',
        icon: XCircleIcon,
        onClick: (targetProject: Project) => {
          setSelectedProject(targetProject)
          setIsCloseProjectOpen(true)
        }
      },
      {
        id: 'delete',
        label: 'Delete Project',
        icon: TrashIcon,
        onClick: (targetProject: Project) => {
          setSelectedProject(targetProject)
          setIsRemoveProjectOpen(true)
        }
      }
    ]
  }, [])

  const dataTable = useMemo(
    () =>
      filteredProjects.map(project => {
        const account = accounts.find(account => account.id === project.customerId)
        const projectManagerName =
          project.manager?.firstName || project.manager?.lastName
            ? `${project.manager.firstName || ''} ${project.manager.lastName || ''}`.trim()
            : undefined

        return {
          ...project,
          accountName: account?.name,
          projectManagerName
        }
      }),
    [filteredProjects, accounts]
  )

  const renderProjectsTable = () => {
    const columns: ColumnDef<Project>[] = [
      {
        accessorKey: 'projectType',
        header: 'Project Type',
        enableSorting: true,
        enableColumnFilter: true,
        cell: ({ getValue }) => {
          const projectType = getValue() as string
          const displayType = projectType
            ? projectType.charAt(0).toUpperCase() + projectType.slice(1).toLowerCase()
            : 'N/A'
          return (
            <div className="gba:flex gba:items-center">
              <Badge variant={getProjectTypeColor(projectType)}>{displayType}</Badge>
            </div>
          )
        }
      },
      {
        accessorKey: 'name',
        header: 'Project Name',
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
        accessorKey: 'projectManagerName',
        header: 'Project Manager',
        enableSorting: true,
        cell: ({ row }) => {
          const projectManagerName = (row.original as any).projectManagerName
          return (
            <div className="gba:font-semibold">
              {projectManagerName || <span className="gba:text-muted-foreground">-</span>}
            </div>
          )
        }
      },
      {
        accessorKey: 'accountName',
        header: 'Account',
        enableSorting: true,
        cell: ({ getValue }) => {
          const accountName = getValue()
          return (
            <div className="gba:font-semibold">
              {(accountName as string) || <span className="gba:text-muted-foreground">-</span>}
            </div>
          )
        }
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: true,
        cell: ({ getValue, row }) => {
          const status = getValue() as string
          const project = row.original
          let daysText: string | undefined

          if (status === 'Delayed' && project.daysDelayed !== undefined) {
            daysText = `Delayed with ${project.daysDelayed} days`
          } else if (status === 'Planned' && project.daysUntilStart !== undefined) {
            daysText = `${project.daysUntilStart} days until start`
          } else if (status === 'Active' && project.daysUntilExpiry !== undefined) {
            daysText =
              project.daysUntilExpiry > 0
                ? `${project.daysUntilExpiry} days left`
                : `${Math.abs(project.daysUntilExpiry)} days ago`
          } else if (status === 'Closed') {
            daysText = undefined
          }

          return (
            <div className="gba:flex gba:flex-col gba:gap-2">
              <Badge variant={getStatusColor(status)}>{status ?? 'N/A'}</Badge>
              {daysText && <div className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">{daysText}</div>}
            </div>
          )
        }
      },
      {
        accessorKey: 'validFrom',
        header: 'Planned Start',
        enableSorting: true,
        cell: ({ row }) => {
          const formattedDate = row.original.formattedValidFrom
          return (
            <div className="gba:flex gba:items-center">
              {formattedDate ? (
                <>
                  <CalendarBlankIcon className="gba:mr-1 gba:text-muted-foreground" />
                  <span>{formattedDate}</span>
                </>
              ) : (
                <span className="gba:text-muted-foreground gba:italic">-</span>
              )}
            </div>
          )
        }
      },
      {
        accessorKey: 'validTo',
        header: 'Planned End',
        enableSorting: true,
        cell: ({ row }) => {
          const formattedDate = row.original.formattedValidTo
          return (
            <div className="gba:flex gba:items-center">
              {formattedDate ? (
                <>
                  <CalendarBlankIcon className="gba:mr-1 gba:text-muted-foreground" />
                  <span>{formattedDate}</span>
                </>
              ) : (
                <span className="gba:text-muted-foreground gba:italic">No expiry</span>
              )}
            </div>
          )
        }
      },
      {
        accessorKey: 'description',
        header: 'Description',
        enableSorting: true,
        cell: ({ getValue }) => {
          const description = getValue()
          return <div>{description as string}</div>
        }
      },
      {
        id: 'actions',
        header: () => (
          <div className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start gba:min-w-[100px]">
            Actions
          </div>
        ),
        enableSorting: false,
        enableHiding: true,
        cell: ({ row }) => {
          const targetProject = projects.find(project => project.id === row.original.id)
          if (!targetProject) return null

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="nw:cursor-pointer">
                <Button variant="ghost" size="icon" className="nw:h-8 nw:w-8">
                  <Icon icon={DotsThreeIcon} decorative />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map(action => {
                  const isDisabled =
                    typeof action.disabled === 'function' ? action.disabled(targetProject) : (action.disabled ?? false)
                  return (
                    <DropdownMenuItem
                      key={action.id}
                      onClick={() => {
                        if (!isDisabled) {
                          action.onClick(targetProject)
                        }
                      }}
                      disabled={isDisabled}
                      className={isDisabled ? 'gba:cursor-not-allowed gba:opacity-50' : 'nw:cursor-pointer'}
                    >
                      {action.icon && (
                        <Icon icon={action.icon} size="sm" variant="regular" decorative className="nw:mr-2" />
                      )}
                      {action.label}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      }
    ]

    return (
      <DataTable
        data={dataTable}
        columns={columns as ColumnDef<(typeof dataTable)[number]>[]}
        enableSorting
        enablePagination
        sorting={sorting}
        onSortingChange={setSorting}
      />
    )
  }

  const drawerItems = useMemo(() => {
    if (!selectedProject) return []
    const account = accounts.find(account => account.id === selectedProject.customerId)
    const items: VerticalTableProps[] = [
      {
        icon: <InfoIcon />,
        title: 'Project Information',
        verticalTable: true,
        items: [
          {
            label: 'Name',
            value: selectedProject.name
          }
        ]
      }
    ]

    if (account) {
      items[0].items.push({
        label: 'Account',
        value: account.name
      })
    }

    if (selectedProject.validTo) {
      items[0].items.push({
        label: 'Valid Until',
        value: selectedProject.formattedValidTo || new Date(selectedProject.validTo).toLocaleDateString()
      })
    }

    if (selectedProject.description) {
      items[0].items.push({
        label: 'Description',
        value: selectedProject.description
      })
    }

    return items
  }, [selectedProject, accounts])

  const navigationItems = useMemo(() => {
    if (!selectedProject) return []

    const items: NavigationLinkCardsProps[] = [
      {
        redirectLink: `/project-management/tasks?projectId=${selectedProject.id}`,
        color: 'blue',
        icon: CheckCircleIcon,
        title: 'View Tasks & Milestones',
        description: 'Track project tasks and upcoming milestones'
      },
      {
        redirectLink: `/project-management/teams?projectId=${selectedProject.id}`,
        color: 'green',
        icon: UsersIcon,
        title: 'View Team Members',
        description: 'See all team members and roles assigned to this project'
      },
      {
        redirectLink: selectedProject.customerId ? `/customer-management/customers/${selectedProject.customerId}` : '#',
        color: 'purple',
        icon: IdentificationCardIcon,
        title: 'View Customer Details',
        description: 'View details about the customer for this project'
      },
      {
        redirectLink: `/project-management/reports?projectId=${selectedProject.id}`,
        color: 'cyan',
        icon: FileIcon,
        title: 'View Project Reports',
        description: 'Access project reports and analytics'
      }
    ]

    return items
  }, [selectedProject])

  const handleView = (targetProject: Project | undefined) => {
    if (!targetProject) return
    setSelectedProject(targetProject)
    setDrawerVisible(true)
  }

  const handleCreateTeam = useCallback(async () => {
    if (!selectedProject) return

    try {
      setIsCreatingTeam(true)

      const teamData = {
        name: selectedProject.name,
        description: selectedProject.description || '',
        rank: 0,
        structureId: structureId
      }

      await restClient.post('/matrix-units', teamData, {
        headers: { Authorization: `Bearer ${context.accessToken}` }
      })

      refetch()
      setIsCreateTeamOpen(false)
      setSelectedProject(null)
    } catch (error) {
      console.error('Error creating team:', error)
    } finally {
      setIsCreatingTeam(false)
    }
  }, [selectedProject, structureId, restClient, context.accessToken, refetch])

  const handleDelete = async (project: Project | undefined) => {
    if (!project) return

    await restClient.delete(`/projects/${project.id}`, {
      headers: { Authorization: `Bearer ${context.accessToken}` }
    })

    refetch()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'success'
      case 'Planned':
        return 'info'
      case 'Delayed':
        return 'destructive'
      case 'Closed':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const getProjectTypeColor = (type: string) => {
    return type === 'INTERNAL' ? 'info' : 'ext1'
  }

  if (isLoading) {
    return (
      <div
        data-testid={`${prefixDataTestId || ''}-ProjectSetup`}
        className="gba:bg-muted gba:min-h-full gba:p-6 gba:rounded-lg gba:flex gba:justify-center gba:items-center"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid={`${prefixDataTestId || ''}-ProjectSetup`}>
        <Alert className="gba:w-full gba:!flex gba:justify-between gba:!items-center" variant="destructive">
          <AlertTitle className="gba:flex gba:items-center gba:justify-center gba:gap-2">
            <XCircleIcon className="h-4 w-4" />
            Error Loading Projects
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
    <Card data-testid={`${prefixDataTestId || ''}-ProjectSetup`} className="gba:overflow-hidden">
      {!isLoading && (
        <CardTabHeaderComponent
          addButton={
            <ProjectForm
              childAddButton={
                <Button
                  variant="default"
                  onClick={event => event.stopPropagation()}
                  data-testid={`${prefixDataTestId || ''}-ProjectSetup-AddButton`}
                >
                  <PlusIcon /> Add Project
                </Button>
              }
              refetch={refetch}
              accessToken={context.accessToken}
              structureId={structureId}
              accounts={accounts}
            />
          }
          cardTitle={`${t('hr.project_setup', 'Project Setup')} (${totalProjects})`}
          cardDescription="Manage projects and their details"
        />
      )}
      <CardContent>
        {/* Filters */}
        <div className="gba:mb-6 gba:relative gba:max-w-sm">
          <Input
            placeholder="Search projects..."
            value={searchInput}
            onChange={handleSearchChange}
            className="gba:pl-10 gba:!w-80"
            data-testid={`${prefixDataTestId || ''}-ProjectSetup-SearchInput`}
          />
        </div>

        {renderProjectsTable()}

        {selectedProject && isEditProjectOpen && (
          <ProjectForm
            refetch={refetch}
            accessToken={context.accessToken}
            structureId={structureId}
            project={selectedProject}
            accounts={accounts}
            open={isEditProjectOpen}
            setOpen={setIsEditProjectOpen}
          />
        )}

        {selectedProject && isCreateTeamOpen && (
          <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="gba:flex gba:items-center gba:gap-2">
                  <Icon icon={WarningIcon} className="gba:text-warning" />
                  Create Team
                </DialogTitle>
                <DialogDescription>
                  {`Are you sure you want to create a team for project "${selectedProject.name}"?`}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateTeamOpen(false)}
                    disabled={isCreatingTeam}
                    data-testid={`${dataTestId}-create-team-cancel-button`}
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  onClick={handleCreateTeam}
                  disabled={isCreatingTeam}
                  data-testid={`${dataTestId}-create-team-confirm-button`}
                >
                  {isCreatingTeam ? (
                    <>
                      <Spinner size="sm" className="gba:mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {selectedProject && isCloseProjectOpen && (
          <Dialog open={isCloseProjectOpen} onOpenChange={setIsCloseProjectOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="gba:flex gba:items-center gba:gap-2">
                  <Icon icon={WarningIcon} className="gba:text-warning" />
                  Close Project
                </DialogTitle>
                <DialogDescription>{`Are you sure you want to close ${selectedProject?.name}?`}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" onClick={() => setIsCloseProjectOpen(false)}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  onClick={() => {
                    setIsCloseProjectOpen(false)
                  }}
                >
                  Close Project
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {selectedProject && isRemoveProjectOpen && (
          <DeleteButton
            onDelete={async () => {
              await handleDelete(selectedProject)
              setIsRemoveProjectOpen(false)
              setSelectedProject(null)
            }}
            itemName={selectedProject?.name ?? ''}
            itemTitle={'Project'}
            open={isRemoveProjectOpen}
            setOpen={setIsRemoveProjectOpen}
          />
        )}

        {selectedProject && (
          <Sheet
            title="Project Details"
            open={drawerVisible}
            onOpenChange={openStatus => {
              if (!openStatus) {
                setSelectedProject(null)
              }
              setDrawerVisible(openStatus)
            }}
          >
            <style>{`
              [data-slot='sheet-overlay'] {
                z-index: 1000 !important;
              }
              [data-slot='sheet-content'] {
                z-index: 1001 !important;
              }
              [data-slot='select-content'] {
                z-index: 1002 !important;
              }
              [data-slot='popover-content'] {
                z-index: 1002 !important;
              }
            `}</style>
            <SheetContent side="right" data-testid={`${dataTestId}-details-sheet`}>
              <SheetHeader>
                <div className="gba:flex gba:items-center gba:gap-2">
                  <KanbanIcon className="h-5 w-5" />
                  <SheetTitle>Project Details</SheetTitle>
                </div>
              </SheetHeader>

              <div className="gba:flex-1 gba:overflow-auto gba:px-4 gba:pb-4">
                <div className="gba:space-y-6">
                  <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                    <Card className="gba:!gap-2 gba:text-lg">
                      <CardHeader className="gba:text-sm gba:text-gray-400">Project Type</CardHeader>
                      <CardContent
                        className={`${selectedProject.projectType === 'INTERNAL' ? 'gba:text-[#1890ff]' : 'gba:text-[#722ed1]'} gba:!pt-0 gba:flex gba:items-center gba:gap-2`}
                      >
                        <WallIcon />
                        {selectedProject.projectType
                          ? selectedProject.projectType.charAt(0).toUpperCase() +
                            selectedProject.projectType.slice(1).toLowerCase()
                          : 'N/A'}
                      </CardContent>
                    </Card>

                    <Card className="gba:!gap-2 gba:text-lg">
                      <CardHeader className="gba:text-sm gba:text-gray-400">Status</CardHeader>
                      <CardContent
                        className={`${selectedProject.status === 'Active' ? 'gba:text-[#52c41a]' : inactiveStatusColor(selectedProject.status)} gba:!pt-0 gba:flex gba:items-center gba:gap-2`}
                      >
                        {selectedProject.status === 'Active' ? (
                          <CheckCircleIcon />
                        ) : (
                          inactiveStatusIcon(selectedProject.status)
                        )}
                        {selectedProject.status}
                      </CardContent>
                    </Card>
                  </div>
                  {(() => {
                    const timeStatus = getProjectTimeStatus(selectedProject)
                    if (!timeStatus) return null

                    return (
                      <div className="gba:mt-4">
                        <div className="gba:flex gba:items-center gba:justify-between">
                          <h1 className="gba:font-medium">{timeStatus.title}</h1>
                          <h1 className={`gba:text-sm gba:font-medium ${timeStatus.textColor}`}>
                            {timeStatus.daysText}
                          </h1>
                        </div>
                        <Progress value={timeStatus.progressValue} className="gba:mt-2" />
                      </div>
                    )
                  })()}

                  {drawerItems.map((item, index) => {
                    return (
                      <VerticalTable
                        key={`${item.title}-${index}`}
                        icon={item.icon}
                        title={item.title}
                        items={item.items}
                        verticalTable={item.verticalTable}
                      />
                    )
                  })}
                </div>
                {showNavigationItems && (
                  <div className="gba:mt-6">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:pb-4">
                      <LinkIcon className="gba:h-4 gba:w-4 gba:inline gba:mr-2" />
                      <span className="gba:text-base gba:font-semibold">Related Resources</span>
                    </div>

                    <div className="gba:grid gba:grid-cols-1 gba:gap-4">
                      {navigationItems.map((item, index) => {
                        return <NavigationLinkCards key={`${item.title}-${index}`} {...item} />
                      })}
                    </div>
                  </div>
                )}
              </div>
              <SheetFooter>
                <div className="gba:flex gba:justify-end gba:gap-2">
                  <ProjectForm
                    childAddButton={
                      <Button>
                        <PencilSimpleLineIcon /> Edit
                      </Button>
                    }
                    refetch={refetch}
                    accessToken={context.accessToken}
                    structureId={structureId}
                    project={selectedProject}
                    isDrawerActive={true}
                    accounts={accounts}
                  />

                  <SheetClose asChild>
                    <Button variant="outline">Close</Button>
                  </SheetClose>
                </div>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        )}
      </CardContent>
    </Card>
  )
}

export default ProjectSetup
