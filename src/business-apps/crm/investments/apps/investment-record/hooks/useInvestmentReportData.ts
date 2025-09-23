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

  // 🔥 EQUITY INVESTMENT DATA - Handle array structure correctly
  const equityInvestmentData = Array.isArray(investment.equityInvestment) && investment.equityInvestment.length > 0 
    ? investment.equityInvestment[0] 
    : investment.equityInvestment;
    
  const equityInvestment = equityInvestmentData ? {
    id: equityInvestmentData.id,
    version: equityInvestmentData.version || 0,
    businessKey: equityInvestmentData.businessKey || '',
    additionalProperties: equityInvestmentData.additionalProperties || {},
    foundationDate: equityInvestmentData.foundationDate || null,
    marketValue: equityInvestmentData.marketValue || 0,
    turnoverAmount: equityInvestmentData.turnoverAmount || 0,
    ebitdaAmount: equityInvestmentData.ebitdaAmount || 0,
    investment: investment.id
  } : null;

  // 🔥 EQUITY INVESTMENT ROUNDS - Get from first equity record
  const equityInvestmentRounds = equityInvestmentData?.equityInvestmentRound?.map((round: any) => ({
    id: round.id,
    version: round.version || 0,
    // Note: businessKey and additionalProperties are NOT included in the GraphQL query
    // But we include them in case they're needed by the API (will be empty/default)
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
    // Include additional audit fields that ARE available
    createdAt: round.createdAt || null,
    createdBy: round.createdBy || null,
    updatedAt: round.updatedAt || null,
    updatedBy: round.updatedBy || null,
    isDeleted: round.isDeleted || false,
    recordState: round.recordState || null,
    activeFrom: round.activeFrom || null,
    activeTo: round.activeTo || null
  })) || [];

  // 🔥 INVESTMENT ROLE - Handle array structure correctly (similar to equityInvestment)
  const investmentRoleData = Array.isArray(investment.investmentRole) && investment.investmentRole.length > 0 
    ? investment.investmentRole[0] 
    : investment.investmentRole;
    
  const investmentRole = investmentRoleData ? {
    id: investmentRoleData.id,
    version: investmentRoleData.version || 0,
    businessKey: investmentRoleData.businessKey || '',
    recordState: investmentRoleData.recordState || '',
    activeTo: investmentRoleData.activeTo || null,
    additionalProperties: investmentRoleData.additionalProperties || {},
    investmentRoleRef: formatCatalogRef(investmentRoleData.investmentRole), // The catalog entry
    displayOrder: investmentRoleData.displayOrder || 0,
    investment: investment.id,
    // Include all audit fields that are available
    createdAt: investmentRoleData.createdAt || null,
    createdBy: investmentRoleData.createdBy || null,
    updatedAt: investmentRoleData.updatedAt || null,
    updatedBy: investmentRoleData.updatedBy || null,
    isDeleted: investmentRoleData.isDeleted || false,
    activeFrom: investmentRoleData.activeFrom || null,
    processInstanceId: investmentRoleData.processInstanceId || '',
    synchronizedAt: investmentRoleData.synchronizedAt || null
  } : null;

  // 🔥 REAL ESTATE INVESTMENT DATA - Handle array structure correctly
  const realEstateInvestmentData = Array.isArray(investment.realEstateInvestment) && investment.realEstateInvestment.length > 0 
    ? investment.realEstateInvestment[0] 
    : investment.realEstateInvestment;
    
  const realEstateInvestment = realEstateInvestmentData ? {
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
    // 🔥 LIQUIDITY FORECAST - Properly mapped from GraphQL jsonb field
    liquidityForecast: realEstateInvestmentData.liquidityForecast || {},
    investment: investment.id
  } : null;

  // 🔥 OWNER EMPLOYEE NAME - Prioritize fullName as requested
  const ownerEmployeeName = investment.ownerEmployee ? 
    investment.ownerEmployee.fullName || 
    investment.ownerEmployee.displayName || 
    `${investment.ownerEmployee.firstName || ''} ${investment.ownerEmployee.lastName || ''}`.trim() : '';

  // Calculate holding period (if acquisition date is available)
  const holdingPeriod = investment.acquisitionDate ? 
    Math.floor((new Date().getTime() - new Date(investment.acquisitionDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : 0;
  const additionalProps = investment.additionalProperties || {};
  const tiles = additionalProps.tiles || {};
  
  // Create a helper function to find tile content by matching label patterns
  const findTileContent = (labelPatterns: string[], tileKeys: string[]): string => {
    // First try exact key matches
    for (const pattern of labelPatterns) {
      if (tiles[pattern]) {
        return tiles[pattern];
      }
    }
    
    // Then try matching against tile keys (case insensitive)
    for (const tileKey of tileKeys) {
      const lowerKey = tileKey.toLowerCase();
      for (const pattern of labelPatterns) {
        if (lowerKey.includes(pattern.toLowerCase()) || pattern.toLowerCase().includes(lowerKey)) {
          return tiles[tileKey] || '';
        }
      }
    }
    
    return '';
  };
  
  const tileKeys = Object.keys(tiles);
  
  // Extract content using semantic matching instead of hardcoded keys
  const aboutInvestmentText = findTileContent([
    'aboutInvestment', 'description', 'about', 'investment-description', 'summary'
  ], tileKeys) || investment.description || '';
                             
  const motivationText = findTileContent([
    'motivation', 'rationale', 'reasoning', 'investment-motivation', 'why'
  ], tileKeys);
                        
  const topicsText = findTileContent([
    'topicsAndOutlook', 'topics', 'outlook', 'current-topics', 'trends'
  ], tileKeys);
                    
  const reviewText = findTileContent([
    'review', 'assessment', 'evaluation', 'performance', 'analysis'
  ], tileKeys);
                    
  const potentialText = findTileContent([
    'potential', 'growth', 'investment-potential', 'opportunity', 'upside'
  ], tileKeys);
                       
  const developmentText = findTileContent([
    'development', 'project-development', 'progress', 'roadmap'
  ], tileKeys);
  
  const mainActionItemsText = findTileContent([
    'actions', 'action-items', 'main-actions', 'tasks', 'next-steps'
  ], tileKeys);
  
  const aboutPropertyText = findTileContent([
    'property', 'about-property', 'real-estate', 'building', 'asset'
  ], tileKeys);
  
  const aboutAreaText = findTileContent([
    'area', 'location', 'neighborhood', 'region', 'geography'
  ], tileKeys);
  
  const outlookText = findTileContent([
    'outlook', 'forecast', 'future', 'projection', 'market-outlook'
  ], tileKeys);
  
  // Process topics and outlook - split by lines, semicolons, or bullet points if it's a string
  const processListItems = (text: string): string[] => {
    if (!text) return [];
    
    // Split by common delimiters and clean up
    return text
      .split(/[;\n\r•\-]+/) // Split by semicolon, newlines, bullets, or dashes
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .filter(item => !item.match(/^[\s\-•]*$/)); // Remove lines with only whitespace/bullets
  };
  
  const topicsArray = processListItems(topicsText);
  const outlookArray = processListItems(outlookText);
  const mainActionItemsArray = processListItems(mainActionItemsText);
  
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
      // 🔥 POPULATED FROM INVESTMENT DESCRIPTION CARDS (Overview Tab Tiles)
      // Map the extracted data to the exact payload fields you requested:
      aboutInvestment: aboutInvestmentText,        // From "Investment Description" card
      motivation: motivationText,                  // From "Motivation" card  
      topicsAndOutlook: topicsArray,              // From "Current topics and outlook" card
      aboutProjectDevelopment: developmentText,   // From "Project Development" card
      review: reviewText,                         // From "Review" card
      outlook: outlookArray.length > 0 ? outlookArray : topicsArray, // From "Outlook" card or fallback to topics
      mainActionItems: mainActionItemsArray,      // From "Main Action Items" card
      investmentPotential: potentialText,         // From "Investment Potential" card
      aboutProperty: aboutPropertyText ||         // From "About Property" card (Real Estate)
                    (realEstateInvestment ? realEstateInvestmentData?.description || '' : ''),
      aboutArea: aboutAreaText ||                 // From "About Area" card (Real Estate)
                (realEstateInvestment ? realEstateInvestmentData?.areaDescription || '' : '')
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
