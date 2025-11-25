import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { env } from '@/common/env/EnvUtils'
import { Project, ProjectData } from '../types'

// Interface for API response with paging
export interface PaginatedProjectRecords {
  data: ProjectData[]
  paging: {
    offset: number
    totalRecords: number
    hasMore: boolean
  }
}

// Default pagination values
const DEFAULT_PAGE_SIZE = 20
const DEFAULT_CURRENT_PAGE = 1

const ORGCHART_BASE_URL = `${env('NEXT_PUBLIC_ORGCHART_API_URL')}/orgchart/api/v1`

// GraphQL query for accounts
export const GET_ACCOUNTS_DATA = (): string => {
  return `query getAccounts {
    Account(where: {isDeleted: {_eq: false}}, orderBy: {name: ASC}) {
      id
      name
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

// Transform API project data to UI-friendly Project interface
const transformProject = (projectData: ProjectData): Project => {
  const now = new Date()
  let status: 'Active' | 'Planned' | 'Delayed' | 'Closed' = 'Active'
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

  // Calculate status based on new rules
  // Priority 1: Closed status (overrides everything)
  if (projectData.projectStatus === 'Closed') {
    status = 'Closed'
    isActive = false
  } else if (projectData.validFrom) {
    const validFromDate = new Date(projectData.validFrom)
    const timeDiffFrom = validFromDate.getTime() - now.getTime()
    // Priority 2: Planned (validFrom is in the future)
    if (timeDiffFrom > 0) {
      status = 'Planned'
      isActive = false
    } else if (projectData.validTo) {
      const validToDate = new Date(projectData.validTo)
      const timeDiffTo = validToDate.getTime() - now.getTime()
      // Priority 3: Delayed (validTo has passed but not closed)
      if (timeDiffTo < 0) {
        status = 'Delayed'
        isActive = false
        daysDelayed = Math.abs(Math.ceil(timeDiffTo / (1000 * 3600 * 24)))
      } else {
        // Priority 4: Active (between validFrom and validTo)
        status = 'Active'
        isActive = true
      }
    } else {
      // No validTo, but validFrom has passed
      status = 'Active'
      isActive = true
    }
  } else if (projectData.validTo) {
    const validToDate = new Date(projectData.validTo)
    const timeDiffTo = validToDate.getTime() - now.getTime()
    // No validFrom, check validTo
    if (timeDiffTo < 0) {
      status = 'Delayed'
      isActive = false
      daysDelayed = Math.abs(Math.ceil(timeDiffTo / (1000 * 3600 * 24)))
    } else {
      status = 'Active'
      isActive = true
    }
  } else {
    // No dates, default to Active
    status = 'Active'
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
    projectStatus: projectData.projectStatus,
    manager: projectData.manager,
    matrixTeam: projectData.matrixTeam,
    status,
    isActive,
    daysUntilExpiry,
    daysUntilStart,
    daysDelayed,
    formattedValidTo,
    formattedValidFrom
  }
}

export const useProjects = (context: BusinessAppContextProps) => {
  const [projects, setProjects] = useState<Project[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const structureId = useRef<string>(context.additionalData?.structureId || 'active')

  // Pagination state
  const [totalCount, setTotalCount] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(DEFAULT_CURRENT_PAGE)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)

  const restClient = useRestClient(ORGCHART_BASE_URL)
  const graphqlClient = useGraphqlClient(context.accessToken)

  // Fetch projects from orgchart API
  const fetchProjects = useCallback(
    async (validTo?: string, offset?: number): Promise<{ projects: Project[]; totalCount: number }> => {
      try {
        if (!structureId.current) {
          throw new Error('Structure ID is required to fetch projects')
        }

        const getStructureResponse = await restClient.get(`/structures/${structureId.current}`, {
          params: {
            nodeType: 'cost_center'
          },
          headers: {
            Authorization: `Bearer ${context.accessToken}`
          }
        })
        structureId.current = getStructureResponse.structure.structureId

        const params: Record<string, string | number> = {
          structureId: structureId.current
        }
        if (validTo) {
          params.valid_to = validTo
        }

        if (offset !== undefined) {
          params.offset = offset
        }

        const response = await restClient.get<PaginatedProjectRecords>('/projects', {
          params,
          headers: {
            Authorization: `Bearer ${context.accessToken}`
          }
        })

        // Extract projects and total count from the paginated response
        const projectResponse = response

        // Handle the response format with data and paging properties
        if (projectResponse && projectResponse.data && projectResponse.paging) {
          const transformedProjects = projectResponse.data.map(transformProject)
          const totalCount = projectResponse.paging.totalRecords

          return {
            projects: transformedProjects,
            totalCount
          }
        }

        // Fallback for backward compatibility or unexpected response format
        const projects = Array.isArray(projectResponse) ? projectResponse.map(transformProject) : []

        return {
          projects,
          totalCount: projects.length
        }
      } catch (error) {
        console.error('Error fetching projects:', error)
        throw new Error('Failed to fetch projects from orgchart API')
      }
    },
    [context.accessToken, restClient]
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

  // Load initial data
  const loadData = useCallback(
    async (validTo?: string) => {
      setIsLoading(true)
      setError(null)

      try {
        // Calculate offset based on current page and page size
        const offset = (currentPage - 1) * pageSize

        // Fetch projects and accounts in parallel
        const [projectsResult, accountsResult] = await Promise.all([fetchProjects(validTo, offset), fetchAccounts()])

        setProjects(projectsResult.projects)
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
    [fetchProjects, fetchAccounts, currentPage, pageSize]
  )

  // Filter projects by various criteria
  const filterProjects = useCallback(
    (searchTerm: string = ''): Project[] => {
      const filteredAccounts = accounts.filter(account =>
        account.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )

      return projects.filter(project => {
        // Search filter
        const matchesSearch =
          !searchTerm ||
          project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
          filteredAccounts.some(account => account.id === project.customerId)

        return matchesSearch
      })
    },
    [projects]
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

  // Get delayed projects
  const getDelayedProjects = useCallback((): Project[] => {
    return projects.filter(project => project.status === 'Delayed')
  }, [projects])

  // Get planned projects
  const getPlannedProjects = useCallback((): Project[] => {
    return projects.filter(project => project.status === 'Planned')
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
    (validTo?: string, newPage?: number, newPageSize?: number) => {
      // Update pagination state if provided
      if (newPage !== undefined) {
        setCurrentPage(newPage)
      }
      if (newPageSize !== undefined) {
        setPageSize(newPageSize)
      }
      return loadData(validTo)
    },
    [loadData]
  )

  // Load data on mount and when access token or pagination changes
  useEffect(() => {
    if (context.accessToken) {
      loadData()
    }
  }, [context.accessToken, currentPage, pageSize, loadData])

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
