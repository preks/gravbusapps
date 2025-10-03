import { useState, useEffect, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import {
  useGetInvestmentLeadById,
  InvestmentLeadQueryResult,
} from "../queries/LeadQueries";
import { LeadFormValues } from "../types";
import { extractAddressFromObject } from "../../../../common/utils/addressUtils";

interface UseInvestmentLeadDataProps {
  businessAppContext: BusinessAppContextProps;
}

interface UseInvestmentLeadDataReturn {
  leadData: InvestmentLeadQueryResult | null;
  isLoading: boolean;
  error: string | null;
  mapLeadToFormValues: (
    lead: InvestmentLeadQueryResult
  ) => Partial<LeadFormValues>;
}


export const useInvestmentLeadData = ({
  businessAppContext,
}: UseInvestmentLeadDataProps): UseInvestmentLeadDataReturn => {
  const [leadData, setLeadData] = useState<InvestmentLeadQueryResult | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { fetchInvestmentLeadById } =
    useGetInvestmentLeadById(businessAppContext);

  // Function to map investment lead data to form values
  const mapLeadToFormValues = useCallback(
    (lead: InvestmentLeadQueryResult): Partial<LeadFormValues> => {

      const mappedValues = {
        // System fields
        id: lead.id,
        version: lead.version,

        // Contact Information - ✅ ADDED: academic title
        firstName: lead.firstName || "",
        lastName: lead.lastName || "",
        email: lead.email || "",
        phone: lead.phoneNumber || "",
        jobPosition: lead.position || "",

        // Company Information
        company: lead.companyName || "",
        companyEmail: lead.companyEmail || "",
        companyPhone: lead.companyPhone || "",
        website: lead.companyWebsite || "",
        industry: lead.industryClassRef || lead.industryClass?.id || "", // ✅ FIXED: industryClassRef
        legalForm: lead.legalFormRef || lead.legalForm?.id || "",
        annualRevenue:
          lead.accountAnnualRevenueBandRef ||
          lead.accountAnnualRevenueBand?.id ||
          "",
        numberOfEmployees: lead.companySizeRef || lead.companySize?.id || "",

        // Lead Information - ✅ FIXED: Use ownerEmployeeId OR ownerEmployee.id
        owner: lead.ownerEmployeeId || lead.ownerEmployee?.id || "",
        leadStatus: lead.leadStatusRef || lead.leadStatus?.id || "",
        leadSource: lead.leadSourceRef || lead.leadSource?.id || "",
        rating: lead.leadRatingRef || lead.leadRating?.id || "",
        sensitive: lead.sensitive || false,

        // Notes - ✅ ADDED: Map description to notes field
        notes: lead.description || "",

        // Address Information - Direct fields (NOT addresses relationship)
        country: lead.countryRef || lead.country?.id || "",
        region: lead.regionRef || lead.region?.id || "",
        locality: lead.locality || "", // Direct locality field
        postalCode: lead.postalCode || "",
        addressLine: extractAddressFromObject(lead.addressLine) || "",

        // Legacy fields for backward compatibility
        city: lead.locality || "", // Map locality to city for backward compatibility
        // Address lines from direct fields
        addressLine1: extractAddressFromObject(lead.addressLine) || "",
        addressLine2: "", // Additional address lines not supported in current schema
        addressLine3: "",
        addressLine4: "",

        // Company relationship - ✅ ADDED: Support both convertedAccount and convertedAccountId
        accountId: lead.convertedAccountId || lead.convertedAccount?.id || "",

        // Investment-specific fields
        investmentName: lead.investmentName || "",
        investmentGroup:
          lead.investmentGroupRef || lead.investmentGroup?.id || "",
        investmentType: lead.investmentTypeRef || lead.investmentType?.id || "",
        investmentRole: lead.investmentRoleRef || lead.investmentRole?.id || "",
        investmentStakeType:
          lead.investmentStakeTypeRef || lead.investmentStakeType?.id || "",
        stakePercentage: lead.stakePercentage?.toString() || "",
        marketValue: lead.marketValue?.toString() || "",
        initialInvestmentAmount: lead.initialInvestmentAmount?.toString() || "",
        loanAmount: lead.loanAmount?.toString() || "",
        loanInterestRate: lead.loanInterestRate?.toString() || "",
        requiredCapitalAmount: lead.requiredCapitalAmount?.toString() || "",
        forecastedProfitAmount: lead.forecastedProfitAmount?.toString() || "",
        annualNetColdRent: lead.annualNetColdRent?.toString() || "",

        // Real Estate specific fields
        buildingYear: lead.buildingYear?.toString() || "",
        size: lead.size?.toString() || "",
        measurementUnit: lead.sizeMeasurementUnitRef || lead.sizeMeasurementUnit?.id || "",
      };

      return mappedValues;
    },
    []
  );

  // Load investment lead data when leadId is provided in additionalData
  useEffect(() => {
    const loadInvestmentLeadData = async () => {
      // Handle leadId the same way as ConvertLeadForm
      const leadId =
        businessAppContext.additionalData?.leadId ||
        businessAppContext.additionalData?.psi_taskPayload
          ?.psi_initialParameters?.leadId;

      if (!leadId || !businessAppContext.accessToken) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const lead = await fetchInvestmentLeadById(leadId);

        if (lead) {
          setLeadData(lead);
        } else {
          setError("Investment lead not found");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to load investment lead data";
        setError(errorMessage);
        console.error("Error loading investment lead data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInvestmentLeadData();
  }, [
    businessAppContext.additionalData?.leadId,
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters
      ?.leadId,
    businessAppContext.accessToken,
    fetchInvestmentLeadById,
  ]);

  return {
    leadData,
    isLoading,
    error,
    mapLeadToFormValues,
  };
};

// Legacy export for backward compatibility (can be removed later)
export const useLeadData = useInvestmentLeadData;
export type UseLeadDataProps = UseInvestmentLeadDataProps;
export type UseLeadDataReturn = UseInvestmentLeadDataReturn;
