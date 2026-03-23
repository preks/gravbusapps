/**
 * IRM Comprehensive Overview Dashboard Configuration
 * All table and field names needed for overview dashboard queries
 */
export const irmOverviewDashboardConfig = {
  // Lead Source Data
  leadSource: {
    leadTable: 'InvestmentLead',
    leadAggregateTable: 'InvestmentLeadAggregate',
    leadStatusPrefix: 'InvestmentLeadStatus'
  },

  // Opportunity Status Data (alternative to Lead Source for IRM)
  opportunityStatus: {
    opportunityTable: 'InvestmentOpportunity',
    opportunityAggregateTable: 'InvestmentOpportunityAggregate',
    opportunityStatusField: 'opportunityStatus',
    opportunityStatusRefField: 'opportunityStatusRef'
  },

  // Recent Records Data
  recentRecords: {
    leadTable: 'InvestmentLead',
    opportunityTable: 'InvestmentOpportunity',
    accountTable: 'InvestmentAccount',
    contactTable: 'InvestmentContact'
  },

  // Today's Activities Data
  todaysActivities: {
    activityTable: 'InvestmentActivity',
    activityAggregateTable: 'InvestmentActivityAggregate',
    activityTypeField: 'activityType',
    activityTypeRefField: 'activityTypeRef',
    leadField: 'lead',
    opportunityField: 'opportunity',
    leadNameFields: 'firstName\n              lastName'
  },

  // Top Deals Data
  topDeals: {
    opportunityTable: 'InvestmentOpportunity',
    pipelineStageField: 'opportunityPipelineStage',
    pipelineStageRefField: 'opportunityPipelineStageRef'
    // No statusField for IRM
  },

  // Aggregated Funnel
  aggregatedFunnel: {
    opportunityTable: 'InvestmentOpportunity',
    aggregateTable: 'InvestmentOpportunityAggregate',
    pipelineFieldName: 'opportunityPipelineRef',
    stageFieldPath: 'opportunityPipelineStage',
    stageRefField: 'opportunityPipelineStageRef',
    stageTypeCatalog: 'InvestmentOpportunityPipelineStageType',
    version: 'v1'
  },

  // Active Tasks
  activeTasks: {
    taskTable: 'InvestmentTask',
    taskAggregateTable: 'InvestmentTaskAggregate',
    statusField: 'taskStatus',
    priorityField: 'taskPriority',
    leadField: 'lead',
    opportunityField: 'opportunity',
    leadNameFields: 'firstName\n              lastName'
  },

  // Feature flags
  useOpportunityStatusInsteadOfLeadSource: true
} as const
