import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  Accordion,
  Button,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  AlertDescription,
  Spinner,
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  DataTable,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
  DialogClose,
  Icon,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  ScrollArea,
  Progress,
  CardHeader,
  Toaster
} from '@newwork/nw-design-system'
import {
  EyeIcon,
  PencilSimpleLineIcon,
  XCircleIcon,
  KanbanIcon,
  UserPlusIcon,
  ArrowsDownUpIcon,
  WarningIcon,
  InfoIcon,
  CheckCircleIcon,
  ClockIcon,
  WallIcon,
  UsersIcon,
  MagnifyingGlassIcon
} from '@phosphor-icons/react'
import { EmployeeAllocationForm } from '@/business-apps/mdm/forms/employee-allocation-form'
import { AssignEmployeesDialog } from './components/AssignEmployeesDialog'
import { useProjects, useTeamAssignments, useCreateTeam, TeamEmployee } from '../hooks'
import { Project, ProjectStatusUI } from '../types'
import { VerticalTable, VerticalTableProps } from '../../generic-components/table/VerticalTable'
import CardTabHeaderComponent from '../../generic-components/card'
import { useTeams } from '../../organizational-data/hooks'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import { showProjectManager } from '../project-setup/ProjectSetup'
import { DebouncedInput } from '@/components/debounced-input/DebouncedInput'

export interface ProjectAllocationProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'ProjectAllocation'

// Helper function to get time status information for a project
const getProjectTimeStatus = (project: Project) => {
  const status = project.status

  if (status === ProjectStatusUI.Planned && project.daysUntilStart !== undefined) {
    const isOverdue = project.daysUntilStart < 0
    const daysText = isOverdue
      ? getTranslationFromI18nKeyAndLabel(
          'lowcoder:smart_project.time_status.days_ago',
          `${Math.abs(project.daysUntilStart)} days ago`,
          { days: Math.abs(project.daysUntilStart) }
        )
      : getTranslationFromI18nKeyAndLabel(
          'lowcoder:smart_project.time_status.days_until_start',
          `${project.daysUntilStart} days until start`,
          { days: project.daysUntilStart }
        )

    return {
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:smart_project.time_status.time_until_start',
        'Time Until Start'
      ),
      daysText: daysText,
      textColor: isOverdue ? 'gba:text-red-500' : 'gba:text-[#1890ff]',
      progressValue: isOverdue
        ? 100
        : project.daysUntilStart > 90
          ? 10
          : project.daysUntilStart > 30
            ? 30
            : project.daysUntilStart > 7
              ? 50
              : 70
    }
  }

  if (status === ProjectStatusUI.InProgress && project.daysUntilExpiry !== undefined) {
    const daysRemainingPattern = getTranslationFromI18nKeyAndLabel(
      'lowcoder:smart_project.time_status.days_remaining',
      `${project.daysUntilExpiry} days remaining`,
      { days: project.daysUntilExpiry }
    )
    const daysAgoPattern = getTranslationFromI18nKeyAndLabel(
      'lowcoder:smart_project.time_status.days_ago',
      `${Math.abs(project.daysUntilExpiry)} days ago`,
      { days: Math.abs(project.daysUntilExpiry) }
    )
    return {
      title: getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.time_status.time_remaining', 'Time Remaining'),
      daysText: project.daysUntilExpiry > 0 ? daysRemainingPattern : daysAgoPattern,
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

  if (status === ProjectStatusUI.Completed || status === ProjectStatusUI.Canceled) {
    return null
  }

  return null
}

// Employees Table Component
interface EmployeesTableProps {
  employees: TeamEmployee[]
  projectId: string
  teamName: string
  onRemoveClick: (employee: TeamEmployee, projectId: string, teamName: string) => void
  onEditClick: (employee: TeamEmployee, projectId: string) => void
  sorting: SortingState
  onSortingChange: (sorting: SortingState) => void
  dataTestId: string
}

const EmployeesTable: React.FC<EmployeesTableProps> = ({
  employees,
  projectId,
  teamName,
  onRemoveClick,
  onEditClick,
  sorting,
  onSortingChange,
  dataTestId
}) => {
  const columns: ColumnDef<TeamEmployee>[] = useMemo(
    () => [
      {
        id: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.table.name', 'Name')}
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const nameA = `${rowA.original.firstName || ''} ${rowA.original.lastName || ''}`.trim()
          const nameB = `${rowB.original.firstName || ''} ${rowB.original.lastName || ''}`.trim()
          return nameA.localeCompare(nameB)
        },
        cell: ({ row }) => {
          const employee = row.original
          const fullName =
            employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown'
          return <div className="gba:font-semibold">{fullName}</div>
        }
      },
      {
        accessorKey: 'jobPosition',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.table.job_position', 'Job Position')}
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const jobPosition = getValue()
          return jobPosition ? (jobPosition as string) : '-'
        }
      },
      {
        accessorKey: 'percentage',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.table.project_allocation', 'Project Allocation')}
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const percentage = getValue()
          return percentage !== undefined && percentage !== null ? `${percentage}%` : '-'
        }
      },
      {
        accessorKey: 'totalAllocationPercent',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.table.total_allocation', 'Total Allocation')}
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        cell: ({ getValue }) => {
          const totalAllocationObject = getValue() as {
            totalAllocationPercent: number | null
          } | null
          const totalAllocation = totalAllocationObject?.totalAllocationPercent
          return totalAllocation !== undefined && totalAllocation !== null ? `${totalAllocation}%` : '-'
        }
      },
      {
        id: 'actions',
        header: getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.table.actions', 'Actions'),
        enableSorting: false,
        enableHiding: true,
        cell: ({ row }) => {
          const employee = row.original

          return (
            <div className="gba:flex gba:items-center gba:gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditClick(employee, projectId)}
                      data-testid={`${dataTestId}-edit-employee-${employee.id}`}
                    >
                      <PencilSimpleLineIcon className="gba:h-4 gba:w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:smart_project.tooltip.edit_allocation',
                        'Edit Employee Allocation'
                      )}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveClick(employee, projectId, teamName)}
                      data-testid={`${dataTestId}-remove-employee-${employee.id}`}
                    >
                      <XCircleIcon className="gba:h-4 gba:w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:smart_project.tooltip.remove_employee',
                        'Remove Employee from Team'
                      )}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )
        }
      }
    ],
    [dataTestId, projectId, teamName, onRemoveClick, onEditClick]
  )

  return (
    <DataTable
      data={employees}
      columns={columns as ColumnDef<(typeof employees)[number]>[]}
      enableSorting
      enablePagination
      sorting={sorting}
      onSortingChange={onSortingChange}
    />
  )
}

const ProjectAllocation: React.FC<ProjectAllocationProps> = context => {
  const { t } = useTranslation()
  const { prefixDataTestId } = context
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)

  const { projects, accounts, isLoading, error, refetch, structureId } = useProjects(context, true)
  const { teams, refetch: refretchTeams } = useTeams(context)
  const { getTeamEmployees, removeEmployeeFromTeam } = useTeamAssignments(context.accessToken)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [accordionValue, setAccordionValue] = useState<string | string[]>([])
  const [teamEmployees, setTeamEmployees] = useState<Record<string, TeamEmployee[]>>({})
  const [loadingEmployees, setLoadingEmployees] = useState<Record<string, boolean>>({})
  const [employeeSorting, setEmployeeSorting] = useState<SortingState>([])
  const [isRemoveEmployeeOpen, setIsRemoveEmployeeOpen] = useState(false)
  const [selectedEmployeeForRemove, setSelectedEmployeeForRemove] = useState<{
    employee: TeamEmployee
    projectId: string
    teamName: string
  } | null>(null)
  const [isEditAllocationOpen, setIsEditAllocationOpen] = useState(false)
  const [selectedEmployeeForEdit, setSelectedEmployeeForEdit] = useState<{
    employee: TeamEmployee
    projectId: string
    teamId: string
    totalAllocationPercent: {
      id: string
      version: number
      totalAllocationPercent: number | null
    } | null
  } | null>(null)
  const [isAssignEmployeesOpen, setIsAssignEmployeesOpen] = useState(false)
  const [selectedProjectForAssign, setSelectedProjectForAssign] = useState<{
    projectId: string
    teamId: string
  } | null>(null)
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false)
  const [selectedProjectForCreateTeam, setSelectedProjectForCreateTeam] = useState<Project | null>(null)

  // Hook for creating team
  const { isCreatingTeam, createTeamForProject } = useCreateTeam({
    accessToken: context.accessToken,
    structureId,
    onSuccess: () => {
      refetch()
      refretchTeams()
      setIsCreateTeamOpen(false)
      setSelectedProjectForCreateTeam(null)
    }
  })

  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    const searchLower = searchTerm.toLowerCase()
    return projects.filter(
      project =>
        project.name.toLowerCase().includes(searchLower) ||
        (project.description && project.description.toLowerCase().includes(searchLower)) ||
        (project.status && project.status.toLowerCase().includes(searchLower)) ||
        (project.projectType && project.projectType.toLowerCase().includes(searchLower)) ||
        (accounts.find(acc => acc.id === project.customerId)?.name || '').toLowerCase().includes(searchLower)
    )
  }, [projects, searchTerm, accounts])

  useEffect(() => {
    if (selectedProject) {
      const updatedSelectedProject = projects.find(project => project.id === selectedProject.id)

      if (updatedSelectedProject) {
        setSelectedProject(updatedSelectedProject)
      }
    }
  }, [projects, selectedProject])

  // Fetch team employees for a specific project
  const fetchTeamEmployees = useCallback(
    async (projectId: string) => {
      // Check if we already have employees for this project or are currently loading
      if (teamEmployees[projectId] || loadingEmployees[projectId]) {
        return
      }

      const project = projects.find(p => p.id === projectId)
      const teamId = project?.matrixTeam?.matrixId

      if (!teamId) {
        return
      }

      setLoadingEmployees(prev => ({ ...prev, [projectId]: true }))

      try {
        const employees = await getTeamEmployees(teamId)
        setTeamEmployees(prev => ({ ...prev, [projectId]: employees }))
      } catch (error) {
        console.error(`Error fetching employees for project ${projectId}:`, error)
        setTeamEmployees(prev => ({ ...prev, [projectId]: [] }))
      } finally {
        setLoadingEmployees(prev => {
          const updated = { ...prev }
          delete updated[projectId]
          return updated
        })
      }
    },
    [getTeamEmployees, teamEmployees, loadingEmployees, projects]
  )

  // Fetch team employees when accordion item is expanded
  useEffect(() => {
    const expandedIds = Array.isArray(accordionValue) ? accordionValue : [accordionValue].filter(Boolean)

    expandedIds.forEach(projectId => {
      fetchTeamEmployees(projectId)
    })
  }, [accordionValue, fetchTeamEmployees])

  const handleViewProject = (record: Project) => {
    setSelectedProject(record)
    setDrawerVisible(true)
  }

  const handleRemoveClick = useCallback((employee: TeamEmployee, projectId: string, teamName: string) => {
    setSelectedEmployeeForRemove({
      employee,
      projectId,
      teamName
    })
    setIsRemoveEmployeeOpen(true)
  }, [])

  const handleEditAllocationClick = useCallback(
    (employee: TeamEmployee, projectId: string) => {
      const project = projects.find(p => p.id === projectId)
      const teamId = project?.matrixTeam?.matrixId

      if (!teamId) {
        console.error('No team ID found for project:', projectId)
        return
      }

      setSelectedEmployeeForEdit({
        employee,
        projectId,
        teamId,
        totalAllocationPercent: employee.totalAllocationPercent ?? null
      })
      setIsEditAllocationOpen(true)
    },
    [projects]
  )

  const handleAssignEmployeesClick = useCallback(
    (projectId: string) => {
      const project = projects.find(p => p.id === projectId)
      const teamId = project?.matrixTeam?.matrixId

      if (!teamId) {
        console.error('No team ID found for project:', projectId)
        return
      }

      setSelectedProjectForAssign({ projectId, teamId })
      setIsAssignEmployeesOpen(true)
    },
    [projects]
  )

  const handleCreateTeamClick = useCallback((project: Project) => {
    setSelectedProjectForCreateTeam(project)
    setIsCreateTeamOpen(true)
  }, [])

  const handleCreateTeam = useCallback(async () => {
    if (!selectedProjectForCreateTeam) return
    await createTeamForProject(selectedProjectForCreateTeam)
  }, [selectedProjectForCreateTeam, createTeamForProject])

  const refreshAllExpandedProjects = useCallback(async () => {
    const expandedIds = Array.isArray(accordionValue) ? accordionValue : [accordionValue].filter(Boolean)

    // If no projects are expanded, just clear all cache
    if (expandedIds.length === 0) {
      setTeamEmployees({})
      return
    }

    // Get all teamIds for expanded projects
    const projectTeamPairs = expandedIds
      .map(projectId => {
        const project = projects.find(p => p.id === projectId)
        const teamId = project?.matrixTeam?.matrixId
        return teamId ? { projectId, teamId } : null
      })
      .filter((pair): pair is { projectId: string; teamId: string } => pair !== null)

    // Fetch employees for all expanded projects in parallel
    try {
      const results = await Promise.all(
        projectTeamPairs.map(async ({ projectId, teamId }) => {
          const employees = await getTeamEmployees(teamId)
          return { projectId, employees }
        })
      )

      // Clear ALL cache and set only expanded projects with fresh data
      // Collapsed projects will re-fetch when expanded again
      setTeamEmployees(() => {
        const freshCache: Record<string, TeamEmployee[]> = {}
        results.forEach(({ projectId, employees }) => {
          freshCache[projectId] = employees
        })
        return freshCache
      })
    } catch (error) {
      console.error('Error refreshing expanded projects:', error)
    }
  }, [accordionValue, projects, getTeamEmployees])

  const handleConfirmRemoveEmployee = useCallback(async () => {
    if (!selectedEmployeeForRemove) return

    const { employee } = selectedEmployeeForRemove

    if (!employee.teamAssignmentId) {
      console.error('No team assignment ID found for employee:', employee.id)
      setIsRemoveEmployeeOpen(false)
      setSelectedEmployeeForRemove(null)
      return
    }

    try {
      await removeEmployeeFromTeam(employee)

      // Refresh all expanded projects to sync totalAllocationPercent
      await refreshAllExpandedProjects()
    } catch (error) {
      console.error('Error removing employee from team:', error)
    } finally {
      setIsRemoveEmployeeOpen(false)
      setSelectedEmployeeForRemove(null)
    }
  }, [selectedEmployeeForRemove, removeEmployeeFromTeam, refreshAllExpandedProjects])

  const handleAllocationUpdated = useCallback(async () => {
    if (!selectedEmployeeForEdit) return

    try {
      // Refresh all expanded projects to sync totalAllocationPercent
      await refreshAllExpandedProjects()
    } catch (error) {
      console.error('Error refreshing employees after allocation update:', error)
    }
  }, [selectedEmployeeForEdit, refreshAllExpandedProjects])

  const handleAssignComplete = useCallback(async () => {
    if (!selectedProjectForAssign) return

    try {
      // Refresh all expanded projects to sync totalAllocationPercent
      await refreshAllExpandedProjects()
    } catch (error) {
      console.error('Error refreshing employees after assignment:', error)
    }
    setSelectedProjectForAssign(null)
  }, [selectedProjectForAssign, refreshAllExpandedProjects])

  const inactiveStatusIcon = useCallback((status: ProjectStatusUI) => {
    if (status === ProjectStatusUI.OnHold) return <WarningIcon />
    if (status === ProjectStatusUI.Planned) return <ClockIcon />
    if (status === ProjectStatusUI.Completed || status === ProjectStatusUI.Canceled) return <XCircleIcon />
    return <ClockIcon />
  }, [])

  const inactiveStatusColor = useCallback((status: ProjectStatusUI) => {
    if (status === ProjectStatusUI.OnHold) return 'gba:text-[#f5222d]'
    if (status === ProjectStatusUI.Planned) return 'gba:text-[#1890ff]'
    if (status === ProjectStatusUI.Completed || status === ProjectStatusUI.Canceled) return 'gba:text-muted-foreground'
    return 'gba:text-[#fa8c16]'
  }, [])

  const groupItems = useMemo(
    () =>
      filteredProjects.map(project => {
        return {
          id: project.id,
          title: project.name,
          description: project.description ?? '-',
          buttons: [
            {
              icon: () => (
                <Button
                  variant="ghost"
                  onClick={() => handleViewProject(project)}
                  data-testid={`${prefixDataTestId}-view-${project.id}`}
                >
                  <EyeIcon />
                </Button>
              ),
              onClick: () => {}
            },
            {
              icon: () => {
                const hasTeam = !!project.matrixTeam?.matrixId
                return (
                  <Button
                    variant="ghost"
                    onClick={e => {
                      e.stopPropagation()
                      if (hasTeam) {
                        handleAssignEmployeesClick(project.id)
                      } else {
                        handleCreateTeamClick(project)
                      }
                    }}
                    data-testid={`${prefixDataTestId}-${hasTeam ? 'assign-employees' : 'add-team'}-${project.id}`}
                  >
                    {hasTeam ? <UserPlusIcon /> : <UsersIcon />}
                  </Button>
                )
              },
              onClick: () => {}
            }
          ],
          content: (
            <div className="gba:space-y-2">
              <div className="gba:text-sm gba:flex gba:gap-2 gba:items-center">
                <h1 className="gba:text-sm gba:text-gray-500">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.team_name', 'Team Name: ')}
                </h1>
                <h2 className="gba:text-sm gba:font-semibold">
                  {project.matrixTeam?.matrixName ??
                    teams.find(team => team.id === project.matrixTeam?.matrixId)?.name ??
                    '-'}
                </h2>
              </div>

              {/* Team Employees Section */}
              <div className="gba:mt-4">
                <h3 className="gba:text-sm gba:font-semibold gba:mb-2">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:smart_project.assigned_employees',
                    'Assigned Employees:'
                  )}
                </h3>
                {loadingEmployees[project.id] ? (
                  <div className="gba:flex gba:items-center gba:gap-2 gba:py-2">
                    <Spinner size="sm" />
                    <span className="gba:text-sm gba:text-muted-foreground">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:smart_project.loading_employees',
                        'Loading employees...'
                      )}
                    </span>
                  </div>
                ) : teamEmployees[project.id] && teamEmployees[project.id].length > 0 ? (
                  <EmployeesTable
                    employees={teamEmployees[project.id]}
                    projectId={project.id}
                    teamName={
                      project.matrixTeam?.matrixName ??
                      teams.find(team => team.id === project.matrixTeam?.matrixId)?.name ??
                      getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.unknown_team', 'Unknown Team')
                    }
                    onRemoveClick={handleRemoveClick}
                    onEditClick={handleEditAllocationClick}
                    sorting={employeeSorting}
                    onSortingChange={setEmployeeSorting}
                    dataTestId={dataTestId}
                  />
                ) : (
                  <div className="gba:text-sm gba:text-muted-foreground gba:py-2">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:smart_project.no_employees_assigned',
                      'No employees assigned to this team'
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        }
      }),
    [
      filteredProjects,
      accounts,
      refetch,
      context.accessToken,
      prefixDataTestId,
      teams,
      teamEmployees,
      loadingEmployees,
      handleViewProject,
      handleRemoveClick,
      handleEditAllocationClick,
      handleAssignEmployeesClick,
      handleCreateTeamClick,
      employeeSorting
    ]
  )

  const drawerItems = useMemo(() => {
    if (!selectedProject) return []
    const account = accounts.find(account => account.id === selectedProject.customerId)
    const items: VerticalTableProps[] = [
      {
        icon: <InfoIcon />,
        title: getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.project_information', 'Project Information'),
        verticalTable: true,
        items: [
          {
            label: getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.label.name', 'Name'),
            value: selectedProject.name
          }
        ]
      }
    ]

    if (account) {
      items[0].items.push({
        label: getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.label.account', 'Account'),
        value: account.name
      })
    }

    if (selectedProject.validFrom) {
      items[0].items.push({
        label: getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.label.valid_from', 'Valid From'),
        value: selectedProject.formattedValidFrom || new Date(selectedProject.validFrom).toLocaleDateString()
      })
    }

    if (selectedProject.validTo) {
      items[0].items.push({
        label: getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.label.valid_until', 'Valid Until'),
        value: selectedProject.formattedValidTo || new Date(selectedProject.validTo).toLocaleDateString()
      })
    }

    items[0].items.push({
      value: selectedProject.matrixTeam?.teamMembersCount
        ? `${selectedProject.matrixTeam.teamMembersCount} ${selectedProject.matrixTeam.teamMembersCount > 1 ? 'members' : 'member'}`
        : 'No team assigned',
      label: 'Team Members'
    })

    if (selectedProject.projectManagerId) {
      items[0].items.push({
        value: showProjectManager(selectedProject),
        label: 'Project Manager'
      })
    }

    if (selectedProject.description) {
      items[0].items.push({
        label: getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.label.description', 'Description'),
        value: selectedProject.description
      })
    }

    return items
  }, [selectedProject, accounts])

  if (isLoading && projects.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6 gba:text-center">
        <Alert className="gba:w-full gba:!flex gba:justify-between gba:!items-center" variant="destructive">
          <AlertTitle className="gba:flex gba:items-center gba:justify-center gba:gap-2">
            <XCircleIcon className="h-4 w-4" />
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:smart_project.error.loading_projects',
              'Error Loading Projects'
            )}
          </AlertTitle>
          <AlertDescription>
            <Button size="sm" variant="destructive" onClick={() => refetch()}>
              {getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.error.retry', 'Retry')}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <Card data-testid={`${prefixDataTestId || ''}-ProjectAllocation`} className="gba:overflow-hidden">
      {!isLoading && (
        <CardTabHeaderComponent
          cardTitle={`${t('hr.project_allocation', 'Project Allocation')} (${projects.length})`}
          cardDescription={getTranslationFromI18nKeyAndLabel(
            'lowcoder:smart_project.description',
            'Manage projects and their details'
          )}
        />
      )}

      <CardContent className="gba:overflow-auto">
        <div className="gba:mb-6 gba:pt-4 gba:relative gba:max-w-sm">
          <DebouncedInput
            key="search-input"
            value={searchTerm}
            onChange={value => setSearchTerm(value)}
            placeholder="Search projects..."
            className="gba:w-full gba:pr-10"
            debounceDelay={300}
            ariaLabel="Search projects..."
            data-testid="asset-search-input"
            icon={
              <MagnifyingGlassIcon
                className="gba:w-4 gba:h-4 gba:text-muted-foreground"
                data-testid="asset-search-icon"
              />
            }
          />
        </div>

        <Accordion
          className="gba:w-full"
          value={accordionValue}
          onValueChange={value => setAccordionValue(value)}
          items={groupItems}
        />

        {selectedProject && (
          <Sheet
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
                  <SheetTitle>
                    {getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.project_details', 'Project Details')}
                  </SheetTitle>
                </div>
              </SheetHeader>

              <ScrollArea className="gba:flex-1 gba:px-4 gba:pb-4">
                <div className="gba:space-y-6">
                  <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                    <Card className="gba:!gap-2 gba:text-lg">
                      <CardHeader className="gba:text-sm gba:text-gray-400">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.project_type', 'Project Type')}
                      </CardHeader>
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
                      <CardHeader className="gba:text-gray-400 gba:text-sm">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.status', 'Status')}
                      </CardHeader>
                      <CardContent
                        className={`${selectedProject.status === ProjectStatusUI.InProgress ? 'gba:text-[#52c41a]' : inactiveStatusColor(selectedProject.status)} gba:items-center gba:!pt-0 gba:flex gba:gap-2`}
                      >
                        {selectedProject.status === ProjectStatusUI.InProgress ? (
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
                        <div className="gba:flex gba:justify-between gba:items-center">
                          <h1 className="gba:font-medium">{timeStatus.title}</h1>
                          <h1 className={`gba:font-medium gba:text-sm ${timeStatus.textColor}`}>
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
                        icon={item.icon}
                        key={`${item.title}-${index}`}
                        title={item.title}
                        verticalTable={item.verticalTable}
                        items={item.items}
                      />
                    )
                  })}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        )}

        {selectedEmployeeForRemove && isRemoveEmployeeOpen && (
          <Dialog open={isRemoveEmployeeOpen} onOpenChange={setIsRemoveEmployeeOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="gba:flex gba:items-center gba:gap-2">
                  <Icon icon={WarningIcon} className="gba:text-warning" />
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:smart_project.dialog.remove_employee_title',
                    'Remove Employee from Team'
                  )}
                </DialogTitle>
                <DialogDescription>
                  {selectedEmployeeForRemove.employee.percentage !== undefined &&
                  selectedEmployeeForRemove.employee.percentage !== null ? (
                    <>
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:smart_project.dialog.remove_employee_with_allocation',
                        `Are you sure you want to remove ${
                          selectedEmployeeForRemove.employee.fullName ||
                          `${selectedEmployeeForRemove.employee.firstName || ''} ${selectedEmployeeForRemove.employee.lastName || ''}`.trim()
                        } from ${selectedEmployeeForRemove.teamName}? The allocated percentage (${selectedEmployeeForRemove.employee.percentage}%) will also be removed.`,
                        {
                          employee:
                            selectedEmployeeForRemove.employee.fullName ||
                            `${selectedEmployeeForRemove.employee.firstName || ''} ${selectedEmployeeForRemove.employee.lastName || ''}`.trim(),
                          team: selectedEmployeeForRemove.teamName,
                          percentage: selectedEmployeeForRemove.employee.percentage
                        }
                      )}
                    </>
                  ) : (
                    <>
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:smart_project.dialog.remove_employee',
                        `Are you sure you want to remove ${
                          selectedEmployeeForRemove.employee.fullName ||
                          `${selectedEmployeeForRemove.employee.firstName || ''} ${selectedEmployeeForRemove.employee.lastName || ''}`.trim()
                        } from ${selectedEmployeeForRemove.teamName}?`,
                        {
                          employee:
                            selectedEmployeeForRemove.employee.fullName ||
                            `${selectedEmployeeForRemove.employee.firstName || ''} ${selectedEmployeeForRemove.employee.lastName || ''}`.trim(),
                          team: selectedEmployeeForRemove.teamName
                        }
                      )}
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" onClick={() => setIsRemoveEmployeeOpen(false)}>
                    {getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.button.cancel', 'Cancel')}
                  </Button>
                </DialogClose>
                <Button variant="destructive" onClick={handleConfirmRemoveEmployee}>
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:smart_project.button.remove_employee',
                    'Remove Employee'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {selectedEmployeeForEdit && isEditAllocationOpen && (
          <EmployeeAllocationForm
            totalAllocationPercent={selectedEmployeeForEdit.totalAllocationPercent}
            employee={selectedEmployeeForEdit.employee}
            teamId={selectedEmployeeForEdit.teamId}
            structureId={structureId}
            accessToken={context.accessToken}
            refetch={handleAllocationUpdated}
            open={isEditAllocationOpen}
            setOpen={setIsEditAllocationOpen}
            onSubmit={() => {
              setIsEditAllocationOpen(false)
              setSelectedEmployeeForEdit(null)
            }}
          />
        )}

        {selectedProjectForAssign && isAssignEmployeesOpen && (
          <AssignEmployeesDialog
            teamId={selectedProjectForAssign.teamId}
            structureId={structureId}
            accessToken={context.accessToken}
            open={isAssignEmployeesOpen}
            onOpenChange={setIsAssignEmployeesOpen}
            onAssignComplete={handleAssignComplete}
            prefixDataTestId={dataTestId}
          />
        )}

        {selectedProjectForCreateTeam && isCreateTeamOpen && (
          <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="gba:flex gba:items-center gba:gap-2">
                  <Icon icon={WarningIcon} className="gba:text-warning" />
                  {getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.dialog.create_team_title', 'Create Team')}
                </DialogTitle>
                <DialogDescription>
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:smart_project.dialog.create_team',
                    `Are you sure you want to create a team for project "${selectedProjectForCreateTeam.name}"?`,
                    { project: selectedProjectForCreateTeam.name }
                  )}
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
                    {getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.button.cancel', 'Cancel')}
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
                      {getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.button.creating', 'Creating...')}
                    </>
                  ) : (
                    getTranslationFromI18nKeyAndLabel('lowcoder:smart_project.button.create', 'Create')
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
      <Toaster />
    </Card>
  )
}

export default ProjectAllocation
