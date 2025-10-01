import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { toISOFormat } from '@/common/utils/dateFormatter';

// ==============================
// Investment Payload Types
// ==============================

export interface InvestmentFormData {
  // Common investment fields
  id?: string;
  version?: number;
  ownerEmployeeId: string;
  name: string;
  accountId: string;
  contactId?: string; // Related contact
  initialInvestmentAmount: number | string;
  group: string; // Used for determining group type
  investmentGroupRef?: string; // The full catalog reference
  
  // Additional investment fields
  acquisitionDate?: string;
  currencyRef?: string;
  debtFinancingAmount?: number | string;
  exitDate?: string;
  fundManagerName?: string;
  investmentTypeRef?: string;
  
  // Investment type-specific fields at Investment level
  plannedExitDate?: string;
  stakePercentage?: number | string;
  requiredCapitalAmount?: number | string;
  totalCommitmentAmount?: number | string;
  totalDistributionAmount?: number | string;
  totalInvestmentAmount?: number | string;
  investmentMarketValue?: number | string;
  
  // Mezzanine Loan fields (at Investment level)
  loanRecipientName?: string;
  loanRecipientInvestmentAccountId?: string;
  loanAmount?: number | string;
  loanOpenCommitmentAmount?: number | string;
  loanInterestRate?: number | string;
  loanStartDate?: string;
  loanEndDate?: string;
  loanInterestClaim?: number | string;

  // Equity specific fields
  equityInvestmentId?: string;
  equityInvestmentVersion?: number | string;
  equityRole?: string;
  currentCompanyValue?: number | string;
  lastReportedTurnover?: number | string;
  lastReportedEbitda?: number | string;
  foundationDate?: string;
  marketValue?: number | string;

  // Private Equity specific fields
  privateEquityInvestmentId?: string;
  privateEquityInvestmentVersion?: number | string;
  privateEquityRole?: string;

  // Real Estate specific fields
  realEstateInvestmentId?: string;
  realEstateInvestmentVersion?: number | string;
  realEstateTypeRef?: string;
  investmentOwnershipStructureRef?: string;
  numberOfUnits?: number | string;
  buildingYear?: number | string;
  addressLine?: string;
  countryRef?: string;
  locality?: string;
  annualNetColdRent?: number | string;
  
  // Additional Real Estate fields from schema
  size?: number | string;
  sizeMeasurementUnitRef?: string;
  occupancyPercent?: number | string;
  targetAnnualExpenses?: number | string;
  forecastedRevenue?: number | string;
  forecastedProfit?: number | string;

  // Liquid Fund specific fields
  liquidFundInvestmentId?: string;
  liquidFundInvestmentVersion?: number | string;
  accountNumber?: string;
  earlyTerminationAllowed?: boolean;
  interestRate?: number | string;
  interestPaymentFrequencyRef?: string;
  maturityDate?: string;
  bankAccountNumber?: string;
  bankName?: string;
  investmentLiquidFundTypeRef?: string;

  // Support for dynamic additional properties fields
  // These fields are dynamically generated from the catalog with additionalProperties_ prefix
  [key: string]: any; // Allow dynamic additional properties fields
}

// ==============================
// Investment Payload Builder
// ==============================

export const buildInvestmentPayload = (
  investment: InvestmentFormData,
  _businessAppContext: BusinessAppContextProps,
  options: { isUpdate?: boolean; rawInvestmentData?: any } = {}
) => {
  const { rawInvestmentData } = options;
  
  // Helper to convert string/number to number
  const toNumber = (value: number | string | undefined): number | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? undefined : num;
  };

  // Helper to extract and build additionalProperties object from form data
  const buildAdditionalProperties = (formData: any, _entityPrefix: string): Record<string, any> | undefined => {
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

  // Extract investment-level additionalProperties
  const investmentAdditionalProperties = buildAdditionalProperties(investment, 'investment');

  
  // Base investment payload
  const baseInvestmentPayload: any = {
    ownerEmployee: investment.ownerEmployeeId,
    name: investment.name,
    ...(investment.accountId && { investmentAccount: investment.accountId }), // Only include if not empty
    ...(investment.contactId && { contactId: investment.contactId }), // Only include if not empty
    initialInvestmentAmount: toNumber(investment.initialInvestmentAmount),
    
    // Investment group reference (required)
    investmentGroupRef: investment.investmentGroupRef || investment.group, // Use explicit ref or construct from group
    
    // Always set status to ACTIVE for new investments
    ...(!options.isUpdate && { investmentStatusRef: 'InvestmentStatus:v1:ACTIVE' }),
    
    // Additional investment fields
    ...(investment.acquisitionDate && { acquisitionDate: toISOFormat(investment.acquisitionDate) }),
    ...(investment.currencyRef && { currencyRef: investment.currencyRef }),
    ...(investment.debtFinancingAmount && { debtFinancingAmount: toNumber(investment.debtFinancingAmount) }),
    ...(investment.exitDate && { exitDate: toISOFormat(investment.exitDate) }),
    ...(investment.fundManagerName && { fundManagerName: investment.fundManagerName }),
    ...(investment.investmentTypeRef && { investmentTypeRef: investment.investmentTypeRef }),
    
    // Investment type-specific fields at Investment level
    ...(investment.plannedExitDate && { plannedExitDate: toISOFormat(investment.plannedExitDate) }),
    ...(investment.stakePercentage && { stakePercentage: toNumber(investment.stakePercentage) }),
    ...(investment.requiredCapitalAmount && { requiredCapitalAmount: toNumber(investment.requiredCapitalAmount) }),
    ...(investment.totalCommitmentAmount && { totalCommitmentAmount: toNumber(investment.totalCommitmentAmount) }),
    ...(investment.totalDistributionAmount && { totalDistributionAmount: toNumber(investment.totalDistributionAmount) }),
    ...(investment.totalInvestmentAmount && { totalInvestmentAmount: toNumber(investment.totalInvestmentAmount) }),
    ...(investment.investmentMarketValue && { investmentMarketValue: toNumber(investment.investmentMarketValue) }),
    
    // Mezzanine Loan fields (at Investment level)
    ...(investment.loanRecipientName && { loanRecipientName: investment.loanRecipientName }),
    ...(investment.loanRecipientInvestmentAccountId && { loanRecipientInvestmentAccount: investment.loanRecipientInvestmentAccountId }),
    ...(investment.loanAmount && { loanAmount: toNumber(investment.loanAmount) }),
    ...(investment.loanOpenCommitmentAmount && { loanOpenCommitmentAmount: toNumber(investment.loanOpenCommitmentAmount) }),
    ...(investment.loanInterestRate && { loanInterestRate: toNumber(investment.loanInterestRate) }),
    ...(investment.loanStartDate && { loanStartDate: toISOFormat(investment.loanStartDate) }),
    ...(investment.loanEndDate && { loanEndDate: toISOFormat(investment.loanEndDate) }),
    ...(investment.loanInterestClaim && { loanInterestClaim: toNumber(investment.loanInterestClaim) }),
    
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
  const groupRef = investment.investmentGroupRef || investment.group;
  if (!groupRef) {
    throw new Error('Investment group is required but not provided');
  }

  const groupType = getGroupType(groupRef);
  
  if (!groupType) {
    throw new Error(`Invalid investment group format: ${groupRef}`);
  }

  // Build the investment request wrapper
  const investmentRequest: any = {
    investment: baseInvestmentPayload,
  };

  // Add group-specific data based on the investment type
  switch (groupType) {
    case 'EQUITY':
      // Always create equityInvestment object (required by API)
      // Start with existing data and override with form changes
      const existingEquity = rawInvestmentData?.equityInvestment || {};
      const equityAdditionalProperties = buildAdditionalProperties(investment, 'equityInvestment');
      
      investmentRequest.equityInvestment = {
        // Preserve all existing data
        ...existingEquity,
        // Override with form changes (only if provided)
        ...(investment.equityRole !== undefined && { investmentRoleRef: investment.equityRole }),
        ...(investment.currentCompanyValue !== undefined && { currentCompanyValuation: toNumber(investment.currentCompanyValue) }),
        ...(investment.lastReportedTurnover !== undefined && { lastReportedTurnover: toNumber(investment.lastReportedTurnover) }),
        ...(investment.lastReportedEbitda !== undefined && { lastReportedEbitda: toNumber(investment.lastReportedEbitda) }),
        ...(investment.foundationDate !== undefined && { foundationDate: toISOFormat(investment.foundationDate) }),
        ...(investment.marketValue !== undefined && { marketValue: toNumber(investment.marketValue) }),
        // Additional properties as JSON string
        ...(equityAdditionalProperties && { additionalProperties: equityAdditionalProperties }),
        // Always include id and version for updates (these should not be overridden by form)
        ...(options.isUpdate && existingEquity.id && { 
          id: existingEquity.id,
          version: existingEquity.version 
        }),
      };
      break;

    case 'PRIVATE_EQUITY':
      // Always create privateEquityInvestment object (required by API)
      // Start with existing data and override with form changes
      const existingPrivateEquity = rawInvestmentData?.privateEquityInvestment || {};
      const privateEquityAdditionalProperties = buildAdditionalProperties(investment, 'privateEquityInvestment');
      
      investmentRequest.privateEquityInvestment = {
        // Preserve all existing data
        ...existingPrivateEquity,
        // Override with form changes (only if provided)
        ...(investment.privateEquityRole !== undefined && { investmentRoleRef: investment.privateEquityRole }),
        // Additional properties as JSON string
        ...(privateEquityAdditionalProperties && { additionalProperties: privateEquityAdditionalProperties }),
        // Always include id and version for updates (these should not be overridden by form)
        ...(options.isUpdate && existingPrivateEquity.id && { 
          id: existingPrivateEquity.id,
          version: existingPrivateEquity.version 
        }),
      };
      break;

    case 'REAL_ESTATE':
      // Always create realEstateInvestment object (required by API)
      // Start with existing data and override with form changes
      const existingRealEstate = rawInvestmentData?.realEstateInvestment || {};
      const realEstateAdditionalProperties = buildAdditionalProperties(investment, 'realEstateInvestment');
      
      investmentRequest.realEstateInvestment = {
        // Preserve all existing data
        ...existingRealEstate,
        // Override with form changes (only if provided)
        ...(investment.realEstateTypeRef !== undefined && { realEstateTypeRef: investment.realEstateTypeRef }),
        ...(investment.investmentOwnershipStructureRef !== undefined && { investmentOwnershipStructureRef: investment.investmentOwnershipStructureRef }),
        ...(investment.numberOfUnits !== undefined && { numberOfUnits: toNumber(investment.numberOfUnits) }),
        ...(investment.buildingYear !== undefined && { buildingYear: toNumber(investment.buildingYear) }),
        ...(investment.addressLine !== undefined && { addressLine: investment.addressLine }),
        ...(investment.countryRef !== undefined && { countryRef: investment.countryRef }),
        ...(investment.locality !== undefined && { locality: investment.locality }),
        ...(investment.annualNetColdRent !== undefined && { annualNetColdRent: toNumber(investment.annualNetColdRent) }),
        ...(investment.size !== undefined && { size: toNumber(investment.size) }),
        ...(investment.sizeMeasurementUnitRef !== undefined && { sizeMeasurementUnitRef: investment.sizeMeasurementUnitRef }),
        ...(investment.occupancyPercent !== undefined && { occupancyPercent: toNumber(investment.occupancyPercent) }),
        ...(investment.targetAnnualExpenses !== undefined && { targetAnnualExpenses: toNumber(investment.targetAnnualExpenses) }),
        // Additional properties as JSON string
        ...(realEstateAdditionalProperties && { additionalProperties: realEstateAdditionalProperties }),
        // Always include id and version for updates (these should not be overridden by form)
        ...(options.isUpdate && existingRealEstate.id && { 
          id: existingRealEstate.id,
          version: existingRealEstate.version 
        }),
      };
      break;

    case 'LIQUID_FUND':
      // Always create liquidFundInvestment object (required by API)
      // Start with existing data and override with form changes
      const existingLiquidFund = rawInvestmentData?.liquidFundInvestment || {};
      const liquidFundAdditionalProperties = buildAdditionalProperties(investment, 'liquidFundInvestment');
      
      investmentRequest.liquidFundInvestment = {
        // Preserve all existing data
        ...existingLiquidFund,
        // Override with form changes (only if provided)
        ...(investment.accountNumber !== undefined && { accountNumber: investment.accountNumber }),
        ...(investment.earlyTerminationAllowed !== undefined && { earlyTerminationAllowed: investment.earlyTerminationAllowed }),
        ...(investment.interestRate !== undefined && { interestRate: toNumber(investment.interestRate) }),
        ...(investment.interestPaymentFrequencyRef !== undefined && { interestPaymentFrequencyRef: investment.interestPaymentFrequencyRef }),
        ...(investment.maturityDate !== undefined && { maturityDate: toISOFormat(investment.maturityDate) }),
        ...(investment.bankAccountNumber !== undefined && { bankAccountNumber: investment.bankAccountNumber }),
        ...(investment.bankName !== undefined && { bankName: investment.bankName }),
        ...(investment.investmentLiquidFundTypeRef !== undefined && { investmentLiquidFundTypeRef: investment.investmentLiquidFundTypeRef }),
        // Additional properties as JSON string
        ...(liquidFundAdditionalProperties && { additionalProperties: liquidFundAdditionalProperties }),
        // Always include id and version for updates (these should not be overridden by form)
        ...(options.isUpdate && existingLiquidFund.id && { 
          id: existingLiquidFund.id,
          version: existingLiquidFund.version 
        }),
      };
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

export const isPrivateEquityInvestment = (groupRef: string): boolean => {
  return getInvestmentGroupType(groupRef) === 'PRIVATE_EQUITY';
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
  PRIVATE_EQUITY: 'InvestmentGroup:v1:PRIVATE_EQUITY',
  REAL_ESTATE: 'InvestmentGroup:v1:REAL_ESTATE',
  LIQUID_FUND: 'InvestmentGroup:v1:LIQUID_FUND',
} as const;

export type InvestmentGroupType = keyof typeof INVESTMENT_GROUP_REFS;
