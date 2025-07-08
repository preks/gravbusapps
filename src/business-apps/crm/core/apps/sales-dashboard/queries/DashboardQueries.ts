import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCallback } from 'react';
import { DateRange, PipelineData } from '../types/dashboardTypes';

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
        catalog: { identifier: { _eq: "SalesPipeline" } }
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
        catalog: { identifier: { _eq: "SalesPipelineStage" } }
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
    opportunities: Opportunity(
      where: {
        salesPipelineRef: { _eq: $pipelineRef }
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
      status
      stage
      closeDate
      createdAt
      winningChance
      currencyRef
      salesPipelineStageRef
      ownerEmployee {
        id
        firstName
        lastName
      }
      currency {
        code
        value
      }
      salesPipelineStage {
        id
        code
        value
        alternativeCode
      }
      lead {
        id
        leadSource {
          code
          value
        }
        leadSourceRef
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
    leads: Lead(
      where: {
        createdAt: { _gte: $startDate }
        isDeleted: { _eq: false }
      }
      orderBy: { createdAt: DESC }
      limit: $limit
    ) {
      id
      name
      firstName
      lastName
      companyName
      email
      statusRef
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
      status {
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
    leads: Lead(
      where: {
        createdAt: { _gte: $startDate, _lte: $endDate }
        isDeleted: { _eq: false }
        leadStatus: { code: { _eq: "OPEN" } }
      }
      orderBy: { createdAt: DESC }
      limit: $limit
    ) {
      id
      name
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
      annualRevenue {
        code
        value
      }
      annualRevenueRef
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
    activities: SalesActivity(
      where: {
        createdAt: { _gte: $startDate, _lte: $endDate }
        isDeleted: { _eq: false }
        _or: [
          { opportunity: { salesPipelineRef: { _eq: $pipelineRef } } }
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
    monthOpportunities: Opportunity(
      where: {
        salesPipelineRef: { _eq: $pipelineRef }
        isDeleted: { _eq: false }
        closeDate: { _gte: $monthStart, _lte: $endDate }
        status: { _in: ["Won", "Lost"] }
      }
    ) {
      id
      status
      estimatedAmount
      closeDate
    }
    
    quarterOpportunities: Opportunity(
      where: {
        salesPipelineRef: { _eq: $pipelineRef }
        isDeleted: { _eq: false }
        closeDate: { _gte: $quarterStart, _lte: $endDate }
        status: { _in: ["Won", "Lost"] }
      }
    ) {
      id
      status
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
    opportunities: Opportunity(
      where: {
        salesPipelineRef: { _eq: $pipelineRef }
        isDeleted: { _eq: false }
        closeDate: { _gte: $startDate, _lte: $endDate }
        status: { _in: ["Won", "Lost"] }
      }
    ) {
      id
      status
      estimatedAmount
      ownerEmployeeId
      ownerEmployee {
        id
        firstName
        lastName
      }
    }
    
    activities: SalesActivity(
      where: {
        createdAt: { _gte: $activityStartDate, _lte: $activityEndDate }
        isDeleted: { _eq: false }
        opportunity: { salesPipelineRef: { _eq: $pipelineRef } }
      }
    ) {
      id
      ownerEmployeeId
      activityTypeRef
    }
  }
`;

export const GET_TODAYS_ACTIVITIES = (startDate: string, endDate: string): string => {
  return `
    query GetTodaysActivities($startDate: timestamptz!, $endDate: timestamptz!) {
      SalesActivity(
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
          name
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
      SalesTask(
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
        statusRef
        status {
          id
          value
          code
        }
        priorityRef
        priority {
          id
          value
          code
        }
        typeRef
        type {
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
          name
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
      console.error('Error fetching pipelines:', error);
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
      console.error('Error fetching pipeline stages:', error);
      throw error;
    }
  }, [graphqlClient]);

  const fetchPipelineOpportunities = useCallback(async (variables: DashboardQueryVariables) => {
    try {
      const result = await graphqlClient.request<{
        opportunities: any[];
      }>(GET_PIPELINE_OPPORTUNITIES, variables);
      return result.opportunities;
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      throw error;
    }
  }, [graphqlClient]);

  const fetchRecentLeads = useCallback(async (startDate: string, limit: number = 5) => {
    try {
      const result = await graphqlClient.request<{
        leads: any[];
      }>(GET_RECENT_LEADS, { startDate, limit });
      return result.leads;
    } catch (error) {
      console.error('Error fetching recent leads:', error);
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
      console.error('Error fetching sales activities:', error);
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
      console.error('Error fetching win rate data:', error);
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
      console.error('Error fetching sales rep performance:', error);
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
      
      const query = GET_TODAYS_ACTIVITIES(startOfDay, endOfDay);
      const result = await graphqlClient.request<{ SalesActivity: any[] }>(
        query,
        {
          startDate: startOfDay,
          endDate: endOfDay
        }
      );
      
      return result.SalesActivity || [];
    } catch (error) {
      console.error('Error fetching today\'s activities:', error);
      throw error;
    }
  }, [graphqlClient, context.accessToken]);

  const fetchTodaysTasks = useCallback(async (): Promise<any[]> => {
    if (!context.accessToken) {
      throw new Error('Access token is required');
    }

    try {
      const query = GET_TODAYS_TASKS();
      const result = await graphqlClient.request<{ SalesTask: any[] }>(query);
      
      return result.SalesTask || [];
    } catch (error) {
      console.error('Error fetching active tasks:', error);
      throw error;
    }
  }, [graphqlClient, context.accessToken]);

  const fetchOpenLeadsForRevenueSource = useCallback(async (variables: {
    startDate: string;
    endDate: string;
    limit?: number;
  }) => {
    try {
      const result = await graphqlClient.request<{
        leads: any[];
      }>(GET_OPEN_LEADS_FOR_REVENUE_SOURCE, variables);
      return result.leads;
    } catch (error) {
      console.error('Error fetching open leads for revenue source:', error);
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