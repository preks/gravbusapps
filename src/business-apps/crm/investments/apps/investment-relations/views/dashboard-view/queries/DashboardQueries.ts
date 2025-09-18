import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCallback } from 'react';
 
import { enforceQueryLimit } from '@/business-apps/crm/common/utils/queryLimits';

export interface DashboardQueryVariables {
  pipelineRef?: string;
  startDate: string;
  endDate: string;
  limit?: number;
  offset?: number;
}

// Get all available pipelines
export const GET_PIPELINES = `
  query GetPipelines {
    pipelines: CatalogEntry(
      where: {
        catalog: { identifier: { _eq: "InvestmentOpportunityPipeline" } }
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
`;

// Get pipeline stages
export const GET_PIPELINE_STAGES = `
  query GetPipelineStages($pipelineRef: String!) {
    stages: CatalogEntry(
      where: {
        catalog: { identifier: { _eq: "InvestmentOpportunityPipelineStage" } }
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
`;

// Get opportunities for a specific pipeline
export const GET_PIPELINE_OPPORTUNITIES = `
  query GetPipelineOpportunities(
    $pipelineRef: String!
    $startDate: timestamptz!
    $endDate: timestamptz!
    $limit: Int
    $offset: Int
  ) {
    opportunities: InvestmentOpportunity(
      where: {
        isDeleted: { _eq: false }
        createdAt: { _gte: $startDate, _lte: $endDate }
        _or: [
          { opportunityPipeline: { id: { _eq: $pipelineRef } } },
          { opportunityPipeline: { code: { _eq: $pipelineRef } } }
        ]
      }
      orderBy: { createdAt: DESC }
      limit: $limit
      offset: $offset
    ) {
      id
      name
      estimatedAmount
      closeDate
      createdAt
      currencyRef
      opportunityPipelineStageRef
      opportunityStatus {
        code
        value
      }
      ownerEmployee {
        id
        firstName
        lastName
      }
      currency {
        code
        value
      }
      opportunityPipelineStage {
        id
        code
        value
        alternativeCode
        additionalValue1
      }
    }
  }
`;

// Get recent leads
export const GET_RECENT_LEADS = `
  query GetRecentLeads(
    $startDate: timestamptz!
    $limit: Int
  ) {
    leads: InvestmentLead(
      where: {
        createdAt: { _gte: $startDate }
        isDeleted: { _eq: false }
      }
      orderBy: { createdAt: DESC }
      limit: $limit
    ) {
      id
      firstName
      lastName
      companyName
      email
      createdAt
      leadSourceRef
      ownerEmployee {
        id
        firstName
        lastName
      }
      leadSource {
        code
        value
      }
      leadStatus {
        code
        value
      }
    }
  }
`;

// Get open leads for potential revenue source calculation
export const GET_OPEN_LEADS_FOR_REVENUE_SOURCE = `
  query GetOpenLeadsForRevenueSource(
    $startDate: timestamptz!
    $endDate: timestamptz!
    $limit: Int
  ) {
    leads: InvestmentLead(
      where: {
        createdAt: { _gte: $startDate, _lte: $endDate }
        isDeleted: { _eq: false }
        leadStatus: { code: { _eq: "OPEN" } }
      }
      orderBy: { createdAt: DESC }
      limit: $limit
    ) {
      id
      firstName
      lastName
      companyName
      createdAt
      leadSourceRef
      leadSource {
        code
        value
      }
      leadStatus {
        code
        value
      }
      accountAnnualRevenueBand {
        code
        value
      }
      accountAnnualRevenueBandRef
    }
  }
`;

// Get sales activities
export const GET_SALES_ACTIVITIES = `
  query GetSalesActivities(
    $startDate: timestamptz!
    $endDate: timestamptz!
    $pipelineRef: String
  ) {
    activities: InvestmentActivity(
      where: {
        createdAt: { _gte: $startDate, _lte: $endDate }
        isDeleted: { _eq: false }
        _or: [
          { opportunity: { opportunityPipeline: { id: { _eq: $pipelineRef } } } },
          { opportunity: { opportunityPipeline: { code: { _eq: $pipelineRef } } } },
          { leadId: { _isNull: false } }
        ]
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
`;

// Get win rate data for a pipeline
export const GET_WIN_RATE_DATA = `
  query GetWinRateData(
    $pipelineRef: String!
    $monthStart: timestamp!
    $quarterStart: timestamp!
    $endDate: timestamp!
  ) {
    monthOpportunities: InvestmentOpportunity(
      where: {
        _or: [
          { opportunityPipeline: { id: { _eq: $pipelineRef } } },
          { opportunityPipeline: { code: { _eq: $pipelineRef } } }
        ]
        isDeleted: { _eq: false }
        closeDate: { _gte: $monthStart, _lte: $endDate }
        opportunityStatus: { code: { _in: ["WON", "LOST"] } }
      }
    ) {
      id
      opportunityStatus { code }
      estimatedAmount
      closeDate
    }
    
    quarterOpportunities: InvestmentOpportunity(
      where: {
        _or: [
          { opportunityPipeline: { id: { _eq: $pipelineRef } } },
          { opportunityPipeline: { code: { _eq: $pipelineRef } } }
        ]
        isDeleted: { _eq: false }
        closeDate: { _gte: $quarterStart, _lte: $endDate }
        opportunityStatus: { code: { _in: ["WON", "LOST"] } }
      }
    ) {
      id
      opportunityStatus { code }
      estimatedAmount
      closeDate
    }
  }
`;

// Get sales rep performance for leaderboard
export const GET_SALES_REP_PERFORMANCE = `
  query GetSalesRepPerformance(
    $pipelineRef: String!
    $startDate: timestamp!
    $endDate: timestamp!
    $activityStartDate: timestamptz!
    $activityEndDate: timestamptz!
  ) {
    opportunities: InvestmentOpportunity(
      where: {
        _or: [
          { opportunityPipeline: { id: { _eq: $pipelineRef } } },
          { opportunityPipeline: { code: { _eq: $pipelineRef } } }
        ]
        isDeleted: { _eq: false }
        closeDate: { _gte: $startDate, _lte: $endDate }
        opportunityStatus: { code: { _in: ["WON", "LOST"] } }
      }
    ) {
      id
      opportunityStatus { code }
      estimatedAmount
      ownerEmployeeId
      ownerEmployee {
        id
        firstName
        lastName
      }
    }
    
    activities: InvestmentActivity(
      where: {
        createdAt: { _gte: $activityStartDate, _lte: $activityEndDate }
        isDeleted: { _eq: false }
        _or: [
          { opportunity: { opportunityPipeline: { id: { _eq: $pipelineRef } } } },
          { opportunity: { opportunityPipeline: { code: { _eq: $pipelineRef } } } }
        ]
      }
    ) {
      id
      ownerEmployeeId
      activityTypeRef
    }
  }
`;

export const GET_TODAYS_ACTIVITIES = (): string => {
  return `
    query GetTodaysActivities($startDate: timestamptz!, $endDate: timestamptz!) {
      InvestmentActivity(
        where: {
          isDeleted: {_eq: false}
          createdAt: {_gte: $startDate, _lte: $endDate}
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
          firstName
          lastName
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
  `;
};

export const GET_TODAYS_TASKS = (): string => {
  return `
    query GetActiveTasks {
      InvestmentTask(
        where: {
          isDeleted: {_eq: false}
          endDate: {_isNull: true}
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
        taskStatusRef
        taskStatus {
          id
          value
          code
        }
        taskPriorityRef
        taskPriority {
          id
          value
          code
        }
        taskTypeRef
        taskType {
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
          firstName
          lastName
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
  `;
};

export const useDashboardQueries = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchPipelines = useCallback(async () => {
    try {
      const result = await graphqlClient.request<{
        pipelines: any[];
      }>(GET_PIPELINES);
      return result.pipelines;
    } catch (error) {
      // Error handled by caller
      throw error;
    }
  }, [graphqlClient]);

  const fetchPipelineStages = useCallback(async (pipelineRef: string) => {
    try {
      const result = await graphqlClient.request<{
        stages: any[];
      }>(GET_PIPELINE_STAGES, { pipelineRef });
      return result.stages;
    } catch (error) {
      // Error handled by caller
      throw error;
    }
  }, [graphqlClient]);

  const fetchPipelineOpportunities = useCallback(async (variables: DashboardQueryVariables) => {
    try {
      const safeVariables = {
        ...variables,
        limit: enforceQueryLimit(variables.limit || 50)
      };
      const result = await graphqlClient.request<{
        opportunities: any[];
      }>(GET_PIPELINE_OPPORTUNITIES, safeVariables);
      return result.opportunities;
    } catch (error) {
      // Error handled by caller
      throw error;
    }
  }, [graphqlClient]);

  const fetchRecentLeads = useCallback(async (startDate: string, limit: number = 5) => {
    try {
      const safeLimit = enforceQueryLimit(limit);
      const result = await graphqlClient.request<{
        leads: any[];
      }>(GET_RECENT_LEADS, { startDate, limit: safeLimit });
      return result.leads;
    } catch (error) {
      // Error handled by caller
      throw error;
    }
  }, [graphqlClient]);

  const fetchSalesActivities = useCallback(async (variables: {
    startDate: string;
    endDate: string;
    pipelineRef?: string;
  }) => {
    try {
      const result = await graphqlClient.request<{
        activities: any[];
      }>(GET_SALES_ACTIVITIES, variables);
      return result.activities;
    } catch (error) {
      // Error handled by caller
      throw error;
    }
  }, [graphqlClient]);

  const fetchWinRateData = useCallback(async (variables: {
    pipelineRef: string;
    monthStart: string;
    quarterStart: string;
    endDate: string;
  }) => {
    try {
      const result = await graphqlClient.request<{
        monthOpportunities: any[];
        quarterOpportunities: any[];
      }>(GET_WIN_RATE_DATA, variables);
      return result;
    } catch (error) {
      // Error handled by caller
      throw error;
    }
  }, [graphqlClient]);

  const fetchSalesRepPerformance = useCallback(async (variables: {
    pipelineRef: string;
    startDate: string;
    endDate: string;
    activityStartDate: string;
    activityEndDate: string;
  }) => {
    try {
      const result = await graphqlClient.request<{
        opportunities: any[];
        activities: any[];
      }>(GET_SALES_REP_PERFORMANCE, variables);
      return result;
    } catch (error) {
      // Error handled by caller
      throw error;
    }
  }, [graphqlClient]);

  const fetchTodaysActivities = useCallback(async (): Promise<any[]> => {
    if (!context.accessToken) {
      throw new Error('Access token is required');
    }

    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
      
      const query = GET_TODAYS_ACTIVITIES();
      const result = await graphqlClient.request<{ InvestmentActivity: any[] }>(
        query,
        {
          startDate: startOfDay,
          endDate: endOfDay
        }
      );
      
      return result.InvestmentActivity || [];
    } catch (error) {
      // Error handled by caller
      throw error;
    }
  }, [graphqlClient, context.accessToken]);

  const fetchTodaysTasks = useCallback(async (): Promise<any[]> => {
    if (!context.accessToken) {
      throw new Error('Access token is required');
    }

    try {
      const query = GET_TODAYS_TASKS();
      const result = await graphqlClient.request<{ InvestmentTask: any[] }>(query);
      
      return result.InvestmentTask || [];
    } catch (error) {
      // Error handled by caller
      throw error;
    }
  }, [graphqlClient, context.accessToken]);

  const fetchOpenLeadsForRevenueSource = useCallback(async (variables: {
    startDate: string;
    endDate: string;
    limit?: number;
  }) => {
    try {
      const safeVariables = {
        ...variables,
        limit: enforceQueryLimit(variables.limit || 50)
      };
      const result = await graphqlClient.request<{
        leads: any[];
      }>(GET_OPEN_LEADS_FOR_REVENUE_SOURCE, safeVariables);
      return result.leads;
    } catch (error) {
      // Error handled by caller
      throw error;
    }
  }, [graphqlClient]);

  return {
    fetchPipelines,
    fetchPipelineStages,
    fetchPipelineOpportunities,
    fetchRecentLeads,
    fetchSalesActivities,
    fetchWinRateData,
    fetchSalesRepPerformance,
    fetchTodaysActivities,
    fetchTodaysTasks,
    fetchOpenLeadsForRevenueSource
  };
};
