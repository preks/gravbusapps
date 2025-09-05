export interface InvestmentFormValues {
  // Investment Information
  ownerEmployeeId: string;
  name: string;
  accountId: string;
  initialInvestmentAmount: number | string;
  group: string;

  // Equity Information (only for EQUITY type)
  equityInvestmentId?: string;
  equityInvestmentVersion?: number | string;
  equityRole?: string;
  currentCompanyValue?: number | string;
  lastReportedTurnover?: number | string;
  lastReportedEbitda?: number | string;


  // Real Estate Information (only for REAL_ESTATE type)
  realEstateInvestmentId?: string;
  realEstateInvestmentVersion?: number | string;
  realEstateTypeRef?: string;
  investmentOwnershipStructureRef?: string;
  numberOfUnits?: number | string;
  buildingYear?: number | string;

  // Liquid Fund Information (only for LIQUID_FUND type)
  liquidFundInvestmentId?: string;
  liquidFundInvestmentVersion?: number | string;
  accountNumber?: string;
  earlyTerminationAllowed?: boolean;
  interestRate?: number | string;
  interestPaymentFrequencyRef?: string;
  maturityDate?: string;

  // System fields
  id?: string;
  version?: number;
}

export interface SelectOption {
  id: string | number;
  value: string;
  label: string;
  name: string;
  extraInfo?: {
    email?: string;
    phone?: string;
    picture?: string | null;
    pictureThumbnail?: string | null;
    jobPosition?: string;
    organizationalUnit?: string;
    userId?: string | null;
    department?: string;
    position?: string;
  };
}

export interface InvestmentContextState {
  // Loading states
  isLoading: boolean;
  error: string | null;

  // Data collections
  investmentGroups: SelectOption[];
  employeePositions: SelectOption[];
  accounts: SelectOption[];
}

export interface InvestmentApiPayload {
  id?: string;
  sourceApp?: string;
  ownerEmployeeId: string;
  name: string;
  accountId: string;
  initialInvestmentAmount: number;
  group: string;
  version?: number;
}

export interface InvestmentApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}
