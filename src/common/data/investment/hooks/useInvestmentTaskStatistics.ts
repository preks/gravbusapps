import { useState, useCallback, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface TaskStatisticItem {
  value: number
}

export interface InvestmentTaskStatistics {
  myTasksStatistics: {
    totalTasks: TaskStatisticItem
    inProgress: TaskStatisticItem
    completed: TaskStatisticItem
    overdue: TaskStatisticItem
  }
  teamTasksStatistics: {
    totalTasks: TaskStatisticItem
    inProgress: TaskStatisticItem
    completed: TaskStatisticItem
    overdue: TaskStatisticItem
  }
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

const GET_INVESTMENT_TASK_STATISTICS = `
  query GetInvestmentTaskStatistics($employeeId: uuid) {
    myTotal: InvestmentTaskAggregate(where: {
      isDeleted: {_eq: false},
      assignedEmployee: {id: {_eq: $employeeId}}
    }) {
      aggregate { count }
    }
    myInProgress: InvestmentTaskAggregate(where: {
      isDeleted: {_eq: false},
      assignedEmployee: {id: {_eq: $employeeId}},
      taskStatus: {code: {_in: ["IN_PROGRESS", "PENDING"]}}
    }) {
      aggregate { count }
    }
    myCompleted: InvestmentTaskAggregate(where: {
      isDeleted: {_eq: false},
      assignedEmployee: {id: {_eq: $employeeId}},
      taskStatus: {code: {_eq: "COMPLETED"}}
    }) {
      aggregate { count }
    }
    myOverdue: InvestmentTaskAggregate(where: {
      isDeleted: {_eq: false},
      assignedEmployee: {id: {_eq: $employeeId}},
      taskStatus: {code: {_eq: "OVERDUE"}}
    }) {
      aggregate { count }
    }
    teamTotal: InvestmentTaskAggregate(where: {
      isDeleted: {_eq: false}
    }) {
      aggregate { count }
    }
    teamInProgress: InvestmentTaskAggregate(where: {
      isDeleted: {_eq: false},
      taskStatus: {code: {_in: ["IN_PROGRESS", "PENDING"]}}
    }) {
      aggregate { count }
    }
    teamCompleted: InvestmentTaskAggregate(where: {
      isDeleted: {_eq: false},
      taskStatus: {code: {_eq: "COMPLETED"}}
    }) {
      aggregate { count }
    }
    teamOverdue: InvestmentTaskAggregate(where: {
      isDeleted: {_eq: false},
      taskStatus: {code: {_eq: "OVERDUE"}}
    }) {
      aggregate { count }
    }
  }
`

export const useInvestmentTaskStatistics = (context: BusinessAppContextProps): InvestmentTaskStatistics => {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const graphqlClient = useGraphQLClient(context.accessToken)

  const [myStats, setMyStats] = useState({
    totalTasks: { value: 0 },
    inProgress: { value: 0 },
    completed: { value: 0 },
    overdue: { value: 0 }
  })

  const [teamStats, setTeamStats] = useState({
    totalTasks: { value: 0 },
    inProgress: { value: 0 },
    completed: { value: 0 },
    overdue: { value: 0 }
  })

  const loadStatistics = useCallback(async () => {
    if (!context.accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const employeeId = context.userInfo?.employeeDetails?.employeeId || context.userInfo?.id

      const result = await graphqlClient.request<{
        myTotal: { aggregate: { count: number } }
        myInProgress: { aggregate: { count: number } }
        myCompleted: { aggregate: { count: number } }
        myOverdue: { aggregate: { count: number } }
        teamTotal: { aggregate: { count: number } }
        teamInProgress: { aggregate: { count: number } }
        teamCompleted: { aggregate: { count: number } }
        teamOverdue: { aggregate: { count: number } }
      }>(GET_INVESTMENT_TASK_STATISTICS, {
        employeeId: employeeId || null
      })

      setMyStats({
        totalTasks: { value: result.myTotal.aggregate.count },
        inProgress: { value: result.myInProgress.aggregate.count },
        completed: { value: result.myCompleted.aggregate.count },
        overdue: { value: result.myOverdue.aggregate.count }
      })

      setTeamStats({
        totalTasks: { value: result.teamTotal.aggregate.count },
        inProgress: { value: result.teamInProgress.aggregate.count },
        completed: { value: result.teamCompleted.aggregate.count },
        overdue: { value: result.teamOverdue.aggregate.count }
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load statistics'))
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, context.userInfo?.employeeDetails?.employeeId, context.userInfo?.id, graphqlClient])

  useEffect(() => {
    if (context.accessToken) {
      loadStatistics()
    }
  }, [context.accessToken, loadStatistics])

  return {
    myTasksStatistics: myStats,
    teamTasksStatistics: teamStats,
    isLoading,
    error,
    refetch: loadStatistics
  }
}
