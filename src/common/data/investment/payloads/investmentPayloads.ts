import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { toISOFormat } from '@/common/utils/dateFormatter'
import { CatalogEntry } from '@/common/network/graphql/commonTypes'
import { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'
import { InvestmentAccount } from '@/common/data/investment/types/investmentAccountTypes'

// ==============================
// Investment Payload Types
// ==============================

// Investment Role payload data
export interface InvestmentRoleData {
  id?: string // For updates
  version?: number // For updates
  investmentRole: CatalogEntry // Full catalog object (form state)
  displayOrder: number // Position in list
  isDeleted?: boolean // Soft delete flag
}

// ==============================
// Investment Entity Interfaces
// ==============================

export interface InvestmentData {
  // Core investment fields (matching API exactly)
  id?: string
  version?: number
  name: string
  investmentGroup: CatalogEntry // Required - full catalog object
  ownerEmployee: EmployeeRef // Required - full employee object

  // Optional investment fields
  code?: string
  isin?: string
  initialInvestmentAmount?: number | string
  investmentType?: CatalogEntry // Full catalog object
  investmentStakeType?: CatalogEntry // Full catalog object
  investmentPhase?: CatalogEntry // Full catalog object
  investmentStatus?: CatalogEntry // Full catalog object
  investmentRiskLevel?: CatalogEntry // Full catalog object
  acquisitionDate?: string
  planedExit?: boolean // TODO: typo in API model
  plannedExitDate?: string
  exitDate?: string
  totalInvestmentAmount?: number | string
  investmentMarketValue?: number | string
  debtFinancingAmount?: number | string
  requiredCapitalAmount?: number | string
  forecastedRevenueAmount?: number | string
  forecastedProfitAmount?: number | string
  stakePercentage?: number | string
  loanRecipientName?: string
  loanAmount?: number | string
  loanOpenCommitmentAmount?: number | string
  loanInterestRate?: number | string
  loanStartDate?: string
  loanEndDate?: string
  loanInterestClaim?: number | string
  totalCommitmentAmount?: number | string
  totalDistributionAmount?: number | string
  currency?: CatalogEntry // Full catalog object
  fundManagerName?: string
  identification?: any // JSON object
  irr?: number | string // Internal Rate of Return
  moic?: number | string // Multiple on Invested Capital
  investmentOpportunity?: string // uuid
  loanRecipientInvestmentAccount?: InvestmentAccount // uuid
  company?: any // Company object or uuid
  companyId?: string // Company uuid (alternative field name)
  additionalProperties?: any // JSON object

  // Investment Roles (array) - GraphQL schema name is singular
  investmentRole?: InvestmentRoleData[]

  // Investment-Account Junction Table (many-to-many)
  investmentAccounts?: Array<{
    // GraphQL field name
    id?: string
    version?: number
    investmentAccountId: string
    investmentAccountTypeRef?: string
    isDeleted?: boolean
  }>

  // Support for dynamic additional properties fields
  [key: string]: any // Allow dynamic additional properties fields
}

export interface EquityInvestmentData {
  id?: string
  version?: number | string
  foundationDate?: string
  marketValue?: number | string
  turnoverAmount?: number | string
  ebitdaAmount?: number | string
  investmentStakeType?: CatalogEntry // Full catalog object
  stakePercentage?: number | string
  additionalProperties?: any // JSON object

  // Support for dynamic additional properties fields
  [key: string]: any // Allow dynamic additional properties fields
}

export interface RealEstateInvestmentData {
  id?: string
  version?: number | string
  country?: CatalogEntry // Full catalog object
  region?: CatalogEntry // Full catalog object
  addressLine?: any // object
  postalCode?: string
  locality?: string
  buildingYear?: string // Note: string in model, not number
  size?: number | string
  sizeMeasurementUnit?: CatalogEntry // Full catalog object
  numberOfUnits?: number | string
  occupancyPercent?: number | string
  annualNetColdRent?: number | string
  funding?: number | string
  actualAnnualExpenses?: number | string
  targetAnnualExpenses?: number | string
  liquidityForecast?: any // object
  loanAmount?: number | string
  loanInterestRate?: number | string
  marketValue?: number | string
  additionalProperties?: any // JSON object

  // Support for dynamic additional properties fields
  [key: string]: any // Allow dynamic additional properties fields
}

export interface LiquidFundInvestmentData {
  id?: string
  version?: number | string
  investmentLiquidFundType?: CatalogEntry // Full catalog object
  proprietorName?: string
  bankName?: string
  bankAccountNumber?: string
  earlyTerminationAllowed?: boolean
  interestRate?: number | string
  interestPaymentFrequency?: CatalogEntry // Full catalog object
  maturityDate?: string
  additionalProperties?: any // JSON object

  // Support for dynamic additional properties fields
  [key: string]: any // Allow dynamic additional properties fields
}

// ==============================
// Combined Form Data Interface
// ==============================

export interface InvestmentFormData {
  // Main investment data
  investment: InvestmentData

  // Investment type-specific data (only one will be populated based on group type)
  equityInvestment?: EquityInvestmentData
  realEstateInvestment?: RealEstateInvestmentData
  liquidFundInvestment?: LiquidFundInvestmentData
}

// ==============================
// Investment Payload Builder
// ==============================

export const buildInvestmentPayload = (
  formData: InvestmentFormData,
  _businessAppContext: BusinessAppContextProps,
  options: { isUpdate?: boolean; rawInvestmentData?: any } = {}
) => {
  const { rawInvestmentData } = options

  // Extract investment data from nested structure
  const investment = formData.investment

  // Helper to convert string/number to number
  const toNumber = (value: number | string | undefined): number | undefined => {
    if (value === undefined || value === null || value === '') return undefined
    const num = typeof value === 'string' ? Number.parseFloat(value) : value
    return Number.isNaN(num) ? undefined : num
  }

  // Helper to extract and build additionalProperties object from form data
  const buildAdditionalProperties = (formData: any): Record<string, any> | undefined => {
    // Return undefined if formData is null, undefined, or not an object
    if (!formData || typeof formData !== 'object') {
      return undefined
    }

    // First, check if additionalProperties is passed directly as an object
    if (formData.additionalProperties && typeof formData.additionalProperties === 'object') {
      return formData.additionalProperties
    }

    // Fallback: Find all fields that start with "additionalProperties_" (for backward compatibility)
    const additionalProps: Record<string, any> = {}
    let hasAdditionalProps = false

    Object.keys(formData).forEach(key => {
      if (key.startsWith('additionalProperties_')) {
        const fieldName = key.replace('additionalProperties_', '')
        const value = formData[key]

        // Only include non-empty values
        if (value !== undefined && value !== null && value !== '') {
          additionalProps[fieldName] = value
          hasAdditionalProps = true
        }
      }
    })

    // Return object if we have additional properties, undefined otherwise
    return hasAdditionalProps ? additionalProps : undefined
  }

  // Validate that investment data exists
  if (!investment) {
    throw new Error('Investment data is required but not provided')
  }

  // Extract investment-level additionalProperties
  const investmentAdditionalProperties = buildAdditionalProperties(investment)

  // Base investment payload - include ALL fields from GraphQL schema
  // NOTE: Form stores full objects, API expects IDs with "Ref" suffix for catalogs
  const baseInvestmentPayload: any = {
    // Always set status to ACTIVE for new investments
    ...(!options.isUpdate && { investmentStatusRef: 'InvestmentStatus:v1:ACTIVE' }),

    // Investment fields (extract IDs from catalog objects)
    ...(investment.name && { name: investment.name }),
    ...(investment.code && { code: investment.code }),
    ...(investment.isin && { isin: investment.isin }),
    ...(investment.investmentGroup?.id && { investmentGroupRef: investment.investmentGroup.id }),
    // Send ownerEmployee as string UUID (backend expects "ownerEmployee" field name with UUID string value)
    // Form uses ownerEmployeeId field, extract from either ownerEmployeeId (string) or ownerEmployee.id (object)
    ...((investment as any).ownerEmployeeId
      ? { ownerEmployee: (investment as any).ownerEmployeeId }
      : investment.ownerEmployee?.id
        ? { ownerEmployee: investment.ownerEmployee.id }
        : {}),
    ...(investment.initialInvestmentAmount && {
      initialInvestmentAmount: toNumber(investment.initialInvestmentAmount)
    }),
    ...(investment.investmentType?.id && { investmentTypeRef: investment.investmentType.id }),
    ...(investment.investmentStakeType?.id && { investmentStakeTypeRef: investment.investmentStakeType.id }),
    ...(investment.investmentPhase?.id && { investmentPhaseRef: investment.investmentPhase.id }),
    ...(investment.investmentStatus?.id && { investmentStatusRef: investment.investmentStatus.id }),
    ...(investment.investmentRiskLevel?.id && { investmentRiskLevelRef: investment.investmentRiskLevel.id }),
    ...(investment.acquisitionDate && { acquisitionDate: toISOFormat(investment.acquisitionDate) }),
    ...(investment.planedExit !== undefined && { planedExit: investment.planedExit }),
    ...(investment.plannedExitDate && { plannedExitDate: toISOFormat(investment.plannedExitDate) }),
    ...(investment.exitDate && { exitDate: toISOFormat(investment.exitDate) }),
    ...(investment.totalInvestmentAmount && { totalInvestmentAmount: toNumber(investment.totalInvestmentAmount) }),
    ...(investment.investmentMarketValue && { investmentMarketValue: toNumber(investment.investmentMarketValue) }),
    ...(investment.debtFinancingAmount && { debtFinancingAmount: toNumber(investment.debtFinancingAmount) }),
    ...(investment.requiredCapitalAmount && { requiredCapitalAmount: toNumber(investment.requiredCapitalAmount) }),
    ...(investment.forecastedRevenueAmount && {
      forecastedRevenueAmount: toNumber(investment.forecastedRevenueAmount)
    }),
    ...(investment.forecastedProfitAmount && { forecastedProfitAmount: toNumber(investment.forecastedProfitAmount) }),
    ...(investment.stakePercentage && { stakePercentage: toNumber(investment.stakePercentage) }),
    ...(investment.loanRecipientName && { loanRecipientName: investment.loanRecipientName }),
    ...(investment.loanAmount && { loanAmount: toNumber(investment.loanAmount) }),
    ...(investment.loanOpenCommitmentAmount && {
      loanOpenCommitmentAmount: toNumber(investment.loanOpenCommitmentAmount)
    }),
    ...(investment.loanInterestRate && { loanInterestRate: toNumber(investment.loanInterestRate) }),
    ...(investment.loanStartDate && { loanStartDate: toISOFormat(investment.loanStartDate) }),
    ...(investment.loanEndDate && { loanEndDate: toISOFormat(investment.loanEndDate) }),
    ...(investment.loanInterestClaim && { loanInterestClaim: toNumber(investment.loanInterestClaim) }),
    ...(investment.totalCommitmentAmount && { totalCommitmentAmount: toNumber(investment.totalCommitmentAmount) }),
    ...(investment.totalDistributionAmount && {
      totalDistributionAmount: toNumber(investment.totalDistributionAmount)
    }),
    ...(investment.currency?.id && { currencyRef: investment.currency.id }), // Extract ID from catalog object
    ...(investment.fundManagerName && { fundManagerName: investment.fundManagerName }),
    ...(investment.irr !== undefined &&
      investment.irr !== null &&
      investment.irr !== '' && {
        irr: toNumber(investment.irr)
      }),
    ...(investment.moic !== undefined &&
      investment.moic !== null &&
      investment.moic !== '' && {
        moic: toNumber(investment.moic)
      }),
    ...(investment.identification && { identification: investment.identification }),
    ...(investment.investmentAccount?.id && { investmentAccount: investment.investmentAccount.id }), // Extract ID from account object
    // Extract ID from investmentOpportunity object (backend expects UUID string, not object)
    ...(investment.investmentOpportunity && typeof investment.investmentOpportunity === 'string'
      ? { investmentOpportunity: investment.investmentOpportunity }
      : typeof investment.investmentOpportunity === 'object' &&
          investment.investmentOpportunity !== null &&
          'id' in investment.investmentOpportunity &&
          (investment.investmentOpportunity as { id?: string }).id
        ? { investmentOpportunity: (investment.investmentOpportunity as { id: string }).id }
        : {}),
    ...(investment.loanRecipientInvestmentAccount?.id && {
      loanRecipientInvestmentAccount: investment.loanRecipientInvestmentAccount.id
    }),
    // Send company as string UUID (backend expects "company" field name with UUID string value)
    // Form uses companyId field, extract from either companyId (string) or company.id (object)
    ...((investment as any).companyId
      ? { company: (investment as any).companyId }
      : investment.company?.id
        ? { company: investment.company.id }
        : {}),

    // Investment additionalProperties as JSON string
    ...(investmentAdditionalProperties && { additionalProperties: investmentAdditionalProperties })
  }

  // Add update fields if updating
  if (options.isUpdate && rawInvestmentData?.id) {
    baseInvestmentPayload.id = rawInvestmentData.id
    baseInvestmentPayload.version = rawInvestmentData.version
  }

  // Process investment roles (array)
  // NOTE: GraphQL returns "investmentRole" (singular), API expects "investmentRoles" (plural)
  const investmentRolesPayload = investment.investmentRole?.map((role: InvestmentRoleData, index: number) => ({
    ...(role.id && { id: role.id }), // Include ID if updating
    ...(role.version !== undefined && { version: role.version }), // Include version if updating
    investmentRoleRef: role.investmentRole?.id, // Extract ID from catalog object
    displayOrder: role.displayOrder ?? index, // Use provided or index
    ...(role.isDeleted !== undefined && { isDeleted: role.isDeleted }) // Include soft delete flag
  }))

  // Add investment roles to payload if present
  if (investmentRolesPayload && investmentRolesPayload.length > 0) {
    baseInvestmentPayload.investmentRoles = investmentRolesPayload
  }

  // Determine investment group type from the catalog object
  const getGroupType = (group: CatalogEntry | undefined): string => {
    if (!group?.id || typeof group.id !== 'string') {
      return ''
    }
    const parts = group.id.split(':')
    return parts.length > 2 ? parts[2] : ''
  }

  // Validate required fields
  if (!investment.investmentGroup) {
    throw new Error('Investment group is required but not provided')
  }

  const groupType = getGroupType(investment.investmentGroup)

  if (!groupType) {
    throw new Error(`Invalid investment group format: ${investment.investmentGroup}`)
  }

  // Build the investment request wrapper
  const investmentRequest: any = {
    investment: baseInvestmentPayload
  }

  // Add group-specific data based on the investment type
  switch (groupType) {
    case 'EQUITY':
      // Always create equityInvestment object (required by API - exactly one subtype must exist)
      const equityData = formData.equityInvestment || {}

      // Handle both array and object structures for existing equity data
      const existingEquity = Array.isArray(rawInvestmentData?.equityInvestment)
        ? rawInvestmentData.equityInvestment[0] || {}
        : rawInvestmentData?.equityInvestment || {}
      const equityAdditionalProperties = buildAdditionalProperties(equityData)

      // Build equityInvestment using ONLY fields defined in EquityInvestmentData interface
      // NOTE: Form state uses catalog fields WITHOUT "Ref", API expects WITH "Ref"
      const equityPayload: any = {}

      // Add fields from equityData (new/updated values)
      if (equityData.foundationDate !== undefined) equityPayload.foundationDate = toISOFormat(equityData.foundationDate)
      if (equityData.marketValue !== undefined) equityPayload.marketValue = toNumber(equityData.marketValue)
      if (equityData.turnoverAmount !== undefined) equityPayload.turnoverAmount = toNumber(equityData.turnoverAmount)
      if (equityData.ebitdaAmount !== undefined) equityPayload.ebitdaAmount = toNumber(equityData.ebitdaAmount)
      if (equityData.investmentStakeType?.id !== undefined)
        equityPayload.investmentStakeTypeRef = equityData.investmentStakeType.id // Extract ID from catalog object
      if (equityData.stakePercentage !== undefined) equityPayload.stakePercentage = toNumber(equityData.stakePercentage)

      // CRITICAL FIX: Always set additionalProperties (even if empty) - backend validation requires this field
      // This ensures the payload is never completely empty which could cause validation errors
      equityPayload.additionalProperties = equityAdditionalProperties || {}

      // Always include id and version for updates
      if (options.isUpdate && existingEquity.id) {
        equityPayload.id = existingEquity.id
        equityPayload.version = existingEquity.version
      }

      // Always set equityInvestment (API requires exactly one subtype)
      investmentRequest.equityInvestment = equityPayload
      break

    case 'REAL_ESTATE':
      // Always create realEstateInvestment object (required by API - exactly one subtype must exist)
      const realEstateData = formData.realEstateInvestment || {}

      // Handle both array and object structures for existing real estate data
      const existingRealEstate = Array.isArray(rawInvestmentData?.realEstateInvestment)
        ? rawInvestmentData.realEstateInvestment[0] || {}
        : rawInvestmentData?.realEstateInvestment || {}
      const realEstateAdditionalProperties = buildAdditionalProperties(realEstateData)

      // Build realEstateInvestment using ONLY fields defined in RealEstateInvestmentData interface
      // NOTE: Form state uses catalog fields WITHOUT "Ref", API expects WITH "Ref"
      const realEstatePayload: any = {}

      // Add fields from realEstateData (new/updated values)
      if (realEstateData.country?.id !== undefined) realEstatePayload.countryRef = realEstateData.country.id // Extract ID from catalog object
      if (realEstateData.region?.id !== undefined) realEstatePayload.regionRef = realEstateData.region.id // Extract ID from catalog object
      if (realEstateData.addressLine !== undefined) realEstatePayload.addressLine = realEstateData.addressLine
      if (realEstateData.postalCode !== undefined) realEstatePayload.postalCode = realEstateData.postalCode
      if (realEstateData.locality !== undefined) realEstatePayload.locality = realEstateData.locality
      if (realEstateData.buildingYear !== undefined) realEstatePayload.buildingYear = realEstateData.buildingYear
      if (realEstateData.size !== undefined) realEstatePayload.size = toNumber(realEstateData.size)
      if (realEstateData.sizeMeasurementUnit?.id !== undefined)
        realEstatePayload.sizeMeasurementUnitRef = realEstateData.sizeMeasurementUnit.id // Extract ID from catalog object
      if (realEstateData.loanAmount !== undefined) realEstatePayload.loanAmount = toNumber(realEstateData.loanAmount)
      if (realEstateData.loanInterestRate !== undefined)
        realEstatePayload.loanInterestRate = toNumber(realEstateData.loanInterestRate)
      if (realEstateData.marketValue !== undefined) realEstatePayload.marketValue = toNumber(realEstateData.marketValue)
      if (realEstateData.numberOfUnits !== undefined)
        realEstatePayload.numberOfUnits = toNumber(realEstateData.numberOfUnits)
      if (realEstateData.occupancyPercent !== undefined)
        realEstatePayload.occupancyPercent = toNumber(realEstateData.occupancyPercent)
      if (realEstateData.annualNetColdRent !== undefined)
        realEstatePayload.annualNetColdRent = toNumber(realEstateData.annualNetColdRent)
      if (realEstateData.funding !== undefined) realEstatePayload.funding = toNumber(realEstateData.funding)
      if (realEstateData.actualAnnualExpenses !== undefined)
        realEstatePayload.actualAnnualExpenses = toNumber(realEstateData.actualAnnualExpenses)
      if (realEstateData.targetAnnualExpenses !== undefined)
        realEstatePayload.targetAnnualExpenses = toNumber(realEstateData.targetAnnualExpenses)
      if (realEstateData.liquidityForecast !== undefined)
        realEstatePayload.liquidityForecast = realEstateData.liquidityForecast

      // CRITICAL FIX: Always set additionalProperties (even if empty) - backend validation requires this field
      // This ensures the payload is never completely empty which could cause validation errors
      realEstatePayload.additionalProperties = realEstateAdditionalProperties || {}

      // Always include id and version for updates
      if (options.isUpdate && existingRealEstate.id) {
        realEstatePayload.id = existingRealEstate.id
        realEstatePayload.version = existingRealEstate.version
      }

      // Always set realEstateInvestment (API requires exactly one subtype)
      investmentRequest.realEstateInvestment = realEstatePayload
      break

    case 'LIQUID_FUND':
      // Always create liquidFundInvestment object (required by API - exactly one subtype must exist)
      const liquidFundData = formData.liquidFundInvestment || {}

      // Handle both array and object structures for existing liquid fund data
      const existingLiquidFund = Array.isArray(rawInvestmentData?.liquidFundInvestment)
        ? rawInvestmentData.liquidFundInvestment[0] || {}
        : rawInvestmentData?.liquidFundInvestment || {}
      const liquidFundAdditionalProperties = buildAdditionalProperties(liquidFundData)

      // Build liquidFundInvestment using ONLY fields defined in LiquidFundInvestmentData interface
      // NOTE: Form state uses catalog fields WITHOUT "Ref", API expects WITH "Ref"
      const liquidFundPayload: any = {}

      // Add fields from liquidFundData (new/updated values)
      if (liquidFundData.investmentLiquidFundType?.id !== undefined)
        liquidFundPayload.investmentLiquidFundTypeRef = liquidFundData.investmentLiquidFundType.id // Extract ID from catalog object
      if (liquidFundData.proprietorName !== undefined) liquidFundPayload.proprietorName = liquidFundData.proprietorName
      if (liquidFundData.bankName !== undefined) liquidFundPayload.bankName = liquidFundData.bankName
      if (liquidFundData.bankAccountNumber !== undefined)
        liquidFundPayload.bankAccountNumber = liquidFundData.bankAccountNumber
      if (liquidFundData.earlyTerminationAllowed !== undefined)
        liquidFundPayload.earlyTerminationAllowed = liquidFundData.earlyTerminationAllowed
      if (liquidFundData.interestRate !== undefined)
        liquidFundPayload.interestRate = toNumber(liquidFundData.interestRate)
      if (liquidFundData.interestPaymentFrequency?.id !== undefined)
        liquidFundPayload.interestPaymentFrequencyRef = liquidFundData.interestPaymentFrequency.id // Extract ID from catalog object
      if (liquidFundData.maturityDate !== undefined)
        liquidFundPayload.maturityDate = toISOFormat(liquidFundData.maturityDate)

      // CRITICAL FIX: Always set additionalProperties (even if empty) - backend validation requires this field
      // This ensures the payload is never completely empty which could cause validation errors
      liquidFundPayload.additionalProperties = liquidFundAdditionalProperties || {}

      // Always include id and version for updates
      if (options.isUpdate && existingLiquidFund.id) {
        liquidFundPayload.id = existingLiquidFund.id
        liquidFundPayload.version = existingLiquidFund.version
      }

      // Always set liquidFundInvestment (API requires exactly one subtype)
      investmentRequest.liquidFundInvestment = liquidFundPayload
      break

    default:
      // Generic/non-core groups: keep base investment payload only.
      // Subtype-specific section is not required for these group types.
      break
  }

  // Return the properly wrapped payload
  return {
    investmentRequest
  }
}

// ==============================
// Group Type Utilities
// ==============================

export const getInvestmentGroupType = (groupRef: string): string => {
  const parts = groupRef.split(':')
  return parts.length > 2 ? parts[2] : ''
}

export const isEquityInvestment = (groupRef: string): boolean => {
  return getInvestmentGroupType(groupRef) === 'EQUITY'
}

export const isRealEstateInvestment = (groupRef: string): boolean => {
  return getInvestmentGroupType(groupRef) === 'REAL_ESTATE'
}

export const isLiquidFundInvestment = (groupRef: string): boolean => {
  return getInvestmentGroupType(groupRef) === 'LIQUID_FUND'
}

export const isPrivateEquityInvestment = (groupRef: string): boolean => {
  return getInvestmentGroupType(groupRef) === 'PRIVATE_EQUITY'
}

// ==============================
// Investment Group References
// ==============================

export const INVESTMENT_GROUP_REFS = {
  EQUITY: 'InvestmentGroup:v1:EQUITY',
  REAL_ESTATE: 'InvestmentGroup:v1:REAL_ESTATE',
  LIQUID_FUND: 'InvestmentGroup:v1:LIQUID_FUND',
  PRIVATE_EQUITY: 'InvestmentGroup:v1:PRIVATE_EQUITY'
} as const

export type InvestmentGroupType = keyof typeof INVESTMENT_GROUP_REFS
