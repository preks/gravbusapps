export const ruleDataQuery = `query ruleDataQuery($activeUserLocale: String!){
   Currencies: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "Currency"}}, isDeleted: { _eq: false }}, orderBy: {value: ASC}) {
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
   CalculationTypes: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "ExpenseCalculationType"}}, isDeleted: { _eq: false }}, orderBy: {value: ASC}) {
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
    where: { catalog: { version: { _eq: "v1" }, identifier: { _eq: "Country" } }, isDeleted: { _eq: false } }
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
`

// Paginated query for affected expenses modal with aggregates
export const buildGetAffectedExpensesQuery = (): string => {
  return `
  query getAffectedExpenses(
    $from: timestamptz!,
    $to: timestamptz!,
  ) {
    ExpensePlanAggregate(where: { isDeleted: { _eq: false }, createdAt: { _gte: $from, _lte: $to } }) { aggregate { count } }
    ExpenseRequestAggregate(where: { isDeleted: { _eq: false }, createdAt: { _gte: $from, _lte: $to } }) { aggregate { count } }
    ExpenseItemAggregate(where: { isDeleted: { _eq: false }, createdAt: { _gte: $from, _lte: $to } }) { aggregate { count } }
  }
  `
}

export const getLastCalculationRule = `
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

export const getExpenseRuleFlagById = `query myQuery($id: uuid!){
    ExpenseRuleFlag(where: { expenseRuleId: {_eq: $id}, isDeleted: {_eq: false}}) {
      id
      version
      expenseRuleId
      value
      name
  }
}
`
export const getCalculationRule = `query myQuery($calculationId: uuid = null) {
  ExpenseRule(
    where: {
      isDeleted: {_eq: false},
      _or: [
        { id: { _eq: $calculationId } }
        { id: { _isNull: true } }
      ]
    }
  ) {
    id
    version
    name
    code
    calculationTypeRef
    standard
    activeFrom
    activeTo
    currency {
      id
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

export const getExpenseRuleAggregateByCode = `query ExpenseRuleAggregateByCode($codeValue: String, $ruleId: uuid) {
  ExpenseRuleAggregate(where: {isDeleted: {_eq: false}, _or: [{code: {_eq: $codeValue}}, {id: {_isNull: true}}], id: {_neq: $ruleId}}) {
    aggregate {
      count
    }
  }
}
`

// Combined query for Edit mode - fetches everything in one call
export const getEditModeData = `query getEditModeData($calculationId: uuid!, $activeUserLocale: String!) {
  # Catalog data
  Currencies: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "Currency"}}, isDeleted: { _eq: false }}, orderBy: {value: ASC}) {
    code
    value
    id
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog { defaultLocale }
  }
  CalculationTypes: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "ExpenseCalculationType"}}, isDeleted: { _eq: false }}, orderBy: {value: ASC}) {
    value
    id
    code
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog { defaultLocale }
  }
  Countries: CatalogEntry(where: { catalog: { version: { _eq: "v1" }, identifier: { _eq: "Country" } }, isDeleted: { _eq: false } }, orderBy: { value: ASC }) {
    code
    id
    value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog { defaultLocale }
  }
  # Rule being edited
  ExpenseRule(where: { isDeleted: {_eq: false}, id: { _eq: $calculationId } }) {
    id
    version
    name
    code
    calculationTypeRef
    standard
    activeFrom
    activeTo
    currency { id code }
    currencyRef
    deductionLimit
    taxesCode
    useLastCountry
    nonpayableCode
    advancePaymentCode
    countryRef
    useSingleCurrency
  }
  # Flags for this rule
  ExpenseRuleFlag(where: { expenseRuleId: {_eq: $calculationId}, isDeleted: {_eq: false}}) {
    id
    version
    expenseRuleId
    value
    name
  }
  # Usage check - determine if rule has been used
  planCount: ExpensePlanAggregate(where: { expenseRuleId: { _eq: $calculationId }, isDeleted: { _eq: false } }) {
    aggregate { count }
  }
  requestCount: ExpenseRequestAggregate(where: { expenseRuleId: { _eq: $calculationId }, isDeleted: { _eq: false } }) {
    aggregate { count }
  }
  itemCount: ExpenseItemAggregate(where: { expenseRuleGeneralExpense: { expenseRuleId: { _eq: $calculationId } }, isDeleted: { _eq: false } }) {
    aggregate { count }
  }
}
`

// Combined query for Create mode - fetches catalogs and last rule
export const getCreateModeData = `query getCreateModeData($activeUserLocale: String!) {
  # Catalog data
  Currencies: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "Currency"}}, isDeleted: { _eq: false }}, orderBy: {value: ASC}) {
    code
    value
    id
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog { defaultLocale }
  }
  CalculationTypes: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "ExpenseCalculationType"}}, isDeleted: { _eq: false }}, orderBy: {value: ASC}) {
    value
    id
    code
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog { defaultLocale }
  }
  Countries: CatalogEntry(where: { catalog: { version: { _eq: "v1" }, identifier: { _eq: "Country" } }, isDeleted: { _eq: false } }, orderBy: { value: ASC }) {
    code
    id
    value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog { defaultLocale }
  }
  # Last rule for reference
  ExpenseRule(orderBy: {createdAt: DESC}, limit: 1, where: {isDeleted: {_eq: false}}) {
    id
    version
    code
  }
}
`
