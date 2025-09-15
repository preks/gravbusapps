export const ruleDataQuery = `query ruleDataQuery($activeUserLocale: String!){
   Currencies: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "Currency"}}}, orderBy: {value: ASC}) {
    code
     value
     id
     translations(where: {localeCode: {_eq: $activeUserLocale}}) {
              localeCode
              value
          }
          catalog {
            defaultLocale
          }
   }
   CalculationTypes: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "ExpenseCalculationType"}}}, orderBy: {value: ASC}) {
    value
    id
    code
     translations(where: {localeCode: {_eq: $activeUserLocale}}) {
              localeCode
              value
          }
          catalog {
            defaultLocale
          }
  }
  Countries: CatalogEntry(
    where: { catalog: { version: { _eq: "v1" }, identifier: { _eq: "Country" } } }
    orderBy: { value: ASC }
  ) {
    code
    id
    value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
              localeCode
              value
          }
    catalog {
     defaultLocale
      }
  }
}
`

export const plansAndRequestsInRangeQuery = `
query plansAndRequestsInRange($from: timestamptz!, $to: timestamptz!) {
  ExpensePlan(where: { isDeleted: { _eq: false }, createdAt: { _gte: $from, _lte: $to } }) {
    createdAt
    title
    requestType { value }
  }
  ExpenseRequest(where: { isDeleted: { _eq: false }, createdAt: { _gte: $from, _lte: $to } }) {
    createdAt
    title
    requestType { value }
  }
  StandardPeriodsInRange: ExpenseRule(
    where: {
      isDeleted: { _eq: false },
      standard: { _eq: true },
      activeFrom: { _lt: $to },
      activeTo: { _gt: $from }
    }
  ) {
    id
    code
    name
    version
    standard
    activeFrom
    activeTo
  }
}
`;