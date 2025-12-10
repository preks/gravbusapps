import type { InvestmentReport } from '@/common/data/investment/types/investmentReportTypes'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import { InvestmentFormValues } from '@/common/components/investment/form-layouts/investment-layout'
import dayjs from 'dayjs'
import { InvestmentType } from '@/common/data/investment/hooks/useInvestmentTypes'
import { mapToSingleInvestmentTypeId } from '@/common/components/investment/form-layouts/investment-layout/utils/investmentTypeMapper'
import { createDynamicInvestmentSchema } from '@/common/components/investment/form-layouts/investment-layout/investmentSchema'
import { mapToFormValues } from '@/common/utils/formMappingUtils'

/**
 * Extract investment data from report, excluding id/version
 * Merges nested report.investment with report-level fields
 */
const extractInvestmentDataFromReport = (report: InvestmentReport | Partial<InvestmentReport>): Partial<Investment> => {
  // Start with nested investment object if it exists
  const baseInvestment = report.investment
    ? {
        ...report.investment,
        id: undefined,
        version: undefined,
        ...(report.investment.code === null ? {} : { code: report.investment.code }),
        // Explicitly preserve investmentAccounts from report
        ...(report.investment.investmentAccounts ? { investmentAccounts: report.investment.investmentAccounts } : {})
      }
    : {
        name: (report as any).name || '',
        ...((report as any).code === null ? {} : { code: (report as any).code })
      }

  // Merge report-level fields (these override nested investment fields for reports)
  const result = {
    ...baseInvestment,
    // Catalog references
    ...(report.investmentStakeTypeRef !== undefined && { investmentStakeTypeRef: report.investmentStakeTypeRef }),
    ...(report.investmentPhaseRef !== undefined && { investmentPhaseRef: report.investmentPhaseRef }),
    ...(report.investmentStatusRef !== undefined && { investmentStatusRef: report.investmentStatusRef }),
    ...(report.investmentRiskLevelRef !== undefined && { investmentRiskLevelRef: report.investmentRiskLevelRef }),
    ...(report.currencyRef !== undefined && { currencyRef: report.currencyRef }),
    // Financial fields
    ...(report.plannedExitDate !== undefined && { plannedExitDate: report.plannedExitDate }),
    ...(report.totalInvestmentAmount !== undefined && { totalInvestmentAmount: report.totalInvestmentAmount }),
    ...(report.investmentMarketValue !== undefined && { investmentMarketValue: report.investmentMarketValue }),
    ...(report.debtFinancingAmount !== undefined && { debtFinancingAmount: report.debtFinancingAmount }),
    ...(report.requiredCapitalAmount !== undefined && { requiredCapitalAmount: report.requiredCapitalAmount }),
    ...(report.forecastedRevenueAmount !== undefined && { forecastedRevenueAmount: report.forecastedRevenueAmount }),
    ...(report.forecastedProfitAmount !== undefined && { forecastedProfitAmount: report.forecastedProfitAmount }),
    ...(report.stakePercentage !== undefined && { stakePercentage: report.stakePercentage }),
    // Loan fields
    ...(report.loanRecipientName !== undefined && { loanRecipientName: report.loanRecipientName }),
    ...(report.loanAmount !== undefined && { loanAmount: report.loanAmount }),
    ...(report.loanOpenCommitmentAmount !== undefined && { loanOpenCommitmentAmount: report.loanOpenCommitmentAmount }),
    ...(report.loanInterestRate !== undefined && { loanInterestRate: report.loanInterestRate }),
    ...(report.loanStartDate !== undefined && { loanStartDate: report.loanStartDate }),
    ...(report.loanEndDate !== undefined && { loanEndDate: report.loanEndDate }),
    ...(report.loanInterestClaim !== undefined && { loanInterestClaim: report.loanInterestClaim }),
    ...(report.loanRecipientInvestmentAccountId !== undefined && {
      loanRecipientInvestmentAccountId: report.loanRecipientInvestmentAccountId
    }),
    // Fund fields
    ...(report.totalCommitmentAmount !== undefined && { totalCommitmentAmount: report.totalCommitmentAmount }),
    ...(report.totalDistributionAmount !== undefined && { totalDistributionAmount: report.totalDistributionAmount }),
    ...(report.fundManagerName !== undefined && { fundManagerName: report.fundManagerName }),
    // Additional fields
    ...(report.identification !== undefined && { identification: report.identification }),
    ...((report as any).irr !== undefined && { irr: (report as any).irr }),
    ...((report as any).moic !== undefined && { moic: (report as any).moic })
  }

  // Debug logs to investigate form prefill issue
  console.log('[extractInvestmentDataFromReport] DEBUG - Report Input:', {
    totalInvestmentAmount: report.totalInvestmentAmount,
    investmentMarketValue: report.investmentMarketValue,
    stakePercentage: report.stakePercentage,
    investmentStakeTypeRef: report.investmentStakeTypeRef,
    currencyRef: report.currencyRef,
    investmentPhaseRef: report.investmentPhaseRef,
    investmentStatusRef: report.investmentStatusRef,
    investmentRiskLevelRef: report.investmentRiskLevelRef,
    plannedExitDate: report.plannedExitDate
  })

  console.log('[extractInvestmentDataFromReport] DEBUG - Base Investment:', {
    totalInvestmentAmount: (baseInvestment as any).totalInvestmentAmount,
    investmentMarketValue: (baseInvestment as any).investmentMarketValue,
    stakePercentage: (baseInvestment as any).stakePercentage,
    investmentStakeTypeRef: (baseInvestment as any).investmentStakeTypeRef,
    currencyRef: (baseInvestment as any).currencyRef
  })

  console.log('[extractInvestmentDataFromReport] DEBUG - Result:', {
    totalInvestmentAmount: (result as any).totalInvestmentAmount,
    investmentMarketValue: (result as any).investmentMarketValue,
    stakePercentage: (result as any).stakePercentage,
    investmentStakeTypeRef: (result as any).investmentStakeTypeRef,
    currencyRef: (result as any).currencyRef,
    investmentPhaseRef: (result as any).investmentPhaseRef,
    investmentStatusRef: (result as any).investmentStatusRef,
    investmentRiskLevelRef: (result as any).investmentRiskLevelRef,
    plannedExitDate: (result as any).plannedExitDate
  })

  return result
}

/**
 * Remove id/version from a sub-investment (handles both array and single object)
 */
const removeIdVersionFromSubInvestment = (subInvestment: any): any => {
  if (Array.isArray(subInvestment)) {
    return subInvestment.map((item: any) => ({
      ...item,
      id: undefined,
      version: undefined
    }))
  }
  return {
    ...subInvestment,
    id: undefined,
    version: undefined
  }
}

/**
 * Merge fetched investment with report investment data, excluding id/version
 */
const mergeInvestmentData = (
  investmentData: Partial<Investment>,
  fetchedInvestment?: Investment | null | undefined
): Partial<Investment> => {
  if (!fetchedInvestment) {
    console.log('[mergeInvestmentData] DEBUG - No fetched investment, returning investmentData only')
    return investmentData
  }

  const result = {
    ...fetchedInvestment,
    id: undefined,
    version: undefined,
    ...(fetchedInvestment.equityInvestment
      ? { equityInvestment: removeIdVersionFromSubInvestment(fetchedInvestment.equityInvestment) }
      : {}),
    ...(fetchedInvestment.liquidFundInvestment
      ? { liquidFundInvestment: removeIdVersionFromSubInvestment(fetchedInvestment.liquidFundInvestment) }
      : {}),
    ...(fetchedInvestment.realEstateInvestment
      ? { realEstateInvestment: removeIdVersionFromSubInvestment(fetchedInvestment.realEstateInvestment) }
      : {}),
    // Explicitly preserve investmentAccounts from fetched investment
    ...(fetchedInvestment.investmentAccounts ? { investmentAccounts: fetchedInvestment.investmentAccounts } : {}),
    ...investmentData
  }

  console.log('[mergeInvestmentData] DEBUG - Merge Details:', {
    investmentDataValues: {
      totalInvestmentAmount: investmentData.totalInvestmentAmount,
      investmentMarketValue: investmentData.investmentMarketValue,
      stakePercentage: investmentData.stakePercentage,
      investmentStakeTypeRef: investmentData.investmentStakeTypeRef
    },
    fetchedInvestmentValues: {
      totalInvestmentAmount: fetchedInvestment.totalInvestmentAmount,
      investmentMarketValue: fetchedInvestment.investmentMarketValue,
      stakePercentage: fetchedInvestment.stakePercentage,
      investmentStakeTypeRef: fetchedInvestment.investmentStakeTypeRef
    },
    resultValues: {
      totalInvestmentAmount: result.totalInvestmentAmount,
      investmentMarketValue: result.investmentMarketValue,
      stakePercentage: result.stakePercentage,
      investmentStakeTypeRef: result.investmentStakeTypeRef
    }
  })

  return result
}

/**
 * Map sub-investment report to form values (with or without id/version based on mode)
 */
const mapSubInvestmentReport = (reportItem: any, reportId: string | undefined): any => {
  if (reportId) {
    return reportItem
  }
  return {
    ...reportItem,
    id: undefined,
    version: undefined
  }
}

/**
 * Extract liquidFundTypeId from merged investment data
 */
const extractLiquidFundTypeId = (mergedInvestmentData: Partial<Investment>): string | null => {
  if (!mergedInvestmentData.liquidFundInvestment) return null

  const liquidFund = Array.isArray(mergedInvestmentData.liquidFundInvestment)
    ? mergedInvestmentData.liquidFundInvestment[0]
    : mergedInvestmentData.liquidFundInvestment
  return (liquidFund as any)?.investmentLiquidFundTypeRef || null
}

/**
 * Set investment type ID in mapped values
 */
const setInvestmentTypeId = (
  mappedValues: Partial<InvestmentFormValues>,
  mergedInvestmentData: Partial<Investment>,
  getPathByType?: (typeId: string | null | undefined) => InvestmentType[]
): void => {
  if (!getPathByType) return

  const groupId = mergedInvestmentData.investmentGroupRef || null
  const typeId = mergedInvestmentData.investmentTypeRef || null
  const liquidFundTypeId = extractLiquidFundTypeId(mergedInvestmentData)
  const investmentTypeId = mapToSingleInvestmentTypeId(groupId, typeId, liquidFundTypeId, getPathByType)

  if (investmentTypeId && mappedValues.investment) {
    ;(mappedValues.investment as any).investmentTypeId = investmentTypeId
  }
}

/**
 * Map investment role from report to form values
 */
const mapInvestmentRole = (
  report: InvestmentReport | Partial<InvestmentReport>,
  mappedValues: Partial<InvestmentFormValues>
): void => {
  if (report.investmentRoleReport && mappedValues.investment) {
    ;(mappedValues.investment as any).investmentRole = report.investmentRoleReport
  }
}

/**
 * Map sub-investment reports to form values
 */
const mapSubInvestmentReports = (
  report: InvestmentReport | Partial<InvestmentReport>,
  reportId: string | undefined,
  mappedValues: Partial<InvestmentFormValues>
): void => {
  if (report.equityInvestmentReport && report.equityInvestmentReport.length > 0) {
    ;(mappedValues as any).equityInvestment = mapSubInvestmentReport(report.equityInvestmentReport[0], reportId)
  }

  if (report.liquidFundInvestmentReport && report.liquidFundInvestmentReport.length > 0) {
    ;(mappedValues as any).liquidFundInvestment = mapSubInvestmentReport(report.liquidFundInvestmentReport[0], reportId)
  }

  if (report.realEstateInvestmentReport && report.realEstateInvestmentReport.length > 0) {
    ;(mappedValues as any).realEstateInvestment = mapSubInvestmentReport(report.realEstateInvestmentReport[0], reportId)
  }
}

/**
 * Set investment IDs in mapped values
 */
const setInvestmentIds = (
  mappedValues: Partial<InvestmentFormValues>,
  investmentId: string | undefined,
  reportId: string | undefined,
  report: InvestmentReport | Partial<InvestmentReport>
): void => {
  if (mappedValues.investment && investmentId) {
    ;(mappedValues.investment as any).id = investmentId
    ;(mappedValues.investment as any).investmentId = investmentId
  }

  if (reportId && mappedValues.investment) {
    ;(mappedValues.investment as any).reportId = reportId
    ;(mappedValues.investment as any).reportVersion = report.version
  }
}

/**
 * Normalize liquid fund investment array
 */
const normalizeLiquidFundInvestment = (mappedValues: Partial<InvestmentFormValues>): any => {
  const liquidFundInvestment = (mappedValues as any).liquidFundInvestment
  if (!liquidFundInvestment) return null

  return Array.isArray(liquidFundInvestment) ? liquidFundInvestment[0] : liquidFundInvestment
}

/**
 * Transforms InvestmentReport to InvestmentFormValues structure
 * Used for initializing the form with report data
 */
export const transformInvestmentReport = (
  report: InvestmentReport | Partial<InvestmentReport>,
  reportId: string | undefined,
  investmentId: string | undefined,
  getPathByType?: (typeId: string | null | undefined) => InvestmentType[],
  fetchedInvestment?: Investment | null | undefined
): Partial<InvestmentFormValues & { investmentReportDate?: string; investmentReportScope?: string }> => {
  const investmentData = extractInvestmentDataFromReport(report)
  const mergedInvestmentData = mergeInvestmentData(investmentData, fetchedInvestment)

  const baseSchema = createDynamicInvestmentSchema()
  const mappedValues = mapToFormValues(
    { investment: mergedInvestmentData },
    baseSchema
  ) as Partial<InvestmentFormValues>

  setInvestmentTypeId(mappedValues, mergedInvestmentData, getPathByType)
  mapInvestmentRole(report, mappedValues)
  mapSubInvestmentReports(report, reportId, mappedValues)
  setInvestmentIds(mappedValues, investmentId, reportId, report)

  // Explicitly preserve investmentAccounts in mapped values
  if (mergedInvestmentData.investmentAccounts && mappedValues.investment) {
    ;(mappedValues.investment as any).investmentAccounts = mergedInvestmentData.investmentAccounts
  }

  const liquidFundNormalized = normalizeLiquidFundInvestment(mappedValues)

  const finalResult = {
    ...mappedValues,
    ...(liquidFundNormalized && { liquidFundInvestment: liquidFundNormalized }),
    investmentReportDate: report.date || dayjs().format('YYYY-MM-DD'),
    investmentReportScope: report.scope || 'MONTHLY'
  }

  // Debug logs to investigate form prefill issue
  console.log('[transformInvestmentReport] DEBUG - Final Form Values:', {
    investmentReportDate: finalResult.investmentReportDate,
    investmentReportScope: finalResult.investmentReportScope,
    investment: {
      totalInvestmentAmount: finalResult.investment?.totalInvestmentAmount,
      investmentMarketValue: finalResult.investment?.investmentMarketValue,
      stakePercentage: finalResult.investment?.stakePercentage,
      investmentStakeTypeRef: finalResult.investment?.investmentStakeTypeRef,
      currencyRef: finalResult.investment?.currencyRef,
      investmentPhaseRef: finalResult.investment?.investmentPhaseRef,
      investmentStatusRef: finalResult.investment?.investmentStatusRef,
      investmentRiskLevelRef: finalResult.investment?.investmentRiskLevelRef,
      plannedExitDate: finalResult.investment?.plannedExitDate,
      investmentRole: (finalResult.investment as any)?.investmentRole
    },
    equityInvestment: finalResult.equityInvestment
      ? {
          marketValue: (finalResult.equityInvestment as any)?.marketValue,
          turnoverAmount: (finalResult.equityInvestment as any)?.turnoverAmount,
          ebitdaAmount: (finalResult.equityInvestment as any)?.ebitdaAmount
        }
      : undefined
  })

  return finalResult
}
