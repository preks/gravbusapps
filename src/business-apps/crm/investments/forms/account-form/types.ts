import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

export interface Address {
  id: string; // Unique identifier for the address
  addressType: string; // "PRIMARY_ADDRESS", "SECONDARY_ADDRESS", "UNKNOWN_ADDRESS", etc.
  addressLines: string[]; // Dynamic array of address lines (stored in additional properties)
  postalCode: string;
  locality: string; // City field (renamed to match API)
  regionRef: string; // Region catalog reference ID
  countryRef: string; // Country catalog reference ID
}

// Address Type enum values based on API model
export const ADDRESS_TYPE_OPTIONS = [
  {
    value: "UNKNOWN_ADDRESS",
    label:
      typeof window === "undefined"
        ? "Unknown Address"
        : getTranslationFromI18nKeyAndLabel(
            "address.type.unknown",
            "Unknown Address"
          ),
  },
  {
    value: "PRIMARY_ADDRESS",
    label:
      typeof window === "undefined"
        ? "Primary Address"
        : getTranslationFromI18nKeyAndLabel(
            "address.type.primary",
            "Primary Address"
          ),
  },
  {
    value: "SECONDARY_ADDRESS",
    label:
      typeof window === "undefined"
        ? "Secondary Address"
        : getTranslationFromI18nKeyAndLabel(
            "address.type.secondary",
            "Secondary Address"
          ),
  },
] as const;

export interface AccountFormValues {
  // Account Information
  owner: string;

  // Company Information
  accountName: string;
  parentAccount: string;
  legalForm: string;
  industry: string;
  website: string;
  description: string;

  // ✅ REMOVED: Campaign Information - not relevant for InvestmentAccount
  // salesCampaignId: string; // Campaign ID for backend

  // Contact Information
  phone: string;
  email: string;
  // ✅ REMOVED: fax: string; // Not available in InvestmentAccount schema

  // Geographic Presence (simplified for InvestmentAccount)
  geographicPresence: string;

  // Address Information (updated to match API model)
  addresses: Address[]; // Array of addresses with proper structure
  
  // Legacy fields kept for form compatibility but made optional
  country?: string;
  region?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  addressLine4?: string;
  postalCode?: string;
  city?: string;

  // Financial Information
  annualRevenue: string;
  numberOfEmployees: string;
  // ✅ REMOVED: currency: string; // Not available in InvestmentAccount schema

  // Additional Information
  foundationDate: string;
  tickerSymbol: string;
  // ✅ REMOVED: sicCode: string; // Not available in InvestmentAccount schema

  // System fields
  id?: string;
  version?: number;

  // Legacy fields for backward compatibility
  address?: string;
  state?: string;
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
  };
}

export interface AccountContextState {
  // Loading states
  isLoading: boolean;
  error: string | null;

  // Data collections
  employeePositions: SelectOption[];
  legalForms: SelectOption[];
  industries: SelectOption[];
  countries: SelectOption[];
  // ✅ REMOVED: currencies: SelectOption[]; // Not available in InvestmentAccount schema
  numberOfEmployeesOptions: SelectOption[];
}
