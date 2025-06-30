export const getExpenseRequestRecordQuery = `
  query MyQuery($expenseRequestId: uuid!) {
    expenseRequest: ExpenseRequestByPk(id: $expenseRequestId) {
      code
      title
      description
      startDate
      endDate
      requestDate
      decisionDate
      requestType {
        value
      }
      costCenter {
        name
      }
      project {
        name
      }
      currency {
        code
      }
      status
      employee {
        fullName
        picture
        employeePosition {
          supervisor {
            fullName
          }
        }
      }
      totalAmount
      reimbursableAmount
      nonReimbursableAmount
      deductibleAmount
      nonDeductibleAmount
      expensePlan {
        code
        planDate
        advancePayment(orderBy: {decisionDate: ASC}) {
          code
          description
          decisionDate
          amount
          currency {
            code
          }
          paymentMethod
          status
          transactionDate
          transactionNumber
          transactionConfirmed
          transactionConfirmedByEmployee {
            fullName
          }
        }
      }
      expenseRequestComment(orderBy: {commentDate: ASC}) {
        comment
        commentDate
        commentType
      }
      expenseRequestItem:expenseItem(orderBy: {expenseDate: ASC, code: ASC}) {
        code
        title
        expenseGroup {
          value
        }
        expenseClass {
          value
        }
        expenseDate
        totalAmount
        reimbursableAmount
        nonDeductibleAmount
        deductibleAmount
        nonDeductibleAmount
      }
      expenseAllowance(orderBy: {allowanceOrder: ASC, allowanceDate: ASC}) {
        allowanceOrder
        allowanceDate
        travelRegion {
          value
        }
        dayRate
        breakfast
        lunch
        dinner
        overnight
        overnightAccommodation
        deductionLimit
      }
      expenseRequestTrip(orderBy: {tripOrder: ASC, tripDateTime: ASC}) {
        tripOrder
        tripDateTime
        tripDirection
        address
        pointType
        country {
          value
        }
        travelRegion {
          value
        }
      }
    }
  }
`;
