import React, { useState, useRef } from "react";
import {
  Button,
  Input,
  Label,
  Spinner,
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
      // Determine if this is an update or create operation
      const isUpdate = formValues.id;

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
        // regionRef: toStringOrUndefined(formValues.region),
        addressLine:
          toStringOrUndefined(formValues.addressLine1) ||
          toStringOrUndefined(formValues.address),
        postalCode: toStringOrUndefined(formValues.postalCode),
        city: toStringOrUndefined(formValues.city),
        ownerEmployee: toStringOrUndefined(formValues.owner),
        description: toStringOrUndefined(formValues.notes), // Fixed: Use notes field from DescriptionSection
      };

      // For updates, include the lead ID and version
      if (isUpdate) {
        leadPayload.id = formValues.id;
        if (formValues.version !== undefined) {
          leadPayload.version = formValues.version;
        }
      }

      // Build addresses array if we have address data
      const addresses = [];
      const addressLine =
        toStringOrUndefined(formValues.addressLine1) ||
        toStringOrUndefined(formValues.address) ||
        [
          formValues.addressLine1,
          formValues.addressLine2,
          formValues.addressLine3,
          formValues.addressLine4,
        ]
          .filter((line) => toStringOrUndefined(line))
          .join(", ");

      if (
        addressLine ||
        toStringOrUndefined(formValues.city) ||
        toStringOrUndefined(formValues.postalCode)
      ) {
        addresses.push({
          addressType: "UNKNOWN_ADDRESS",
          addressLine: addressLine,
          postalCode: toStringOrUndefined(formValues.postalCode),
          city: toStringOrUndefined(formValues.city),
          regionRef: toStringOrUndefined(formValues.region),
          countryRef: toStringOrUndefined(formValues.country),
        });
      }

      leadPayload.addresses = addresses;

      const payload = {
        lead: leadPayload,
      };

      // Log the payload for debugging
      console.log(
        `${isUpdate ? "Updating" : "Creating"} lead with payload:`,
        payload
      );

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
