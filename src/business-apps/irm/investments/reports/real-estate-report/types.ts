export interface RealEstateInvestmentSummary {
  id: string;
  investmentId: string;
  realEstateTypeRef?: string;
  realEstateType?: {
    id: string;
    value: string;
  };
  countryRef?: string;
  country?: {
    id: string;
    value: string;
  };
  regionRef?: string;
  region?: {
    id: string;
    value: string;
  };
  addressLine?: string;
  postalCode?: string;
  city?: string;
  investmentOwnershipStructureRef?: string;
  investmentOwnershipStructure?: {
    id: string;
    value: string;
  };
  numberOfUnits?: number;
  buildingYear?: string;
  occupancyPercent?: number;
  annualExpenses?: number;
  size?: number;
  activeFrom?: string;
  activeTo?: string;
  createdAt?: string;
  
  // From Investment table
  investment: {
    id: string;
    name: string;
    accountId: string;
    opportunityId?: string;
    ownerEmployeeId: string;
    acquisitionDate?: string;
    exitDate?: string;
    plannedExitDate?: string;
    bookValue?: number;
    marketValue?: number;
    initialInvestmentAmount?: number;
    totalInvestmentAmount?: number;
    stakePercent?: number;
    debtFinancing?: number;
    leverageRatio?: number;
    notesSummary?: string;
    investmentGroup?: {
      id: string;
      value: string;
    };
    investmentType?: {
      id: string;
      value: string;
    };
    investmentPhase?: {
      id: string;
      value: string;
    };
    investmentStatus?: {
      id: string;
      value: string;
    };
    investmentRiskLevel?: {
      id: string;
      value: string;
    };
    currency?: {
      id: string;
      value: string;
    };
    account?: {
      id: string;
      name: string;
    };
    opportunity?: {
      id: string;
      name: string;
    };
  };
}

export interface RealEstateInvestmentKPIs {
  totalPropertyValue: number;
  averageOccupancyRate: number;
  totalUnits: number;
  totalAnnualExpenses: number;
}

export interface RealEstateInvestmentQueryVariables {
  limit?: number;
  offset?: number;
  search?: string;
  orderBy?: any;
}

export interface RealEstateInvestmentResponse {
  RealEstateInvestment: RealEstateInvestmentSummary[];
  RealEstateInvestmentAggregate: {
    aggregate: {
      count: number;
      sum: {
        numberOfUnits: number | null;
        occupancyPercent: number | null;
        annualExpenses: number | null;
      };
      avg: {
        numberOfUnits: number | null;
        occupancyPercent: number | null;
        annualExpenses: number | null;
      };
    };
  };
} 