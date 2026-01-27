// GraphQL query for fetching expense request data for approval
export const GET_EXPENSE_REQUEST_FOR_APPROVAL = `
  query GetExpenseRequestForApproval($expenseId: uuid!, $activeUserLocale: String!) {
    ExpenseRequestByPk(id: $expenseId) {
      id
      code
      title
      project {
        id
        name
      }
      totalAmount
      totalRemainingAmount
      reimbursableAmount
      nonReimbursableAmount
      currency {
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          localeCode
          value
        }
        catalog {
          defaultLocale
        }
        code
      }
      expensePlanId
      description
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
      employeeDocument {
        id
        file
        name
        mimeType
      }
      expensePlan {
        totalAmount
        advancePaymentTotalAmount
        startDate
        endDate
        advancePayment(where: {isDeleted: {_eq: false}}) {
          status
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
        currency {
          translations(where: {localeCode: {_eq: $activeUserLocale}}) {
            localeCode
            value
          }
          catalog {
            defaultLocale
          }
          code
        }
      }
      expenseItem(where: {expenseRequestId: {_eq: $expenseId}, isDeleted: {_eq: false}}) {
        id
        totalAmount
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
          translations(where: {localeCode: {_eq: $activeUserLocale}}) {
            localeCode
            value
          }
          catalog {
            defaultLocale
          }
          code
        }
        expenseItemFile(where: {isDeleted: {_eq: false}}) {
          id
          fileType
          fileUrl
          fileName
        }
        expensePosition(where: {isDeleted: {_eq: false}}) {
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
      }
      expenseRequestTrip(orderBy: {tripDateTime: ASC}, where: {isDeleted: {_eq: false}}) {
        id
        address
        expenseRequestId
        pointType
        tripDateTime
        tripOrder
        tripDirection
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
        country {
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
      expenseAllowance(orderBy: {allowanceDate: ASC}, where: {isDeleted: {_eq: false}}) {
        id
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
        currency {
          code
        }
      }
      expenseRequestComment(where: {isDeleted: {_eq: false}}, orderBy: {commentDate: DESC}) {
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
