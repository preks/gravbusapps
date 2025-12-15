import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { env } from '@/common/env/EnvUtils'
import { Project, ProjectData, ProjectStatusBE, ProjectStatusUI, ProjectTypeBE } from '../types'

// Default pagination values
const DEFAULT_PAGE_SIZE = 10
const DEFAULT_CURRENT_PAGE = 1

const ORGCHART_BASE_URL = `${env('NEXT_PUBLIC_ORGCHART_API_URL')}/orgchart/api/v1`
// GraphQL query for projects with pagination
export const GET_PROJECTS_DATA = (
  structureId: string,
  limit: number,
  offset: number,
  search?: string,
  onlyActiveProjects: boolean = false
): string => {
  const searchCondition = search
    ? `, _or: [
        { name: { _ilike: "%${search}%" } },
        { description: { _ilike: "%${search}%" } },
      ]`
    : ''

  const activeProjectsCondition = onlyActiveProjects ? `, status: { _in: ["IN_PROGRESS", "ON_HOLD", "PLANNED"] }` : ''

  return `query getProjects {
    Project(
      where: {
        isDeleted: { _eq: false }
        structureId: { _eq: "${structureId}" }
        ${searchCondition}
        ${activeProjectsCondition}
      }
      limit: ${limit}
      offset: ${offset}
      orderBy: { name: ASC }
    ) {
      id
      name
      description
      hoursBudget
      projectType
      status
      customerId
      projectManagerId
      matrixUnitId
      validFrom
      validTo
    }
    ProjectAggregate(
      where: {
        isDeleted: { _eq: false }
        structureId: { _eq: "${structureId}" }
        ${searchCondition}
      }
    ) {
      aggregate {
        count
      }
    }
  }`
}

// GraphQL response type for projects
export interface ProjectsGraphQLResponse {
  Project?: Array<{
    id: string
    name: string
    description?: string
    hoursBudget?: number | null
    projectType: ProjectTypeBE
    status?: ProjectStatusBE | null
    customerId?: string
    projectManagerId?: string
    matrixUnitId?: string
    validFrom?: string
    validTo?: string
  }>
  ProjectAggregate?: {
    aggregate: {
      count: number
    }
  }
}

// GraphQL query for accounts
export const GET_ACCOUNTS_DATA = (): string => {
  return `query getAccounts {
    Account(where: {isDeleted: {_eq: false}}, orderBy: {name: ASC}) {
      id
      name
    }
  }`
}

// GraphQL query for employees (project managers) by IDs - batch query
export const GET_EMPLOYEES_BY_IDS = (employeeIds: string[]): string => {
  const idsString = employeeIds.map(id => `"${id}"`).join(', ')
  return `query getEmployeesByIds {
    Employee(where: { id: { _in: [${idsString}] } }) {
      id
      firstName
      lastName
      displayName
      pictureThumbnail
    }
  }`
}

// GraphQL query for matrix unit member counts - fetches assignments to count per matrix
export const GET_MATRIX_MEMBER_COUNTS = (matrixUnitIds: string[]): string => {
  const idsString = matrixUnitIds.map(id => `"${id}"`).join(', ')
  return `query getMatrixMemberCounts {
    EmployeeMatrixUnit(where: { matrixUnitId: { _in: [${idsString}] } }) {
      matrixUnitId
    }
  }`
}

export type AccountData = {
  Account?: {
    id: string
    name: string
  }[]
  error?: {
    status: number | null
    message: string | null
  }
}

export type Account = {
  id: string
  name: string
}

// Employee type for project managers
export interface EmployeeData {
  id: string
  firstName?: string
  lastName?: string
  displayName?: string
  pictureThumbnail?: string
}

export interface EmployeesGraphQLResponse {
  Employee?: EmployeeData[]
}

// Matrix unit member assignment
export interface MatrixMemberCountsResponse {
  EmployeeMatrixUnit?: Array<{
    matrixUnitId: string
  }>
}

// Helper function to transform BE status format to UI format
const transformStatus = (beStatus?: ProjectStatusBE): ProjectStatusUI => {
  if (!beStatus) {
    return ProjectStatusUI.InProgress
  }

  switch (beStatus) {
    case ProjectStatusBE.PLANNED:
      return ProjectStatusUI.Planned
    case ProjectStatusBE.IN_PROGRESS:
      return ProjectStatusUI.InProgress
    case ProjectStatusBE.ON_HOLD:
      return ProjectStatusUI.OnHold
    case ProjectStatusBE.CANCELLED:
      return ProjectStatusUI.Canceled
    case ProjectStatusBE.COMPLETED:
      return ProjectStatusUI.Completed
    default:
      return ProjectStatusUI.InProgress
  }
}

// Transform API project data to UI-friendly Project interface
const transformProject = (projectData: ProjectData): Project => {
  const now = new Date()
  let status: ProjectStatusUI = ProjectStatusUI.InProgress
  let isActive = true
  let daysUntilExpiry: number | undefined
  let daysUntilStart: number | undefined
  let daysDelayed: number | undefined
  let formattedValidTo: string | undefined
  let formattedValidFrom: string | undefined

  // Format validFrom date
  if (projectData.validFrom) {
    const validFromDate = new Date(projectData.validFrom)
    formattedValidFrom = validFromDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
    const timeDiffFrom = validFromDate.getTime() - now.getTime()
    daysUntilStart = Math.ceil(timeDiffFrom / (1000 * 3600 * 24))
  }

  // Format validTo date
  if (projectData.validTo) {
    const validToDate = new Date(projectData.validTo)
    formattedValidTo = validToDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
    const timeDiffTo = validToDate.getTime() - now.getTime()
    daysUntilExpiry = Math.ceil(timeDiffTo / (1000 * 3600 * 24))
  }

  // Calculate status: Priority 1 - Use status from BE if available
  if (projectData.status) {
    status = transformStatus(projectData.status)
    isActive =
      status === ProjectStatusUI.InProgress || status === ProjectStatusUI.OnHold || status === ProjectStatusUI.Planned
  } else {
    // Default to In Progress if no status from BE
    status = ProjectStatusUI.InProgress
    isActive = true
  }

  return {
    id: projectData.id,
    name: projectData.name,
    description: projectData.description,
    validFrom: projectData.validFrom,
    validTo: projectData.validTo,
    structureId: projectData.structureId,
    projectType: projectData.projectType,
    customerId: projectData.customerId,
    projectManagerId: projectData.projectManagerId,
    manager: undefined,
    matrixTeam: projectData.matrixUnitId ? { matrixId: projectData.matrixUnitId } : undefined,
    status,
    isActive,
    daysUntilExpiry,
    daysUntilStart,
    daysDelayed,
    formattedValidTo,
    formattedValidFrom,
    hoursBudget: projectData.hoursBudget
  }
}

export const useProjects = (context: BusinessAppContextProps, onlyActiveProjects: boolean = false) => {
  const [projects, setProjects] = useState<Project[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const structureId = useRef<string>(context.additionalData?.structureId || 'active')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Pagination state
  const [totalCount, setTotalCount] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(DEFAULT_CURRENT_PAGE)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)

  const restClient = useRestClient(ORGCHART_BASE_URL)
  const graphqlClient = useGraphqlClient(context.accessToken)

  // Fetch projects using GraphQL with pagination
  const fetchProjects = useCallback(
    async (limit: number, offset: number, search?: string): Promise<{ projects: Project[]; totalCount: number }> => {
      try {
        if (!structureId.current) {
          throw new Error('Structure ID is required to fetch projects')
        }

        const getStructureResponse = await restClient.get(`/structures/${structureId.current}`, {
          params: {
            isPlanningMode: false
          },
          headers: {
            Authorization: `Bearer ${context.accessToken}`
          }
        })
        structureId.current = getStructureResponse.structure.structureId
        // structureId.current = '4ff76a51-551d-4d5a-8e50-28ef08c6ab67'

        const query = GET_PROJECTS_DATA(structureId.current, limit, offset, search, onlyActiveProjects)
        const result = await graphqlClient.request<ProjectsGraphQLResponse>(query)

        if (result.Project) {
          const transformedProjects = result.Project.map(project => {
            // Convert GraphQL response to ProjectData format for transformProject
            const projectData: ProjectData = {
              id: project.id,
              name: project.name,
              description: project.description,
              validFrom: project.validFrom,
              validTo: project.validTo,
              structureId: structureId.current,
              projectType: project.projectType,
              customerId: project.customerId,
              projectManagerId: project.projectManagerId,
              status: project.status,
              matrixUnitId: project.matrixUnitId,
              hoursBudget: project.hoursBudget
            }
            return transformProject(projectData)
          })

          const totalCount = result.ProjectAggregate?.aggregate?.count || 0

          return {
            projects: transformedProjects,
            totalCount
          }
        }

        return {
          projects: [],
          totalCount: 0
        }
      } catch (error) {
        console.error('Error fetching projects:', error)
        throw new Error('Failed to fetch projects')
      }
    },
    [graphqlClient]
  )

  // Fetch accounts using GraphQL
  const fetchAccounts = useCallback(async (): Promise<Account[]> => {
    try {
      const query = GET_ACCOUNTS_DATA()
      const result = await graphqlClient.request<AccountData>(query)

      if (result.Account) {
        return result.Account
      }

      return []
    } catch (error) {
      console.error('Error fetching accounts:', error)
      throw error
    }
  }, [graphqlClient])

  // Fetch employees (project managers) by IDs - batch query
  const fetchEmployeesByIds = useCallback(
    async (employeeIds: string[]): Promise<Map<string, EmployeeData>> => {
      if (employeeIds.length === 0) {
        return new Map()
      }

      try {
        const query = GET_EMPLOYEES_BY_IDS(employeeIds)
        const result = await graphqlClient.request<EmployeesGraphQLResponse>(query)

        const employeeMap = new Map<string, EmployeeData>()
        if (result.Employee) {
          result.Employee.forEach(emp => {
            employeeMap.set(emp.id, emp)
          })
        }
        return employeeMap
      } catch (error) {
        console.error('Error fetching employees:', error)
        return new Map()
      }
    },
    [graphqlClient]
  )

  // Fetch matrix unit member counts - batch query
  const fetchMatrixMemberCounts = useCallback(
    async (matrixUnitIds: string[]): Promise<Map<string, number>> => {
      if (matrixUnitIds.length === 0) {
        return new Map()
      }

      try {
        const query = GET_MATRIX_MEMBER_COUNTS(matrixUnitIds)
        const result = await graphqlClient.request<MatrixMemberCountsResponse>(query)

        // Count members per matrix unit
        const countMap = new Map<string, number>()
        if (result.EmployeeMatrixUnit) {
          result.EmployeeMatrixUnit.forEach(assignment => {
            const currentCount = countMap.get(assignment.matrixUnitId) || 0
            countMap.set(assignment.matrixUnitId, currentCount + 1)
          })
        }
        return countMap
      } catch (error) {
        console.error('Error fetching matrix member counts:', error)
        return new Map()
      }
    },
    [graphqlClient]
  )

  // Load initial data
  const loadData = useCallback(
    async (search?: string) => {
      setIsLoading(true)
      setError(null)

      try {
        // Calculate offset based on current page and page size
        const offset = (currentPage - 1) * pageSize

        // Step 1: Fetch projects and accounts in parallel
        const [projectsResult, accountsResult] = await Promise.all([
          fetchProjects(pageSize, offset, search),
          fetchAccounts()
        ])

        // Step 2: Extract unique IDs for batch queries
        const managerIds = [
          ...new Set(projectsResult.projects.map(p => p.projectManagerId).filter((id): id is string => Boolean(id)))
        ]
        const matrixUnitIds = [
          ...new Set(projectsResult.projects.map(p => p.matrixTeam?.matrixId).filter((id): id is string => Boolean(id)))
        ]

        // Step 3: Batch fetch employees and matrix member counts in parallel
        const [employeesMap, matrixCountsMap] = await Promise.all([
          fetchEmployeesByIds(managerIds),
          fetchMatrixMemberCounts(matrixUnitIds)
        ])

        // Step 4: Enrich projects with manager and team member data
        const enrichedProjects = projectsResult.projects.map(project => {
          const manager = project.projectManagerId ? employeesMap.get(project.projectManagerId) : undefined
          const teamMembersCount = project.matrixTeam?.matrixId
            ? matrixCountsMap.get(project.matrixTeam.matrixId)
            : undefined

          return {
            ...project,
            manager: manager
              ? {
                  firstName: manager.firstName,
                  lastName: manager.lastName,
                  displayName: manager.displayName,
                  pictureThumbnail: manager.pictureThumbnail
                }
              : undefined,
            matrixTeam: project.matrixTeam?.matrixId
              ? {
                  matrixId: project.matrixTeam.matrixId,
                  teamMembersCount
                }
              : undefined
          }
        })

        setProjects(enrichedProjects)
        setTotalCount(projectsResult.totalCount)
        setAccounts(accountsResult)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setError(errorMessage)
        console.error('Error loading projects:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [fetchProjects, fetchAccounts, fetchEmployeesByIds, fetchMatrixMemberCounts, currentPage, pageSize]
  )

  // Search projects - triggers BE query
  const handleSearch = useCallback((search: string) => {
    setSearchTerm(search)
    setCurrentPage(DEFAULT_CURRENT_PAGE) // Reset to first page on search
  }, [])

  // Filter projects locally (for additional client-side filtering if needed)
  const filterProjects = useCallback(
    (localSearchTerm: string = ''): Project[] => {
      if (!localSearchTerm) return projects

      const filteredAccounts = accounts.filter(account =>
        account.name?.toLowerCase().includes(localSearchTerm.toLowerCase())
      )

      return projects.filter(project => {
        const matchesSearch =
          project.name.toLowerCase().includes(localSearchTerm.toLowerCase()) ||
          (project.description && project.description.toLowerCase().includes(localSearchTerm.toLowerCase())) ||
          filteredAccounts.some(account => account.id === project.customerId)

        return matchesSearch
      })
    },
    [projects, accounts]
  )

  // Get projects by type
  const getProjectsByType = useCallback(
    (type: 'INTERNAL' | 'EXTERNAL'): Project[] => {
      return projects.filter(project => project.projectType === type)
    },
    [projects]
  )

  // Get active projects
  const getActiveProjects = useCallback((): Project[] => {
    return projects.filter(project => project.isActive)
  }, [projects])

  // Get delayed projects (legacy - no longer used with new statuses)
  const getDelayedProjects = useCallback((): Project[] => {
    return projects.filter(project => project.status === ProjectStatusUI.Canceled)
  }, [projects])

  // Get planned projects
  const getPlannedProjects = useCallback((): Project[] => {
    return projects.filter(project => project.status === ProjectStatusUI.Planned)
  }, [projects])

  // Search projects by name or description
  const searchProjects = useCallback(
    (query: string): Project[] => {
      const searchTerm = query.toLowerCase()
      return projects.filter(
        project =>
          project.name.toLowerCase().includes(searchTerm) ||
          (project.description && project.description.toLowerCase().includes(searchTerm))
      )
    },
    [projects]
  )

  // Get project by ID
  const getProjectById = useCallback(
    (id: string): Project | undefined => {
      return projects.find(project => project.id === id)
    },
    [projects]
  )

  const refetch = useCallback(
    (search?: string, newPage?: number, newPageSize?: number) => {
      // Update pagination state if provided
      if (newPage !== undefined) {
        setCurrentPage(newPage)
      }
      if (newPageSize !== undefined) {
        setPageSize(newPageSize)
      }
      return loadData(search ?? searchTerm)
    },
    [loadData, searchTerm]
  )

  // Load data on mount and when access token, pagination, or search changes
  useEffect(() => {
    if (context.accessToken) {
      loadData(searchTerm)
    }
  }, [context.accessToken, currentPage, pageSize, searchTerm, loadData])

  return {
    // Data
    projects,
    accounts,
    structureId: structureId.current,

    // State
    isLoading,
    error,

    // Pagination
    totalCount,
    currentPage,
    pageSize,

    // Search
    searchTerm,
    handleSearch,

    // Change pagination
    setCurrentPage,
    setPageSize,

    // Actions
    refetch,

    // Filter functions
    filterProjects,
    getProjectsByType,
    getActiveProjects,
    getDelayedProjects,
    getPlannedProjects,
    searchProjects,
    getProjectById,

    // Statistics
    totalProjects: totalCount,
    internalProjects: getProjectsByType('INTERNAL').length,
    externalProjects: getProjectsByType('EXTERNAL').length,
    activeProjects: getActiveProjects().length,
    delayedProjects: getDelayedProjects().length,
    plannedProjects: getPlannedProjects().length,

    // Raw fetch function for advanced usage
    fetchProjects
  }
}
