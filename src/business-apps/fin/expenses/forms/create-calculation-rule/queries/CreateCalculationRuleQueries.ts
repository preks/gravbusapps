export const ruleDataQuery = `query ruleDataQuery($activeUserLocale: String!){
  ExpenseRule(where: {isDeleted: {_eq: false}}) {
    id
    code
    name
    version
    standard
    activeFrom
    activeTo
  }
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