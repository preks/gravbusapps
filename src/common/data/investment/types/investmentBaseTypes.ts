// Base types that match GraphQL responses exactly for core investment entities
// These should match the DBML schema exactly without any computed fields
import type { CatalogEntry, BaseEntity } from '@/common/network/graphql/commonTypes';
import type { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes';
import type { InvestmentAccountRef, InvestmentOpportunityRef, InvestmentRef } from './investmentRelationBaseTypes';
import type { ReportScope } from './investmentEnums';

// InvestmentRef is now imported from investmentRelationBaseTypes.ts to avoid circular dependencies

// =====================================================
// CORE INVESTMENT ENTITIES (from DBML)
// =====================================================

// investment table (Domain Specific Models)
export interface BaseInvestment extends BaseEntity {
  id: string;
  code?: string;
  name: string;
  isin?: string;

  // Catalog references
  investmentGroup?: CatalogEntry;
  investmentType?: CatalogEntry;
  investmentStakeType?: CatalogEntry;
  investmentPhase?: CatalogEntry;
  investmentStatus?: CatalogEntry;
  investmentRiskLevel?: CatalogEntry;
  currency?: CatalogEntry;

  // Entity references (using Ref types)
  investmentAccount?: InvestmentAccountRef;
  investmentOpportunity?: InvestmentOpportunityRef;
  ownerEmployee?: EmployeeRef;
  loanRecipientInvestmentAccount?: InvestmentAccountRef;

  // Investment fields
  acquisitionDate?: string; // ISO date string
  planedExit?: boolean;
  plannedExitDate?: string; // ISO date string
  exitDate?: string; // ISO date string

  initialInvestmentAmount?: number;
  totalInvestmentAmount?: number;
  investmentMarketValue?: number;
  debtFinancingAmount?: number;
  requiredCapitalAmount?: number;
  forecastedRevenueAmount?: number;
  forecastedProfitAmount?: number;
  stakePercentage?: number;
  // Added fields returned by queries
  loanRecipientName?: string;
  loanAmount?: number;
  loanOpenCommitmentAmount?: number;
  loanInterestRate?: number;
  loanStartDate?: string; // ISO date string
  loanEndDate?: string; // ISO date string
  loanInterestClaim?: number;

  totalCommitmentAmount?: number;
  totalDistributionAmount?: number;

  fundManagerName?: string;
  identification?: any; // Jsonb
  additionalProperties?: any; // Jsonb - stores custom tile data and other additional information
}

// investment_role table
export interface BaseInvestmentRole extends BaseEntity {
  id: string;
  displayOrder?: number;

  // Catalog references
  investmentRole?: CatalogEntry;

  // Entity references (using Ref types)  
  investment?: InvestmentRef;
}

// investment_report table
export interface BaseInvestmentReport extends BaseEntity {
  id: string;
  date?: string; // ISO date string
  scope?: ReportScope;

  // Catalog references
  investmentStakeType?: CatalogEntry;
  investmentPhase?: CatalogEntry;
  investmentStatus?: CatalogEntry;
  investmentRiskLevel?: CatalogEntry;
  currency?: CatalogEntry;

  // Entity references (using Ref types)
  investment?: InvestmentRef;
  loanRecipientInvestmentAccount?: InvestmentAccountRef;

  // Report fields (from investment table)
  plannedExitDate?: string; // ISO date string
  totalInvestmentAmount?: number;
  investmentMarketValue?: number;
  debtFinancingAmount?: number;
  requiredCapitalAmount?: number;
  forecastedRevenueAmount?: number;
  forecastedProfitAmount?: number;
  stakePercentage?: number;

  loanRecipientName?: string;
  loanAmount?: number;
  loanOpenCommitmentAmount?: number;
  loanInterestRate?: number;
  loanStartDate?: string; // ISO date string
  loanEndDate?: string; // ISO date string
  loanInterestClaim?: number;

  totalCommitmentAmount?: number;
  totalDistributionAmount?: number;

  fundManagerName?: string;
  identification?: any; // Jsonb
  
  // Specific report type relationships
  equityInvestmentReport?: BaseEquityInvestmentReport[];
  liquidFundInvestmentReport?: BaseLiquidFundInvestmentReport[];
  realEstateInvestmentReport?: BaseRealEstateInvestmentReport[];
  investmentRoleReport?: BaseInvestmentRoleReport[];
}

// investment_role_report table
export interface BaseInvestmentRoleReport extends BaseEntity {
  id: string;
  displayOrder?: number;

  // Catalog references
  investmentRole?: CatalogEntry;

  // Entity references (using Ref types)
  investmentReport?: BaseInvestmentReport;
}

// investment_transaction table
export interface BaseInvestmentTransaction extends BaseEntity {
  id: string;
  code?: string;
  date?: string; // ISO date string
  amount?: number;
  comment?: string;

  // Catalog references
  investmentTransactionType?: CatalogEntry;
  currency?: CatalogEntry;

  // Entity references (using Ref types)
  investment?: InvestmentRef;
}

// equity_investment table
export interface BaseEquityInvestment extends BaseEntity {
  id: string;
  foundationDate?: string; // ISO date string
  marketValue?: number;
  turnoverAmount?: number;
  ebitdaAmount?: number;

  // Entity references (using Ref types)
  investment?: InvestmentRef;
}

// equity_investment_report table
export interface BaseEquityInvestmentReport extends BaseEntity {
  id: string;
  date?: string; // ISO date string
  scope?: ReportScope;
  marketValue?: number;
  turnoverAmount?: number;
  ebitdaAmount?: number;

  // Entity references (using Ref types)
  equityInvestment?: BaseEquityInvestment;
}

// equity_investment_round table
export interface BaseEquityInvestmentRound extends BaseEntity {
  id: string;
  name?: string;
  year?: string; // ISO date string
  preValue?: number;
  investmentVolume?: number;
  volumeShare?: number;
  roundSharePercentage?: number;

  // Catalog references
  currency?: CatalogEntry;

  // Entity references (using Ref types)
  equityInvestment?: BaseEquityInvestment;
}

// real_estate_investment table
export interface BaseRealEstateInvestment extends BaseEntity {
  id: string;

  // Address Information
  addressLine?: any; // JsonB
  postalCode?: string;
  locality?: string;
  buildingYear?: string;
  size?: number;
  numberOfUnits?: number;
  occupancyPercent?: number;
  annualNetColdRent?: number;
  funding?: number;
  actualAnnualExpenses?: number;
  targetAnnualExpenses?: number;
  liquidityForecast?: any; // Jsonb

  // Catalog references
  country?: CatalogEntry;
  region?: CatalogEntry;
  sizeMeasurementUnit?: CatalogEntry;

  // Entity references (using Ref types)
  investment?: InvestmentRef;
}

// real_estate_investment_rental_unit table
export interface BaseRealEstateInvestmentRentalUnit extends BaseEntity {
  id: string;
  code?: string;
  name?: string;

  // Catalog references
  investmentRentalUnitType?: CatalogEntry;

  // Entity references (using Ref types)
  realEstate?: BaseRealEstateInvestment;
}

// real_estate_investment_report table
export interface BaseRealEstateInvestmentReport extends BaseEntity {
  id: string;
  date?: string; // ISO date string
  scope?: ReportScope;
  size?: number;
  numberOfUnits?: number;
  occupancyPercent?: number;
  annualNetColdRent?: number;
  funding?: number;
  actualAnnualExpenses?: number;
  targetAnnualExpenses?: number;
  liquidityForecast?: any; // Jsonb

  // Catalog references
  sizeMeasurementUnit?: CatalogEntry;

  // Entity references (using Ref types)
  realEstateInvestment?: BaseRealEstateInvestment;
}

// real_estate_investment_rental_unit_report table
export interface BaseRealEstateInvestmentRentalUnitReport extends BaseEntity {
  id: string;
  name?: string;

  // Catalog references
  investmentRentalUnitType?: CatalogEntry;

  // Entity references (using Ref types)
  realEstateInvestmentReport?: BaseRealEstateInvestmentReport;
}

// liquid_fund_investment table
export interface BaseLiquidFundInvestment extends BaseEntity {
  id: string;
  proprietorName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  earlyTerminationAllowed?: boolean;
  interestRate?: number;
  maturityDate?: string; // ISO date string

  // Catalog references
  investmentLiquidFundType?: CatalogEntry;
  interestPaymentFrequency?: CatalogEntry;

  // Entity references (using Ref types)
  investment?: InvestmentRef;
}

// liquid_fund_investment_report table
export interface BaseLiquidFundInvestmentReport extends BaseEntity {
  id: string;
  date?: string; // ISO date string
  scope?: ReportScope;
  proprietorName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  earlyTerminationAllowed?: boolean;
  interestRate?: number;
  maturityDate?: string; // ISO date string

  // Catalog references
  investmentLiquidFundType?: CatalogEntry;
  interestPaymentFrequency?: CatalogEntry;

  // Entity references (using Ref types)
  liquidFundInvestment?: BaseLiquidFundInvestment;
}

// =====================================================
// QUERY RESPONSE INTERFACES
// =====================================================

// Response interfaces moved to hooks files where they're used

// For list queries, we expect arrays (what makes sense for lists)
export interface InvestmentData {
  items: BaseInvestment[]; // Base type - enhanced type is defined in investmentTypes.ts
  total: number;
  pageInfo?: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Raw GraphQL response interface (what GraphQL actually returns - always arrays)
export interface InvestmentGraphQLResponse {
  Investment: BaseInvestment[]; // Even for ID queries, GraphQL returns array (0 or 1 items)
  InvestmentAggregate?: {
    aggregate: {
      count: number;
    };
  };
}