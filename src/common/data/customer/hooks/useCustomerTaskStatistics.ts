import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTaskStatistics, TaskStatistics } from '@/common/data/relations/hooks/useTaskStatistics'

export type CustomerTaskStatistics = TaskStatistics

const GET_CUSTOMER_TASK_STATISTICS = `
  query GetCustomerTaskStatistics($employeeId: uuid) {
    myTotal: SalesTaskAggregate(where: {
      isDeleted: {_eq: false},
      assignedEmployee: {id: {_eq: $employeeId}}
    }) {
      aggregate { count }
    }
    myInProgress: SalesTaskAggregate(where: {
      isDeleted: {_eq: false},
      assignedEmployee: {id: {_eq: $employeeId}},
      status: {code: {_in: ["IN_PROGRESS", "PENDING"]}}
    }) {
      aggregate { count }
    }
    myCompleted: SalesTaskAggregate(where: {
      isDeleted: {_eq: false},
      assignedEmployee: {id: {_eq: $employeeId}},
      status: {code: {_eq: "COMPLETED"}}
    }) {
      aggregate { count }
    }
    myOverdue: SalesTaskAggregate(where: {
      isDeleted: {_eq: false},
      assignedEmployee: {id: {_eq: $employeeId}},
      status: {code: {_eq: "OVERDUE"}}
    }) {
      aggregate { count }
    }
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
  }
`

export const useCustomerTaskStatistics = (context: BusinessAppContextProps): CustomerTaskStatistics => {
  return useTaskStatistics(context, GET_CUSTOMER_TASK_STATISTICS)
}
