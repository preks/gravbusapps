export const getExpenseRequestRecordQuery = `
  query MyQuery($expenseRequestId: uuid!, $activeUserLocale: String!) {
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
        id
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
      employeeDocument {
        id
        file
        name
        mimeType
      }
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
        authorEmployee {
          fullName
          firstName
          lastName
          pictureThumbnail  
        }
      }
      expenseRequestItem:expenseItem(orderBy: {expenseDate: ASC, code: ASC}) {
        id
        code
        title
        status
        expenseGroup {
          value
          translations(where: {localeCode: {_eq: $activeUserLocale}}) { localeCode value }
        }
        expenseClass {
          value
          translations(where: {localeCode: {_eq: $activeUserLocale}}) { localeCode value }
        }
        currency {
          code
        }
        expensePosition(orderBy: {positionOrder: ASC}) {
          positionOrder
          totalAmount
          reimbursableAmount
          nonReimbursableAmount
          deductibleAmount
          nonDeductibleAmount
          expenseGroup {
            value
            translations(where: {localeCode: {_eq: $activeUserLocale}}) { localeCode value }
          }
          costCenter {
            name
          }
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
          translations(where: {localeCode: {_eq: $activeUserLocale}}) {
           localeCode 
           value 
           }
        }
        travelRegion {
          value
          translations(where: {localeCode: {_eq: $activeUserLocale}}) { 
            localeCode 
            value 
          }
        }
      }
    }
  }
`
