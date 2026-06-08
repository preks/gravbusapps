/**
 * CRM Comprehensive Overview Dashboard Configuration
 * All table and field names needed for overview dashboard queries
 */
export const crmOverviewDashboardConfig = {
  // Lead Source Data
  leadSource: {
    leadTable: 'Lead',
    leadAggregateTable: 'LeadAggregate'
  },

  // Recent Records Data
  recentRecords: {
    leadTable: 'Lead',
    opportunityTable: 'Opportunity',
    accountTable: 'Account',
    contactTable: 'Contact'
  },

  // Today's Activities Data
  todaysActivities: {
    activityTable: 'SalesActivity',
    activityAggregateTable: 'SalesActivityAggregate',
    activityTypeField: 'activityType',
    activityTypeRefField: 'activityTypeRef',
    leadField: 'lead',
    opportunityField: 'opportunity',
    leadNameFields: 'name'
  },

  // Top Opportunities Data
  topOpportunities: {
    opportunityTable: 'Opportunity',
    pipelineStageField: 'salesPipelineStage',
    pipelineStageRefField: 'salesPipelineStageRef',
    statusField: 'status' // CRM-specific
  },

  // Aggregated Funnel
  aggregatedFunnel: {
    opportunityTable: 'Opportunity',
    aggregateTable: 'OpportunityAggregate',
    pipelineFieldName: 'salesPipelineRef',
    stageFieldPath: 'salesPipelineStage',
    stageRefField: 'salesPipelineStageRef',
    stageTypeCatalog: 'SalesPipelineStageType',
    version: 'v1'
  },

  // Active Tasks
  activeTasks: {
    taskTable: 'SalesTask',
    taskAggregateTable: 'SalesTaskAggregate',
    statusField: 'status',
    priorityField: 'priority',
    leadField: 'lead',
    opportunityField: 'opportunity',
    leadNameFields: 'name'
  }
} as const
