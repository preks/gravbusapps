import { useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetInvestmentById } from '@/common/data/investment';
import { GenerateInvestmentReportRequest } from '@/common/network/investment-reports';

/**
 * Helper function to extract currency reference
 */
const extractCurrencyRef = (currencyData: any): string => {
  if (!currencyData) return '';
  return currencyData.value || currencyData.code || '';
};

/**
 * Helper function to format catalog reference
 */
const formatCatalogRef = (catalogData: any): string => {
  if (!catalogData) return '';
  const { catalog, value } = catalogData;
  if (catalog && value) {
    return `${catalog}:v1:${value}`;
  }
  return value || '';
};

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
const getTemplateNameByInvestmentType = (investment: any): string => {
  // Primary logic: Use templateName from investmentType.objectValue
  const templateName = investment.investmentType?.objectValue?.templateName;
  
  if (templateName) {
    return templateName;
  }
  
  // Default template for cases where templateName is not configured
  const defaultTemplate = 'investment-one-pager-template';
  return defaultTemplate;
};

/**
 * Transform investment data to report payload format
 */
const transformInvestmentToReportPayload = (investmentData: any): GenerateInvestmentReportRequest => {
  const investment = investmentData;
  
  // Base investment data
  const baseInvestment = {
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
    investmentAccount: investment.investmentAccount?.id || null,
    investmentOpportunity: investment.investmentOpportunity?.id || null,
    ownerEmployee: investment.ownerEmployee?.id || null,
    loanRecipientInvestmentAccount: investment.loanRecipientInvestmentAccount?.id || null
  };

  // Equity investment data
  const equityInvestment = investment.equityInvestment ? {
    id: investment.equityInvestment.id,
    version: investment.equityInvestment.version || 0,
    businessKey: investment.equityInvestment.businessKey || '',
    additionalProperties: investment.equityInvestment.additionalProperties || {},
    foundationDate: investment.equityInvestment.foundationDate || null,
    marketValue: investment.equityInvestment.marketValue || 0,
    turnoverAmount: investment.equityInvestment.turnoverAmount || 0,
    ebitdaAmount: investment.equityInvestment.ebitdaAmount || 0,
    investment: investment.id
  } : null;

  // Equity investment rounds
  const equityInvestmentRounds = investment.equityInvestment?.equityInvestmentRound?.map((round: any) => ({
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
    equityInvestment: investment.equityInvestment.id
  })) || [];

  // Investment role (simplified - may need adjustment based on actual data structure)
  const investmentRole = investment.investmentRole ? {
    id: investment.investmentRole.id,
    version: investment.investmentRole.version || 0,
    businessKey: investment.investmentRole.businessKey || '',
    additionalProperties: investment.investmentRole.additionalProperties || {},
    investmentRoleRef: formatCatalogRef(investment.investmentRole.investmentRoleRef),
    displayOrder: investment.investmentRole.displayOrder || 0,
    investment: investment.id
  } : null;

  // Real estate investment data
  const realEstateInvestment = investment.realEstateInvestment ? {
    id: investment.realEstateInvestment.id,
    version: investment.realEstateInvestment.version || 0,
    businessKey: investment.realEstateInvestment.businessKey || '',
    additionalProperties: investment.realEstateInvestment.additionalProperties || {},
    countryRef: formatCatalogRef(investment.realEstateInvestment.country),
    regionRef: formatCatalogRef(investment.realEstateInvestment.region),
    addressLine: investment.realEstateInvestment.addressLine || {},
    postalCode: investment.realEstateInvestment.postalCode || '',
    locality: investment.realEstateInvestment.locality || '',
    buildingYear: investment.realEstateInvestment.buildingYear || '',
    size: investment.realEstateInvestment.size || 0,
    sizeMeasurementUnitRef: formatCatalogRef(investment.realEstateInvestment.sizeMeasurementUnit),
    numberOfUnits: investment.realEstateInvestment.numberOfUnits || 0,
    occupancyPercent: investment.realEstateInvestment.occupancyPercent || 0,
    annualNetColdRent: investment.realEstateInvestment.annualNetColdRent || 0,
    funding: investment.realEstateInvestment.funding || 0,
    actualAnnualExpenses: investment.realEstateInvestment.actualAnnualExpenses || 0,
    targetAnnualExpenses: investment.realEstateInvestment.targetAnnualExpenses || 0,
    liquidityForecast: investment.realEstateInvestment.liquidityForecast || {},
    investment: investment.id
  } : null;

  // Additional computed fields
  const ownerEmployeeName = investment.ownerEmployee ? 
    investment.ownerEmployee.displayName || investment.ownerEmployee.fullName || 
    `${investment.ownerEmployee.firstName || ''} ${investment.ownerEmployee.lastName || ''}`.trim() : '';

  // Calculate holding period (if acquisition date is available)
  const holdingPeriod = investment.acquisitionDate ? 
    Math.floor((new Date().getTime() - new Date(investment.acquisitionDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : 0;

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
      // These fields could be populated from investment description or notes if available
      aboutInvestment: investment.description || '',
      motivation: '',
      topicsAndOutlook: [],
      aboutProjectDevelopment: '',
      review: '',
      outlook: [],
      mainActionItems: [],
      investmentPotential: '',
      aboutProperty: realEstateInvestment ? investment.realEstateInvestment?.description || '' : '',
      aboutArea: realEstateInvestment ? investment.realEstateInvestment?.areaDescription || '' : ''
    }
  };
};

/**
 * Hook for fetching investment data and transforming it to report payload format
 */
export const useInvestmentReportData = (context: BusinessAppContextProps) => {
  const { fetchInvestmentById } = useGetInvestmentById(context);

  const fetchInvestmentReportData = useCallback(async (investmentId: string): Promise<GenerateInvestmentReportRequest> => {
    try {
      const result = await fetchInvestmentById(investmentId);
      
      if (!result.investment) {
        throw new Error(`Investment not found for ID: ${investmentId}`);
      }

      return transformInvestmentToReportPayload(result.investment);
    } catch (error) {
      throw error;
    }
  }, [fetchInvestmentById]);

  // Export transformation function for use with pre-loaded data
  const transformInvestmentToPayload = useCallback((investmentData: any): GenerateInvestmentReportRequest => {
    return transformInvestmentToReportPayload(investmentData);
  }, []);

  return { 
    fetchInvestmentReportData, 
    transformInvestmentToPayload 
  };
};
