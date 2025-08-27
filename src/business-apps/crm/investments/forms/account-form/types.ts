export interface Address {
  id: string; // Unique identifier for the address
  addressType: string; // "BILLING", "SHIPPING", "OFFICE", "UNKNOWN_ADDRESS", etc.
  addressLines: string[]; // Dynamic array of address lines
  postalCode: string;
  city: string;
  region: string;
  country: string;
}

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

  // ✅ REMOVED: Complex address handling - InvestmentAccount only has geographicPresence field
  // Legacy fields kept for form compatibility but not used in payload
  country?: string;
  region?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  addressLine4?: string;
  postalCode?: string;
  city?: string;
  addresses?: Address[]; // Dynamic addresses array - not used

  // Financial Information
  annualRevenue: string;
  numberOfEmployees: string;
  // ✅ REMOVED: currency: string; // Not available in InvestmentAccount schema

  // Additional Information
  timeZone: string; // ✅ RESTORED: Available in InvestmentAccount schema as timeZoneRef
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
  timeZones: SelectOption[]; // ✅ RESTORED: Available in InvestmentAccount schema as timeZoneRef
  numberOfEmployeesOptions: SelectOption[];
}
