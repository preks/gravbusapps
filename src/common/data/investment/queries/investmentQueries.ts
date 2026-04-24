// Investment Queries - Core investment entities and their specializations
// Built using actual schema discovered via newwork-mcp
import { CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { buildDocumentFragment } from '@/common/data/relations/queries/relationFragments'
import { InvestmentDocumentFields } from '../types/investmentDocumentTypes'
import { INVESTMENT, INVESTMENT_SHAREHOLDER } from './fragments/investmentFragments'
import {
  INVESTMENT_ACTIVITY_REF,
  INVESTMENT_TASK_REF,
  INVESTMENT_ACCOUNT_REF
} from './fragments/investmentReferenceFragments'

export interface InvestmentQueryVariables {
  ids?: string[]
  search?: string
  investmentTypeIds?: string[]
  investmentStatusIds?: string[]
  investmentGroupIds?: string[]
  investmentPhaseIds?: string[]
  investmentRiskLevelIds?: string[]
  currencyIds?: string[]
  currencyCode?: string // Simple currency code like 'EUR', 'USD' - convenience parameter
  ownerEmployeeIds?: string[]
  accountIds?: string[]
  opportunityIds?: string[]
  // Creation date range (createdAt)
  createdAfter?: string
  createdBefore?: string
  // Amount ranges
  initialInvestmentMinAmount?: number
  initialInvestmentMaxAmount?: number
  marketValueMinAmount?: number
  marketValueMaxAmount?: number
  // Performance (percentage) range - applied client-side if provided
  performanceMinPercent?: number
  performanceMaxPercent?: number
  acquisitionDateFrom?: string
  acquisitionDateTo?: string
  exitDateFrom?: string
  exitDateTo?: string
  plannedExitDateFrom?: string
  plannedExitDateTo?: string
  // Text filters
  isinContains?: string
  fundManagerNameContains?: string
  // Catalog filters (phase already supported; risk level & currency already declared above)
  // Numeric scalars
  stakePercentageMin?: number
  stakePercentageMax?: number
  totalInvestmentMinAmount?: number
  totalInvestmentMaxAmount?: number
  debtFinancingMinAmount?: number
  debtFinancingMaxAmount?: number
  forecastedProfitMinAmount?: number
  forecastedProfitMaxAmount?: number
  // Liquid fund specialization filters
  liquidFundBankAccountContains?: string
  liquidFundEarlyTermination?: boolean
  limit?: number
  offset?: number
  orderBy?: Array<{
    field: string
    direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
  }>
}

export interface InvestmentDocumentQueryVariables {
  investmentId: string
  createdBy?: string // Filter by creator user ID
  limit?: number
  offset?: number
}

/**
 * Build a Hasura `InvestmentBoolExp` as a plain JavaScript object suitable for
 * passing as a GraphQL variable (e.g. `{ where: $where }`).
 *
 * Prefer this over building a where clause via string concatenation:
 *   - User input (search terms, free-text filters) is sent in the GraphQL
 *     variables payload, never embedded in the query body — this eliminates
 *     GraphQL injection risk and makes the query identical for any input.
 *   - Hasura can cache the parsed/compiled query plan because the query body
 *     no longer changes per request.
 */
type RangeExpression<T> = { _gte?: T; _lte?: T }

const addRange = <T>(
  where: Record<string, unknown>,
  field: string,
  min: T | undefined,
  max: T | undefined,
  isPresent: (v: T | undefined) => boolean
): void => {
  const range: RangeExpression<T> = {}
  if (isPresent(min)) range._gte = min
  if (isPresent(max)) range._lte = max
  if (Object.keys(range).length) where[field] = range
}

const isNonEmptyString = (v: string | undefined): v is string => typeof v === 'string' && v.length > 0
const isNumber = (v: number | undefined): v is number => typeof v === 'number'

export const buildInvestmentWhereObject = (variables: InvestmentQueryVariables = {}): Record<string, unknown> => {
  const where: Record<string, unknown> = { isDeleted: { _eq: false } }

  // Free-text search — applied as a single _or block across the indexed
  // text fields. The search term is interpolated into _ilike but flows through
  // GraphQL variables, so quoting/escaping is handled by the transport.
  const searchTerm = variables.search?.trim()
  if (searchTerm) {
    const pattern = `%${searchTerm}%`
    where._or = [
      { name: { _ilike: pattern } },
      { code: { _ilike: pattern } },
      { isin: { _ilike: pattern } },
      { fundManagerName: { _ilike: pattern } },
      { loanRecipientName: { _ilike: pattern } }
    ]
  }

  // ID-list filters (catalog references)
  if (variables.investmentTypeIds?.length) {
    where.investmentType = { id: { _in: variables.investmentTypeIds } }
  }
  if (variables.investmentStatusIds?.length) {
    where.investmentStatus = { id: { _in: variables.investmentStatusIds } }
  }
  if (variables.investmentGroupIds?.length) {
    where.investmentGroup = { id: { _in: variables.investmentGroupIds } }
  }
  if (variables.investmentPhaseIds?.length) {
    where.investmentPhase = { id: { _in: variables.investmentPhaseIds } }
  }
  if (variables.investmentRiskLevelIds?.length) {
    where.investmentRiskLevel = { id: { _in: variables.investmentRiskLevelIds } }
  }

  // Currency: prefer ID list, fall back to bare code
  if (variables.currencyIds?.length) {
    where.currency = { id: { _in: variables.currencyIds } }
  } else if (variables.currencyCode?.trim()) {
    where.currency = { code: { _eq: variables.currencyCode.trim() } }
  }

  // Free-text "contains" filters
  if (variables.isinContains?.trim()) {
    where.isin = { _ilike: `%${variables.isinContains.trim()}%` }
  }
  if (variables.fundManagerNameContains?.trim()) {
    where.fundManagerName = { _ilike: `%${variables.fundManagerNameContains.trim()}%` }
  }

  if (variables.ownerEmployeeIds?.length) {
    where.ownerEmployee = { id: { _in: variables.ownerEmployeeIds } }
  }
  if (variables.accountIds?.length) {
    where.investmentAccounts = { investmentAccountId: { _in: variables.accountIds } }
  }
  if (variables.opportunityIds?.length) {
    where.investmentOpportunity = { id: { _in: variables.opportunityIds } }
  }

  // Date and numeric ranges
  addRange<string>(where, 'createdAt', variables.createdAfter, variables.createdBefore, isNonEmptyString)
  addRange<string>(
    where,
    'acquisitionDate',
    variables.acquisitionDateFrom,
    variables.acquisitionDateTo,
    isNonEmptyString
  )
  addRange<string>(where, 'exitDate', variables.exitDateFrom, variables.exitDateTo, isNonEmptyString)
  addRange<string>(
    where,
    'plannedExitDate',
    variables.plannedExitDateFrom,
    variables.plannedExitDateTo,
    isNonEmptyString
  )

  addRange<number>(
    where,
    'initialInvestmentAmount',
    variables.initialInvestmentMinAmount,
    variables.initialInvestmentMaxAmount,
    isNumber
  )
  addRange<number>(
    where,
    'investmentMarketValue',
    variables.marketValueMinAmount,
    variables.marketValueMaxAmount,
    isNumber
  )
  addRange<number>(where, 'stakePercentage', variables.stakePercentageMin, variables.stakePercentageMax, isNumber)
  addRange<number>(
    where,
    'totalInvestmentAmount',
    variables.totalInvestmentMinAmount,
    variables.totalInvestmentMaxAmount,
    isNumber
  )
  addRange<number>(
    where,
    'debtFinancingAmount',
    variables.debtFinancingMinAmount,
    variables.debtFinancingMaxAmount,
    isNumber
  )
  addRange<number>(
    where,
    'forecastedProfitAmount',
    variables.forecastedProfitMinAmount,
    variables.forecastedProfitMaxAmount,
    isNumber
  )

  // Liquid fund nested filters — merged so that supplying both
  // bankAccountContains and earlyTermination produces a single object.
  const liquidFund: Record<string, unknown> = {}
  if (variables.liquidFundBankAccountContains?.trim()) {
    liquidFund.bankAccountNumber = { _ilike: `%${variables.liquidFundBankAccountContains.trim()}%` }
  }
  if (typeof variables.liquidFundEarlyTermination === 'boolean') {
    liquidFund.earlyTerminationAllowed = { _eq: variables.liquidFundEarlyTermination }
  }
  if (Object.keys(liquidFund).length) {
    where.liquidFundInvestment = liquidFund
  }

  return where
}

/**
 * Build the Hasura `[InvestmentOrderBy!]` array as plain JS objects, ready
 * to be sent as a GraphQL variable. Returns the default (`createdAt DESC`)
 * when no requested field is supported.
 */
const ORDER_BY_DEFAULT: Array<Record<string, unknown>> = [{ createdAt: 'DESC_NULLS_LAST' }]

const ORDER_BY_NESTED_FIELDS: Record<string, (direction: string) => Record<string, unknown>> = {
  'investmentType.value': direction => ({ investmentType: { value: direction } }),
  'investmentStatus.value': direction => ({ investmentStatus: { value: direction } }),
  'investmentGroup.value': direction => ({ investmentGroup: { value: direction } }),
  'ownerEmployee.displayName': direction => ({ ownerEmployee: { displayName: direction } })
}

const ORDER_BY_ALLOWED_ROOT_FIELDS = new Set<string>([
  'name',
  'code',
  'createdAt',
  'updatedAt',
  'acquisitionDate',
  'plannedExitDate',
  'exitDate',
  'initialInvestmentAmount',
  'totalInvestmentAmount',
  'investmentMarketValue',
  'stakePercentage',
  'fundManagerName',
  'loanInterestRate',
  'investmentType',
  'investmentStatus',
  'investmentGroup'
])

export const buildInvestmentOrderBy = (variables: InvestmentQueryVariables = {}): Array<Record<string, unknown>> => {
  const entries: Array<Record<string, unknown>> = []
  for (const ob of variables.orderBy || []) {
    const nested = ORDER_BY_NESTED_FIELDS[ob.field]
    if (nested) {
      entries.push(nested(ob.direction))
      continue
    }
    if (ORDER_BY_ALLOWED_ROOT_FIELDS.has(ob.field)) {
      entries.push({ [ob.field]: ob.direction })
    }
  }
  return entries.length ? entries : ORDER_BY_DEFAULT
}

/**
 * Build Investments query body for a given account ID (to be combined with a main query).
 * Returns a GraphQL selection body (without `query` wrapper) that can be injected alongside
 * another root-level selection — e.g. alongside InvestmentAccountByPk.
 *
 * The alias `accountInvestments` avoids collisions with other Investment selections.
 */
export const buildInvestmentsByAccountIdQueryBody = (accountId: string): string => {
  return `
    accountInvestments: Investment(
      limit: 100
      orderBy: [{ createdAt: DESC_NULLS_LAST }]
      where: {
        isDeleted: { _eq: false }
        investmentAccounts: { investmentAccountId: { _in: ["${accountId}"] } }
      }
    ) {
      ${INVESTMENT}
    }
  `
}

/**
 * Variables payload sent alongside the parameterized `GET_INVESTMENTS_QUERY`.
 * All dynamic input flows through this object — never the query body.
 */
export interface BuiltInvestmentsQueryVariables {
  where: Record<string, unknown>
  limit: number
  offset: number
  orderBy: Array<Record<string, unknown>>
}

/**
 * Parameterized GetInvestments query. Reuses the same `$where` for both the
 * paginated `Investment` selection and the `InvestmentAggregate` count, so we
 * never have to re-serialize the filter.
 */
const GET_INVESTMENTS_QUERY = `
    query GetInvestments(
      $where: InvestmentBoolExp
      $limit: Int
      $offset: Int
      $orderBy: [InvestmentOrderBy!]
    ) {
      Investment(
        limit: $limit
        offset: $offset
        orderBy: $orderBy
        where: $where
      ) {
        ${INVESTMENT}
      }

      InvestmentAggregate(where: $where) {
        aggregate {
          count
        }
      }
    }
  `

/**
 * Build the GetInvestments request as a `{ query, variables }` pair so callers
 * can do `graphqlClient.request(query, variables)` — keeping all dynamic input
 * out of the query body.
 */
export const GET_INVESTMENTS = (
  variables: InvestmentQueryVariables = {}
): { query: string; variables: BuiltInvestmentsQueryVariables } => {
  return {
    query: GET_INVESTMENTS_QUERY,
    variables: {
      where: buildInvestmentWhereObject(variables),
      limit: Math.min(variables.limit || 50, 100),
      offset: variables.offset || 0,
      orderBy: buildInvestmentOrderBy(variables)
    }
  }
}

// Get Investment Activities by Investment ID
export const GET_INVESTMENT_ACTIVITIES_BY_INVESTMENT_ID = (investmentId: string): string => {
  return `
    query GetInvestmentActivitiesByInvestmentId {
      InvestmentActivity(
        where: { 
          investment: { id: { _eq: "${investmentId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ occurredAt: DESC }]
      ) {
        ${INVESTMENT_ACTIVITY_REF}
        
        # Documents relation (includes fileInfo)
        documents(where: { isDeleted: { _eq: false } }) {
          ${buildDocumentFragment(InvestmentDocumentFields)}
        }
        
        # Entity references
        investment {
          id
          code
          name
        }
      }
    }
  `
}

// Get Investment Tasks by Investment ID
export const GET_INVESTMENT_TASKS_BY_INVESTMENT_ID = (investmentId: string): string => {
  return `
    query GetInvestmentTasksByInvestmentId {
      InvestmentTask(
        where: { 
          investment: { id: { _eq: "${investmentId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_TASK_REF}
        
        # Entity references
        investment {
          id
          code
          name
        }
      }
    }
  `
}

// Get Investment by ID with full details
export const GET_INVESTMENT_BY_ID = (id: string): string => {
  return `
    query GetInvestmentById {
      Investment(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
        ${INVESTMENT}
      }
    }
  `
}

// Search Investments (lightweight for autocomplete)
export const SEARCH_INVESTMENTS = (variables: InvestmentQueryVariables): string => {
  const { search = '', limit = 10 } = variables

  return `
    query SearchInvestments {
      Investment(
        where: {
          isDeleted: { _eq: false }
          _and: [
            {
              _or: [
                { name: { _ilike: "%${search}%" } },
                { code: { _ilike: "%${search}%" } },
                { isin: { _ilike: "%${search}%" } },
                { fundManagerName: { _ilike: "%${search}%" } }
              ]
            }
          ]
        }
        limit: ${limit}
        orderBy: [{ name: ASC }]
      ) {
        id
        code
        name
        isin
        initialInvestmentAmount
        totalInvestmentAmount
        investmentMarketValue
        acquisitionDate
        exitDate
        stakePercentage
        
        investmentType {
          ${CATALOG_ENTRY}
        }
        investmentStatus {
          ${CATALOG_ENTRY}
        }
        currency {
          ${CATALOG_ENTRY}
        }
        ownerEmployee {
          id
          displayName
        }
        investmentAccounts(where: { isDeleted: { _eq: false } }) {
          id
          investmentAccountId
          investmentAccount {
            ${INVESTMENT_ACCOUNT_REF}
          }
        }
      }
    }
  `
}

// Get Investment Shareholders by Investment ID
export const GET_INVESTMENT_SHAREHOLDERS_BY_INVESTMENT_ID = (investmentId: string): string => {
  return `
    query GetInvestmentShareholdersByInvestmentId {
      InvestmentShareholder(
        where: { 
          investmentId: { _eq: "${investmentId}" }
          isDeleted: { _eq: false }
        }
        orderBy: { stakePercentage: DESC_NULLS_LAST }
      ) {
        ${INVESTMENT_SHAREHOLDER}
      }
    }
  `
}
