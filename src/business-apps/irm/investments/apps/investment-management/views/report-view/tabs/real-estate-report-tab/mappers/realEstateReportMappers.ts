import type { EnhancedRealEstateInvestment, RealEstateInvestmentDetail } from '../types/realEstateReportTypes'

// Helper function to format currency code
const extractCurrencyCode = (currencyId: string | undefined): string => {
  if (!currencyId) return 'EUR'
  return currencyId.split(':').pop() || 'EUR'
}

// Helper function to calculate holding period
const calculateHoldingPeriod = (acquisitionDate: string | null | undefined): string => {
  if (!acquisitionDate) return 'N/A'
  try {
    const startDate = new Date(acquisitionDate)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 30) {
      return `${diffDays} days`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return `${months} month${months > 1 ? 's' : ''}`
    } else {
      const years = Math.floor(diffDays / 365)
      const remainingMonths = Math.floor((diffDays % 365) / 30)
      if (remainingMonths > 0) {
        return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`
      }
      return `${years} year${years > 1 ? 's' : ''}`
    }
  } catch {
    return 'N/A'
  }
}

// Helper function to get status badge variant
const getStatusBadgeVariant = (status?: string): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' => {
  if (!status) return 'secondary'

  switch (status.toLowerCase()) {
    case 'active':
      return 'success'
    case 'inactive':
    case 'closed':
      return 'secondary'
    case 'pending':
      return 'warning'
    case 'failed':
    case 'cancelled':
      return 'destructive'
    default:
      return 'default'
  }
}

// Helper function to calculate performance
const calculatePerformance = (currentValue: number | null = 0, initialValue: number | null = 0) => {
  const current = currentValue ?? 0
  const initial = initialValue ?? 0

  if (initial === 0) {
    return { amount: 0, percentage: 0, variant: 'default' as const }
  }

  const amount = current - initial
  const percentage = (amount / initial) * 100
  const variant = amount >= 0 ? ('success' as const) : ('destructive' as const)

  return { amount, percentage, variant }
}

// Helper function to get investment role
const getInvestmentRole = (investmentData: any): string => {
  // Try to get role from multiple possible sources
  if (investmentData.investmentRoles?.[0]?.investmentRole?.value) {
    return investmentData.investmentRoles[0].investmentRole.value
  }

  // Fallback based on stake percentage
  const stakePercentage = investmentData.stakePercentage
  if (stakePercentage) {
    if (stakePercentage >= 50) return 'Primary'
    if (stakePercentage >= 25) return 'Major'
    if (stakePercentage >= 10) return 'Significant'
    return 'Minor'
  }

  // Default fallback
  return 'Standard'
}

// Main mapper function to transform GraphQL Investment data to enhanced real estate investment
export const toEnhancedRealEstateInvestment = (investmentData: any): EnhancedRealEstateInvestment => {
  // Get the first real estate investment detail if available
  const realEstateDetail = investmentData.realEstateInvestment?.[0] as RealEstateInvestmentDetail | undefined

  // Extract currency code
  const currencyCode = investmentData.currency?.code || extractCurrencyCode(investmentData.currency?.id)

  // Calculate performance metrics
  const performance = calculatePerformance(
    investmentData.investmentMarketValue,
    investmentData.initialInvestmentAmount || investmentData.totalInvestmentAmount
  )

  // Calculate holding period
  const holdingPeriod = calculateHoldingPeriod(investmentData.acquisitionDate)

  // Get owner display name
  const ownerDisplayName =
    investmentData.ownerEmployee?.displayName ||
    (investmentData.ownerEmployee
      ? `${investmentData.ownerEmployee.firstName || ''} ${investmentData.ownerEmployee.lastName || ''}`.trim()
      : undefined)

  // Get investment role
  const investmentRole = getInvestmentRole(investmentData)

  // Get status badge variant
  const statusBadgeVariant = getStatusBadgeVariant(investmentData.investmentStatus?.value)

  // Determine property name based on available data
  const propertyName =
    investmentData.name ||
    realEstateDetail?.locality ||
    investmentData.code ||
    `Investment ${investmentData.id.slice(-8)}`

  return {
    // Basic investment information
    id: investmentData.id,
    name: investmentData.name,
    code: investmentData.code,
    isin: investmentData.isin,

    // Investment type and classification
    investmentType: investmentData.investmentType,
    investmentStatus: investmentData.investmentStatus,
    currency: { ...investmentData.currency, code: currencyCode },

    // Financial information
    initialInvestmentAmount: investmentData.initialInvestmentAmount,
    totalInvestmentAmount: investmentData.totalInvestmentAmount,
    investmentMarketValue: investmentData.investmentMarketValue,
    debtFinancingAmount: investmentData.debtFinancingAmount,
    requiredCapitalAmount: investmentData.requiredCapitalAmount,
    forecastedRevenueAmount: investmentData.forecastedRevenueAmount,
    forecastedProfitAmount: investmentData.forecastedProfitAmount,
    stakePercentage: investmentData.stakePercentage,

    // Loan information
    loanRecipientName: investmentData.loanRecipientName,
    loanAmount: investmentData.loanAmount,
    loanOpenCommitmentAmount: investmentData.loanOpenCommitmentAmount,
    loanInterestRate: investmentData.loanInterestRate,
    loanStartDate: investmentData.loanStartDate,
    loanEndDate: investmentData.loanEndDate,
    loanInterestClaim: investmentData.loanInterestClaim,

    // Fund information
    totalCommitmentAmount: investmentData.totalCommitmentAmount,
    totalDistributionAmount: investmentData.totalDistributionAmount,
    fundManagerName: investmentData.fundManagerName,

    // Dates
    acquisitionDate: investmentData.acquisitionDate,
    plannedExitDate: investmentData.plannedExitDate,
    exitDate: investmentData.exitDate,

    // Relationships
    ownerEmployee: investmentData.ownerEmployee,
    investmentAccounts: investmentData.investmentAccounts, // GraphQL field name
    realEstateInvestment: investmentData.realEstateInvestment,

    // Computed properties for UI
    propertyName,
    buildingYear: realEstateDetail?.buildingYear,
    size: realEstateDetail?.size,
    sizeMeasurementUnit: realEstateDetail?.sizeMeasurementUnit?.value,
    occupancyPercent: realEstateDetail?.occupancyPercent,
    annualNetColdRent: realEstateDetail?.annualNetColdRent,
    funding: realEstateDetail?.funding,
    targetAnnualExpenses: realEstateDetail?.targetAnnualExpenses,
    actualAnnualExpenses: realEstateDetail?.actualAnnualExpenses,
    numberOfUnits: realEstateDetail?.numberOfUnits,
    locality: realEstateDetail?.locality,
    currencyCode,
    ownerDisplayName,
    investmentRole,
    statusBadgeVariant,
    performanceAmount: performance.amount,
    performancePercentage: performance.percentage,
    performanceBadgeVariant: performance.variant,
    holdingPeriod
  }
}

// Mapper for transforming array of investments
export const toEnhancedRealEstateInvestmentList = (investmentList: any[]): EnhancedRealEstateInvestment[] => {
  return investmentList.map(toEnhancedRealEstateInvestment)
}

// Type-specific mappers that ensure required fields are present

export const toExistingPropertiesData = (investment: EnhancedRealEstateInvestment) => {
  return {
    ...investment,
    buildingYear: investment.buildingYear || 'Unknown',
    size: investment.size || 0,
    sizeMeasurementUnit: investment.sizeMeasurementUnit || 'sqm',
    occupancyPercent: investment.occupancyPercent || 0,
    totalInvestmentAmount: investment.totalInvestmentAmount || 0,
    annualNetColdRent: investment.annualNetColdRent || 0,
    funding: investment.funding || 0,
    investmentRole: investment.investmentRole || 'Standard',
    stakePercentage: investment.stakePercentage || 0,
    holdingPeriod: investment.holdingPeriod || 'N/A'
  }
}

export const toProjectDevelopmentData = (investment: EnhancedRealEstateInvestment) => {
  return {
    ...investment,
    holdingPeriod: investment.holdingPeriod || 'N/A',
    acquisitionDate: investment.acquisitionDate || '',
    plannedExitDate: investment.plannedExitDate || '',
    totalInvestmentAmount: investment.totalInvestmentAmount || 0,
    requiredCapitalAmount: investment.requiredCapitalAmount || 0,
    debtFinancingAmount: investment.debtFinancingAmount || 0,
    targetAnnualExpenses: investment.targetAnnualExpenses || 0,
    forecastedRevenueAmount: investment.forecastedRevenueAmount || 0,
    forecastedProfitAmount: investment.forecastedProfitAmount || 0
  }
}

export const toMezzanineLoansData = (investment: EnhancedRealEstateInvestment) => {
  return {
    ...investment,
    loanRecipientName: investment.loanRecipientName || 'Unknown',
    loanAmount: investment.loanAmount || 0,
    loanOpenCommitmentAmount: investment.loanOpenCommitmentAmount || 0,
    loanInterestRate: investment.loanInterestRate || 0,
    loanStartDate: investment.loanStartDate || '',
    loanEndDate: investment.loanEndDate || '',
    loanInterestClaim: investment.loanInterestClaim || 0
  }
}

export const toOthersData = (investment: EnhancedRealEstateInvestment) => {
  return {
    ...investment,
    fundManagerName: investment.fundManagerName || 'Unknown',
    totalCommitmentAmount: investment.totalCommitmentAmount || 0,
    totalInvestmentAmount: investment.totalInvestmentAmount || 0, // Used as "Contribution"
    totalDistributionAmount: investment.totalDistributionAmount || 0,
    forecastedProfitAmount: investment.forecastedProfitAmount || 0
  }
}
