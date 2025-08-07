import React, { useState, useRef } from "react";
import { Button, Input, Label, Spinner } from "@newwork/nw-design-system";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { dispatchProcessContinueEvent } from "@/common/utils/processEventUtils";
import { useContactFormContext } from "../context/ContactFormContext";
import OwnerInformationSection from "./OwnerInformationSection";
import PersonalInformationSection from "./PersonalInformationSection";
import ProfessionalInformationSection from "./ProfessionalInformationSection";
import AdditionalInformationSection from "./AdditionalInformationSection";
import SearchableSelect from "../../opportunity-form/components/SearchableSelect";

const prefixDataTestId = "ContactForm";

const ContactFormComponent: React.FC = () => {
  const {
    formValues,
    setFormValues,
    onSubmit,
    onCancel,
    isLoading,
    error,
    businessAppContext,
    accountSuggestions,
    searchAccounts,
    loadMoreAccounts,
    accountsHasMore,
    accountsLoading,
  } = useContactFormContext();

  // Safety check - if context is not properly initialized, show error
  if (!formValues) {
    return (
      <div className="gba:p-6 gba:text-center">
        <div className="gba:text-red-500">
          Error: Form context not properly initialized. Please refresh the page.
        </div>
      </div>
    );
  }

  // Check if all mandatory fields are filled
  const isFormValid =
    formValues.firstName &&
    formValues.lastName &&
    formValues.email &&
    formValues.accountId &&
    formValues.ownerEmployeeId;

  // Helper function to convert values to strings safely
  const toStringOrUndefined = (value: string): string | undefined => {
    return value && value.trim() ? value.trim() : undefined;
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      await onSubmit(formValues);

      // Determine if this is an update or create operation
      const isUpdate = formValues.id;

      // Prepare comprehensive contact payload following the API structure
      const contactPayload: any = {
        sourceApp: "CRM",
        firstName: toStringOrUndefined(formValues.firstName),
        lastName: toStringOrUndefined(formValues.lastName),
        academicTitleRef: toStringOrUndefined(formValues.academicTitleRef),
        birthDate: toStringOrUndefined(formValues.birthDate),
        languageRef: toStringOrUndefined(formValues.languageRef),
        bio: toStringOrUndefined(formValues.bio),
        pictureUrl: toStringOrUndefined(formValues.pictureUrl),
        jobTitle: toStringOrUndefined(formValues.jobTitle),
        department: toStringOrUndefined(formValues.department),
        contactRole: toStringOrUndefined(formValues.contactRole),
        //contactType: toStringOrUndefined(formValues.contactType),
        workExperienceYears: formValues.workExperienceYears
          ? parseInt(formValues.workExperienceYears)
          : undefined,
        email: toStringOrUndefined(formValues.email),
        phone: toStringOrUndefined(formValues.phone),
        fax: toStringOrUndefined(formValues.fax),
        linkedinUrl: toStringOrUndefined(formValues.linkedinUrl),
        xingUrl: toStringOrUndefined(formValues.xingUrl),
        companyName: formValues.companyName
          ? toStringOrUndefined(formValues.companyName)
          : undefined,
        accountId: toStringOrUndefined(formValues.accountId),
        ownerEmployee:
          businessAppContext.userInfo?.employeeDetails?.employeeId ||
          toStringOrUndefined(formValues.ownerEmployeeId),
        ownerOrganization: undefined, // Will be set by backend based on owner employee
        notesSummary: toStringOrUndefined(formValues.notesSummary),
        recordState: formValues.recordState || "ACTIVE",
      };

      // For updates, include the contact ID and version
      if (isUpdate) {
        contactPayload.id = formValues.id;
        if (formValues.version !== undefined) {
          contactPayload.version = formValues.version;
        }
      }

      // Initialize empty arrays for relationships
      contactPayload.addresses = [];
      contactPayload.communicationChannels = [];
      contactPayload.tags = [];

      // Determine change mode based on whether we have an ID
      const changeMode = isUpdate ? "UPDATE" : "INSERT";

      const payload = {
        contact: contactPayload,
        changeMode: changeMode,
      };

      // Debug logs for accountId
      console.log("🔍 Contact Form Debug:");
      console.log("  formValues.accountId:", formValues.accountId);
      console.log("  companyInputValue:", formValues.companyName);
      console.log("  contactPayload.accountId:", contactPayload.accountId);
      console.log("  contactPayload.companyName:", contactPayload.companyName);

      // Log the payload for debugging
      console.log(
        `${isUpdate ? "Updating" : "Creating"} contact with payload:`,
        payload
      );

      // Dispatch process continue event on successful submission
      dispatchProcessContinueEvent("pse_submit", payload);
    } catch (err) {
      console.error("Error submitting contact form:", err);
    }
  };

  // Handle form cancellation
  const handleCancel = async () => {
    try {
      await onCancel();

      // Dispatch process continue event for cancellation (pause)
      dispatchProcessContinueEvent("pse_pause", null);
    } catch (err) {
      console.error("Error cancelling contact form:", err);
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
          {/* Contact Owner Section - First and most important */}
          <OwnerInformationSection />

          {/* Company Name Section - Second field */}
          <div className="gba:space-y-2">
            <SearchableSelect
              label="Company Name *"
              name="companyName"
              value={formValues.companyName}
              placeholder="Please Select..."
              options={accountSuggestions as any}
              loading={accountsLoading}
              hasMore={accountsHasMore}
              onSearch={searchAccounts}
              onLoadMore={loadMoreAccounts}
              onChange={(value) => {
                // Find the selected account to get both ID and name
                const selectedAccount = accountSuggestions.find(
                  (account) => account.value === value || account.id === value
                );
                if (selectedAccount) {
                  setFormValues({
                    companyName: selectedAccount.name, // Store name for display
                    accountId: selectedAccount.value, // Store ID for backend
                  });
                }
              }}
              error={null}
              data-testid={formatDataTestId(prefixDataTestId, "CompanySelect")}
            />
          </div>

          {/* Personal Information Section */}
          <PersonalInformationSection />

          {/* Professional Information Section */}
          <ProfessionalInformationSection />

          {/* Additional Information Section */}
          <AdditionalInformationSection />

          {/* Error Display */}
          {error && (
            <div
              className="gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-md gba:p-4 gba:mb-4"
              data-testid={formatDataTestId(prefixDataTestId, "ErrorAlert")}
            >
              <p className="gba:text-red-800 gba:font-medium">{error}</p>
            </div>
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
            {isLoading && <Spinner size="sm" className="gba:mr-2" />}
            {formValues.id ? "Update Contact" : "Create Contact"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ContactFormComponent;
