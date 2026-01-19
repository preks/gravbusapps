export const MANAGER_APPROVE_OR_REJECT = `
  mutation ManagerApproveOrReject(
    $approverId: uuid!,
    $timestamp: timestamptz!,
    $planApproveIds: [uuid!] = [],
    $planRejectIds: [uuid!] = [],
    $planComments: String,
    $requestApproveIds: [uuid!] = [],
    $requestRejectIds: [uuid!] = [],
    $requestComments: String
  ) {
    approvePlans: update_ExpensePlan(
      where: { id: { _in: $planApproveIds }, isDeleted: { _eq: false } },
      _set: { status: "APPROVED", approvedBy: $approverId, approvedDate: $timestamp, approvalComments: $planComments }
    ) { affected_rows returning { id status } }

    rejectPlans: update_ExpensePlan(
      where: { id: { _in: $planRejectIds }, isDeleted: { _eq: false } },
      _set: { status: "REJECTED", rejectedBy: $approverId, rejectedDate: $timestamp, rejectionReason: $planComments }
    ) { affected_rows returning { id status } }

    approveRequests: update_ExpenseRequest(
      where: { id: { _in: $requestApproveIds }, isDeleted: { _eq: false } },
      _set: { status: "APPROVED", approvedAt: $timestamp, comments: $requestComments }
    ) { affected_rows returning { id status } }

    rejectRequests: update_ExpenseRequest(
      where: { id: { _in: $requestRejectIds }, isDeleted: { _eq: false } },
      _set: { status: "REJECTED", rejectedAt: $timestamp, rejectionReason: $requestComments }
    ) { affected_rows returning { id status } }
  }
`
