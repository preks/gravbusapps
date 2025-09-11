import { InvestmentFormData } from '@/common/data/investment/payloads/investmentPayloads';

// Interface for the GraphQL investment data response (from existing queries)
export interface InvestmentQueryData {
  id: string;
  accountId: string;
  account?: {
    id: string;
    name: string;
  };
  name: string;
  investmentGroupRef?: string;
  investmentTypeRef?: string;
  ownerEmployeeId?: string;
  ownerEmployee?: {
    id: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
  };
  initialInvestmentAmount?: number;
  version?: number;
  
  // Group-specific data
  equityInvestment?: {
    id: string;
    investmentRoleRef?: string;
    currentCompanyValuation?: number;
    lastReportedTurnover?: number;
    lastReportedEbitda?: number;
    version?: number;
  };
  
  realEstateInvestment?: {
    id: string;
    realEstateTypeRef?: string;
    investmentOwnershipStructureRef?: string;
    numberOfUnits?: number;
    buildingYear?: number;
    version?: number;
  };
  
  privateEquityInvestment?: {
    id: string;
    investmentRoleRef?: string;
    version?: number;
  };
  
  liquidFundInvestment?: {
    id: string;
    accountNumber?: string;
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
    // Base investment data
    id: data.id,
    version: data.version,
    ownerEmployeeId: data.ownerEmployeeId || '',
    name: data.name || '',
    accountId: data.accountId || '',
    initialInvestmentAmount: data.initialInvestmentAmount || '',
    group: data.investmentGroupRef || '',
    investmentTypeRef: data.investmentTypeRef || '',
  };

  // Add equity-specific data if present
  if (data.equityInvestment) {
    formData.equityInvestmentId = data.equityInvestment.id;
    formData.equityInvestmentVersion = data.equityInvestment.version;
    // Match dynamic field names by last segment from catalog JSON
    formData.investmentRoleRef = data.equityInvestment.investmentRoleRef || '';
    formData.marketValue = data.equityInvestment.currentCompanyValuation || '';
    formData.turnoverAmount = data.equityInvestment.lastReportedTurnover || '';
    formData.ebitdaAmount = data.equityInvestment.lastReportedEbitda || '';
  }

  // Add real estate-specific data if present
  if (data.realEstateInvestment) {
    formData.realEstateInvestmentId = data.realEstateInvestment.id;
    formData.realEstateInvestmentVersion = data.realEstateInvestment.version;
    formData.realEstateTypeRef = data.realEstateInvestment.realEstateTypeRef || '';
    formData.investmentOwnershipStructureRef = data.realEstateInvestment.investmentOwnershipStructureRef || '';
    formData.numberOfUnits = data.realEstateInvestment.numberOfUnits || '';
    formData.buildingYear = data.realEstateInvestment.buildingYear || '';
    // Additional real estate fields
    // If present in response, map using last segment names
    // @ts-expect-error optional specialization fields
    if ((data.realEstateInvestment as any).annualNetColdRent !== undefined) {
      // @ts-expect-error
      formData.annualNetColdRent = (data.realEstateInvestment as any).annualNetColdRent || '';
    }
    // @ts-expect-error
    if ((data.realEstateInvestment as any).actualAnnualExpenses !== undefined) {
      // @ts-expect-error
      formData.actualAnnualExpenses = (data.realEstateInvestment as any).actualAnnualExpenses || '';
    }
    // @ts-expect-error
    if ((data.realEstateInvestment as any).targetAnnualExpenses !== undefined) {
      // @ts-expect-error
      formData.targetAnnualExpenses = (data.realEstateInvestment as any).targetAnnualExpenses || '';
    }
    // @ts-expect-error
    if ((data.realEstateInvestment as any).occupancyPercent !== undefined) {
      // @ts-expect-error
      formData.occupancyPercent = (data.realEstateInvestment as any).occupancyPercent || '';
    }
    // @ts-expect-error
    if ((data.realEstateInvestment as any).size !== undefined) {
      // @ts-expect-error
      formData.size = (data.realEstateInvestment as any).size || '';
    }
  }

  // Add private equity-specific data if present
  if (data.privateEquityInvestment) {
    formData.privateEquityInvestmentId = data.privateEquityInvestment.id;
    formData.privateEquityInvestmentVersion = data.privateEquityInvestment.version;
    formData.investmentRoleRef = data.privateEquityInvestment.investmentRoleRef || '';
  }

  // Add liquid fund-specific data if present
  if (data.liquidFundInvestment) {
    formData.liquidFundInvestmentId = data.liquidFundInvestment.id;
    formData.liquidFundInvestmentVersion = data.liquidFundInvestment.version;
    // Match last segment names used by JSON
    formData.bankAccountNumber = data.liquidFundInvestment.accountNumber || '';
    formData.earlyTerminationAllowed = data.liquidFundInvestment.earlyTerminationAllowed || false;
    formData.interestRate = data.liquidFundInvestment.interestRate || '';
    formData.interestPaymentFrequencyRef = data.liquidFundInvestment.interestPaymentFrequencyRef || '';
    formData.maturityDate = data.liquidFundInvestment.maturityDate || '';
    // Optional additional fields
    // @ts-expect-error
    if ((data.liquidFundInvestment as any).bankName) {
      // @ts-expect-error
      formData.bankName = (data.liquidFundInvestment as any).bankName;
    }
    // @ts-expect-error
    if ((data.liquidFundInvestment as any).investmentLiquidFundTypeRef) {
      // @ts-expect-error
      formData.investmentLiquidFundTypeRef = (data.liquidFundInvestment as any).investmentLiquidFundTypeRef;
    }
  }

  return formData;
};

/**
 * Get investment group from form data or additional data
 */
export const getInvestmentGroupFromContext = (additionalData?: Record<string, any>): string | undefined => {
  // Check for investmentGroupRef in additionalData
  if (additionalData?.investmentGroupRef) {
    return additionalData.investmentGroupRef;
  }

  // Check for shorthand group type and convert to full reference
  if (additionalData?.investmentGroup) {
    const group = additionalData.investmentGroup.toUpperCase();
    switch (group) {
      case 'EQUITY':
        return 'InvestmentGroup:v1:EQUITY';
      case 'REAL_ESTATE':
      case 'REAL-ESTATE':
        return 'InvestmentGroup:v1:REAL_ESTATE';
      case 'LIQUID_FUND':
      case 'LIQUID-FUND':
        return 'InvestmentGroup:v1:LIQUID_FUND';
      case 'PRIVATE_EQUITY':
        return 'InvestmentGroup:v1:PRIVATE_EQUITY';
      default:
        return undefined;
    }
  }

  return undefined;
};
