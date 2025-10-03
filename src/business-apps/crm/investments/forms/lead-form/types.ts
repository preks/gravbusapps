export interface Address {
  id: string; // Unique identifier for the address
  addressType: string; // "BILLING", "SHIPPING", "OFFICE", "UNKNOWN_ADDRESS", etc.
  addressLines: string[]; // Dynamic array of address lines
  postalCode: string;
  city: string;
  region: string;
  country: string;
}

export interface LeadFormValues {
  // Lead Information
  owner: string;
  leadStatus: string;
  leadSource: string;
  rating: string;

  // Contact Information
  salutation: string;
  academicTitle?: string; // ✅ ADDED: Academic title (PhD, MBA, etc.)
  firstName: string;
  lastName: string;
  jobPosition: string; // Replaces title
  phone: string;
  email: string;
  sensitive?: string | boolean; // ✅ ADDED: Sensitive data flag

  // Company Information
  legalForm: string;
  industry: string;
  company: string;
  website: string;
  companyEmail: string;
  companyPhone: string;
  numberOfEmployees: string;
  annualRevenue: string;

  // Campaign Information
  salesCampaignId: string; // Campaign ID for backend

  // Address Information (New dynamic structure)
  addresses: Address[];

  // Address Information - ✅ UPDATED: InvestmentLead fields
  country: string;
  region: string;
  addressLine: string; // Single address line (jsonb in InvestmentLead)
  locality: string; // City field in InvestmentLead
  postalCode: string;

  // Legacy fields for backward compatibility (can be removed eventually)
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  addressLine4?: string;
  city?: string;

  // Investment-Specific Fields
  investmentName: string;
  investmentGroup: string;
  investmentType: string;
  investmentRole: string;
  investmentStakeType: string;
  stakePercentage: string;
  marketValue: string;
  initialInvestmentAmount: string;
  loanAmount: string;
  loanInterestRate: string;
  requiredCapitalAmount: string;
  forecastedProfitAmount: string;
  annualNetColdRent: string;
  
  // Real Estate Specific Fields
  buildingYear: string;
  size: string;
  measurementUnit: string;


  // Conversion Information
  conversionDate?: string; // ✅ ADDED: Date when lead was converted
  convertedAccountId?: string; // ✅ ADDED: ID of converted account
  convertedContactId?: string; // ✅ ADDED: ID of converted contact
  convertedOpportunityId?: string; // ✅ ADDED: ID of converted opportunity

  // System fields
  id?: string;
  version?: number;

  // Legacy fields for backward compatibility
  followUp?: boolean;
  address?: string;
  state?: string;
  title?: string;
  accountId?: string; // Maps to convertedAccountId for InvestmentLead
  contactId?: string;
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

export interface LeadContextState {
  // Loading states
  isLoading: boolean;
  error: string | null;

  // Basic catalog collections
  leadSources: SelectOption[];
  leadStatuses: SelectOption[];
  leadRatings: SelectOption[];
  employeePositions: SelectOption[];
  legalForms: SelectOption[];
  industries: SelectOption[];
  countries: SelectOption[];
  regions: SelectOption[]; // ✅ ADDED: Regions catalog

  // ✅ ADDED: Contact information catalogs with searchable functionality
  salutations: SelectOption[];
  salutationsLoading: boolean;
  salutationsError: string | null;
  salutationsHasMore: boolean;
  salutationsNeedsMoreData: boolean;
  salutationsDisplayCount: number;
  salutationsTotalFetched: number;
  searchSalutations: (search: string) => void;
  loadMoreSalutations: () => void;
  showMoreSalutations: () => void;

  academicTitles: SelectOption[];
  academicTitlesLoading: boolean;
  academicTitlesError: string | null;
  academicTitlesHasMore: boolean;
  academicTitlesNeedsMoreData: boolean;
  academicTitlesDisplayCount: number;
  academicTitlesTotalFetched: number;
  searchAcademicTitles: (search: string) => void;
  loadMoreAcademicTitles: () => void;
  showMoreAcademicTitles: () => void;


  // Investment Types (Searchable)
  investmentTypesSearchable: SelectOption[];
  investmentTypesLoading: boolean;
  investmentTypesError: string | null;
  investmentTypesHasMore: boolean;
  investmentTypesNeedsMoreData: boolean;
  investmentTypesDisplayCount: number;
  investmentTypesTotalFetched: number;
  searchInvestmentTypes: (search: string) => void;
  loadMoreInvestmentTypes: () => void;
  showMoreInvestmentTypes: () => void;

  // Investment Groups (Searchable)
  investmentGroupsSearchable: SelectOption[];
  investmentGroupsLoading: boolean;
  investmentGroupsError: string | null;
  investmentGroupsHasMore: boolean;
  investmentGroupsNeedsMoreData: boolean;
  investmentGroupsDisplayCount: number;
  investmentGroupsTotalFetched: number;
  searchInvestmentGroups: (search: string) => void;
  loadMoreInvestmentGroups: () => void;
  showMoreInvestmentGroups: () => void;

  // Investment Roles (Searchable)
  investmentRolesSearchable: SelectOption[];
  investmentRolesLoading: boolean;
  investmentRolesError: string | null;
  investmentRolesHasMore: boolean;
  investmentRolesNeedsMoreData: boolean;
  investmentRolesDisplayCount: number;
  investmentRolesTotalFetched: number;
  searchInvestmentRoles: (search: string) => void;
  loadMoreInvestmentRoles: () => void;
  showMoreInvestmentRoles: () => void;

  // Investment Stake Types (Searchable)
  investmentStakeTypesSearchable: SelectOption[];
  investmentStakeTypesLoading: boolean;
  investmentStakeTypesError: string | null;
  investmentStakeTypesHasMore: boolean;
  investmentStakeTypesNeedsMoreData: boolean;
  investmentStakeTypesDisplayCount: number;
  investmentStakeTypesTotalFetched: number;
  searchInvestmentStakeTypes: (search: string) => void;
  loadMoreInvestmentStakeTypes: () => void;
  showMoreInvestmentStakeTypes: () => void;

  // Investment-specific catalogs (Static - for backward compatibility)
  investmentGroups: SelectOption[];
  investmentTypes: SelectOption[];
  investmentRoles: SelectOption[];
  investmentStakeTypes: SelectOption[];

  // Employee Sizes
  employeeSizes: SelectOption[];
  employeeSizesLoading: boolean;
  employeeSizesError: string | null;
  employeeSizesHasMore: boolean;
  employeeSizesNeedsMoreData: boolean;
  employeeSizesDisplayCount: number;
  employeeSizesTotalFetched: number;
  searchEmployeeSizes: (search: string) => void;
  loadMoreEmployeeSizes: () => void;
  showMoreEmployeeSizes: () => void;

  // Revenue Sizes
  revenueSizes: SelectOption[];
  revenueSizesLoading: boolean;
  revenueSizesError: string | null;
  revenueSizesHasMore: boolean;
  revenueSizesNeedsMoreData: boolean;
  revenueSizesDisplayCount: number;
  revenueSizesTotalFetched: number;
  searchRevenueSizes: (search: string) => void;
  loadMoreRevenueSizes: () => void;
  showMoreRevenueSizes: () => void;
}
