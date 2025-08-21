// GraphQL query for fetching expense plan data for approval
export const GET_EXPENSE_PLAN_FOR_APPROVAL = `
  query GetExpensePlanForApproval($expenseId: uuid!, $activeUserLocale: String!) {
    ExpensePlanByPk(id: $expenseId) {
      id
      code
      title
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
      advancePaymentTotalAmount
      advancePayment(where: {isDeleted: {_eq: false}}) {
        amount
        code
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
      expensePlanItem(where: {isDeleted: {_eq: false}}) {
        id
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
      }
      expenseRequestTrip(orderBy: {tripDateTime: ASC}, where: {isDeleted: {_eq: false}}) {
        address
        expenseRequestId
        pointType
        tripDateTime
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
    }
  }
`; 