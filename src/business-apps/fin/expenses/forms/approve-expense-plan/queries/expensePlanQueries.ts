// GraphQL query for fetching expense plan data for approval
export const GET_EXPENSE_PLAN_FOR_APPROVAL = `
  query GetExpensePlanForApproval($expenseId: uuid!, $activeUserLocale: String!) {
    ExpensePlanByPk(id: $expenseId) {
      id
      code
      title
      status
      project {
        id
        name
      }
      description
      startDate
      endDate
      totalAmount
      reimbursableAmount
      nonReimbursableAmount
      deductibleAmount
      nonDeductibleAmount
      advancePaymentTotalAmount
      advancePayment(where: {isDeleted: {_eq: false}}, orderBy: {decisionDate: ASC}) {
        amount
        code
        status
        decisionDate
        transactionDate
        transactionNumber
        transactionConfirmed
        currency {
          translations(where: {localeCode: {_eq: $activeUserLocale}}) {
            localeCode
            value
          }
          catalog {
            defaultLocale
          }
          alternativeCode
          value
          code
          id
        }
        costCenter {
          code
          name
        }
        paymentMethod
      }
      advancePaymentAggregate(where: { status: {_eq: "PREPARED"} }) {
        aggregate {
          sum {
            amount
          }
        }
      }
      currency {
        code
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          localeCode
          value
        }
        catalog {
          defaultLocale
        }
        catalog {
          defaultLocale
        }
      }
      costCenter {
        name
      }
      requestType {
        code
      }
      employee {
        id
        firstName
        lastName
        picture
        pictureThumbnail
        employeePosition {
          jobPosition {
            name
          }
        }
      }
      expensePlanItem(where: {isDeleted: {_eq: false}}, orderBy: {expenseDate: ASC, code: ASC}) {
        id
        code
        expenseDate
        reimbursable
        expenseClass {
          translations(where: {localeCode: {_eq: $activeUserLocale}}) {
            localeCode
            value
          }
          catalog {
            defaultLocale
          }
          value
        }
        title
        currency {
          code
        }
        expenseGroup {
          translations(where: {localeCode: {_eq: $activeUserLocale}}) {
            localeCode
            value
          }
          catalog {
            defaultLocale
          }
          value
        }
        expenseRuleGeneralExpense {
          name
        }
        totalAmount
        reimbursableAmount
        deductibleAmount
        nonDeductibleAmount
      }
      expenseAllowance(orderBy: {allowanceOrder: ASC, allowanceDate: ASC}) {
        allowanceOrder
        allowanceDate
        travelRegion {
          translations(where: {localeCode: {_eq: $activeUserLocale}}) {
            localeCode
            value
          }
          catalog {
            defaultLocale
          }
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
      expenseRequestTrip(orderBy: {tripOrder: ASC, tripDateTime: ASC}, where: {isDeleted: {_eq: false}}) {
        tripOrder
        address
        expenseRequestId
        pointType
        tripDateTime
        tripDirection
        country {
          value
          translations(where: {localeCode: {_eq: $activeUserLocale}}) {
            localeCode
            value
          }
          catalog {
            defaultLocale
          }
        }
        travelRegion {
          translations(where: {localeCode: {_eq: $activeUserLocale}}) {
            localeCode
            value
          }
          catalog {
            defaultLocale
          }
          value
        }
      }
      expensePlanComment(where: {isDeleted: {_eq: false}}, orderBy: {commentDate: DESC}) {
        id
        comment
        commentDate
        commentType
        authorEmployee {
          id
          firstName
          lastName
          displayName
          pictureThumbnail
        }
      }
    }
  }
`
