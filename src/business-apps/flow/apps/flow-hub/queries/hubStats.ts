// Mock data for flow hub statistics
export const getMockHubStats = () => {
  return {
    // Header KPIs - personal workflow stats
    activeTasks: 7,
    activeFlows: 3,
    completedTasksMonth: 24,

    // Manager/Admin KPIs - team and system stats
    teamActiveTasks: 45,
    teamPendingApprovals: 12,
    systemActiveWorkflows: 189,

    // Card KPIs - detailed personal metrics
    totalCompletedTasks: 156,
    totalInitiatedFlows: 42,
    overdueTasks: 2,
    upcomingTasks: 5,
    tasksCompletedToday: 3,
    avgCompletionTime: 4.2 // hours
  }
}

// Future GraphQL queries can be added here when ready
export const GET_HUB_STATS_BY_EMPLOYEE = `
  # This will be implemented later when connecting to real data
  # Currently using mock data in useFlowDashboardStats hook
`
