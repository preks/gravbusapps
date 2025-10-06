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
import AddressInformationSection from "./AddressInformationSection";
import FinancialInformationSection from "./FinancialInformationSection";
import ContactSelector from "./ContactSelector";

const prefixDataTestId = "AccountForm";

const AccountFormComponent: React.FC = () => {
  const { formValues, setFormValues, onSubmit, onCancel, isLoading, error, hideActions } =
    useAccountFormContext();

  // Check if all mandatory fields are filled
  const isFormValid =
    formValues.owner && formValues.accountName;

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

      // ✅ UPDATED: Prepare InvestmentAccount payload following the correct API structure
      const investmentAccountPayload: any = {
        sourceApp: "IRM", // ✅ FIXED: Changed from CRM to IRM for Investment Relations Management
        name: toStringOrUndefined(formValues.accountName), // ✅ FIXED: accountName → name
        legalFormRef: toStringOrUndefined(formValues.legalForm),
        industryClassRef: toStringOrUndefined(formValues.industry), // ✅ FIXED: industryRef → industryClassRef
        website: toStringOrUndefined(formValues.website),
        mission: toStringOrUndefined(formValues.description), // ✅ UPDATED: description → mission
        phone: toStringOrUndefined(formValues.phone),
        email: toStringOrUndefined(formValues.email),
        geographicPresence: toStringOrUndefined(formValues.geographicPresence), // ✅ FIXED: Use dedicated geographicPresence field
        
        // Address relationships (using the new addresses array structure)
        addresses: formValues.addresses?.filter(addr => 
          // Only include addresses that have some content
          addr.addressLines.some(line => line.trim()) || 
          addr.postalCode.trim() || 
          addr.locality.trim() ||
          addr.regionRef.trim() ||
          addr.countryRef.trim()
        ).map(addr => {
          const addressPayload: any = {
            addressType: "PRIMARY_ADDRESS", // Always set to PRIMARY_ADDRESS
            addressLine: addr.addressLines.filter(line => line.trim()).length > 0 
              ? { lines: addr.addressLines.filter(line => line.trim()) }
              : null,
            postalCode: addr.postalCode.trim() || null,
            locality: addr.locality.trim() || null,
            regionRef: addr.regionRef.trim() || null,
            countryRef: addr.countryRef.trim() || null,
          };

          // ✅ FIXED: Only include ID and version when updating an existing account
          // This prevents the backend from treating addresses as new inserts during updates
          if (isUpdate && addr.id && addr.id !== "default-address") {
            addressPayload.id = addr.id;
            // Include version for optimistic locking during address updates (only on update)
            if (addr.version !== undefined && addr.version !== null) {
              addressPayload.version = addr.version;
            }
          }

          return addressPayload;
        }) || [],
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
      }

      // ✅ REMOVED: InvestmentAccount doesn't have addresses array - using geographicPresence instead
      // (geographicPresence is already set above from formValues.addressLine1)

      // ✅ UPDATED: Initialize required arrays for InvestmentAccount
      investmentAccountPayload.tags = [];

      // Determine change mode based on whether we have an ID
      const changeMode = isUpdate ? "UPDATE" : "INSERT";

      // ✅ FIXED: Extract contact IDs from contactIds (handle both string[] and object[] formats)
      const extractedContactIds = (formValues.contactIds || []).map(contact => 
        typeof contact === 'object' ? contact.id : contact
      );

      // ✅ FIXED: Create clean payload structure to prevent context field pollution
      const cleanPayload = {
        investmentAccount: investmentAccountPayload,
        changeMode: changeMode,
        contactIds: extractedContactIds, // ✅ UPDATED: Array of contact IDs (extracted from objects if needed)
      };


      // ✅ FIXED: Create completely isolated payload to prevent context field pollution
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

          {/* Related Contact Selection - positioned right after Account Information */}
          <div className="gba:space-y-2">
            <ContactSelector
              value={formValues.contactIds}
              onChange={(contactIds) => setFormValues({ contactIds })}
              dataTestId={formatDataTestId(prefixDataTestId, "contact-selector")}
              error={null}
            />
          </div>


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
              data-testid={formatDataTestId(prefixDataTestId, "cancel-button")}
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
              data-testid={formatDataTestId(prefixDataTestId, "submit-button")}
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
