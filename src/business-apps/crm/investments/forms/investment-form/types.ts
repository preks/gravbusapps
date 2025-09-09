import { InvestmentFormData } from '@/common/data/investment/payloads/investmentPayloads';

// Re-export the form data interface for backwards compatibility
export interface InvestmentFormValues extends InvestmentFormData {}

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
  // Note: accounts now accessed via centralized fetchInvestmentAccounts function
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
