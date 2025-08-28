import { useMemo } from "react";

export interface ContactInfoFilter {
  id: string;
  label: string;
  value: string;
}

export const useGetAccountContactInfo = () => {
  const contactInfoFilters: ContactInfoFilter[] = useMemo(() => [
    {
      id: "HAS_WEBSITE",
      label: "Has Website",
      value: "HAS_WEBSITE",
    },
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
      id: "HAS_CONTACT",
      label: "Has Contact Person",
      value: "HAS_CONTACT",
    },
    {
      id: "HAS_ADDRESS",
      label: "Has Address",
      value: "HAS_ADDRESS",
    },
    {
      id: "MISSING_WEBSITE",
      label: "Missing Website",
      value: "MISSING_WEBSITE",
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
  ], []);

  return {
    contactInfoFilters,
    isLoading: false,
    error: null,
  };
}; 