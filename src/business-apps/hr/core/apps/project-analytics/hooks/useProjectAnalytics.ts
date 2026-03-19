import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import dayjs from 'dayjs'
import {
  ProjectAnalyticsData,
  ProjectData,
  ProjectWorkingHoursEntry,
  KpiCardData,
  PortfolioMetrics,
  ProjectAnalyticsFilters
} from '../types'
import { GET_PROJECTS, GET_ALL_PROJECTS_WORKING_HOURS, GET_PROJECT_MANAGERS } from '../queries/projectAnalyticsQueries'
import {
  parseHoursFromText,
  calculateElapsedTimePercent,
  calculateBudgetConsumption,
  calculateBurnRate,
  determineRiskStatus,
  generateInsights,
  aggregateContributors,
  calculateWeeklyBurnRates,
  getDaysUntilDeadline
} from '../utils/calculations'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'

interface ProjectResponse {
  Project: ProjectData[]
  ProjectAggregate: {
    aggregate: {
      count: number
    }
  }
}

interface WorkingHoursResponse {
  EmployeeProjectWorkingHours: ProjectWorkingHoursEntry[]
}

interface EmployeeResponse {
  Employee: Array<{
    id: string
    firstName: string
    lastName: string
    displayName?: string
    pictureThumbnail?: string
  }>
}

export const useProjectAnalytics = (accessToken: string) => {
  const [projects, setProjects] = useState<ProjectAnalyticsData[]>([])
  const [projectManagers, setProjectManagers] = useState<
    Array<{ id: string; firstName: string; lastName: string; displayName?: string }>
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ProjectAnalyticsFilters>({
    projectIds: [],
    projectManagerIds: [],
    statuses: [],
    search: ''
  })

  const graphqlClient = useGraphqlClient(accessToken)
  const orgchartClient = useOrgchartClient(accessToken)
  const structureId = getCurrentActiveStructureId() ?? ''

  // Fetch projects from REST API (has more fields including hoursBudget)
  const fetchProjectsFromRest = useCallback(async (): Promise<ProjectData[]> => {
    try {
      const response = await orgchartClient.getProjects(
        { structureId },
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )
      return response.data || []
    } catch (err) {
      console.error('Error fetching projects from REST:', err)
      // Fallback to GraphQL
      const result = await graphqlClient.request<ProjectResponse>(GET_PROJECTS, {
        structureId,
        limit: 200
      })
      return result.Project || []
    }
  }, [accessToken, graphqlClient, orgchartClient, structureId])

  // Fetch working hours for all projects
  const fetchWorkingHours = useCallback(
    async (projectIds: string[]): Promise<ProjectWorkingHoursEntry[]> => {
      if (projectIds.length === 0) return []

      try {
        // Get data for the last year
        const dateFrom = dayjs().subtract(1, 'year').format('YYYY-MM-DD')
        const dateTo = dayjs().format('YYYY-MM-DD')

        const result = await graphqlClient.request<WorkingHoursResponse>(GET_ALL_PROJECTS_WORKING_HOURS, {
          projectIds,
          dateFrom,
          dateTo
        })
        return result.EmployeeProjectWorkingHours || []
      } catch (err) {
        console.error('Error fetching working hours:', err)
        return []
      }
    },
    [graphqlClient]
  )

  // Fetch project managers
  const fetchProjectManagers = useCallback(async () => {
    try {
      const result = await graphqlClient.request<EmployeeResponse>(GET_PROJECT_MANAGERS, {
        structureId
      })
      setProjectManagers(result.Employee || [])
    } catch (err) {
      console.error('Error fetching project managers:', err)
    }
  }, [graphqlClient, structureId])

  // Process and calculate analytics for each project
  const processProjectAnalytics = useCallback(
    (projectData: ProjectData[], workingHours: ProjectWorkingHoursEntry[]): ProjectAnalyticsData[] => {
      // Group working hours by project
      const hoursByProject = new Map<string, ProjectWorkingHoursEntry[]>()
      for (const entry of workingHours) {
        const existing = hoursByProject.get(entry.projectId) || []
        existing.push(entry)
        hoursByProject.set(entry.projectId, existing)
      }

      return projectData.map(project => {
        const projectHours = hoursByProject.get(project.id) || []

        // Calculate total logged hours
        const totalLoggedHours = projectHours.reduce(
          (sum, entry) => sum + parseHoursFromText(entry.actualWorkingHours),
          0
        )

        // Get date range from entries
        const dates = projectHours.map(e => e.workingDate).sort((a, b) => a.localeCompare(b))
        const firstWorkingDate = dates[0]
        const lastWorkingDate = dates[dates.length - 1]

        // Calculate metrics
        const hoursBudget = project.hoursBudget || 0
        const budgetConsumptionPercent = calculateBudgetConsumption(totalLoggedHours, hoursBudget)
        const remainingHours = Math.max(0, hoursBudget - totalLoggedHours)
        const burnRatePerDay = calculateBurnRate(totalLoggedHours, firstWorkingDate, lastWorkingDate)

        const elapsedTimePercent = calculateElapsedTimePercent(
          project.plannedStartDate || project.validFrom,
          project.plannedEndDate || project.validTo
        )
        const scheduleVariance = budgetConsumptionPercent - elapsedTimePercent

        // Calculate team metrics
        const contributors = aggregateContributors(projectHours)
        const activeContributorsCount = contributors.length
        const avgHoursPerContributor =
          activeContributorsCount > 0 ? Math.round(totalLoggedHours / activeContributorsCount) : 0

        // Calculate weekly burn rates
        const weeklyBurnRates = calculateWeeklyBurnRates(projectHours)

        // Determine risk status
        const { status: riskStatus, reasons: riskReasons } = determineRiskStatus(
          budgetConsumptionPercent,
          elapsedTimePercent,
          totalLoggedHours
        )

        // Calculate forecasts
        const daysUntilDeadline = getDaysUntilDeadline(project.plannedEndDate || project.validTo)
        let projectedOverrun: number | undefined
        if (burnRatePerDay > 0 && remainingHours > 0 && daysUntilDeadline !== undefined) {
          const daysNeeded = Math.ceil(remainingHours / burnRatePerDay)
          if (daysNeeded > daysUntilDeadline) {
            projectedOverrun = daysNeeded - daysUntilDeadline
          }
        }

        // Build analytics object for insights generation
        const analyticsPartial = {
          budgetConsumptionPercent,
          elapsedTimePercent,
          burnRatePerDay,
          remainingHours,
          hoursBudget,
          weeklyBurnRates,
          topContributors: contributors.slice(0, 5),
          activeContributorsCount,
          plannedEndDate: project.plannedEndDate || project.validTo
        }

        const insights = generateInsights(analyticsPartial)

        return {
          ...project,
          totalLoggedHours: Math.round(totalLoggedHours * 10) / 10,
          budgetConsumptionPercent,
          remainingHours: Math.round(remainingHours * 10) / 10,
          burnRatePerDay,
          elapsedTimePercent,
          scheduleVariance,
          daysUntilDeadline,
          activeContributorsCount,
          avgHoursPerContributor,
          topContributors: contributors.slice(0, 5),
          weeklyBurnRates,
          riskStatus,
          riskReasons,
          projectedOverrun,
          insights
        }
      })
    },
    []
  )

  // Load all data
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch projects and managers in parallel
      const [projectData] = await Promise.all([fetchProjectsFromRest(), fetchProjectManagers()])

      if (projectData.length === 0) {
        setProjects([])
        return
      }

      // Fetch working hours for all projects
      const projectIds = projectData.map(p => p.id)
      const workingHours = await fetchWorkingHours(projectIds)

      // Process and calculate analytics
      const analyticsData = processProjectAnalytics(projectData, workingHours)
      setProjects(analyticsData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load project analytics'
      setError(errorMessage)
      console.error('Error loading project analytics:', err)
    } finally {
      setIsLoading(false)
    }
  }, [fetchProjectsFromRest, fetchProjectManagers, fetchWorkingHours, processProjectAnalytics])

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const nameMatch = project.name.toLowerCase().includes(searchLower)
        const descMatch = project.description?.toLowerCase().includes(searchLower)
        if (!nameMatch && !descMatch) return false
      }

      // Project filter
      if (filters.projectIds.length > 0 && !filters.projectIds.includes(project.id)) {
        return false
      }

      // Status filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(project.riskStatus)) {
        return false
      }

      return true
    })
  }, [projects, filters])

  // Calculate KPI summary
  const kpiData = useMemo((): KpiCardData => {
    const totalProjects = filteredProjects.length
    const activeProjects = filteredProjects.filter(p => p.riskStatus !== 'not-started').length
    const totalBudgetHours = filteredProjects.reduce((sum, p) => sum + (p.hoursBudget || 0), 0)
    const totalLoggedHours = filteredProjects.reduce((sum, p) => sum + p.totalLoggedHours, 0)
    const averageBudgetConsumption =
      totalProjects > 0
        ? Math.round(filteredProjects.reduce((sum, p) => sum + p.budgetConsumptionPercent, 0) / totalProjects)
        : 0
    const projectsOnTrack = filteredProjects.filter(p => p.riskStatus === 'on-track').length
    const projectsAtRisk = filteredProjects.filter(p => p.riskStatus === 'at-risk').length
    const projectsOverBudget = filteredProjects.filter(p => p.riskStatus === 'over-budget').length

    return {
      totalProjects,
      activeProjects,
      totalBudgetHours,
      totalLoggedHours,
      averageBudgetConsumption,
      projectsOnTrack,
      projectsAtRisk,
      projectsOverBudget
    }
  }, [filteredProjects])

  // Calculate portfolio metrics
  const portfolioMetrics = useMemo((): PortfolioMetrics => {
    return {
      ...kpiData,
      notStartedProjects: filteredProjects.filter(p => p.riskStatus === 'not-started').length,
      onTrackProjects: kpiData.projectsOnTrack,
      atRiskProjects: kpiData.projectsAtRisk,
      overBudgetProjects: kpiData.projectsOverBudget
    }
  }, [kpiData, filteredProjects])

  // Initial load
  useEffect(() => {
    if (accessToken) {
      loadData()
    }
  }, [accessToken, loadData])

  return {
    projects: filteredProjects,
    allProjects: projects,
    projectManagers,
    kpiData,
    portfolioMetrics,
    filters,
    setFilters,
    isLoading,
    error,
    refetch: loadData
  }
}
