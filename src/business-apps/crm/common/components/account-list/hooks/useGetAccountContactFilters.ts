export interface ContactFilter {
  id: string;
  label: string;
  value: string;
}

export interface UseGetAccountContactFiltersReturn {
  websiteFilters: ContactFilter[];
  phoneFilters: ContactFilter[];
  emailFilters: ContactFilter[];
  faxFilters: ContactFilter[];
}

export const useGetAccountContactFilters = (): UseGetAccountContactFiltersReturn => {
  // These are simple presence/absence filters
  const websiteFilters: ContactFilter[] = [
    { id: "HAS_WEBSITE", label: "Has Website", value: "HAS_WEBSITE" },
    { id: "MISSING_WEBSITE", label: "Missing Website", value: "MISSING_WEBSITE" },
  ];

  const phoneFilters: ContactFilter[] = [
    { id: "HAS_PHONE", label: "Has Phone", value: "HAS_PHONE" },
    { id: "MISSING_PHONE", label: "Missing Phone", value: "MISSING_PHONE" },
  ];

  const emailFilters: ContactFilter[] = [
    { id: "HAS_EMAIL", label: "Has Email", value: "HAS_EMAIL" },
    { id: "MISSING_EMAIL", label: "Missing Email", value: "MISSING_EMAIL" },
  ];

  const faxFilters: ContactFilter[] = [
    { id: "HAS_FAX", label: "Has Fax", value: "HAS_FAX" },
    { id: "MISSING_FAX", label: "Missing Fax", value: "MISSING_FAX" },
  ];

  return {
    websiteFilters,
    phoneFilters,
    emailFilters,
    faxFilters,
  };
}; 