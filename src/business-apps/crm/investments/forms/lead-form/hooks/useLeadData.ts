import { useState, useEffect, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import {
  useGetInvestmentLeadById,
  InvestmentLeadQueryResult,
} from "../queries/LeadQueries";
import { LeadFormValues } from "../types";

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
      console.log("🔄 Mapping InvestmentLead data to form values. Country data:", {
        countryRef: lead.countryRef,
        countryObject: lead.country,
        countryId: lead.country?.id,
        regionRef: lead.regionRef,
        regionObject: lead.region,
        regionId: lead.region?.id
      });

      const mappedValues = {
        // System fields
        id: lead.id,
        version: lead.version,

        // Contact Information - ✅ ADDED: salutation and academic title
        salutation: lead.salutationRef || lead.salutation?.id || "",
        firstName: lead.firstName || "",
        lastName: lead.lastName || "",
        email: lead.email || "",
        phone: lead.phoneNumber || "",
        jobPosition: lead.position || "",

        // Company Information - ✅ ADDED: timeZone
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
        timeZone: lead.timeZoneRef || lead.timeZone?.id || "", // ✅ ADDED

        // Lead Information - ✅ FIXED: Use ownerEmployeeId OR ownerEmployee.id
        owner: lead.ownerEmployeeId || lead.ownerEmployee?.id || "",
        leadStatus: lead.leadStatusRef || lead.leadStatus?.id || "",
        leadSource: lead.leadSourceRef || lead.leadSource?.id || "",
        rating: lead.leadRatingRef || lead.leadRating?.id || "",

        // Notes - ✅ ADDED: Map description to notes field
        notes: lead.description || "",

        // Address Information - ✅ UPDATED: Single addressLine and locality
        country: lead.countryRef || lead.country?.id || "",
        region: lead.regionRef || lead.region?.id || "",
        locality: lead.locality || "", // ✅ UPDATED: Use locality field
        postalCode: lead.postalCode || "",
        addressLine: lead.addressLine
          ? typeof lead.addressLine === "object"
            ? lead.addressLine.address || JSON.stringify(lead.addressLine)
            : lead.addressLine
          : "", // ✅ UPDATED: Single addressLine field

        // Legacy fields for backward compatibility
        city: lead.locality || "",
        addressLine1: lead.addressLine
          ? typeof lead.addressLine === "object"
            ? lead.addressLine.address || JSON.stringify(lead.addressLine)
            : lead.addressLine
          : "",

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
      };

      console.log("🔄 Final mapped values for address fields:", {
        country: mappedValues.country,
        region: mappedValues.region,
        locality: mappedValues.locality,
        addressLine: mappedValues.addressLine
      });

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
