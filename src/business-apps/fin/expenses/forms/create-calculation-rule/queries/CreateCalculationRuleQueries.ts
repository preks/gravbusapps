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

// Paginated query for affected expenses modal with aggregates
export const buildGetAffectedExpensesQuery = (): string => {
  return `
  query getAffectedExpenses(
    $from: timestamptz!,
    $to: timestamptz!,
    $limit: Int = 5,
    $offset: Int = 0,
    $orderDirection: OrderBy = DESC
  ) {
    ExpensePlan(
      where: { isDeleted: { _eq: false }, createdAt: { _gte: $from, _lte: $to } },
      orderBy: { createdAt: $orderDirection },
      limit: $limit,
      offset: $offset
    ) {
      createdAt
      title
      requestType { value }
    }
    ExpenseRequest(
      where: { isDeleted: { _eq: false }, createdAt: { _gte: $from, _lte: $to } },
      orderBy: { createdAt: $orderDirection },
      limit: $limit,
      offset: $offset
    ) {
      createdAt
      title
      requestType { value }
    }
    ExpenseItem(
      where: { isDeleted: { _eq: false }, createdAt: { _gte: $from, _lte: $to } },
      orderBy: { createdAt: $orderDirection },
      limit: $limit,
      offset: $offset
    ) {
      createdAt
      title
    }
    ExpensePlanAggregate(where: { isDeleted: { _eq: false }, createdAt: { _gte: $from, _lte: $to } }) { aggregate { count } }
    ExpenseRequestAggregate(where: { isDeleted: { _eq: false }, createdAt: { _gte: $from, _lte: $to } }) { aggregate { count } }
    ExpenseItemAggregate(where: { isDeleted: { _eq: false }, createdAt: { _gte: $from, _lte: $to } }) { aggregate { count } }
  }
  `;
};

export const getLastCalculationRule=`
query myQuery {
  ExpenseRule(orderBy: {createdAt: DESC}, limit: 1, where: {isDeleted: {_eq: false}}) {
    id
    version
    code
    calculationTypeRef
    standard
    activeFrom
    activeTo
    name
    currency {
      code
    }
    currencyRef
    deductionLimit
    taxesCode
    useLastCountry
    nonpayableCode
    advancePaymentCode
    countryRef
    useSingleCurrency
  }
}
`

export const getExpenseRuleFlagById=`query myQuery($id: uuid!){
    ExpenseRuleFlag(where: { expenseRuleId: {_eq: $id}, isDeleted: {_eq: false}}) {
      id
      version
      expenseRuleId
      value
      name
  }
}
`