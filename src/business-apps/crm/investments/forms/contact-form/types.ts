export interface ContactFormValues {
  // Personal Information
  firstName: string;
  lastName: string;
  fullName: string; // ✅ Available in InvestmentContact
  academicTitleRef: string;
  birthDate: string;
  languageRef: string; // ✅ Available in InvestmentContact
  description: string; // ✅ Available in InvestmentContact

  // Professional Information
  jobPosition: string; // ✅ Available in InvestmentContact
  department: string; // ✅ Available in InvestmentContact
  code: string; // ✅ Available in InvestmentContact (business code)

  // ✅ REMOVED: Fields NOT available in InvestmentContact database
  // salutationRef: string; // ❌ NOT in InvestmentContact schema
  // type: string; // ❌ NOT in InvestmentContact schema

  // Contact Information
  email: string; // ✅ Available in InvestmentContact
  phone: string; // ✅ Available in InvestmentContact

  // ✅ REMOVED: Picture fields NOT in InvestmentContact database schema
  // picture: string; // ❌ NOT in InvestmentContact schema
  // pictureThumbnail: string; // ❌ NOT in InvestmentContact schema

  // Owner Information
  ownerEmployeeId: string; // ✅ Available in InvestmentContact
  owner: string; // Owner employee ID for selection

  // Additional Information
  notesSummary: string; // ✅ Available in InvestmentContact
  businessKey: string; // ✅ Available in InvestmentContact

  // System fields
  id?: string; // ✅ Available in InvestmentContact
  version?: number;

  // Audit fields
  createdAt?: string; // ✅ Available in InvestmentContact
  createdBy?: string; // ✅ Available in InvestmentContact

  // Additional properties (jsonb)
  additionalProperties?: any; // ✅ Available in InvestmentContact
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

export interface ContactContextState {
  // Loading states
  isLoading: boolean;
  error: string | null;

  // Data collections for InvestmentContact
  academicTitles: SelectOption[];
  languages: SelectOption[];
  departments: SelectOption[];
  employeePositions: SelectOption[];

  // ✅ REMOVED: Fields not relevant for InvestmentContact
  // contactTypes: SelectOption[]; // Not in InvestmentContact
  // contactRoles: SelectOption[]; // Not in InvestmentContact
  // accounts: SelectOption[]; // Handled differently in InvestmentContact
}

// ✅ NEW: Interface for InvestmentContact query response
export interface InvestmentContactQueryResult {
  id: string;
  version?: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  jobPosition?: string;
  department?: string;
  code?: string;
  type?: string; // ✅ NEW: Contact type enum
  description?: string;
  notesSummary?: string;
  businessKey?: string;
  birthDate?: string;
  picture?: string; // ✅ NEW: Profile picture URL
  pictureThumbnail?: string; // ✅ NEW: Profile picture thumbnail
  ownerEmployeeId?: string;
  academicTitle?: {
    id: string;
    value: string;
    code: string;
    objectValue?: any;
  };
  academicTitleRef?: string;
  salutationRef?: string; // ✅ NEW: Salutation reference
  languageRef?: string;
  createdAt?: string;
  createdBy?: string;
  additionalProperties?: any;

  // ✅ REMOVED: Fields NOT in expected payload structure
  // activeFrom?: string; // Not in expected payload
  // activeTo?: string; // Not in expected payload
  // acl?: any; // Not in expected payload
  // updatedAt?: string; // ❌ NOT in InvestmentContact schema
  // updatedBy?: string; // ❌ NOT in InvestmentContact schema
}

// ✅ NEW: Interface for InvestmentContact data response
export interface InvestmentContactDataResponse {
  InvestmentContact: InvestmentContactQueryResult[];
}
