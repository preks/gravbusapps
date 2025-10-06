import React from "react";
import {
  Button,
  Alert,
  AlertDescription,
} from "@newwork/nw-design-system";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { dispatchProcessContinueEvent } from "@/common/utils/processEventUtils";
import { useContactFormContext } from "../context/ContactFormContext";
import PersonalInformationSection from "./PersonalInformationSection";
import OwnerInformationSection from "./OwnerInformationSection";

const prefixDataTestId = "ContactForm";

const ContactFormComponent: React.FC = () => {
  const { formValues, onSubmit, onCancel, isLoading, error, hideActions } =
    useContactFormContext();

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
    formValues.ownerEmployeeId;

  // Helper function to convert values to strings safely
  const toStringOrUndefined = (value: string): string | undefined => {
    return value && value.trim() ? value.trim() : undefined;
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Prevent duplicate submissions
    if (isLoading) {
      console.log('🚫 Duplicate submission prevented - already loading');
      return;
    }

    try {
      console.log('⏳ Starting contact form submission');
      // Determine if this is an update or create operation
      const isUpdate = formValues.id;

      // ✅ UPDATED: Prepare InvestmentContact payload matching expected API structure exactly
      const investmentContactPayload: any = {
        firstName: toStringOrUndefined(formValues.firstName),
        lastName: toStringOrUndefined(formValues.lastName),
        fullName: `${(formValues.firstName || "").trim()} ${(formValues.lastName || "").trim()}`.trim(),
        type: toStringOrUndefined(formValues.type),
        birthDate: toStringOrUndefined(formValues.birthDate),

        jobPosition: toStringOrUndefined(formValues.jobPosition),
        department: toStringOrUndefined(formValues.department),

        email: toStringOrUndefined(formValues.email),
        phone: toStringOrUndefined(formValues.phone),

        ownerEmployee: toStringOrUndefined(formValues.ownerEmployeeId), // ✅ FIXED: ownerEmployeeId → ownerEmployee

        notesSummary: toStringOrUndefined(formValues.notesSummary),
        businessKey: toStringOrUndefined(formValues.businessKey),

        academicTitleRef: toStringOrUndefined(formValues.academicTitleRef),
        // languageRef: toStringOrUndefined(formValues.languageRef),

        additionalProperties: formValues.additionalProperties || {},
      };

      // ✅ NEW: Add communication channels for LinkedIn and Xing
      const communicationChannels = [];
      
      // Add LinkedIn communication channel if provided
      if (formValues.linkedinUrl && formValues.linkedinUrl.trim()) {
        communicationChannels.push({
          communicationChannelRef: "CommunicationChannel:v1:LinkedIn",
          value: formValues.linkedinUrl.trim(),
          valueExtension: null,
          source: "FORM_INPUT",
          activeFrom: new Date().toISOString(),
          activeTo: null,
        });
      }
      
      // Add Xing communication channel if provided
      if (formValues.xingUrl && formValues.xingUrl.trim()) {
        communicationChannels.push({
          communicationChannelRef: "CommunicationChannel:v1:Xing", 
          value: formValues.xingUrl.trim(),
          valueExtension: null,
          source: "FORM_INPUT",
          activeFrom: new Date().toISOString(),
          activeTo: null,
        });
      }

      // Add communication channels to payload if any exist
      if (communicationChannels.length > 0) {
        investmentContactPayload.communicationChannels = communicationChannels;
      }

      // ✅ NEW: Add account IDs to payload - always include as array
      // Always include accountIds at top level to maintain/break associations

      // ✅ FIXED: Handle ID and version for UPDATE mode only
      if (isUpdate) {
        investmentContactPayload.id = formValues.id;
        if (formValues.version !== undefined && formValues.version !== null) {
          investmentContactPayload.version = formValues.version;
        }
      }

      // Determine change mode based on whether we have an ID
      const changeMode = isUpdate ? "UPDATE" : "INSERT";

      // ✅ FIXED: Extract account IDs from accountIds (handle both string[] and object[] formats)
      const extractedAccountIds = (formValues.accountIds || []).map(account => 
        typeof account === 'object' ? account.id : account
      );

      // ✅ FIXED: Create clean payload structure to prevent context field pollution
      const cleanPayload = {
        investmentContact: investmentContactPayload,
        changeMode: changeMode,
        accountIds: extractedAccountIds, // ✅ UPDATED: Array of account IDs (extracted from objects if needed)
      };

      const isolatedPayload = JSON.parse(JSON.stringify(cleanPayload));
      

      dispatchProcessContinueEvent("pse_submit", isolatedPayload);

      // Call the onSubmit callback after dispatching the process event
      // This ensures the process event is always dispatched even if onSubmit fails
      try {
        await onSubmit(formValues);
      } catch (submitError) {
        console.warn(
          "onSubmit callback failed, but process event was dispatched:",
          submitError
        );
      }
    } catch (err) {
      console.error("Error submitting investment contact form:", err);
    }
  };

  // Handle form cancellation
  const handleCancel = async () => {
    try {
      await onCancel();

      // Dispatch process continue event for cancellation (pause)
      dispatchProcessContinueEvent("pse_pause", null);
    } catch (err) {
      console.error("Error cancelling investment contact form:", err);
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
          {/* Contact Owner Section - First and most important (WITHOUT section header) */}
          <OwnerInformationSection />

          {/* Personal Information Section */}
          <PersonalInformationSection />

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Submit and Cancel Buttons - Fixed at bottom (only shown when not embedded) */}
        {!hideActions && (
          <div className="gba:mt-6 gba:pt-4 gba:border-t gba:border-gray-200 gba:flex gba:gap-3">
            <Button
              type="button"
              variant="secondary"
              className="gba:flex-1"
              size="lg"
              onClick={handleCancel}
              data-testid={formatDataTestId(prefixDataTestId, "cancel-button")}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={!isFormValid || isLoading}
              className="gba:flex-1"
              size="lg"
              onClick={handleSubmit}
              data-testid={formatDataTestId(prefixDataTestId, "submit-button")}
            >
              {formValues.id ? "Update Contact" : "Create Contact"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactFormComponent;
