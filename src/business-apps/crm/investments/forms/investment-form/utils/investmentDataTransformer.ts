import { InvestmentFormData } from '@/common/data/investment/payloads/investmentPayloads';

// Interface for the GraphQL investment data response (from existing queries)
export interface InvestmentQueryData {
  id: string;
  name: string;
  investmentGroupRef?: string;
  investmentTypeRef?: string;
  investmentStakeTypeRef?: string;
  ownerEmployee?: {
    id: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
  };
  investmentAccount?: {
    id: string;
    name: string;
  };
  initialInvestmentAmount?: number;
  version?: number;
  
  // Group-specific data
  equityInvestment?: {
    id: string;
    marketValue?: number;
    turnoverAmount?: number;
    ebitdaAmount?: number;
    foundationDate?: string;
    version?: number;
  };
  
  realEstateInvestment?: {
    id: string;
    numberOfUnits?: number;
    buildingYear?: string;
    countryRef?: string;
    regionRef?: string;
    addressLine?: any;
    postalCode?: string;
    locality?: string;
    size?: number;
    sizeMeasurementUnitRef?: string;
    occupancyPercent?: number;
    annualNetColdRent?: number;
    funding?: number;
    actualAnnualExpenses?: number;
    targetAnnualExpenses?: number;
    liquidityForecast?: any;
    investment?: string;
    version?: number;
  };
  
  liquidFundInvestment?: {
    id: string;
    investmentLiquidFundTypeRef?: string;
    proprietorName?: string;
    bankName?: string;
    bankAccountNumber?: string;
    earlyTerminationAllowed?: boolean;
    interestRate?: number;
    interestPaymentFrequencyRef?: string;
    maturityDate?: string;
    version?: number;
  };
}

/**
 * Transform GraphQL investment data to form data
 */
export const transformInvestmentDataToForm = (data: InvestmentQueryData): InvestmentFormData => {
  const formData: InvestmentFormData = {
    // Main investment data
    investment: {
      id: data.id,
      version: data.version,
      name: data.name || '',
      initialInvestmentAmount: data.initialInvestmentAmount || '',
      investmentGroupRef: data.investmentGroupRef || '',
      ownerEmployee: data.ownerEmployee?.id || '',
      investmentTypeRef: data.investmentTypeRef,
      investmentStakeTypeRef: data.investmentStakeTypeRef,
      investmentAccount: data.investmentAccount?.id,
      // Include any additional fields that might be available in the data
      ...(data as any),
    },
  };

  // Add equity-specific data if present
  if (data.equityInvestment) {
    formData.equityInvestment = {
      id: data.equityInvestment.id,
      version: data.equityInvestment.version,
      foundationDate: data.equityInvestment.foundationDate,
      marketValue: data.equityInvestment.marketValue,
      turnoverAmount: data.equityInvestment.turnoverAmount,
      ebitdaAmount: data.equityInvestment.ebitdaAmount,
    };
  }

  // Add real estate-specific data if present
  if (data.realEstateInvestment) {
    formData.realEstateInvestment = {
      id: data.realEstateInvestment.id,
      version: data.realEstateInvestment.version,
      countryRef: data.realEstateInvestment.countryRef,
      regionRef: data.realEstateInvestment.regionRef,
      addressLine: data.realEstateInvestment.addressLine,
      postalCode: data.realEstateInvestment.postalCode,
      locality: data.realEstateInvestment.locality,
      buildingYear: data.realEstateInvestment.buildingYear,
      size: data.realEstateInvestment.size,
      sizeMeasurementUnitRef: data.realEstateInvestment.sizeMeasurementUnitRef,
      numberOfUnits: data.realEstateInvestment.numberOfUnits,
      occupancyPercent: data.realEstateInvestment.occupancyPercent,
      annualNetColdRent: data.realEstateInvestment.annualNetColdRent,
      funding: data.realEstateInvestment.funding,
      actualAnnualExpenses: data.realEstateInvestment.actualAnnualExpenses,
      targetAnnualExpenses: data.realEstateInvestment.targetAnnualExpenses,
      liquidityForecast: data.realEstateInvestment.liquidityForecast,
      investment: data.realEstateInvestment.investment,
    };
  }

  // Add liquid fund-specific data if present
  if (data.liquidFundInvestment) {
    formData.liquidFundInvestment = {
      id: data.liquidFundInvestment.id,
      version: data.liquidFundInvestment.version,
      investmentLiquidFundTypeRef: data.liquidFundInvestment.investmentLiquidFundTypeRef,
      proprietorName: data.liquidFundInvestment.proprietorName,
      bankName: data.liquidFundInvestment.bankName,
      bankAccountNumber: data.liquidFundInvestment.bankAccountNumber,
      earlyTerminationAllowed: data.liquidFundInvestment.earlyTerminationAllowed,
      interestRate: data.liquidFundInvestment.interestRate,
      interestPaymentFrequencyRef: data.liquidFundInvestment.interestPaymentFrequencyRef,
      maturityDate: data.liquidFundInvestment.maturityDate,
    };
  }

  return formData;
};

/**
 * Get investment group from form data or additional data
 */
export const getInvestmentGroupFromContext = (additionalData?: Record<string, any>): string | undefined => {
  // Check for investmentGroup in multiple possible locations
  // 1. Top level (direct pass-through)
  // 2. psi_taskPayload.psi_initialParameters (process payload)
  const group = additionalData?.investmentGroup || 
                additionalData?.psi_taskPayload?.psi_initialParameters?.investmentGroup;
  
  if (group) {
    // If already in catalog ID format (e.g., "InvestmentGroup:v1:EQUITY"), return as-is
    if (typeof group === 'string' && group.includes('InvestmentGroup:v1:')) {
      return group;
    }
    
    // Otherwise, convert shorthand to full reference
    const groupUpper = String(group).toUpperCase();
    switch (groupUpper) {
      case 'EQUITY':
        return 'InvestmentGroup:v1:EQUITY';
      case 'REAL_ESTATE':
      case 'REAL-ESTATE':
        return 'InvestmentGroup:v1:REAL_ESTATE';
      case 'LIQUID_FUND':
      case 'LIQUID-FUND':
        return 'InvestmentGroup:v1:LIQUID_FUND';
      default:
        return undefined;
    }
  }

  return undefined;
};
