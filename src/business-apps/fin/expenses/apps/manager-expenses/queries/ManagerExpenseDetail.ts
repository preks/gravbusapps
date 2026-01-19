export const MANAGER_EXPENSE_DETAIL = `
  query ManagerExpenseDetail(
    $requestId: uuid, 
    $planId: uuid, 
    $advancePaymentId: uuid,
    $skipRequest: Boolean!,
    $skipPlan: Boolean!,
    $skipPayment: Boolean!
  ) {
    ExpenseRequest(where: { id: { _eq: $requestId } }) @skip(if: $skipRequest) {
      id code title description requestDate startDate endDate totalAmount currencyRef status
      attachments { fileUrl fileName }
      employee { id firstName lastName fullName department }
    }

    ExpensePlan(where: { id: { _eq: $planId } }) @skip(if: $skipPlan) {
      id code title status totalAmount currencyRef startDate endDate planDate decisionDate
      employeeDocument { id file fileSize name mimeType description type }
      employee {
        id fullName displayName pictureThumbnail
        employeePosition { organizationalUnit { id name } siteLocation { id name } }
      }
      advancePayment(where: { isDeleted: { _eq: false } }) {
        id code amount status transactionDate createdAt currencyRef
        costCenter { id name code }
      }
    }

    AdvancePayment(where: { id: { _eq: $advancePaymentId } }) @skip(if: $skipPayment) {
      id code amount status transactionDate createdAt currencyRef paymentMethod
      costCenter { id name code }
      expensePlan {
        id code title startDate endDate currencyRef
        employee { id fullName }
      }
    }
  }
`
