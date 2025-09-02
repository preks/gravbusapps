export interface ContactInfoFilter {
  id: string;
  label: string;
  value: string;
}

// Predefined contact info filters
export const CONTACT_INFO_FILTERS: ContactInfoFilter[] = [
  {
    id: "HAS_EMAIL",
    label: "Has Email",
    value: "HAS_EMAIL",
  },
  {
    id: "HAS_PHONE",
    label: "Has Phone",
    value: "HAS_PHONE",
  },
  {
    id: "HAS_LINKEDIN",
    label: "Has LinkedIn",
    value: "HAS_LINKEDIN",
  },
  {
    id: "HAS_XING",
    label: "Has Xing",
    value: "HAS_XING",
  },
  {
    id: "HAS_JOB_TITLE",
    label: "Has Job Title",
    value: "HAS_JOB_TITLE",
  },
  {
    id: "MISSING_EMAIL",
    label: "Missing Email",
    value: "MISSING_EMAIL",
  },
  {
    id: "MISSING_PHONE",
    label: "Missing Phone",
    value: "MISSING_PHONE",
  },
];

export const useGetContactInfoFilters = () => {
  return {
    contactInfoFilters: CONTACT_INFO_FILTERS,
    isLoading: false,
    error: null,
  };
}; 