export interface ContactFormValues {
  // Personal Information
  firstName: string;
  lastName: string;
  academicTitleRef: string;
  birthDate: string;
  languageRef: string;
  bio: string;
  pictureUrl: string;

  // Professional Information
  jobTitle: string;
  department: string;
  contactRole: string;
  contactType: string;
  workExperienceYears: string;

  // Contact Information
  email: string;
  phone: string;
  fax: string;
  linkedinUrl: string;
  xingUrl: string;

  // Account Information
  accountId: string;
  companyName: string; // Company name for display (same as opportunity form)
  ownerEmployeeId: string;
  ownerOrganizationId: string;

  // Campaign Information
  salesCampaignId: string; // Campaign ID for backend

  // Additional Information
  notesSummary: string;

  // System fields
  id?: string;
  version?: number;

  // Source tracking
  sourceApp?: string;
  recordState?: string;
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

  // Data collections
  contactTypes: SelectOption[];
  contactRoles: SelectOption[];
  academicTitles: SelectOption[];
  languages: SelectOption[];
  departments: SelectOption[];
  employeePositions: SelectOption[];
  accounts: SelectOption[];
}
