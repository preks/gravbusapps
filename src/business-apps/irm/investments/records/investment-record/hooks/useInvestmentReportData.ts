import { useCallback } from 'react'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentById } from '@/common/data/investment/hooks/useInvestments'
import { GenerateInvestmentReportRequest } from '@/common/network/investment-reports'

dayjs.extend(weekday)
dayjs.extend(localeData)

// ==========================================
// TYPE DEFINITIONS
// ==========================================

/**
 * Currency reference interface
 */
interface CurrencyRef {
  value?: string
  code?: string
}

/**
 * Catalog reference interface
 */
interface CatalogRef {
  id?: string
  code?: string
  value?: string
  catalog?: string
  catalogId?: string
  objectValue?: any
  translations?: Array<{
    localeCode?: string
    value?: string
  }>
}

/**
 * Employee reference interface
 */
interface EmployeeRef {
  id?: string
  code?: string
  firstName?: string
  lastName?: string
  displayName?: string
  fullName?: string
  picture?: string
  pictureThumbnail?: string
}

/**
 * Equity investment round interface
 */
interface EquityInvestmentRound {
  id?: string
  version?: number
  name?: string
  year?: string
  preValue?: number
  investmentVolume?: number
  volumeShare?: number
  roundSharePercentage?: number
  currency?: CatalogRef
  currencyRef?: string
  equityInvestment?: string
  // Audit fields
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
  recordState?: string
  activeFrom?: string
  activeTo?: string
}

/**
 * Equity investment interface
 */
interface EquityInvestment {
  id?: string
  version?: number
  businessKey?: string
  additionalProperties?: any
  foundationDate?: string
  marketValue?: number
  ebitdaAmount?: number
  turnoverAmount?: number
  investment?: string
  equityInvestmentRound?: EquityInvestmentRound[]
  // Audit fields
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
  recordState?: string
  activeFrom?: string
  activeTo?: string
  isDeleted?: boolean
  processInstanceId?: string
  synchronizedAt?: string
}

/**
 * Real estate investment interface
 */
interface RealEstateInvestment {
  id?: string
  version?: number
  businessKey?: string
  additionalProperties?: any
  countryRef?: string
  regionRef?: string
  country?: CatalogRef
  region?: CatalogRef
  addressLine?: any
  postalCode?: string
  locality?: string
  buildingYear?: string
  size?: number
  sizeMeasurementUnitRef?: string
  sizeMeasurementUnit?: CatalogRef
  numberOfUnits?: number
  occupancyPercent?: number
  annualNetColdRent?: number
  funding?: number
  actualAnnualExpenses?: number
  targetAnnualExpenses?: number
  liquidityForecast?: any
  investment?: string
  description?: string
  areaDescription?: string
  // Audit fields
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
  recordState?: string
  activeFrom?: string
  activeTo?: string
}

/**
 * Investment role interface
 */
interface InvestmentRole {
  id?: string
  version?: number
  businessKey?: string
  recordState?: string
  activeTo?: string
  additionalProperties?: any
  investmentRoleRef?: string
  investmentRole?: CatalogRef
  displayOrder?: number
  // Audit fields
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
  activeFrom?: string
  isDeleted?: boolean
  processInstanceId?: string
  synchronizedAt?: string
}

/**
 * Base investment interface
 */
export interface BaseInvestment {
  id: string
  version?: number
  code?: string
  name?: string
  isin?: string
  description?: string
  acquisitionDate?: string | null
  planedExit?: boolean
  plannedExitDate?: string | null
  exitDate?: string | null
  initialInvestmentAmount?: number
  totalInvestmentAmount?: number
  investmentMarketValue?: number
  debtFinancingAmount?: number
  requiredCapitalAmount?: number
  forecastedRevenueAmount?: number
  forecastedProfitAmount?: number
  stakePercentage?: number

  // Loan-specific fields
  loanRecipientName?: string
  loanAmount?: number
  loanOpenCommitmentAmount?: number
  loanInterestRate?: number
  loanStartDate?: string
  loanEndDate?: string
  loanInterestClaim?: number
  totalCommitmentAmount?: number
  totalDistributionAmount?: number

  // Fund management
  fundManagerName?: string
  identification?: string

  additionalProperties?: {
    tiles?: Record<string, string>
    [key: string]: any
  }

  // Catalog relationships
  investmentGroup?: CatalogRef
  investmentType?: CatalogRef
  investmentStakeType?: CatalogRef
  investmentPhase?: CatalogRef
  investmentStatus?: CatalogRef
  investmentRiskLevel?: CatalogRef
  currency?: CurrencyRef

  // Employee relationship
  ownerEmployee?: EmployeeRef | null

  // Entity relationships
  investmentAccounts?: Array<{
    // GraphQL field name
    id?: string
    investmentAccountId?: string
    investmentAccount?: any
  }>
  investmentOpportunity?: any
  loanRecipientInvestmentAccount?: any

  // Investment specializations
  equityInvestment?: EquityInvestment[]
  realEstateInvestment?: RealEstateInvestment[]
  investmentRole?: InvestmentRole[]

  // Audit fields
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
  recordState?: string
  activeFrom?: string
  activeTo?: string
}

/**
 * Helper function to extract currency reference
 */
const extractCurrencyRef = (currencyData: CurrencyRef | null | undefined): string => {
  if (!currencyData) return ''
  return currencyData.value || currencyData.code || ''
}

/**
 * Helper function to format catalog reference
 */
const formatCatalogRef = (catalogData: CatalogRef | null | undefined): string => {
  if (!catalogData) return ''
  const { catalog, value } = catalogData
  if (catalog && value) {
    return `${catalog}:v1:${value}`
  }
  return value || ''
}

/**
 * Determine the correct template name based on investment type's objectValue
 *
 * Template mapping is now dynamic based on investmentType.objectValue.templateName:
 * - Gets templateName directly from investment type configuration
 * - Falls back to default template if not specified
 *
 * Example values from investmentType.objectValue.templateName:
 * - "co-investment.odt" (for DISRUPTIVE_TECHNOLOGY, PHARMA)
 * - "real-estate-property.odt" (for EXISTING_PROPERTY)
 * - "real-estate-property-name.odt" (for MEZZANINE_LOANS)
 *
 * @param investment - The investment data object
 * @returns The template name to use for report generation
 */
const getTemplateNameByInvestmentType = (investment: BaseInvestment): string => {
  // Primary logic: Use templateName from investmentType.objectValue
  const templateName = investment.investmentType?.objectValue?.templateName

  if (templateName) {
    return templateName
  }

  // Default template for cases where templateName is not configured
  const defaultTemplate = 'investment-one-pager-template'
  return defaultTemplate
}

/**
 * Transform base investment data
 */
const transformBaseInvestmentData = (investment: BaseInvestment) => {
  return {
    id: investment.id,
    version: investment.version || 0,
    businessKey: investment.code || '',
    additionalProperties: investment.additionalProperties || {},
    code: investment.code || '',
    name: investment.name || '',
    isin: investment.isin || '',
    investmentGroupRef: formatCatalogRef(investment.investmentGroup),
    investmentTypeRef: formatCatalogRef(investment.investmentType),
    investmentStakeTypeRef: formatCatalogRef(investment.investmentStakeType),
    investmentPhaseRef: formatCatalogRef(investment.investmentPhase),
    investmentStatusRef: formatCatalogRef(investment.investmentStatus),
    investmentRiskLevelRef: formatCatalogRef(investment.investmentRiskLevel),
    acquisitionDate: investment.acquisitionDate || null,
    planedExit: investment.planedExit || false,
    plannedExitDate: investment.plannedExitDate || null,
    exitDate: investment.exitDate || null,
    initialInvestmentAmount: investment.initialInvestmentAmount || 0,
    totalInvestmentAmount: investment.totalInvestmentAmount || 0,
    investmentMarketValue: investment.investmentMarketValue || 0,
    debtFinancingAmount: investment.debtFinancingAmount || 0,
    requiredCapitalAmount: investment.requiredCapitalAmount || 0,
    forecastedRevenueAmount: investment.forecastedRevenueAmount || 0,
    forecastedProfitAmount: investment.forecastedProfitAmount || 0,
    stakePercentage: investment.stakePercentage || 0,
    loanRecipientName: investment.loanRecipientName || '',
    loanAmount: investment.loanAmount || 0,
    loanOpenCommitmentAmount: investment.loanOpenCommitmentAmount || 0,
    loanInterestRate: investment.loanInterestRate || 0,
    loanStartDate: investment.loanStartDate || null,
    loanEndDate: investment.loanEndDate || null,
    loanInterestClaim: investment.loanInterestClaim || 0,
    totalCommitmentAmount: investment.totalCommitmentAmount || 0,
    totalDistributionAmount: investment.totalDistributionAmount || 0,
    currencyRef: extractCurrencyRef(investment.currency),
    fundManagerName: investment.fundManagerName || '',
    identification: investment.identification || {},
    investmentAccounts:
      investment.investmentAccounts?.map(assoc => ({
        // GraphQL field name
        id: assoc.id,
        investmentAccountId: assoc.investmentAccountId,
        investmentAccount: assoc.investmentAccount?.id || null
      })) || [],
    investmentOpportunity: investment.investmentOpportunity?.id || null,
    ownerEmployee: investment.ownerEmployee?.id || null,
    loanRecipientInvestmentAccount: investment.loanRecipientInvestmentAccount?.id || null
  }
}

/**
 * Transform equity investment data and rounds
 */
const transformEquityInvestmentData = (investment: BaseInvestment) => {
  const equityInvestmentData: EquityInvestment | null =
    Array.isArray(investment.equityInvestment) && investment.equityInvestment.length > 0
      ? investment.equityInvestment[0]
      : null

  const equityInvestment = equityInvestmentData
    ? {
        id: equityInvestmentData.id,
        version: equityInvestmentData.version || 0,
        businessKey: equityInvestmentData.businessKey || '',
        additionalProperties: equityInvestmentData.additionalProperties || {},
        foundationDate: equityInvestmentData.foundationDate || null,
        marketValue: equityInvestmentData.marketValue || 0,
        turnoverAmount: equityInvestmentData.turnoverAmount || 0,
        ebitdaAmount: equityInvestmentData.ebitdaAmount || 0,
        investment: investment.id
      }
    : null

  const equityInvestmentRounds =
    equityInvestmentData?.equityInvestmentRound?.map((round: any) => ({
      id: round.id,
      version: round.version || 0,
      businessKey: round.businessKey || '',
      additionalProperties: round.additionalProperties || {},
      name: round.name || '',
      year: round.year || null,
      preValue: round.preValue || 0,
      investmentVolume: round.investmentVolume || 0,
      volumeShare: round.volumeShare || 0,
      roundSharePercentage: round.roundSharePercentage || 0,
      currencyRef: extractCurrencyRef(round.currency),
      equityInvestment: equityInvestmentData.id,
      createdAt: round.createdAt || null,
      createdBy: round.createdBy || null,
      updatedAt: round.updatedAt || null,
      updatedBy: round.updatedBy || null,
      isDeleted: round.isDeleted || false,
      recordState: round.recordState || null,
      activeFrom: round.activeFrom || null,
      activeTo: round.activeTo || null
    })) || []

  return { equityInvestment, equityInvestmentRounds }
}

/**
 * Transform investment role data
 */
const transformInvestmentRoleData = (investment: BaseInvestment) => {
  const investmentRoleData: InvestmentRole | null =
    Array.isArray(investment.investmentRole) && investment.investmentRole.length > 0
      ? investment.investmentRole[0]
      : null

  return investmentRoleData
    ? {
        id: investmentRoleData.id,
        version: investmentRoleData.version || 0,
        businessKey: investmentRoleData.businessKey || '',
        recordState: investmentRoleData.recordState || '',
        activeTo: investmentRoleData.activeTo || null,
        additionalProperties: investmentRoleData.additionalProperties || {},
        investmentRoleRef: formatCatalogRef(investmentRoleData.investmentRole),
        displayOrder: investmentRoleData.displayOrder || 0,
        investment: investment.id,
        createdAt: investmentRoleData.createdAt || null,
        createdBy: investmentRoleData.createdBy || null,
        updatedAt: investmentRoleData.updatedAt || null,
        updatedBy: investmentRoleData.updatedBy || null,
        isDeleted: investmentRoleData.isDeleted || false,
        activeFrom: investmentRoleData.activeFrom || null,
        processInstanceId: investmentRoleData.processInstanceId || '',
        synchronizedAt: investmentRoleData.synchronizedAt || null
      }
    : null
}

/**
 * Transform real estate investment data
 */
const transformRealEstateInvestmentData = (investment: BaseInvestment) => {
  const realEstateInvestmentData: RealEstateInvestment | null =
    Array.isArray(investment.realEstateInvestment) && investment.realEstateInvestment.length > 0
      ? investment.realEstateInvestment[0]
      : null

  return realEstateInvestmentData
    ? {
        id: realEstateInvestmentData.id,
        version: realEstateInvestmentData.version || 0,
        businessKey: realEstateInvestmentData.businessKey || '',
        additionalProperties: realEstateInvestmentData.additionalProperties || {},
        countryRef: formatCatalogRef(realEstateInvestmentData.country),
        regionRef: formatCatalogRef(realEstateInvestmentData.region),
        addressLine: realEstateInvestmentData.addressLine || {},
        postalCode: realEstateInvestmentData.postalCode || '',
        locality: realEstateInvestmentData.locality || '',
        buildingYear: realEstateInvestmentData.buildingYear || '',
        size: realEstateInvestmentData.size || 0,
        sizeMeasurementUnitRef: formatCatalogRef(realEstateInvestmentData.sizeMeasurementUnit),
        numberOfUnits: realEstateInvestmentData.numberOfUnits || 0,
        occupancyPercent: realEstateInvestmentData.occupancyPercent || 0,
        annualNetColdRent: realEstateInvestmentData.annualNetColdRent || 0,
        funding: realEstateInvestmentData.funding || 0,
        actualAnnualExpenses: realEstateInvestmentData.actualAnnualExpenses || 0,
        targetAnnualExpenses: realEstateInvestmentData.targetAnnualExpenses || 0,
        liquidityForecast: realEstateInvestmentData.liquidityForecast || {},
        investment: investment.id
      }
    : null
}

/**
 * Helper function to find tile content by matching label patterns
 */
const findTileContent = (labelPatterns: string[], tiles: Record<string, string>, tileKeys: string[]): string => {
  // First try exact key matches
  for (const pattern of labelPatterns) {
    if (tiles[pattern]) {
      return tiles[pattern]
    }
  }

  // Then try matching against tile keys (case insensitive)
  for (const tileKey of tileKeys) {
    const lowerKey = tileKey.toLowerCase()
    for (const pattern of labelPatterns) {
      if (lowerKey.includes(pattern.toLowerCase()) || pattern.toLowerCase().includes(lowerKey)) {
        return tiles[tileKey] || ''
      }
    }
  }

  return ''
}

/**
 * Process text into array items - split by lines, semicolons, or bullet points
 */
const processListItems = (text: string): string[] => {
  if (!text) return []

  return text
    .split(/[;\n\r•\-]+/)
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .filter(item => !item.match(/^[\s\-•]*$/))
}

/**
 * Extract and process tile content from investment
 */
const extractTileContent = (investment: BaseInvestment) => {
  const additionalProps = investment.additionalProperties || {}
  const tiles = additionalProps.tiles || {}
  const tileKeys = Object.keys(tiles)

  const aboutInvestmentText =
    findTileContent(
      ['aboutInvestment', 'description', 'about', 'investment-description', 'summary'],
      tiles,
      tileKeys
    ) ||
    investment.description ||
    ''

  const motivationText = findTileContent(
    ['motivation', 'rationale', 'reasoning', 'investment-motivation', 'why'],
    tiles,
    tileKeys
  )

  const topicsText = findTileContent(
    ['topicsAndOutlook', 'topics', 'outlook', 'current-topics', 'trends'],
    tiles,
    tileKeys
  )

  const reviewText = findTileContent(['review', 'assessment', 'evaluation', 'performance', 'analysis'], tiles, tileKeys)

  const potentialText = findTileContent(
    ['potential', 'growth', 'investment-potential', 'opportunity', 'upside'],
    tiles,
    tileKeys
  )

  const developmentText = findTileContent(
    ['development', 'project-development', 'progress', 'roadmap'],
    tiles,
    tileKeys
  )

  const mainActionItemsText = findTileContent(
    ['actions', 'action-items', 'main-actions', 'tasks', 'next-steps'],
    tiles,
    tileKeys
  )

  const aboutPropertyText = findTileContent(
    ['property', 'about-property', 'real-estate', 'building', 'asset'],
    tiles,
    tileKeys
  )

  const aboutAreaText = findTileContent(
    [
      'area',
      'location',
      'neighborhood',
      'region',
      'geography',
      'real-estate-description',
      'realEstateDescription',
      'real-estate',
      'description',
      'areaDescription',
      'area-description'
    ],
    tiles,
    tileKeys
  )

  const outlookText = findTileContent(
    ['outlook', 'forecast', 'future', 'projection', 'market-outlook'],
    tiles,
    tileKeys
  )

  const topicsArray = processListItems(topicsText)
  const outlookArray = processListItems(outlookText)
  const mainActionItemsArray = processListItems(mainActionItemsText)

  return {
    aboutInvestmentText,
    motivationText,
    reviewText,
    potentialText,
    developmentText,
    aboutPropertyText,
    aboutAreaText,
    topicsArray,
    outlookArray,
    mainActionItemsArray
  }
}

/**
 * Calculate holding period from acquisition date
 */
const calculateHoldingPeriod = (acquisitionDate: string | null | undefined): number => {
  return acquisitionDate ? dayjs().diff(dayjs(acquisitionDate), 'year') : 0
}

/**
 * Get formatted owner employee name
 */
const getOwnerEmployeeName = (ownerEmployee: EmployeeRef | null | undefined): string => {
  return ownerEmployee
    ? ownerEmployee.fullName ||
        ownerEmployee.displayName ||
        `${ownerEmployee.firstName || ''} ${ownerEmployee.lastName || ''}`.trim()
    : ''
}

/**
 * Transform investment data to report payload format
 */
const transformInvestmentToReportPayload = (investmentData: BaseInvestment): GenerateInvestmentReportRequest => {
  const investment = investmentData

  // Transform all data sections
  const baseInvestment = transformBaseInvestmentData(investment)
  const { equityInvestment, equityInvestmentRounds } = transformEquityInvestmentData(investment)
  const investmentRole = transformInvestmentRoleData(investment)
  const realEstateInvestment = transformRealEstateInvestmentData(investment)

  // Extract tile content and metadata
  const {
    aboutInvestmentText,
    motivationText,
    reviewText,
    potentialText,
    developmentText,
    aboutPropertyText,
    aboutAreaText,
    topicsArray,
    outlookArray,
    mainActionItemsArray
  } = extractTileContent(investment)

  const ownerEmployeeName = getOwnerEmployeeName(investment.ownerEmployee)
  const holdingPeriod = calculateHoldingPeriod(investment.acquisitionDate)

  return {
    reportPath: '/reports/investment-one-pager',
    templateName: getTemplateNameByInvestmentType(investment),
    reportData: {
      investment: baseInvestment,
      ...(equityInvestment && { equityInvestment }),
      ...(equityInvestmentRounds.length > 0 && { equityInvestmentRounds }),
      ...(investmentRole && { investmentRole }),
      ...(realEstateInvestment && { realEstateInvestment }),
      ownerEmployeeName,
      holdingPeriod,
      aboutInvestment: aboutInvestmentText,
      motivation: motivationText,
      topicsAndOutlook: topicsArray,
      aboutProjectDevelopment: developmentText,
      review: reviewText,
      outlook: outlookArray.length > 0 ? outlookArray : topicsArray,
      mainActionItems: mainActionItemsArray,
      investmentPotential: potentialText,
      aboutProperty:
        aboutPropertyText || (realEstateInvestment ? investmentData.realEstateInvestment?.[0]?.description || '' : ''),
      aboutArea:
        aboutAreaText || (realEstateInvestment ? investmentData.realEstateInvestment?.[0]?.areaDescription || '' : '')
    }
  }
}

/**
 * Hook for fetching investment data and transforming it to report payload format
 */
export const useInvestmentReportData = (context: BusinessAppContextProps) => {
  const { fetchInvestmentById } = useGetInvestmentById(context)

  const fetchInvestmentReportData = useCallback(
    async (investmentId: string): Promise<GenerateInvestmentReportRequest> => {
      try {
        const result = await fetchInvestmentById(investmentId)

        if (!result.investment) {
          throw new Error(`Investment not found for ID: ${investmentId}`)
        }

        return transformInvestmentToReportPayload(result.investment)
      } catch (error) {
        throw error
      }
    },
    [fetchInvestmentById]
  )

  // Export transformation function for use with pre-loaded data
  const transformInvestmentToPayload = useCallback(
    (investmentData: BaseInvestment): GenerateInvestmentReportRequest => {
      return transformInvestmentToReportPayload(investmentData)
    },
    []
  )

  return {
    fetchInvestmentReportData,
    transformInvestmentToPayload
  }
}
