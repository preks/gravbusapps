import React from "react";
import { useAccountFormContext } from "../context/AccountFormContext";
import {
  Button,
  Alert,
  AlertDescription,
  Spinner,
} from "@newwork/nw-design-system";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { dispatchProcessContinueEvent } from "@/common/utils/processEventUtils";
import AccountInformationSection from "./AccountInformationSection";
import CompanyInformationSection from "./CompanyInformationSection";
import ContactInformationSection from "./ContactInformationSection";
import AddressInformationSection from "./AddressInformationSection";
import FinancialInformationSection from "./FinancialInformationSection";

const prefixDataTestId = "AccountForm";

const AccountFormComponent: React.FC = () => {
  const { formValues, onSubmit, onCancel, isLoading, error, hideActions } =
    useAccountFormContext();

  // Check if all mandatory fields are filled
  const isFormValid =
    formValues.owner && formValues.legalForm && formValues.accountName;

  // Helper function to convert values to strings safely
  const toStringOrUndefined = (
    value: string | undefined
  ): string | undefined => {
    return value && value.trim() ? value.trim() : undefined;
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      // ✅ FIXED: Determine operation mode based on account ID presence
      const isUpdate = formValues.id && formValues.id.trim();
      console.log(
        `🔄 Investment Account Form Mode: ${isUpdate ? "UPDATE" : "INSERT"}`,
        {
          accountId: formValues.id,
          accountName: formValues.accountName,
          isUpdate: isUpdate,
        }
      );

      // ✅ UPDATED: Prepare InvestmentAccount payload following the correct API structure
      const investmentAccountPayload: any = {
        sourceApp: "IRM", // ✅ FIXED: Changed from CRM to IRM for Investment Relations Management
        name: toStringOrUndefined(formValues.accountName), // ✅ FIXED: accountName → name
        code: toStringOrUndefined(formValues.tickerSymbol), // ✅ UPDATED: Use tickerSymbol as code
        legalFormRef: toStringOrUndefined(formValues.legalForm),
        industryClassRef: toStringOrUndefined(formValues.industry), // ✅ FIXED: industryRef → industryClassRef
        website: toStringOrUndefined(formValues.website),
        mission: toStringOrUndefined(formValues.description), // ✅ UPDATED: description → mission
        phone: toStringOrUndefined(formValues.phone),
        email: toStringOrUndefined(formValues.email),
        geographicPresence: toStringOrUndefined(formValues.geographicPresence), // ✅ FIXED: Use dedicated geographicPresence field
        specialty: undefined, // Not available in current form
        liquidationDate: undefined, // Not available in current form
        picture: undefined, // Not available in current form
        pictureThumbnail: undefined, // Not available in current form
        // ✅ REMOVED: businessKey mapping - sicCode field removed from form
        accountAnnualRevenueBandRef: toStringOrUndefined(
          formValues.annualRevenue
        ), // ✅ FIXED: annualRevenue → accountAnnualRevenueBandRef
        companySizeRef: toStringOrUndefined(formValues.numberOfEmployees), // ✅ FIXED: numberOfEmployeesRef → companySizeRef
        foundationDate: toStringOrUndefined(formValues.foundationDate),
        ownerEmployee: toStringOrUndefined(formValues.owner), // ✅ CORRECT: Keep as ownerEmployee (relationship field)
      };

      // ✅ FIXED: Handle ID and version for UPDATE mode only
      if (isUpdate) {
        investmentAccountPayload.id = formValues.id;
        if (formValues.version !== undefined && formValues.version !== null) {
          investmentAccountPayload.version = formValues.version;
        }
        console.log("✅ UPDATE mode - including ID and version:", {
          id: investmentAccountPayload.id,
          version: investmentAccountPayload.version,
        });
      } else {
        console.log("✅ INSERT mode - no ID or version included");
      }

      // ✅ REMOVED: InvestmentAccount doesn't have addresses array - using geographicPresence instead
      // (geographicPresence is already set above from formValues.addressLine1)

      // ✅ UPDATED: Initialize required arrays for InvestmentAccount
      investmentAccountPayload.tags = [];

      // Determine change mode based on whether we have an ID
      const changeMode = isUpdate ? "UPDATE" : "INSERT";

      // ✅ FIXED: Create clean payload structure to prevent context field pollution
      const cleanPayload = {
        investmentAccount: investmentAccountPayload,
        changeMode: changeMode,
      };

      // ✅ DEBUG: Log the final payload structure
      console.log(
        "🚀 Investment Account Clean Payload (no context pollution):",
        {
          changeMode: cleanPayload.changeMode,
          isUpdate: isUpdate,
          investmentAccountId: cleanPayload.investmentAccount?.id,
          sourceApp: cleanPayload.investmentAccount?.sourceApp,
          name: cleanPayload.investmentAccount?.name,
          industryClassRef: cleanPayload.investmentAccount?.industryClassRef,
          companySizeRef: cleanPayload.investmentAccount?.companySizeRef,
          accountAnnualRevenueBandRef:
            cleanPayload.investmentAccount?.accountAnnualRevenueBandRef,
          ownerEmployee: cleanPayload.investmentAccount?.ownerEmployee,
          payloadKeys: Object.keys(cleanPayload),
          investmentAccountKeys: Object.keys(
            cleanPayload.investmentAccount || {}
          ),
        }
      );

      // ✅ FIXED: Create completely isolated payload to prevent context field pollution
      const isolatedPayload = JSON.parse(JSON.stringify(cleanPayload));

      console.log(
        "✅ Investment Account form dispatching pse_submit event with ISOLATED payload:",
        isolatedPayload
      );
      console.log(
        "🔍 Payload keys before dispatch:",
        Object.keys(isolatedPayload)
      );

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
      console.error("Error submitting account form:", err);
    }
  };

  // Handle form cancellation
  const handleCancel = async () => {
    try {
      await onCancel();

      // Dispatch process continue event for cancellation (pause)
      dispatchProcessContinueEvent("pse_pause", null);
    } catch (err) {
      console.error("Error cancelling account form:", err);
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
          {/* Account Information Section */}
          <AccountInformationSection />

          {/* Company Information Section */}
          <CompanyInformationSection />

          {/* Contact Information Section */}
          <ContactInformationSection />

          {/* Address Information Section */}
          <AddressInformationSection />

          {/* Financial Information Section */}
          <FinancialInformationSection />

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
              data-testid={formatDataTestId(prefixDataTestId, "CancelButton")}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={!isFormValid}
              className="gba:flex-1"
              size="lg"
              onClick={handleSubmit}
              data-testid={formatDataTestId(prefixDataTestId, "SubmitButton")}
            >
              {isLoading && <Spinner size="sm" className="gba:mr-2" />}
              {formValues.id ? "Update Account" : "Create Account"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountFormComponent;
