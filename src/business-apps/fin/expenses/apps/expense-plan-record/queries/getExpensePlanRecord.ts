// GraphQL query for fetching expense plan record data

export const getExpensePlanRecordQuery = `
    query MyQuery($expensePlanId:uuid!, $activeUserLocale:String!){
      expensePlan:ExpensePlanByPk(id:$expensePlanId){
        code
        title
        description
        startDate
        endDate
        planDate
        decisionDate
        requestType{
          value
        }
        costCenter{
          name
        }
        project{
          name
        }
        currency{
          code
        }
        status
        employee{
         id
         fullName
         firstName
         lastName
         pictureThumbnail
         employeePosition{
            costCenter {
              name
            }
            supervisor{
              fullName
              firstName   
              lastName
            }
          }
        }
        totalAmount
        reimbursableAmount
        nonReimbursableAmount
        deductibleAmount
        nonDeductibleAmount
        expenseRequest{
          code
          requestDate
        }
        expensePlanComment(orderBy:{commentDate:ASC}){
          comment
          commentDate   
          commentType
          authorEmployee{   
            fullName  
            firstName
            lastName
            pictureThumbnail
          }
        }
        expensePlanItem(orderBy:{expenseDate:ASC,code:ASC}){
          id
          code
          title
          costCenter {
            name
          }
          currency {
           code
          }
          expenseGroup{
            value
            translations(where: {localeCode: {_eq: $activeUserLocale}}) {
              localeCode
              value
            }
          }
          expenseClass{
            value 
            translations(where: {localeCode: {_eq: $activeUserLocale}}) {
              localeCode
              value
            }
          }
          expenseDate
          totalAmount
          reimbursableAmount
          nonDeductibleAmount
          deductibleAmount
          
        }
        expenseAllowance(orderBy:{allowanceOrder:ASC,allowanceDate:ASC}){
          allowanceOrder
          allowanceDate
          travelRegion{
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
        expenseRequestTrip(orderBy:{tripOrder:ASC,tripDateTime:ASC}){
          tripOrder
          tripDateTime
          tripDirection
          address
          pointType
          country{
            value
            translations(where: {localeCode: {_eq: $activeUserLocale}}) {
              localeCode
              value
            }
          }
          travelRegion{
            value
            translations(where: {localeCode: {_eq: $activeUserLocale}}) {
              localeCode
              value
            }
          }
        }
        advancePayment(orderBy:{decisionDate:ASC}){
        advancePaymentComment{
            id
            commentType
            commentDate
            comment
            authorEmployee {
              id    
              firstName
              lastName
              fullName
              pictureThumbnail
            } 
          }
          code
          description
          decisionDate
          amount
          currency{
            code
          }
          paymentMethod
          status
          transactionDate
          transactionNumber
          transactionConfirmed
          transactionConfirmedByEmployee{
            fullName
          }
          
        }
      }
    }
`

export default getExpensePlanRecordQuery
