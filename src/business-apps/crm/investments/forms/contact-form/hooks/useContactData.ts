import { useState, useEffect } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import {
  useGetInvestmentContactData,
  InvestmentContactDataResponse,
  InvestmentContactQueryVariables,
} from "../queries/ContactQueries";
import { ContactFormValues, InvestmentContactQueryResult } from "../types";

// Helper function to map InvestmentContact data to form values
export const mapInvestmentContactToFormValues = (
  contactData: InvestmentContactDataResponse
): Partial<ContactFormValues> => {
  if (!contactData?.InvestmentContact?.[0]) {
    console.log("⚠️ No InvestmentContact data found for mapping");
    return {};
  }

  const contact = contactData.InvestmentContact[0];

  console.log("🔄 Mapping InvestmentContact data to form values:", {
    contactId: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    jobPosition: contact.jobPosition,
    department: contact.department,
    ownerEmployeeId: contact.ownerEmployeeId,
    academicTitleRef: contact.academicTitleRef,
    languageRef: contact.languageRef,
  });

  const formValues: Partial<ContactFormValues> = {
    // System fields
    id: contact.id,
    version: contact.version,

    // Personal Information
    firstName: contact.firstName || "",
    lastName: contact.lastName || "",
    fullName: contact.fullName || "",
    birthDate: contact.birthDate || "",
    description: contact.description || "", // ✅ Using description field

    // Professional Information
    jobPosition: contact.jobPosition || "",
    department: contact.department || "",
    code: contact.code || "",

    // Contact Information
    email: contact.email || "",
    phone: contact.phone || "",

    // ✅ REMOVED: Fields NOT in InvestmentContact database
    // type: contact.type || "UNKNOWN_CONTACT", // ❌ NOT in schema
    // picture: contact.picture || "", // ❌ NOT in schema
    // pictureThumbnail: contact.pictureThumbnail || "", // ❌ NOT in schema

    // Owner Information
    ownerEmployeeId: contact.ownerEmployeeId || "",
    owner: contact.ownerEmployeeId || "", // Map to owner field for form

    // Additional Information
    notesSummary: contact.notesSummary || "",
    businessKey: contact.businessKey || "",

    // Catalog fields
    academicTitleRef: contact.academicTitle?.id || "",
    languageRef: contact.languageRef || "",

    // ✅ REMOVED: Fields NOT in InvestmentContact database
    // salutationRef: contact.salutationRef || "", // ❌ NOT in schema

    // Audit fields
    createdAt: contact.createdAt || "",
    createdBy: contact.createdBy || "",

    // System fields
    additionalProperties: contact.additionalProperties,

    // ✅ REMOVED: Fields NOT in expected payload structure
    // activeFrom: contact.activeFrom || "", // Not in expected payload
    // activeTo: contact.activeTo || "", // Not in expected payload
    // acl: contact.acl, // Not in expected payload
    // updatedAt: contact.updatedAt || "", // ❌ NOT in InvestmentContact schema
    // updatedBy: contact.updatedBy || "", // ❌ NOT in InvestmentContact schema
    // sourceApp: "IRM", // ❌ NOT a database field (used in payload only)
  };

  console.log("✅ Mapped InvestmentContact form values:", formValues);
  return formValues;
};

export const useInvestmentContactData = (
  businessAppContext: BusinessAppContextProps
) => {
  const [contactData, setContactData] =
    useState<InvestmentContactDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { fetchInvestmentContactData } =
    useGetInvestmentContactData(businessAppContext);

  // Extract contactId from businessAppContext
  const contactId =
    businessAppContext.additionalData?.contactId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters
      ?.contactId;

  useEffect(() => {
    const loadContactData = async () => {
      console.log("🔍 Investment Contact Data Hook - Starting load:", {
        contactId,
        hasAccessToken: !!businessAppContext.accessToken,
        additionalData: businessAppContext.additionalData,
      });

      if (!contactId || !businessAppContext.accessToken) {
        console.log("❌ Investment Contact Data Hook - Missing requirements:", {
          hasContactId: !!contactId,
          hasAccessToken: !!businessAppContext.accessToken,
        });
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log(
          "🚀 Investment Contact Data Hook - Fetching data for contactId:",
          contactId
        );
        const result = await fetchInvestmentContactData({ contactId });
        console.log(
          "✅ Investment Contact Data Hook - Data loaded successfully:",
          {
            hasResult: !!result,
            investmentContactCount: result?.InvestmentContact?.length || 0,
            firstContactId: result?.InvestmentContact?.[0]?.id,
            firstContactName: `${
              result?.InvestmentContact?.[0]?.firstName || ""
            } ${result?.InvestmentContact?.[0]?.lastName || ""}`.trim(),
          }
        );

        setContactData(result);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Unknown error loading contact data";
        console.error("❌ Contact Data Hook: Error loading contact data:", err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (contactId) {
      loadContactData();
    } else {
      console.log(
        "⏳ Investment Contact Data Hook - No contactId provided, waiting..."
      );
    }
  }, [contactId, businessAppContext.accessToken]);

  return {
    contactData,
    loading,
    error,
    contactId,
  };
};
