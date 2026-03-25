/** GraphQL order-by field names used by the backoffice expense requests list. */
export type ExpenseRequestListSortField =
  | 'title'
  | 'startDate'
  | 'endDate'
  | 'createdAt'
  | 'status'
  | 'totalAmount'
  | 'reimbursableAmount'
  | 'totalRemainingAmount'
  | 'employee.fullName'
  | 'employee.code'
  | 'code'
