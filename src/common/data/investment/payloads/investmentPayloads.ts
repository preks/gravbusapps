import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { toISOFormat } from '@/common/utils/dateFormatter';

// ==============================
// Investment Payload Types
// ==============================

// ==============================
// Investment Entity Interfaces
// ==============================

export interface InvestmentData {
  // Core investment fields (matching API exactly)
  id?: string;
  version?: number;
  name: string;
  initialInvestmentAmount: number | string;
  investmentGroupRef: string; // Required - catalog reference
  ownerEmployee: string; // Required - UUID reference
  
  // Optional investment fields
  code?: string;
  isin?: string;
  investmentTypeRef?: string;
  investmentStakeTypeRef?: string;
  investmentPhaseRef?: string;
  investmentStatusRef?: string;
  investmentRiskLevelRef?: string;
  acquisitionDate?: string;
  planedExit?: boolean; // Note: typo in API model
  plannedExitDate?: string;
  exitDate?: string;
  totalInvestmentAmount?: number | string;
  investmentMarketValue?: number | string;
  debtFinancingAmount?: number | string;
  requiredCapitalAmount?: number | string;
  forecastedRevenueAmount?: number | string;
  forecastedProfitAmount?: number | string;
  stakePercentage?: number | string;
  loanRecipientName?: string;
  loanAmount?: number | string;
  loanOpenCommitmentAmount?: number | string;
  loanInterestRate?: number | string;
  loanStartDate?: string;
  loanEndDate?: string;
  loanInterestClaim?: number | string;
  totalCommitmentAmount?: number | string;
  totalDistributionAmount?: number | string;
  currencyRef?: string;
  fundManagerName?: string;
  identification?: any; // JSON object
  investmentAccount?: string; // uuid
  investmentOpportunity?: string; // uuid
  loanRecipientInvestmentAccount?: string; // uuid

  // Support for dynamic additional properties fields
  [key: string]: any; // Allow dynamic additional properties fields
}

export interface EquityInvestmentData {
  id?: string;
  version?: number | string;
  foundationDate?: string;
  marketValue?: number | string;
  turnoverAmount?: number | string;
  ebitdaAmount?: number | string;
  investment?: string; // uuid

  // Support for dynamic additional properties fields
  [key: string]: any; // Allow dynamic additional properties fields
}

export interface RealEstateInvestmentData {
  id?: string;
  version?: number | string;
  countryRef?: string;
  regionRef?: string;
  addressLine?: any; // object
  postalCode?: string;
  locality?: string;
  buildingYear?: string; // Note: string in model, not number
  size?: number | string;
  sizeMeasurementUnitRef?: string;
  numberOfUnits?: number | string;
  occupancyPercent?: number | string;
  annualNetColdRent?: number | string;
  funding?: number | string;
  actualAnnualExpenses?: number | string;
  targetAnnualExpenses?: number | string;
  liquidityForecast?: any; // object
  investment?: string; // uuid

  // Support for dynamic additional properties fields
  [key: string]: any; // Allow dynamic additional properties fields
}

export interface LiquidFundInvestmentData {
  id?: string;
  version?: number | string;
  investmentLiquidFundTypeRef?: string;
  proprietorName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  earlyTerminationAllowed?: boolean;
  interestRate?: number | string;
  interestPaymentFrequencyRef?: string;
  maturityDate?: string;
  investment?: string; // uuid

  // Support for dynamic additional properties fields
  [key: string]: any; // Allow dynamic additional properties fields
}

// ==============================
// Combined Form Data Interface
// ==============================

export interface InvestmentFormData {
  // Main investment data
  investment: InvestmentData;
  
  // Investment type-specific data (only one will be populated based on group type)
  equityInvestment?: EquityInvestmentData;
  realEstateInvestment?: RealEstateInvestmentData;
  liquidFundInvestment?: LiquidFundInvestmentData;
}

// ==============================
// Investment Payload Builder
// ==============================

export const buildInvestmentPayload = (
  formData: InvestmentFormData | any, // Accept any for backwards compatibility
  _businessAppContext: BusinessAppContextProps,
  options: { isUpdate?: boolean; rawInvestmentData?: any } = {}
) => {
  const { rawInvestmentData } = options;
  
  // Handle both new nested structure and old flat structure for backwards compatibility
  let investment: any;
  
  if (formData.investment) {
    // New nested structure
    investment = formData.investment;
  } else {
    // Old flat structure - convert to new structure
    investment = {
      id: (formData as any).id,
      version: (formData as any).version,
      name: (formData as any).name,
      initialInvestmentAmount: (formData as any).initialInvestmentAmount,
      investmentGroupRef: (formData as any).investmentGroupRef || (formData as any).group,
      ownerEmployee: (formData as any).ownerEmployee || (formData as any).ownerEmployeeId,
      investmentTypeRef: (formData as any).investmentTypeRef,
      investmentAccount: (formData as any).investmentAccount || (formData as any).accountId,
      // Copy all other fields that might be in the flat structure
      ...(formData as any),
    };
  }
  
  // Helper to convert string/number to number
  const toNumber = (value: number | string | undefined): number | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? undefined : num;
  };

  // Helper to extract and build additionalProperties object from form data
  const buildAdditionalProperties = (formData: any, _entityPrefix: string): Record<string, any> | undefined => {
    // Return undefined if formData is null, undefined, or not an object
    if (!formData || typeof formData !== 'object') {
      return undefined;
    }

    const additionalProps: Record<string, any> = {};
    let hasAdditionalProps = false;

    // Find all fields that start with "additionalProperties_"
    Object.keys(formData).forEach(key => {
      if (key.startsWith('additionalProperties_')) {
        const fieldName = key.replace('additionalProperties_', '');
        const value = formData[key];
        
        // Only include non-empty values
        if (value !== undefined && value !== null && value !== '') {
          additionalProps[fieldName] = value;
          hasAdditionalProps = true;
        }
      }
    });

    // Return object if we have additional properties, undefined otherwise
    return hasAdditionalProps ? additionalProps : undefined;
  };

  // Validate that investment data exists
  if (!investment) {
    throw new Error('Investment data is required but not provided');
  }

  // Extract investment-level additionalProperties
  const investmentAdditionalProperties = buildAdditionalProperties(investment, 'investment');

  
  // Base investment payload
  const baseInvestmentPayload: any = {
    name: investment.name,
    initialInvestmentAmount: toNumber(investment.initialInvestmentAmount),
    investmentGroupRef: investment.investmentGroupRef, // Required
    ownerEmployee: investment.ownerEmployee, // Required UUID
    
    // Always set status to ACTIVE for new investments
    ...(!options.isUpdate && { investmentStatusRef: 'InvestmentStatus:v1:ACTIVE' }),
    
    // Investment fields (matching model exactly)
    ...(investment.code && { code: investment.code }),
    ...(investment.isin && { isin: investment.isin }),
    ...(investment.investmentTypeRef && { investmentTypeRef: investment.investmentTypeRef }),
    ...(investment.investmentStakeTypeRef && { investmentStakeTypeRef: investment.investmentStakeTypeRef }),
    ...(investment.investmentPhaseRef && { investmentPhaseRef: investment.investmentPhaseRef }),
    ...(investment.investmentStatusRef && { investmentStatusRef: investment.investmentStatusRef }),
    ...(investment.investmentRiskLevelRef && { investmentRiskLevelRef: investment.investmentRiskLevelRef }),
    ...(investment.acquisitionDate && { acquisitionDate: toISOFormat(investment.acquisitionDate) }),
    ...(investment.planedExit !== undefined && { planedExit: investment.planedExit }),
    ...(investment.plannedExitDate && { plannedExitDate: toISOFormat(investment.plannedExitDate) }),
    ...(investment.exitDate && { exitDate: toISOFormat(investment.exitDate) }),
    ...(investment.totalInvestmentAmount && { totalInvestmentAmount: toNumber(investment.totalInvestmentAmount) }),
    ...(investment.investmentMarketValue && { investmentMarketValue: toNumber(investment.investmentMarketValue) }),
    ...(investment.debtFinancingAmount && { debtFinancingAmount: toNumber(investment.debtFinancingAmount) }),
    ...(investment.requiredCapitalAmount && { requiredCapitalAmount: toNumber(investment.requiredCapitalAmount) }),
    ...(investment.forecastedRevenueAmount && { forecastedRevenueAmount: toNumber(investment.forecastedRevenueAmount) }),
    ...(investment.forecastedProfitAmount && { forecastedProfitAmount: toNumber(investment.forecastedProfitAmount) }),
    ...(investment.stakePercentage && { stakePercentage: toNumber(investment.stakePercentage) }),
    ...(investment.loanRecipientName && { loanRecipientName: investment.loanRecipientName }),
    ...(investment.loanAmount && { loanAmount: toNumber(investment.loanAmount) }),
    ...(investment.loanOpenCommitmentAmount && { loanOpenCommitmentAmount: toNumber(investment.loanOpenCommitmentAmount) }),
    ...(investment.loanInterestRate && { loanInterestRate: toNumber(investment.loanInterestRate) }),
    ...(investment.loanStartDate && { loanStartDate: toISOFormat(investment.loanStartDate) }),
    ...(investment.loanEndDate && { loanEndDate: toISOFormat(investment.loanEndDate) }),
    ...(investment.loanInterestClaim && { loanInterestClaim: toNumber(investment.loanInterestClaim) }),
    ...(investment.totalCommitmentAmount && { totalCommitmentAmount: toNumber(investment.totalCommitmentAmount) }),
    ...(investment.totalDistributionAmount && { totalDistributionAmount: toNumber(investment.totalDistributionAmount) }),
    ...(investment.currencyRef && { currencyRef: investment.currencyRef }),
    ...(investment.fundManagerName && { fundManagerName: investment.fundManagerName }),
    ...(investment.identification && { identification: investment.identification }),
    ...(investment.investmentAccount && { investmentAccount: investment.investmentAccount }),
    ...(investment.investmentOpportunity && { investmentOpportunity: investment.investmentOpportunity }),
    ...(investment.loanRecipientInvestmentAccount && { loanRecipientInvestmentAccount: investment.loanRecipientInvestmentAccount }),
    
    // Investment additionalProperties as JSON string
    ...(investmentAdditionalProperties && { additionalProperties: investmentAdditionalProperties }),
  };

  // Add update fields if updating
  if (options.isUpdate && rawInvestmentData?.id) {
    baseInvestmentPayload.id = rawInvestmentData.id;
    baseInvestmentPayload.version = rawInvestmentData.version;
  }

  // Determine investment group type from the reference
  const getGroupType = (groupRef: string | undefined): string => {
    if (!groupRef || typeof groupRef !== 'string') {
      return '';
    }
    const parts = groupRef.split(':');
    return parts.length > 2 ? parts[2] : '';
  };

  // Validate required fields
  if (!investment.investmentGroupRef) {
    throw new Error('Investment group is required but not provided');
  }

  const groupType = getGroupType(investment.investmentGroupRef);
  
  if (!groupType) {
    throw new Error(`Invalid investment group format: ${investment.investmentGroupRef}`);
  }

  // Build the investment request wrapper
  const investmentRequest: any = {
    investment: baseInvestmentPayload,
  };

  // Add group-specific data based on the investment type
  switch (groupType) {
    case 'EQUITY':
      // Always create equityInvestment object (required by API)
      // Handle both new nested structure and old flat structure
      const equityData = formData.equityInvestment || {
        foundationDate: (formData as any).foundationDate,
        marketValue: (formData as any).marketValue,
        turnoverAmount: (formData as any).turnoverAmount,
        ebitdaAmount: (formData as any).ebitdaAmount,
      };
      
      if (equityData && (equityData.foundationDate || equityData.marketValue || equityData.turnoverAmount || equityData.ebitdaAmount)) {
        // Handle both array and object structures for existing equity data
        const existingEquity = Array.isArray(rawInvestmentData?.equityInvestment) 
          ? rawInvestmentData.equityInvestment[0] || {}
          : rawInvestmentData?.equityInvestment || {};
        const equityAdditionalProperties = buildAdditionalProperties(equityData, 'equityInvestment');
        
        investmentRequest.equityInvestment = {
          // Preserve all existing data
          ...existingEquity,
          // Override with form changes (only if provided)
          ...(equityData.foundationDate !== undefined && { foundationDate: toISOFormat(equityData.foundationDate) }),
          ...(equityData.marketValue !== undefined && { marketValue: toNumber(equityData.marketValue) }),
          ...(equityData.turnoverAmount !== undefined && { turnoverAmount: toNumber(equityData.turnoverAmount) }),
          ...(equityData.ebitdaAmount !== undefined && { ebitdaAmount: toNumber(equityData.ebitdaAmount) }),
          ...(equityData.investment !== undefined && { investment: equityData.investment }),
          // Additional properties as JSON string
          ...(equityAdditionalProperties && { additionalProperties: equityAdditionalProperties }),
          // Always include id and version for updates (these should not be overridden by form)
          ...(options.isUpdate && existingEquity.id && { 
            id: existingEquity.id,
            version: existingEquity.version 
          }),
        };
      }
      break;

    case 'REAL_ESTATE':
      // Always create realEstateInvestment object (required by API)
      // Handle both new nested structure and old flat structure
      const realEstateData = formData.realEstateInvestment || {
        countryRef: (formData as any).countryRef,
        regionRef: (formData as any).regionRef,
        addressLine: (formData as any).addressLine,
        postalCode: (formData as any).postalCode,
        locality: (formData as any).locality,
        buildingYear: (formData as any).buildingYear,
        size: (formData as any).size,
        sizeMeasurementUnitRef: (formData as any).sizeMeasurementUnitRef,
        numberOfUnits: (formData as any).numberOfUnits,
        occupancyPercent: (formData as any).occupancyPercent,
        annualNetColdRent: (formData as any).annualNetColdRent,
        funding: (formData as any).funding,
        actualAnnualExpenses: (formData as any).actualAnnualExpenses,
        targetAnnualExpenses: (formData as any).targetAnnualExpenses,
        liquidityForecast: (formData as any).liquidityForecast,
      };
      
      if (realEstateData && Object.values(realEstateData).some(v => v !== undefined)) {
        // Handle both array and object structures for existing real estate data
        const existingRealEstate = Array.isArray(rawInvestmentData?.realEstateInvestment) 
          ? rawInvestmentData.realEstateInvestment[0] || {}
          : rawInvestmentData?.realEstateInvestment || {};
        const realEstateAdditionalProperties = buildAdditionalProperties(realEstateData, 'realEstateInvestment');
        
        investmentRequest.realEstateInvestment = {
          // Preserve all existing data
          ...existingRealEstate,
          // Override with form changes (only if provided)
          ...(realEstateData.countryRef !== undefined && { countryRef: realEstateData.countryRef }),
          ...(realEstateData.regionRef !== undefined && { regionRef: realEstateData.regionRef }),
          ...(realEstateData.addressLine !== undefined && { addressLine: realEstateData.addressLine }),
          ...(realEstateData.postalCode !== undefined && { postalCode: realEstateData.postalCode }),
          ...(realEstateData.locality !== undefined && { locality: realEstateData.locality }),
          ...(realEstateData.buildingYear !== undefined && { buildingYear: realEstateData.buildingYear }), // string in model
          ...(realEstateData.size !== undefined && { size: toNumber(realEstateData.size) }),
          ...(realEstateData.sizeMeasurementUnitRef !== undefined && { sizeMeasurementUnitRef: realEstateData.sizeMeasurementUnitRef }),
          ...(realEstateData.numberOfUnits !== undefined && { numberOfUnits: toNumber(realEstateData.numberOfUnits) }),
          ...(realEstateData.occupancyPercent !== undefined && { occupancyPercent: toNumber(realEstateData.occupancyPercent) }),
          ...(realEstateData.annualNetColdRent !== undefined && { annualNetColdRent: toNumber(realEstateData.annualNetColdRent) }),
          ...(realEstateData.funding !== undefined && { funding: toNumber(realEstateData.funding) }),
          ...(realEstateData.actualAnnualExpenses !== undefined && { actualAnnualExpenses: toNumber(realEstateData.actualAnnualExpenses) }),
          ...(realEstateData.targetAnnualExpenses !== undefined && { targetAnnualExpenses: toNumber(realEstateData.targetAnnualExpenses) }),
          ...(realEstateData.liquidityForecast !== undefined && { liquidityForecast: realEstateData.liquidityForecast }),
          ...(realEstateData.investment !== undefined && { investment: realEstateData.investment }),
          // Additional properties as JSON string
          ...(realEstateAdditionalProperties && { additionalProperties: realEstateAdditionalProperties }),
          // Always include id and version for updates (these should not be overridden by form)
          ...(options.isUpdate && existingRealEstate.id && { 
            id: existingRealEstate.id,
            version: existingRealEstate.version 
          }),
        };
      }
      break;

    case 'LIQUID_FUND':
      // Always create liquidFundInvestment object (required by API)
      // Handle both new nested structure and old flat structure
      const liquidFundData = formData.liquidFundInvestment || {
        investmentLiquidFundTypeRef: (formData as any).investmentLiquidFundTypeRef,
        proprietorName: (formData as any).proprietorName,
        bankName: (formData as any).bankName,
        bankAccountNumber: (formData as any).bankAccountNumber,
        earlyTerminationAllowed: (formData as any).earlyTerminationAllowed,
        interestRate: (formData as any).interestRate,
        interestPaymentFrequencyRef: (formData as any).interestPaymentFrequencyRef,
        maturityDate: (formData as any).maturityDate,
      };
      
      if (liquidFundData && Object.values(liquidFundData).some(v => v !== undefined)) {
        // Handle both array and object structures for existing liquid fund data
        const existingLiquidFund = Array.isArray(rawInvestmentData?.liquidFundInvestment) 
          ? rawInvestmentData.liquidFundInvestment[0] || {}
          : rawInvestmentData?.liquidFundInvestment || {};
        const liquidFundAdditionalProperties = buildAdditionalProperties(liquidFundData, 'liquidFundInvestment');
        
        investmentRequest.liquidFundInvestment = {
          // Preserve all existing data
          ...existingLiquidFund,
          // Override with form changes (only if provided)
          ...(liquidFundData.investmentLiquidFundTypeRef !== undefined && { investmentLiquidFundTypeRef: liquidFundData.investmentLiquidFundTypeRef }),
          ...(liquidFundData.proprietorName !== undefined && { proprietorName: liquidFundData.proprietorName }),
          ...(liquidFundData.bankName !== undefined && { bankName: liquidFundData.bankName }),
          ...(liquidFundData.bankAccountNumber !== undefined && { bankAccountNumber: liquidFundData.bankAccountNumber }),
          ...(liquidFundData.earlyTerminationAllowed !== undefined && { earlyTerminationAllowed: liquidFundData.earlyTerminationAllowed }),
          ...(liquidFundData.interestRate !== undefined && { interestRate: toNumber(liquidFundData.interestRate) }),
          ...(liquidFundData.interestPaymentFrequencyRef !== undefined && { interestPaymentFrequencyRef: liquidFundData.interestPaymentFrequencyRef }),
          ...(liquidFundData.maturityDate !== undefined && { maturityDate: toISOFormat(liquidFundData.maturityDate) }),
          ...(liquidFundData.investment !== undefined && { investment: liquidFundData.investment }),
          // Additional properties as JSON string
          ...(liquidFundAdditionalProperties && { additionalProperties: liquidFundAdditionalProperties }),
          // Always include id and version for updates (these should not be overridden by form)
          ...(options.isUpdate && existingLiquidFund.id && { 
            id: existingLiquidFund.id,
            version: existingLiquidFund.version 
          }),
        };
      }
      break;
  }


  // Return the properly wrapped payload
  return {
    investmentRequest
  };
};

// ==============================
// Group Type Utilities
// ==============================

export const getInvestmentGroupType = (groupRef: string): string => {
  const parts = groupRef.split(':');
  return parts.length > 2 ? parts[2] : '';
};

export const isEquityInvestment = (groupRef: string): boolean => {
  return getInvestmentGroupType(groupRef) === 'EQUITY';
};

export const isRealEstateInvestment = (groupRef: string): boolean => {
  return getInvestmentGroupType(groupRef) === 'REAL_ESTATE';
};

export const isLiquidFundInvestment = (groupRef: string): boolean => {
  return getInvestmentGroupType(groupRef) === 'LIQUID_FUND';
};

// ==============================
// Investment Group References
// ==============================

export const INVESTMENT_GROUP_REFS = {
  EQUITY: 'InvestmentGroup:v1:EQUITY',
  REAL_ESTATE: 'InvestmentGroup:v1:REAL_ESTATE',
  LIQUID_FUND: 'InvestmentGroup:v1:LIQUID_FUND',
} as const;

export type InvestmentGroupType = keyof typeof INVESTMENT_GROUP_REFS;
