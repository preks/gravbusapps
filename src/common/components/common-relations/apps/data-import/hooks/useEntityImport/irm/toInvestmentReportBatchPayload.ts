import type { ImportConfig } from '@/common/components/common-relations/apps/data-import/types'
import {
  nestFlatDottedKeys,
  normalizeEntityForImport,
  parseJsonObjectString,
  stripEmptyValues,
  toRecordObject
} from '../shared'

const DEFAULT_REPORT_SCOPE = 'MONTHLY'

const INVESTMENT_REPORT_FIELDS = [
  'id',
  'version',
  'businessKey',
  'recordState',
  'activeTo',
  'additionalProperties',
  'date',
  'scope',
  'investmentStakeTypeRef',
  'investmentPhaseRef',
  'investmentStatusRef',
  'investmentRiskLevelRef',
  'plannedExitDate',
  'totalInvestmentAmount',
  'investmentMarketValue',
  'debtFinancingAmount',
  'requiredCapitalAmount',
  'forecastedRevenueAmount',
  'forecastedProfitAmount',
  'stakePercentage',
  'loanRecipientName',
  'loanAmount',
  'loanOpenCommitmentAmount',
  'loanInterestRate',
  'loanStartDate',
  'loanEndDate',
  'loanInterestClaim',
  'totalCommitmentAmount',
  'totalDistributionAmount',
  'currencyRef',
  'fundManagerName',
  'identification',
  'forecast',
  'moic',
  'irr',
  'securityQuantity',
  'timeWeightedPerformance',
  'initialInvestmentAmount',
  'loanRecipientInvestmentAccount',
  'loanRecipientInvestmentAccountId',
  'investmentRoleReports'
] as const

function pickFields(source: Record<string, any>, fields: readonly string[]): Record<string, any> {
  const result: Record<string, any> = {}
  for (const field of fields) {
    if (source[field] !== undefined) {
      result[field] = source[field]
    }
  }
  return result
}

function resolveInvestmentRef(record: Record<string, any>, investmentReport: Record<string, any>): unknown {
  if (typeof record.investment === 'string') return record.investment
  if (typeof record.investmentId === 'string') return record.investmentId
  if (typeof investmentReport.investment === 'string') return investmentReport.investment
  if (typeof investmentReport.investmentId === 'string') return investmentReport.investmentId
  return undefined
}

function normalizeInvestmentReport(record: Record<string, any>): Record<string, any> {
  const nestedInvestmentReport = toRecordObject(record.investmentReport)
  const investmentReport = {
    ...pickFields(record, INVESTMENT_REPORT_FIELDS),
    ...nestedInvestmentReport
  }

  const investmentRef = resolveInvestmentRef(record, investmentReport)
  if (investmentRef) {
    investmentReport.investment = investmentRef
  }

  if (investmentReport.loanRecipientInvestmentAccountId && !investmentReport.loanRecipientInvestmentAccount) {
    investmentReport.loanRecipientInvestmentAccount = investmentReport.loanRecipientInvestmentAccountId
  }
  if (investmentReport.investmentRoles && !investmentReport.investmentRoleReports) {
    investmentReport.investmentRoleReports = investmentReport.investmentRoles
  }
  if (!investmentReport.scope) {
    investmentReport.scope = DEFAULT_REPORT_SCOPE
  }

  investmentReport.identification = parseJsonObjectString(investmentReport.identification)
  investmentReport.additionalProperties = parseJsonObjectString(investmentReport.additionalProperties)
  delete investmentReport.investmentId
  delete investmentReport.loanRecipientInvestmentAccountId
  delete investmentReport.investmentRoles

  return stripEmptyValues(investmentReport)
}

function normalizeSpecificReport(
  record: Record<string, any>,
  payloadKey: NonNullable<ImportConfig['investmentReportPayloadKey']>
): Record<string, any> {
  const specificReport = {
    ...toRecordObject(record[payloadKey])
  }

  if (!specificReport.scope) {
    specificReport.scope = DEFAULT_REPORT_SCOPE
  }

  specificReport.additionalProperties = parseJsonObjectString(specificReport.additionalProperties)
  specificReport.liquidityForecast = parseJsonObjectString(specificReport.liquidityForecast)

  return stripEmptyValues(specificReport)
}

export function toInvestmentReportBatchPayload(
  entities: Record<string, any>[],
  config: ImportConfig
): { investmentReportRequests: Record<string, any>[] } {
  const payloadKey = config.investmentReportPayloadKey

  const investmentReportRequests = entities.map(entity => {
    const nested = nestFlatDottedKeys(entity)
    const normalized = normalizeEntityForImport(nested)
    const investmentReport = normalizeInvestmentReport(normalized)
    const request: Record<string, any> = { investmentReport }

    if (payloadKey) {
      const specificReport = normalizeSpecificReport(normalized, payloadKey)
      if (Object.keys(specificReport).length > 0) {
        request[payloadKey] = specificReport
      }
    }

    return request
  })

  return {
    investmentReportRequests: investmentReportRequests.filter(req => req.investmentReport.investment)
  }
}
