// Project Analytics Types

export type RiskStatus = 'on-track' | 'at-risk' | 'over-budget' | 'not-started'

export interface ProjectManager {
  id: string
  firstName: string
  lastName: string
  displayName?: string
  pictureThumbnail?: string
}

export interface ProjectData {
  id: string
  name: string
  description?: string
  structureId: string
  projectType: 'INTERNAL' | 'EXTERNAL'
  customerId?: string
  validTo?: string
  validFrom?: string
  status?: string
  hoursBudget?: number
  plannedStartDate?: string
  plannedEndDate?: string
  projectManager?: ProjectManager
}

export interface ProjectWorkingHoursEntry {
  id: string
  projectId: string
  employeeId: string
  workingDate: string
  actualWorkingHours: string
  employee?: {
    id: string
    firstName: string
    lastName: string
    displayName?: string
    pictureThumbnail?: string
  }
}

export interface ProjectWorkingHoursAggregate {
  projectId: string
  totalHours: number
  distinctEmployees: number
  firstWorkingDate?: string
  lastWorkingDate?: string
}

export interface ProjectAnalyticsData extends ProjectData {
  // Budget metrics
  totalLoggedHours: number
  budgetConsumptionPercent: number
  remainingHours: number
  burnRatePerDay: number

  // Time metrics
  elapsedTimePercent: number
  scheduleVariance: number
  daysUntilDeadline?: number

  // Team metrics
  activeContributorsCount: number
  avgHoursPerContributor: number
  topContributors: Array<{
    employeeId: string
    employeeName: string
    employeePicture?: string
    totalHours: number
    percentOfTotal: number
  }>

  // Trend data
  weeklyBurnRates: Array<{
    weekStart: string
    weekEnd: string
    hoursLogged: number
    burnRate: number
  }>

  // Risk assessment
  riskStatus: RiskStatus
  riskReasons: string[]

  // Forecasts
  forecastedCompletionDate?: string
  projectedOverrun?: number

  // Insights
  insights: string[]
}

export interface ProjectAnalyticsFilters {
  projectIds: string[]
  projectManagerIds: string[]
  statuses: string[]
  dateFrom?: string
  dateTo?: string
  search?: string
}

export interface PortfolioMetrics {
  totalProjects: number
  activeProjects: number
  onTrackProjects: number
  atRiskProjects: number
  overBudgetProjects: number
  notStartedProjects: number
  totalBudgetHours: number
  totalLoggedHours: number
  averageBudgetConsumption: number
}

export interface KpiCardData {
  totalProjects: number
  activeProjects: number
  totalBudgetHours: number
  totalLoggedHours: number
  averageBudgetConsumption: number
  projectsOnTrack: number
  projectsAtRisk: number
  projectsOverBudget: number
}

export interface ProjectAnalyticsProps {
  accessToken: string
  prefixDataTestId?: string
}
