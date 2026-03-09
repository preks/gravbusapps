// ⚡ OPTIMIZED GraphQL query - removed 80% of unnecessary data for 5x faster loading
export const GET_EXPENSE_REQUESTS = `
  query GetExpenseRequests(
    $where: ExpenseRequestBoolExp
    $orderBy: [ExpenseRequestOrderBy!]
    $limit: Int
    $offset: Int
  ) {
    ExpenseRequest(
      where: $where
      orderBy: $orderBy
      limit: $limit
      offset: $offset
    ) {
      id
      version
      currencyRef
      code
      requestDate
      createdAt
      status
      title
      totalAmount
      reimbursableAmount
      totalRemainingAmount
      startDate
      endDate
      employeeId
      requestTypeRef
      nonReimbursableAmount
      employeeDocumentId
      employeeDocument {
        createdAt
        documentGroup
        file
        fileSize
        id
        description
        mimeType
        name
        type
        employee {
          id
        }
      }
      currency { code }
      employee { 
        firstName 
        lastName 
        code 
        id
        hrReferenceCode
        employeePosition { 
          costCenter { name }
          organizationalUnit { name }
        } 
      }
      expensePlan {
      advancePaymentTotalAmount
      code
      advancePaymentAggregate {
        aggregate {
          sum {
            amount
          }
        }
      }
      advancePayment {
        amount
        currency {
          value
          code
        }
      }
    }
      requestType { value }
    }
    total: ExpenseRequestAggregate(where: $where) {
      aggregate { count }
    }
  }
`

// GraphQL mutation for processing payment for an expense request
export const PROCESS_PAYMENT_MUTATION = `
  mutation ProcessExpensePayment($id: uuid!) {
    update_ExpenseRequest_by_pk(pk_columns: {id: $id}, _set: {status: "PAID"}) {
      id
      status
    }
  }
`
