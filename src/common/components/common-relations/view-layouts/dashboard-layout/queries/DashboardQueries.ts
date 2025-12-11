import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCallback } from 'react'
import { DashboardEntityConfig } from '../types/dashboardTypes'

export interface DashboardQueryVariables {
  pipelineRef?: string
  startDate: string
  endDate: string
  limit?: number
  offset?: number
}

// Enforce query limits to prevent excessive data fetching
const enforceQueryLimit = (limit: number, max: number = 100): number => {
  return Math.min(Math.max(1, limit), max)
}

// Helper to derive config values (reduces cognitive complexity)
const deriveConfigValues = (config: DashboardEntityConfig) => {
  const isCRM = config.source === 'customer-relations'
  return {
    isCRM,
    sourceApp: isCRM ? 'CRM' : 'IRM',
    pipelineRefField: isCRM ? 'salesPipelineRef' : 'opportunityPipelineRef',
    pipelineStageRefField: config.fieldMappings.pipelineStageRefField,
    pipelineCatalog: isCRM ? 'SalesPipeline' : 'OpportunityPipeline',
    pipelineStageCatalog: isCRM ? 'SalesPipelineStage' : 'OpportunityPipelineStage',
    leadEntity: isCRM ? 'Lead' : 'InvestmentLead',
    leadSourceField: isCRM ? 'leadSource' : 'investmentLeadSource',
    leadSourceRefField: isCRM ? 'leadSourceRef' : 'investmentLeadSourceRef',
    leadStatusField: isCRM ? 'leadStatus' : 'investmentLeadStatus',
    activityEntity: config.entities.activity,
    taskEntity: config.entities.task,
    taskStatusField: isCRM ? 'status' : 'taskStatus',
    taskStatusRefField: isCRM ? 'statusRef' : 'taskStatusRef',
    taskPriorityField: isCRM ? 'priority' : 'taskPriority',
    taskPriorityRefField: isCRM ? 'priorityRef' : 'taskPriorityRef',
    taskTypeField: isCRM ? 'type' : 'taskType',
    taskTypeRefField: isCRM ? 'typeRef' : 'taskTypeRef'
  }
}

// Query generators based on entity config
export const createDashboardQueries = (config: DashboardEntityConfig) => {
  const cv = deriveConfigValues(config)
  const { isCRM } = cv

  // Get all available pipelines
  const GET_PIPELINES = `
    query GetPipelines {
      pipelines: CatalogEntry(
        where: {
          catalog: { identifier: { _eq: "${cv.pipelineCatalog}" } }
        }
        orderBy: { value: ASC }
      ) {
        id
        code
        value
        additionalValue1
        additionalValue2
        additionalValue3
        catalog {
          id
          identifier
          name
        }
      }
    }
  `

  // Get pipeline stages
  const GET_PIPELINE_STAGES = `
    query GetPipelineStages($pipelineRef: String!) {
      stages: CatalogEntry(
        where: {
          catalog: { identifier: { _eq: "${cv.pipelineStageCatalog}" } }
          parentEntryId: { _eq: $pipelineRef }
        }
        orderBy: { value: ASC }
      ) {
        id
        code
        value
        additionalValue1
        additionalValue2
        additionalValue3
        parentEntryId
        catalog {
          id
          identifier
          name
        }
      }
    }
  `

  // Get opportunities for a specific pipeline
  const GET_PIPELINE_OPPORTUNITIES = `
    query GetPipelineOpportunities(
      $pipelineRef: String!
      $startDate: timestamptz!
      $endDate: timestamptz!
      $limit: Int
      $offset: Int
    ) {
      opportunities: ${isCRM ? 'Opportunity' : 'InvestmentOpportunity'}(
        where: {
          ${cv.pipelineRefField}: { _eq: $pipelineRef }
          sourceApp: { _eq: "${cv.sourceApp}" }
          isDeleted: { _eq: false }
          createdAt: { _gte: $startDate, _lte: $endDate }
        }
        orderBy: { createdAt: DESC }
        limit: $limit
        offset: $offset
      ) {
        id
        name
        estimatedAmount
        ${isCRM ? 'status' : 'opportunityStatus { code value }'}
        stage
        closeDate
        createdAt
        winningChance
        currencyRef
        ${cv.pipelineStageRefField}
        ownerEmployeeId
        ownerEmployee {
          id
          firstName
          lastName
        }
        currency {
          code
          value
        }
        ${config.fieldMappings.pipelineStageField} {
          id
          code
          value
          alternativeCode
        }
        lead {
          id
          ${isCRM ? 'leadSource { code value } leadSourceRef' : 'investmentLeadSource { code value } investmentLeadSourceRef'}
        }
      }
    }
  `

  const GET_RECENT_LEADS = `
    query GetRecentLeads(
      $startDate: timestamptz!
      $limit: Int
    ) {
      leads: ${cv.leadEntity}(
        where: {
          createdAt: { _gte: $startDate }
          sourceApp: { _eq: "${cv.sourceApp}" }
          isDeleted: { _eq: false }
        }
        orderBy: { createdAt: DESC }
        limit: $limit
      ) {
        id
        ${isCRM ? 'name' : ''}
        firstName
        lastName
        ${isCRM ? 'companyName' : 'company'}
        email
        ${isCRM ? 'statusRef' : 'investmentLeadStatusRef'}
        createdAt
        ${cv.leadSourceRefField}
        ownerEmployee {
          id
          firstName
          lastName
        }
        ${cv.leadSourceField} {
          code
          value
        }
        ${cv.leadStatusField} {
          code
          value
        }
      }
    }
  `

  // Get open leads for revenue source calculation
  const GET_OPEN_LEADS_FOR_REVENUE_SOURCE = `
    query GetOpenLeadsForRevenueSource(
      $startDate: timestamptz!
      $endDate: timestamptz!
      $limit: Int
    ) {
      leads: ${cv.leadEntity}(
        where: {
          createdAt: { _gte: $startDate, _lte: $endDate }
          sourceApp: { _eq: "${cv.sourceApp}" }
          isDeleted: { _eq: false }
          ${cv.leadStatusField}: { code: { _eq: "OPEN" } }
        }
        orderBy: { createdAt: DESC }
        limit: $limit
      ) {
        id
        ${isCRM ? 'name' : ''}
        firstName
        lastName
        ${isCRM ? 'companyName' : 'company'}
        createdAt
        ${cv.leadSourceRefField}
        ${cv.leadSourceField} {
          code
          value
        }
        ${cv.leadStatusField} {
          code
          value
        }
        ${isCRM ? 'annualRevenue { code value } annualRevenueRef' : ''}
      }
    }
  `

  // Get activities
  const GET_ACTIVITIES = `
    query GetActivities(
      $startDate: timestamptz!
      $endDate: timestamptz!
      $pipelineRef: String
    ) {
      activities: ${cv.activityEntity}(
        where: {
          createdAt: { _gte: $startDate, _lte: $endDate }
          isDeleted: { _eq: false }
        }
        orderBy: { createdAt: DESC }
      ) {
        id
        title
        description
        createdAt
        completedAt
        ownerEmployeeId
        leadId
        opportunityId
        accountId
        activityTypeRef
        activityType {
          code
          value
        }
        ownerEmployee {
          id
          firstName
          lastName
        }
      }
    }
  `

  // Get today's activities for current user
  const GET_TODAYS_ACTIVITIES = `
    query GetTodaysActivities($startDate: timestamptz!, $endDate: timestamptz!, $employeeId: uuid!) {
      activities: ${cv.activityEntity}(
        where: {
          isDeleted: {_eq: false}
          createdAt: {_gte: $startDate, _lte: $endDate}
          ownerEmployeeId: {_eq: $employeeId}
        }
        limit: 10
        orderBy: {createdAt: DESC}
      ) {
        id
        title
        description
        version
        createdAt
        completedAt
        activeFrom
        activeTo
        activityTypeRef
        activityType {
          id
          value
          code
        }
        ownerEmployee {
          id
          firstName
          lastName
          fullName
          displayName
        }
        ownerEmployeeId
        lead {
          id
          ${isCRM ? 'name' : 'firstName lastName'}
        }
        opportunity {
          id
          name
        }
        account {
          id
          name
        }
        contact {
          id
          firstName
          lastName
        }
      }
    }
  `

  // Get active tasks for current user
  const GET_TODAYS_TASKS = `
    query GetActiveTasks($employeeId: uuid!) {
      tasks: ${cv.taskEntity}(
        where: {
          isDeleted: {_eq: false}
          endDate: {_isNull: true}
          assignedEmployeeId: {_eq: $employeeId}
        }
        limit: 10
        orderBy: {createdAt: DESC}
      ) {
        id
        name
        description
        createdAt
        dueDate
        startDate
        endDate
        ${cv.taskStatusRefField}
        ${cv.taskStatusField} {
          id
          value
          code
        }
        ${cv.taskPriorityRefField}
        ${cv.taskPriorityField} {
          id
          value
          code
        }
        ${cv.taskTypeRefField}
        ${cv.taskTypeField} {
          id
          value
          code
        }
        assignedEmployee {
          id
          firstName
          lastName
          fullName
          displayName
        }
        creatorEmployee {
          id
          firstName
          lastName
          fullName
          displayName
        }
        lead {
          id
          ${isCRM ? 'name' : 'firstName lastName'}
        }
        opportunity {
          id
          name
        }
        account {
          id
          name
        }
        contact {
          id
          firstName
          lastName
        }
      }
    }
  `

  return {
    GET_PIPELINES,
    GET_PIPELINE_STAGES,
    GET_PIPELINE_OPPORTUNITIES,
    GET_RECENT_LEADS,
    GET_OPEN_LEADS_FOR_REVENUE_SOURCE,
    GET_ACTIVITIES,
    GET_TODAYS_ACTIVITIES,
    GET_TODAYS_TASKS,
    activityEntity: cv.activityEntity,
    taskEntity: cv.taskEntity
  }
}

// Hook to use dashboard queries with entity config
export const useDashboardQueries = (context: BusinessAppContextProps, config: DashboardEntityConfig) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const queries = createDashboardQueries(config)

  const fetchPipelines = useCallback(async () => {
    const result = await graphqlClient.request<{ pipelines: any[] }>(queries.GET_PIPELINES)
    return result.pipelines
  }, [graphqlClient, queries.GET_PIPELINES])

  const fetchPipelineStages = useCallback(
    async (pipelineRef: string) => {
      const result = await graphqlClient.request<{ stages: any[] }>(queries.GET_PIPELINE_STAGES, { pipelineRef })
      return result.stages
    },
    [graphqlClient, queries.GET_PIPELINE_STAGES]
  )

  const fetchPipelineOpportunities = useCallback(
    async (variables: DashboardQueryVariables) => {
      const safeVariables = {
        ...variables,
        limit: enforceQueryLimit(variables.limit || 50)
      }
      const result = await graphqlClient.request<{ opportunities: any[] }>(
        queries.GET_PIPELINE_OPPORTUNITIES,
        safeVariables
      )
      return result.opportunities
    },
    [graphqlClient, queries.GET_PIPELINE_OPPORTUNITIES]
  )

  const fetchRecentLeads = useCallback(
    async (startDate: string, limit: number = 5) => {
      const safeLimit = enforceQueryLimit(limit)
      const result = await graphqlClient.request<{ leads: any[] }>(queries.GET_RECENT_LEADS, {
        startDate,
        limit: safeLimit
      })
      return result.leads
    },
    [graphqlClient, queries.GET_RECENT_LEADS]
  )

  const fetchActivities = useCallback(
    async (variables: { startDate: string; endDate: string; pipelineRef?: string }) => {
      const result = await graphqlClient.request<{ activities: any[] }>(queries.GET_ACTIVITIES, variables)
      return result.activities
    },
    [graphqlClient, queries.GET_ACTIVITIES]
  )

  const fetchTodaysActivities = useCallback(async (): Promise<any[]> => {
    if (!context.accessToken) {
      return []
    }

    const employeeId = context.userInfo?.employeeDetails?.employeeId
    if (!employeeId) {
      return []
    }

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString()

    const result = await graphqlClient.request<{ activities: any[] }>(queries.GET_TODAYS_ACTIVITIES, {
      startDate: startOfDay,
      endDate: endOfDay,
      employeeId
    })

    return result.activities || []
  }, [graphqlClient, context.accessToken, context.userInfo?.employeeDetails?.employeeId, queries.GET_TODAYS_ACTIVITIES])

  const fetchTodaysTasks = useCallback(async (): Promise<any[]> => {
    if (!context.accessToken) {
      return []
    }

    const employeeId = context.userInfo?.employeeDetails?.employeeId
    if (!employeeId) {
      return []
    }

    const result = await graphqlClient.request<{ tasks: any[] }>(queries.GET_TODAYS_TASKS, {
      employeeId
    })

    return result.tasks || []
  }, [graphqlClient, context.accessToken, context.userInfo?.employeeDetails?.employeeId, queries.GET_TODAYS_TASKS])

  const fetchOpenLeadsForRevenueSource = useCallback(
    async (variables: { startDate: string; endDate: string; limit?: number }) => {
      const safeVariables = {
        ...variables,
        limit: enforceQueryLimit(variables.limit || 50)
      }
      const result = await graphqlClient.request<{ leads: any[] }>(
        queries.GET_OPEN_LEADS_FOR_REVENUE_SOURCE,
        safeVariables
      )
      return result.leads
    },
    [graphqlClient, queries.GET_OPEN_LEADS_FOR_REVENUE_SOURCE]
  )

  return {
    fetchPipelines,
    fetchPipelineStages,
    fetchPipelineOpportunities,
    fetchRecentLeads,
    fetchActivities,
    fetchTodaysActivities,
    fetchTodaysTasks,
    fetchOpenLeadsForRevenueSource
  }
}
