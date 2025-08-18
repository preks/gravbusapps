import React from "react";
import {
  Button,
  Label,
  Alert,
  AlertDescription,
} from "@newwork/nw-design-system";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { dispatchProcessContinueEvent } from "@/common/utils/processEventUtils";
import { useLeadFormContext } from "../context/LeadFormContext";
import { toStringOrUndefined } from "../utils/validationUtils";
import OwnerSelector from "./OwnerSelector";
import LeadInformationSection from "./LeadInformationSection";
import ContactInformationSection from "./ContactInformationSection";
import CompanyInformationSection from "./CompanyInformationSection";
import AddressInformationSection from "./AddressInformationSection";
import DescriptionSection from "./DescriptionSection";

const prefixDataTestId = "LeadForm";

const LeadFormComponent: React.FC = () => {
  const {
    formValues,
    onSubmit,
    onCancel,
    isLoading,
    error,
    setFormValues,
    employeePositions,
    employeePositionsLoading,
    employeePositionsError,
    employeePositionsHasMore,
    loadMoreEmployeePositions,
    searchEmployeePositions,
    addressLineCount,
  } = useLeadFormContext();

  // Check if all mandatory fields are filled
  const isFormValid =
    toStringOrUndefined(formValues.firstName) &&
    toStringOrUndefined(formValues.lastName) &&
    toStringOrUndefined(formValues.company) &&
    toStringOrUndefined(formValues.owner);

  // Handle form submission
  const handleSubmit = async () => {
    try {
      await onSubmit(formValues);
      console.log("Comapny name value ", formValues.company);
      // Prepare comprehensive lead payload following the API structure
      const leadPayload: any = {
        sourceApp: "CRM",
        leadRatingRef: toStringOrUndefined(formValues.rating),
        leadStatusRef: toStringOrUndefined(formValues.leadStatus),
        leadSourceRef: toStringOrUndefined(formValues.leadSource),
        firstName: toStringOrUndefined(formValues.firstName),
        lastName: toStringOrUndefined(formValues.lastName),
        phoneNumber: toStringOrUndefined(formValues.phone),
        email: toStringOrUndefined(formValues.email),
        position: toStringOrUndefined(formValues.jobPosition),
        companyName: toStringOrUndefined(formValues.company),
        accountId: toStringOrUndefined(formValues.accountId), // Include accountId from selected company
        salesCampaign: toStringOrUndefined(formValues.salesCampaignId),
        legalFormRef: toStringOrUndefined(formValues.legalForm),
        numberOfEmployeesRef: toStringOrUndefined(formValues.numberOfEmployees),
        industryRef: toStringOrUndefined(formValues.industry),
        annualRevenueRef: toStringOrUndefined(formValues.annualRevenue),
        companyEmail: toStringOrUndefined(formValues.companyEmail),
        companyPhone: toStringOrUndefined(formValues.companyPhone),
        companyWebsite: toStringOrUndefined(formValues.website),
        countryRef: toStringOrUndefined(formValues.country),
        regionRef: toStringOrUndefined(formValues.region),
        addressLine: undefined, // Will be set from addresses array below
        postalCode: toStringOrUndefined(formValues.postalCode),
        city: toStringOrUndefined(formValues.city),
        ownerEmployee: toStringOrUndefined(formValues.owner),
        description: toStringOrUndefined(formValues.notes), // Fixed: Use notes field from DescriptionSection
      };

      // Build addresses array from dynamic addresses only (no legacy fallback)
      const addresses: any[] = [];

      // Process dynamic addresses only
      if (formValues.addresses && formValues.addresses.length > 0) {
        formValues.addresses.forEach((address) => {
          // Filter out empty address lines
          const nonEmptyLines = address.addressLines
            .map((line) => toStringOrUndefined(line))
            .filter((line) => line);

          // Create a separate address object for each non-empty address line
          nonEmptyLines.forEach((addressLine) => {
            addresses.push({
              addressType: address.addressType || "UNKNOWN_ADDRESS",
              addressLine: addressLine,
              postalCode: toStringOrUndefined(address.postalCode),
              city: toStringOrUndefined(address.city),
              regionRef: toStringOrUndefined(address.region),
              countryRef: toStringOrUndefined(address.country),
            });
          });

          // If no address lines but other address data exists, create one address with empty addressLine
          if (
            nonEmptyLines.length === 0 &&
            (toStringOrUndefined(address.city) ||
              toStringOrUndefined(address.postalCode) ||
              toStringOrUndefined(address.region) ||
              toStringOrUndefined(address.country))
          ) {
            addresses.push({
              addressType: address.addressType || "UNKNOWN_ADDRESS",
              addressLine: "",
              postalCode: toStringOrUndefined(address.postalCode),
              city: toStringOrUndefined(address.city),
              regionRef: toStringOrUndefined(address.region),
              countryRef: toStringOrUndefined(address.country),
            });
          }
        });
      }

      // Set addresses to null if empty, otherwise use the addresses array
      leadPayload.addresses = addresses.length > 0 ? addresses : null;

      // Set the main addressLine field from the first address (for backward compatibility)
      if (addresses.length > 0) {
        leadPayload.addressLine = addresses[0].addressLine;
      } else {
        leadPayload.addressLine = null;
      }

      // Initialize empty arrays for tags and communication channels (like account form)
      leadPayload.tags = [];
      leadPayload.communicationChannels = [];

      // Debug logging
      console.log("Lead Address Debug Info:", {
        addressLineCount: addressLineCount,
        dynamicAddresses: formValues.addresses,
        dynamicAddressesCount: formValues.addresses?.length || 0,
        processedAddressesForPayload: addresses,
        totalSeparateAddressObjects: addresses.length,
        payloadAddressesField: leadPayload.addresses,
        finalPayloadAddressLine: leadPayload.addressLine,
      });

      // Always use INSERT mode for lead creation
      const changeMode = "INSERT";

      const payload = {
        lead: leadPayload,
        changeMode: changeMode,
      };

      // Dispatch process continue event on successful submission
      dispatchProcessContinueEvent("pse_submit", payload);
    } catch (err) {
      console.error("Error submitting lead form:", err);
    }
  };

  // Handle form cancellation
  const handleCancel = async () => {
    try {
      await onCancel();

      // Dispatch process continue event for cancellation (pause)
      dispatchProcessContinueEvent("pse_pause", null);
    } catch (err) {
      console.error("Error cancelling lead form:", err);
    }
  };

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:max-w-md gba:mx-auto gba:p-6">
      <div
        className="gba:h-full gba:flex gba:flex-col"
        data-testid={formatDataTestId(prefixDataTestId, "Form")}
      >
        {/* Form Fields Container - Takes up available space */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-8">
          {/* Owner - Same pattern as contact form */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Owner <span className="gba:text-red-500">*</span>
            </Label>
            <OwnerSelector
              value={formValues.owner}
              onChange={(value) => setFormValues({ owner: value })}
              employees={employeePositions}
              loading={employeePositionsLoading}
              hasMore={employeePositionsHasMore}
              onLoadMore={loadMoreEmployeePositions}
              onSearch={searchEmployeePositions}
              error={employeePositionsError}
              dataTestId={formatDataTestId(prefixDataTestId, "OwnerSelector")}
            />
          </div>

          {/* Lead Information Section */}
          <LeadInformationSection />

          {/* Contact Information Section */}
          <ContactInformationSection />

          {/* Company Information Section */}
          <CompanyInformationSection />

          {/* Address Information Section */}
          <AddressInformationSection />

          {/* Description Section */}
          <DescriptionSection />

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Submit and Cancel Buttons - Fixed at bottom */}
        <div className="gba:mt-6 gba:pt-4 gba:border-t gba:border-gray-200 gba:flex gba:gap-3">
          <Button
            variant="secondary"
            className="gba:flex-1"
            size="lg"
            onClick={handleCancel}
            data-testid={formatDataTestId(prefixDataTestId, "CancelButton")}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            disabled={!isFormValid}
            className="gba:flex-1"
            size="lg"
            onClick={handleSubmit}
            data-testid={formatDataTestId(prefixDataTestId, "SubmitButton")}
          >
            {isLoading
              ? "Processing..."
              : formValues.id
              ? "Update Lead"
              : "Create Lead"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LeadFormComponent;
