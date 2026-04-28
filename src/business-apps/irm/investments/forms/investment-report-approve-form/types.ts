export interface InvestmentReportApproveData {
  investmentReportProcessContext: {
    investmentId: string
    userId: string
    currentInvestment: {
      equityInvestment: any | null
      investment: Investment
      liquidFundInvestment: any | null
      realEstateInvestment: RealEstateInvestment | null
    }
    updatedInvestment: {
      equityInvestment: any | null
      investment: Investment
      liquidFundInvestment: any | null
      realEstateInvestment: RealEstateInvestment | null
    }
    extractedReports: ExtractedReport[]
  }
}

export interface Investment {
  id: string
  version: number
  businessKey: string
  recordState: string
  activeTo: string | null
  additionalProperties: Record<string, any> | null
  code: string | null
  currencyRef: string | null
  debtFinancingAmount: number | null
  exitDate: string | null
  forecastedProfitAmount: number | null
  forecastedRevenueAmount: number | null
  fundManagerName: string | null
  identification: Record<string, any> | null
  initialInvestmentAmount: number | null
  investmentAccount: string
  investmentGroupRef: string
  investmentMarketValue: number | null
  investmentOpportunity: string | null
  investmentPhaseRef: string | null
  investmentRiskLevelRef: string | null
  investmentRoles: any[]
  investmentStakeTypeRef: string | null
  investmentStatusRef: string
  investmentTypeRef: string
  isin: string | null
  loanAmount: number | null
  loanEndDate: string | null
  loanInterestClaim: number | null
  loanInterestRate: number | null
  loanOpenCommitmentAmount: number | null
  loanRecipientInvestmentAccount: string | null
  loanRecipientName: string | null
  loanStartDate: string | null
  name: string
  ownerEmployee: string
  planedExit: boolean
  plannedExitDate: string | null
  requiredCapitalAmount: number | null
  stakePercentage: number | null
  securityQuantity: number | null
  timeWeightedPerformance: number | null
  maturityDate: string | null
  totalCommitmentAmount: number | null
  totalDistributionAmount: number | null
  totalInvestmentAmount: number | null
  acquisitionDate: string | null
  irr: number | null
  moic: number | null
}

export interface RealEstateInvestment {
  id: string
  version: number
  businessKey: string
  recordState: string
  activeTo: string | null
  additionalProperties: Record<string, any> | null
  addressLine: string | null
  annualNetColdRent: number | null
  buildingYear: string | null
  countryRef: string | null
  funding: number | null
  investment: string
  liquidityForecast: Record<string, any> | null
  locality: string | null
  numberOfUnits: number | null
  occupancyPercent: number | null
  postalCode: string | null
  regionRef: string | null
  size: number | null
  sizeMeasurementUnitRef: string | null
  targetAnnualExpenses: number | null
}

export interface ExtractedReport {
  investmentReport: InvestmentReport
  equityInvestmentReport: any | null
  investmentRoleReport: any | null
  liquidFundInvestmentReport: any | null
  realEstateInvestmentReport: RealEstateInvestmentReport | null
}

export interface InvestmentReport {
  id: string | null
  version: number | null
  businessKey: string | null
  recordState: string | null
  activeTo: string | null
  additionalProperties: Record<string, any>
  currencyRef: string | null
  date: string
  debtFinancingAmount: number | null
  forecastedProfitAmount: number | null
  forecastedRevenueAmount: number | null
  fundManagerName: string | null
  identification: Record<string, any>
  investment: string
  investmentMarketValue: number | null
  investmentPhaseRef: string | null
  investmentRiskLevelRef: string | null
  investmentStakeTypeRef: string | null
  investmentStatusRef: string | null
  loanAmount: number | null
  loanEndDate: string | null
  loanInterestClaim: number | null
  loanInterestRate: number | null
  loanOpenCommitmentAmount: number | null
  loanRecipientInvestmentAccount: string | null
  loanRecipientName: string | null
  loanStartDate: string | null
  plannedExitDate: string | null
  requiredCapitalAmount: number | null
  scope: string
  stakePercentage: number | null
  initialInvestmentAmount: number | null
  securityQuantity: number | null
  timeWeightedPerformance: number | null
  totalCommitmentAmount: number | null
  totalDistributionAmount: number | null
  totalInvestmentAmount: number | null
  irr: number | null
  moic: number | null
}

export interface RealEstateInvestmentReport {
  id: string | null
  version: number | null
  businessKey: string | null
  recordState: string | null
  activeTo: string | null
  additionalProperties: Record<string, any>
  annualNetColdRent: number | null
  date: string | null
  funding: number | null
  investmentReport: string | null
  liquidityForecast: Record<string, any>
  numberOfUnits: number | null
  occupancyPercent: number | null
  realEstateInvestment: string | null
  scope: string | null
  size: number | null
  sizeMeasurementUnitRef: string | null
  targetAnnualExpenses: number | null
}
