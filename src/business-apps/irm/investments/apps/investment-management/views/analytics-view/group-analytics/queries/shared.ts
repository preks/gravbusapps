import { buildWhere } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_DESCRIPTORS } from '@/common/data/investment/types/investmentTypes.new'
import { isAllCurrencySelection } from '@/common/data/investment/utils/investmentCurrencySelection'

export interface InvestmentGroupDistributionDatum {
  category: string
  count: number
  totalAmount: number
  averageAmount: number
}

export interface InvestmentGroupTimelineDatum {
  period: string
  count: number
  totalAmount: number
  cumulativeAmount: number
  averageAmount: number
}

export interface InvestmentGroupMonthlyTimelineDatum {
  period: string
  year: string
  month: number
  monthLabel: string
  count: number
  totalAmount: number
  averageAmount: number
}

export interface InvestmentGroupTypeTimelineResult {
  timelineData: Array<Record<string, string | number>>
  investmentTypes: string[]
  typeKeyByLabel: Record<string, string>
}

export interface TopInvestmentDatum {
  id: string
  name: string
  totalAmount: number
  currencyCode: string
}

export interface InvestmentGroupParetoDatum {
  id: string
  name: string
  totalAmount: number
  cumulativeAmount: number
  cumulativePercentage: number
  currencyCode: string
}

export type DistributionDimension = 'investmentType' | 'investmentStatus' | 'currency'
export type TimelineDateField = 'createdAt' | 'plannedExitDate'

export interface DistinctCategory {
  id: string
  label: string
}

export interface AggregateResult {
  InvestmentAggregate?: {
    aggregate?: {
      count?: number
      sum?: {
        totalInvestmentAmount?: number | null
      } | null
      avg?: {
        totalInvestmentAmount?: number | null
      } | null
    } | null
  } | null
}

export const EMPTY_AGGREGATE = {
  count: 0,
  totalAmount: 0,
  averageAmount: 0
}

export const getLastYears = (count: number): string[] => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: count }, (_, index) => String(currentYear - count + index + 1))
}

export const getNextYears = (count: number): string[] => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: count }, (_, index) => String(currentYear + index))
}

export const getMonthsForYears = (
  years: string[]
): Array<{ period: string; year: string; month: number; monthLabel: string }> => {
  const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' })

  return years.flatMap(year =>
    Array.from({ length: 12 }, (_, index) => {
      const month = index + 1
      const monthLabel = monthFormatter.format(new Date(Number(year), index, 1))
      return {
        period: `${year}-${String(month).padStart(2, '0')}`,
        year,
        month,
        monthLabel
      }
    })
  )
}

export const toChartKey = (value: string): string => {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'unknown'
  )
}

export const normalizeAmount = (value: number | null | undefined): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export const buildInvestmentGroupWhere = (
  groupId: string,
  currencyCode?: string,
  extraConditions: Record<string, any>[] = []
): Record<string, any> => {
  const customConditions: Record<string, any>[] = [{ investmentGroup: { id: { _eq: groupId } } }, ...extraConditions]

  if (!isAllCurrencySelection(currencyCode)) {
    customConditions.push({ currency: { code: { _eq: currencyCode } } })
  }

  return buildWhere({
    variables: {},
    descriptors: INVESTMENT_DESCRIPTORS,
    customConditions,
    isDeleted: true
  })
}

export const getDistinctQuery = (dimension: DistributionDimension): string => {
  if (dimension === 'investmentType') {
    return `
      query GetDistinctInvestmentTypes($where: InvestmentBoolExp) {
        Investment(where: $where, distinctOn: [investmentTypeRef], orderBy: [{ investmentTypeRef: ASC }]) {
          investmentTypeRef
          investmentType { value }
        }
      }
    `
  }

  if (dimension === 'investmentStatus') {
    return `
      query GetDistinctInvestmentStatuses($where: InvestmentBoolExp) {
        Investment(where: $where, distinctOn: [investmentStatusRef], orderBy: [{ investmentStatusRef: ASC }]) {
          investmentStatusRef
          investmentStatus { value }
        }
      }
    `
  }

  return `
    query GetDistinctInvestmentCurrencies($where: InvestmentBoolExp) {
      Investment(where: $where, distinctOn: [currencyRef], orderBy: [{ currencyRef: ASC }]) {
        currencyRef
        currency { code value }
      }
    }
  `
}

export const toDistinctCategories = (dimension: DistributionDimension, rows: any[]): DistinctCategory[] => {
  if (dimension === 'investmentType') {
    return rows
      .filter(row => row.investmentTypeRef && row.investmentType?.value)
      .map(row => ({ id: row.investmentTypeRef as string, label: row.investmentType.value as string }))
  }

  if (dimension === 'investmentStatus') {
    return rows
      .filter(row => row.investmentStatusRef && row.investmentStatus?.value)
      .map(row => ({ id: row.investmentStatusRef as string, label: row.investmentStatus.value as string }))
  }

  return rows
    .filter(row => row.currencyRef && row.currency?.code)
    .map(row => ({ id: row.currencyRef as string, label: row.currency.code as string }))
}

export const getCategoryCondition = (dimension: DistributionDimension, categoryId: string): Record<string, any> => {
  if (dimension === 'investmentType') return { investmentTypeRef: { _eq: categoryId } }
  if (dimension === 'investmentStatus') return { investmentStatusRef: { _eq: categoryId } }
  return { currencyRef: { _eq: categoryId } }
}

export const parseAggregate = (result: AggregateResult) => {
  const aggregate = result.InvestmentAggregate?.aggregate
  return {
    count: aggregate?.count ?? 0,
    totalAmount: normalizeAmount(aggregate?.sum?.totalInvestmentAmount),
    averageAmount: normalizeAmount(aggregate?.avg?.totalInvestmentAmount)
  }
}
