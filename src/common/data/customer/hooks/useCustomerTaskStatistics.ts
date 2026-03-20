import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTaskStatistics, TaskStatistics } from '@/common/data/relations/hooks/useTaskStatistics'

export type CustomerTaskStatistics = TaskStatistics

const GET_CUSTOMER_TASK_STATISTICS = `
  query GetCustomerTaskStatistics($employeeId: uuid, $sevenDaysAgo: timestamptz!) {
    # My Tasks - Current (all time)
    myTotal: SalesTaskAggregate(where: {
      isDeleted: {_eq: false},
      taskAssignees: {
        assignedEmployeeId: {_eq: $employeeId}
        isDeleted: {_eq: false}
      }
    }) {
      aggregate { count }
    }
    myInProgress: SalesTaskAggregate(where: {
      isDeleted: {_eq: false},
      taskAssignees: {
        assignedEmployeeId: {_eq: $employeeId}
        isDeleted: {_eq: false}
      },
      status: {code: {_in: ["IN_PROGRESS", "PENDING"]}}
    }) {
      aggregate { count }
    }
    myCompleted: SalesTaskAggregate(where: {
      isDeleted: {_eq: false},
      taskAssignees: {
        assignedEmployeeId: {_eq: $employeeId}
        isDeleted: {_eq: false}
      },
      status: {code: {_eq: "COMPLETED"}}
    }) {
      aggregate { count }
    }
    myOverdue: SalesTaskAggregate(where: {
      isDeleted: {_eq: false},
      taskAssignees: {
        assignedEmployeeId: {_eq: $employeeId}
        isDeleted: {_eq: false}
      },
      status: {code: {_eq: "OVERDUE"}}
    }) {
      aggregate { count }
    }
    
    # My Tasks - Previous (for trend calculation - 7 days ago)
    myTotalPrevious: SalesTaskAggregate(where: {
      isDeleted: {_eq: false},
      taskAssignees: {
        assignedEmployeeId: {_eq: $employeeId}
        isDeleted: {_eq: false}
      },
      createdAt: {_lt: $sevenDaysAgo}
    }) {
      aggregate { count }
    }
    myInProgressPrevious: SalesTaskAggregate(where: {
      isDeleted: {_eq: false},
      taskAssignees: {
        assignedEmployeeId: {_eq: $employeeId}
        isDeleted: {_eq: false}
      },
      status: {code: {_in: ["IN_PROGRESS", "PENDING"]}},
      createdAt: {_lt: $sevenDaysAgo}
    }) {
      aggregate { count }
    }
    myCompletedPrevious: SalesTaskAggregate(where: {
      isDeleted: {_eq: false},
      taskAssignees: {
        assignedEmployeeId: {_eq: $employeeId}
        isDeleted: {_eq: false}
      },
      status: {code: {_eq: "COMPLETED"}},
      updatedAt: {_lt: $sevenDaysAgo}
    }) {
      aggregate { count }
    }
    myOverduePrevious: SalesTaskAggregate(where: {
      isDeleted: {_eq: false},
      taskAssignees: {
        assignedEmployeeId: {_eq: $employeeId}
        isDeleted: {_eq: false}
      },
      status: {code: {_eq: "OVERDUE"}},
      dueDate: {_lt: $sevenDaysAgo}
    }) {
      aggregate { count }
    }
    
    # Team Tasks - Current
    teamTotal: SalesTaskAggregate(where: {
      isDeleted: {_eq: false}
    }) {
      aggregate { count }
    }
    teamInProgress: SalesTaskAggregate(where: {
      isDeleted: {_eq: false},
      status: {code: {_in: ["IN_PROGRESS", "PENDING"]}}
    }) {
      aggregate { count }
    }
    teamCompleted: SalesTaskAggregate(where: {
      isDeleted: {_eq: false},
      status: {code: {_eq: "COMPLETED"}}
    }) {
      aggregate { count }
    }
    teamOverdue: SalesTaskAggregate(where: {
      isDeleted: {_eq: false},
      status: {code: {_eq: "OVERDUE"}}
    }) {
      aggregate { count }
    }
    
    # Team Tasks - Previous (7 days ago)
    teamTotalPrevious: SalesTaskAggregate(where: {
      isDeleted: {_eq: false},
      createdAt: {_lt: $sevenDaysAgo}
    }) {
      aggregate { count }
    }
    teamInProgressPrevious: SalesTaskAggregate(where: {
      isDeleted: {_eq: false},
      status: {code: {_in: ["IN_PROGRESS", "PENDING"]}},
      createdAt: {_lt: $sevenDaysAgo}
    }) {
      aggregate { count }
    }
    teamCompletedPrevious: SalesTaskAggregate(where: {
      isDeleted: {_eq: false},
      status: {code: {_eq: "COMPLETED"}},
      updatedAt: {_lt: $sevenDaysAgo}
    }) {
      aggregate { count }
    }
    teamOverduePrevious: SalesTaskAggregate(where: {
      isDeleted: {_eq: false},
      status: {code: {_eq: "OVERDUE"}},
      dueDate: {_lt: $sevenDaysAgo}
    }) {
      aggregate { count }
    }
  }
`

export const useCustomerTaskStatistics = (context: BusinessAppContextProps): CustomerTaskStatistics => {
  return useTaskStatistics(context, GET_CUSTOMER_TASK_STATISTICS)
}
