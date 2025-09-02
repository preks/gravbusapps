import { useState, useEffect, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { AccountFormValues } from "../types";
import {
  useGetInvestmentAccountData,
  InvestmentAccountDataResponse,
} from "../queries/AccountQueries";

// Map investment account data from API to form values
export const mapInvestmentAccountToFormValues = (
  accountData: InvestmentAccountDataResponse
): Partial<AccountFormValues> => {
  if (!accountData?.InvestmentAccount?.[0]) {
    return {};
  }

  const account = accountData.InvestmentAccount[0];

  // ✅ REMOVED: InvestmentAccount doesn't have addresses array - uses simple geographicPresence field

  const formValues: Partial<AccountFormValues> = {
    // System fields
    id: account.id,
    version: account.version,

    // Account Information
    owner: account.ownerEmployee?.id || "",

    // Company Information (✅ UPDATED to match InvestmentAccount schema)
    accountName: account.name || "",
    parentAccount: "", // Not available in InvestmentAccount schema
    legalForm: account.legalForm?.id || "",
    industry: account.industryClass?.id || "", // ✅ FIXED: industry -> industryClass
    website: account.website || "",
    description: account.mission || "", // ✅ UPDATED: Use mission as description

    // ✅ REMOVED: Campaign Information - not relevant for InvestmentAccount
    // salesCampaignId: "", // Removed from form

    // Contact Information
    phone: account.phone || "",
    email: account.email || "",
    // ✅ REMOVED: fax: "", // Not available in InvestmentAccount schema

    // Geographic Presence (simplified for InvestmentAccount)
    geographicPresence: account.geographicPresence || "",

    // ✅ REMOVED: Complex address handling - InvestmentAccount only has geographicPresence field
    // Legacy fields kept for form compatibility but not populated from database
    country: "",
    region: "",
    addressLine1: "",
    addressLine2: "",
    addressLine3: "",
    addressLine4: "",
    postalCode: "",
    city: "",
    addresses: [], // Dynamic addresses array - not used

    // Financial Information (✅ UPDATED to match InvestmentAccount schema)
    annualRevenue: account.accountAnnualRevenueBand?.id || "", // ✅ FIXED: annualRevenue -> accountAnnualRevenueBand
    numberOfEmployees: account.companySize?.id || "", // ✅ FIXED: numberOfEmployees -> companySize (use id, not value)
    // ✅ REMOVED: currency: "", // Not available in InvestmentAccount schema

    // Additional Information (✅ UPDATED for InvestmentAccount)
    timeZone: account.timeZone?.id || "", // ✅ RESTORED: Available in InvestmentAccount schema
    foundationDate: account.foundationDate || "",
    tickerSymbol: account.code || "", // ✅ UPDATED: Use code as ticker symbol
    // ✅ REMOVED: sicCode mapping - sicCode field removed from form

    // Legacy fields
    address: "",
    state: "",
  };

  return formValues;
};

export const useInvestmentAccountData = (
  businessAppContext: BusinessAppContextProps
) => {
  const [accountData, setAccountData] =
    useState<InvestmentAccountDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { fetchInvestmentAccountData } =
    useGetInvestmentAccountData(businessAppContext);

  // Extract accountId from businessAppContext
  const accountId =
    businessAppContext.additionalData?.accountId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters
      ?.accountId;

  useEffect(() => {
    const loadAccountData = async () => {
      console.log("🔍 Investment Account Data Hook - Starting load:", {
        accountId,
        hasAccessToken: !!businessAppContext.accessToken,
        additionalData: businessAppContext.additionalData,
      });

      if (!accountId || !businessAppContext.accessToken) {
        console.log("❌ Investment Account Data Hook - Missing requirements:", {
          hasAccountId: !!accountId,
          hasAccessToken: !!businessAppContext.accessToken,
        });
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log(
          "🚀 Investment Account Data Hook - Fetching data for accountId:",
          accountId
        );
        const result = await fetchInvestmentAccountData({ accountId });
        console.log(
          "✅ Investment Account Data Hook - Data loaded successfully:",
          {
            hasResult: !!result,
            investmentAccountCount: result?.InvestmentAccount?.length || 0,
            firstAccountId: result?.InvestmentAccount?.[0]?.id,
            firstAccountName: result?.InvestmentAccount?.[0]?.name,
          }
        );

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
      console.log(
        "🔍 Investment Account Data Hook: No accountId found in additionalData:",
        {
          additionalData: businessAppContext.additionalData,
          accountIdPath1: businessAppContext.additionalData?.accountId,
          accountIdPath2:
            businessAppContext.additionalData?.psi_taskPayload
              ?.psi_initialParameters?.accountId,
        }
      );
    }
  }, [accountId, businessAppContext.accessToken]); // Removed fetchAccountData to prevent infinite loops

  const refetch = useCallback(async () => {
    if (!accountId || !businessAppContext.accessToken) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await fetchInvestmentAccountData({ accountId });
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

// ✅ BACKWARD COMPATIBILITY: Export old names for existing code
export const mapAccountToFormValues = mapInvestmentAccountToFormValues;
export const useAccountData = useInvestmentAccountData;
