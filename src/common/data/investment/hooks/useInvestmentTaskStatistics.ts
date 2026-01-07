import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTaskStatistics, TaskStatistics } from '@/common/data/relations/hooks/useTaskStatistics'

export type InvestmentTaskStatistics = TaskStatistics

const GET_INVESTMENT_TASK_STATISTICS = `
  query GetInvestmentTaskStatistics($employeeId: uuid) {
    myTotal: InvestmentTaskAggregate(where: {
      isDeleted: {_eq: false},
      taskAssignees: {
        assignedEmployeeId: {_eq: $employeeId},
        isDeleted: {_eq: false}
      }
    }) {
      aggregate { count }
    }
    myInProgress: InvestmentTaskAggregate(where: {
      isDeleted: {_eq: false},
      taskAssignees: {
        assignedEmployeeId: {_eq: $employeeId},
        isDeleted: {_eq: false}
      },
      taskStatus: {code: {_in: ["IN_PROGRESS", "PENDING"]}}
    }) {
      aggregate { count }
    }
    myCompleted: InvestmentTaskAggregate(where: {
      isDeleted: {_eq: false},
      taskAssignees: {
        assignedEmployeeId: {_eq: $employeeId},
        isDeleted: {_eq: false}
      },
      taskStatus: {code: {_eq: "COMPLETED"}}
    }) {
      aggregate { count }
    }
    myOverdue: InvestmentTaskAggregate(where: {
      isDeleted: {_eq: false},
      taskAssignees: {
        assignedEmployeeId: {_eq: $employeeId},
        isDeleted: {_eq: false}
      },
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
  return useTaskStatistics(context, GET_INVESTMENT_TASK_STATISTICS)
}
