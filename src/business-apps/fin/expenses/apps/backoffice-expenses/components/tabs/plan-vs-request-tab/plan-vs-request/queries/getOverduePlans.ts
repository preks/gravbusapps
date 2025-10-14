import { ExpenseStatus } from '../../../../../utils/utils'

// Returns the count of overdue expense plans.
// Definition of "overdue":
// - ExpensePlan.isDeleted = false (exclude soft-deleted plans)
// - ExpensePlan.status IN [APPROVED, PENDING]
// - ExpensePlan.endDate < $currentDate (strictly in the past)
// - EXCLUDE plans already connected to an ExpenseRequest (i.e., no linked request)
// - Optional: filter by department if selectedDepartment is provided
export const getOverduePlansCountQuery = (hasDepartment: boolean): string =>
  `query GetOverduePlansCount($currentDate: timestamp!${hasDepartment ? ', $selectedDepartment: uuid!' : ''}) {
    overduePlans: ExpensePlanAggregate(
      where: {
        _and: [
          { isDeleted: { _eq: false } },
          { status: { _in: ["${ExpenseStatus.APPROVED}", "${ExpenseStatus.PENDING}"] } },
          { endDate: { _lt: $currentDate } },
          { _not: { expenseRequest: { id: { _isNull: false } } } }${hasDepartment ? ',\n          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }' : ''}
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`
