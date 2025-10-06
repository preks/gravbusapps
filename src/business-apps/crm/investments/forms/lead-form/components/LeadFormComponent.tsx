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

  // Local loading state for submission
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Check if all mandatory fields are filled
  const isFormValid =
    toStringOrUndefined(formValues.firstName) &&
    toStringOrUndefined(formValues.lastName) &&
    toStringOrUndefined(formValues.company) &&
    toStringOrUndefined(formValues.owner);

  // Handle form submission
  const handleSubmit = async () => {
    // Prevent duplicate submissions
    if (isLoading || isSubmitting) {
      console.log('🚫 Duplicate lead submission prevented - already loading');
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare comprehensive InvestmentLead payload following the API structure
      const leadPayload: any = {
        sourceApp: "IRM", // ✅ FIXED: Changed from CRM to IRM for Investment Relations Management

        // ✅ UPDATED: Contact Information with new fields
        academicTitleRef: toStringOrUndefined(formValues.academicTitle),
        firstName: toStringOrUndefined(formValues.firstName),
        lastName: toStringOrUndefined(formValues.lastName),
        phoneNumber: toStringOrUndefined(formValues.phone),
        email: toStringOrUndefined(formValues.email),
        position: toStringOrUndefined(formValues.jobPosition),
        sensitive: formValues.sensitive,

        // ✅ UPDATED: Lead Information with new fields
        leadRatingRef: toStringOrUndefined(formValues.rating),
        leadStatusRef: toStringOrUndefined(formValues.leadStatus),
        leadSourceRef: toStringOrUndefined(formValues.leadSource),

        // ✅ UPDATED: Company Information with fixed field names
        companyName: toStringOrUndefined(formValues.company),
        companyEmail: toStringOrUndefined(formValues.companyEmail),
        companyPhone: toStringOrUndefined(formValues.companyPhone),
        companyWebsite: toStringOrUndefined(formValues.website),
        legalFormRef: toStringOrUndefined(formValues.legalForm),
        companySizeRef: toStringOrUndefined(formValues.numberOfEmployees), // ✅ FIXED: numberOfEmployeesRef → companySizeRef
        industryClassRef: toStringOrUndefined(formValues.industry), // ✅ FIXED: industryRef → industryClassRef
        accountAnnualRevenueBandRef: toStringOrUndefined(
          formValues.annualRevenue
        ), // ✅ FIXED: annualRevenueRef → accountAnnualRevenueBandRef

        // ✅ FIXED: Owner Information with correct API field name
        ownerEmployee: toStringOrUndefined(formValues.owner), // ✅ FIXED: API expects 'ownerEmployee' not 'ownerEmployeeId'

        // ✅ UPDATED: Address Information collecting all address lines
        countryRef: toStringOrUndefined(formValues.country),
        regionRef: toStringOrUndefined(formValues.region),
        locality: toStringOrUndefined(formValues.locality), // ✅ UPDATED: Use formValues.locality
        postalCode: toStringOrUndefined(formValues.postalCode),
        addressLine: (() => {
          // Collect all non-empty address lines
          const addressLines = [
            formValues.addressLine1,
            formValues.addressLine2,
            formValues.addressLine3,
            formValues.addressLine4,
          ]
            .filter((line) => line && line.trim())
            .map((line) => line!.trim());
          
          return addressLines.length > 0 ? { lines: addressLines } : null;
        })(),

        // ✅ FIXED: Conversion Information with correct API field names
        convertedAccount: toStringOrUndefined(formValues.accountId), // ✅ FIXED: API expects 'convertedAccount' not 'convertedAccountId'
        conversionDate: formValues.conversionDate
          ? new Date(formValues.conversionDate).toISOString()
          : null, // ✅ ADDED: Conversion date
        convertedContact: toStringOrUndefined(formValues.convertedContactId), // ✅ FIXED: API expects 'convertedContact' not 'convertedContactId'
        convertedOpportunity: toStringOrUndefined(
          formValues.convertedOpportunityId
        ), // ✅ FIXED: API expects 'convertedOpportunity' not 'convertedOpportunityId'

        // ✅ UPDATED: Investment-specific fields (unchanged - already correct)
        investmentName: toStringOrUndefined(formValues.investmentName),
        investmentGroupRef: toStringOrUndefined(formValues.investmentGroup),
        investmentTypeRef: toStringOrUndefined(formValues.investmentType),
        investmentRoleRef: toStringOrUndefined(formValues.investmentRole),
        investmentStakeTypeRef: toStringOrUndefined(
          formValues.investmentStakeType
        ),
        stakePercentage: formValues.stakePercentage
          ? parseFloat(formValues.stakePercentage)
          : null,
        marketValue: formValues.marketValue
          ? parseFloat(formValues.marketValue)
          : null,
        initialInvestmentAmount: formValues.initialInvestmentAmount
          ? parseFloat(formValues.initialInvestmentAmount)
          : null,
        loanAmount: formValues.loanAmount
          ? parseFloat(formValues.loanAmount)
          : null,
        loanInterestRate: formValues.loanInterestRate
          ? parseFloat(formValues.loanInterestRate)
          : null,
        requiredCapitalAmount: formValues.requiredCapitalAmount
          ? parseFloat(formValues.requiredCapitalAmount)
          : null,
        forecastedProfitAmount: formValues.forecastedProfitAmount
          ? parseFloat(formValues.forecastedProfitAmount)
          : null,
        annualNetColdRent: formValues.annualNetColdRent
          ? parseFloat(formValues.annualNetColdRent)
          : null,
        
        // Real Estate Specific Fields
        buildingYear: formValues.buildingYear
          ? parseInt(formValues.buildingYear)
          : null,
        size: formValues.size
          ? parseFloat(formValues.size)
          : null,
        sizeMeasurementUnitRef: toStringOrUndefined(formValues.measurementUnit),
      };

      leadPayload.tags = [];

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
      leadPayload.communicationChannels = communicationChannels;

      // ✅ ADDED: Ensure numerical fields are properly set (API validation)
      leadPayload.stakePercentage = leadPayload.stakePercentage || 0;
      leadPayload.marketValue = leadPayload.marketValue || 0;
      leadPayload.initialInvestmentAmount =
        leadPayload.initialInvestmentAmount || 0;
      leadPayload.loanAmount = leadPayload.loanAmount || 0;
      leadPayload.loanInterestRate = leadPayload.loanInterestRate || 0;
      leadPayload.requiredCapitalAmount =
        leadPayload.requiredCapitalAmount || 0;
      leadPayload.forecastedProfitAmount =
        leadPayload.forecastedProfitAmount || 0;
      leadPayload.annualNetColdRent = leadPayload.annualNetColdRent || 0;

      // Use UPDATE mode if editing existing lead, INSERT for new lead
      const changeMode = formValues.id ? "UPDATE" : "INSERT";

      // Add id and version for UPDATE mode
      if (changeMode === "UPDATE" && formValues.id) {
        leadPayload.id = formValues.id;
        leadPayload.version = formValues.version;
      }

      // ✅ FIXED: Use same pattern as account form (account: accountPayload, changeMode: changeMode)
      const payload = {
        investmentLead: leadPayload,
        changeMode: changeMode,
      };

      // Dispatch process continue event on successful submission
      dispatchProcessContinueEvent("pse_submit", payload);

      // Wait for process completion event
      await new Promise<void>((resolve) => {
        const TIMEOUT = 10000; // 10 second timeout for safety
        const timeoutId = setTimeout(() => {
          console.log('⏱️ Process completion timeout reached, proceeding...');
          cleanup();
          resolve();
        }, TIMEOUT);

        const handleProcessCompletion = (event: Event) => {
          const customEvent = event as CustomEvent<{ resolution: 'success' | 'failure' }>;
          console.log('🎉 Process completion event received:', customEvent.detail);
          if (
            customEvent.detail?.resolution === 'success' ||
            customEvent.detail?.resolution === 'failure'
          ) {
            cleanup();
            resolve();
          }
        };

        const cleanup = () => {
          clearTimeout(timeoutId);
          window.removeEventListener('com.newwork.process.processCompletion', handleProcessCompletion);
          window.removeEventListener('com.newwork.process.taskCompletion', handleProcessCompletion);
        };

        window.addEventListener('com.newwork.process.processCompletion', handleProcessCompletion);
        window.addEventListener('com.newwork.process.taskCompletion', handleProcessCompletion);
      });

      console.log('✅ Lead form submitted and process completed');
    } catch (err) {
      console.error("Error submitting lead form:", err);
    } finally {
      setIsSubmitting(false);
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
              dataTestId={formatDataTestId(prefixDataTestId, "owner-selector-select")}
            />
          </div>

          {/* Lead Information Section */}
          <LeadInformationSection />

          {/* Contact Information Section */}
          <ContactInformationSection />

          {/* Company Information Section */}
          <CompanyInformationSection />


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
            data-testid={formatDataTestId(prefixDataTestId, "cancel-button")}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            disabled={!isFormValid || isLoading || isSubmitting}
            className="gba:flex-1"
            size="lg"
            onClick={handleSubmit}
            data-testid={formatDataTestId(prefixDataTestId, "submit-button")}
          >
            {formValues.id ? "Update Lead" : "Create Lead"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LeadFormComponent;
