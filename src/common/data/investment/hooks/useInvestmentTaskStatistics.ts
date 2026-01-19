import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTaskStatistics, TaskStatistics } from '@/common/data/relations/hooks/useTaskStatistics'

export type InvestmentTaskStatistics = TaskStatistics

const GET_INVESTMENT_TASK_STATISTICS = `
  query GetInvestmentTaskStatistics($employeeId: uuid, $sevenDaysAgo: timestamptz!) {
    # My Tasks - Current (all time)
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
    
    # My Tasks - Previous (for trend calculation - 7 days ago)
    myTotalPrevious: InvestmentTaskAggregate(where: {
      isDeleted: {_eq: false},
      taskAssignees: {
        assignedEmployeeId: {_eq: $employeeId},
        isDeleted: {_eq: false}
      },
      createdAt: {_lt: $sevenDaysAgo}
    }) {
      aggregate { count }
    }
    myInProgressPrevious: InvestmentTaskAggregate(where: {
      isDeleted: {_eq: false},
      taskAssignees: {
        assignedEmployeeId: {_eq: $employeeId},
        isDeleted: {_eq: false}
      },
      taskStatus: {code: {_in: ["IN_PROGRESS", "PENDING"]}},
      createdAt: {_lt: $sevenDaysAgo}
    }) {
      aggregate { count }
    }
    myCompletedPrevious: InvestmentTaskAggregate(where: {
      isDeleted: {_eq: false},
      taskAssignees: {
        assignedEmployeeId: {_eq: $employeeId},
        isDeleted: {_eq: false}
      },
      taskStatus: {code: {_eq: "COMPLETED"}},
      updatedAt: {_lt: $sevenDaysAgo}
    }) {
      aggregate { count }
    }
    myOverduePrevious: InvestmentTaskAggregate(where: {
      isDeleted: {_eq: false},
      taskAssignees: {
        assignedEmployeeId: {_eq: $employeeId},
        isDeleted: {_eq: false}
      },
      taskStatus: {code: {_eq: "OVERDUE"}},
      dueDate: {_lt: $sevenDaysAgo}
    }) {
      aggregate { count }
    }
    
    # Team Tasks - Current
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
    
    # Team Tasks - Previous (7 days ago)
    teamTotalPrevious: InvestmentTaskAggregate(where: {
      isDeleted: {_eq: false},
      createdAt: {_lt: $sevenDaysAgo}
    }) {
      aggregate { count }
    }
    teamInProgressPrevious: InvestmentTaskAggregate(where: {
      isDeleted: {_eq: false},
      taskStatus: {code: {_in: ["IN_PROGRESS", "PENDING"]}},
      createdAt: {_lt: $sevenDaysAgo}
    }) {
      aggregate { count }
    }
    teamCompletedPrevious: InvestmentTaskAggregate(where: {
      isDeleted: {_eq: false},
      taskStatus: {code: {_eq: "COMPLETED"}},
      updatedAt: {_lt: $sevenDaysAgo}
    }) {
      aggregate { count }
    }
    teamOverduePrevious: InvestmentTaskAggregate(where: {
      isDeleted: {_eq: false},
      taskStatus: {code: {_eq: "OVERDUE"}},
      dueDate: {_lt: $sevenDaysAgo}
    }) {
      aggregate { count }
    }
  }
`

export const useInvestmentTaskStatistics = (context: BusinessAppContextProps): InvestmentTaskStatistics => {
  return useTaskStatistics(context, GET_INVESTMENT_TASK_STATISTICS)
}
