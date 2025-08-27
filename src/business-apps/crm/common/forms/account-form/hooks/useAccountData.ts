import { useState, useEffect, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { AccountFormValues } from "../types";
import {
  useGetAccountData,
  AccountDataResponse,
} from "../queries/AccountQueries";

// Map account data from API to form values
export const mapAccountToFormValues = (
  accountData: AccountDataResponse
): Partial<AccountFormValues> => {
  if (!accountData?.Account?.[0]) {
    return {};
  }

  const account = accountData.Account[0];

  // Handle addresses - prioritize structured addresses, fallback to legacy
  let addresses = [];
  if (account.addresses && account.addresses.length > 0) {
    addresses = account.addresses.map((addr, index) => ({
      id: `address-${index}`,
      addressType: "UNKNOWN_ADDRESS",
      addressLines: [addr.city || ""],
      postalCode: "",
      city: addr.city || "",
      region: addr.region?.id || "",
      country: addr.country?.id || "",
    }));
  } else {
    // Create default address from legacy fields
    addresses = [
      {
        id: "default-address",
        addressType: "UNKNOWN_ADDRESS",
        addressLines: [account.addressLine || ""],
        postalCode: "",
        city: "",
        region: "",
        country: account.countryRef || "",
      },
    ];
  }

  const formValues: Partial<AccountFormValues> = {
    // System fields
    id: account.id,
    version: account.version,

    // Account Information
    owner: account.ownerEmployee?.id || "",

    // Company Information
    accountName: account.name || "",
    parentAccount: "", // Not available in schema
    legalForm: account.legalForm?.id || "",
    industry: account.industry?.id || "",
    website: account.website || "",
    description: "", // Not available in schema

    // Campaign Information
    salesCampaignId: account.salesCampaignId || account.salesCampaign?.id || "",

    // Contact Information
    phone: account.phone || "",
    email: account.email || "",
    fax: "", // Not available in schema

    // Dynamic Addresses
    addresses: addresses,

    // Financial Information
    annualRevenue: account.annualRevenue?.id || "",
    numberOfEmployees: account.numberOfEmployees?.value || "", // Note: only 'value' available
    currency: "", // Not available in schema

    // Additional Information
    timeZone: "", // Not available in schema
    foundationDate: account.foundationDate || "",
    tickerSymbol: "", // Not available in schema
    sicCode: "", // Not available in schema

    // Legacy Address Information (for backward compatibility)
    addressLine1: account.addressLine || "",
    country: account.countryRef || "",
  };

  return formValues;
};

export const useAccountData = (businessAppContext: BusinessAppContextProps) => {
  const [accountData, setAccountData] = useState<AccountDataResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { fetchAccountData } = useGetAccountData(businessAppContext);

  // Extract accountId from businessAppContext
  const accountId =
    businessAppContext.additionalData?.accountId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters
      ?.accountId;

  useEffect(() => {
    const loadAccountData = async () => {
      if (!accountId || !businessAppContext.accessToken) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const result = await fetchAccountData({ accountId });

        setAccountData(result);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Unknown error loading account data";
        console.error("❌ Account Data Hook: Error loading account data:", err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (accountId) {
      loadAccountData();
    } else {
      console.log("🔍 Account Data Hook: No accountId found in additionalData");
    }
  }, [accountId, businessAppContext.accessToken]); // Removed fetchAccountData to prevent infinite loops

  const refetch = useCallback(async () => {
    if (!accountId || !businessAppContext.accessToken) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await fetchAccountData({ accountId });
      setAccountData(result);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Unknown error loading account data";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [accountId, businessAppContext.accessToken]); // Removed fetchAccountData to prevent infinite loops

  return {
    accountData,
    loading,
    error,
    refetch,
  };
};
