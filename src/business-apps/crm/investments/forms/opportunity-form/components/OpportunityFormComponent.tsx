import React from "react";
import { useOpportunityFormContext } from "../context/OpportunityFormContext";
import {
  Button,
  Alert,
  AlertDescription,
  Spinner,
} from "@newwork/nw-design-system";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { dispatchProcessContinueEvent } from "@/common/utils/processEventUtils";
import OpportunityInformationSection from "./OpportunityInformationSection";

const prefixDataTestId = "InvestmentOpportunityForm";

const OpportunityFormComponent: React.FC = () => {
  const { formValues, onSubmit, onCancel, isLoading, error, businessAppContext, hideActions } =
    useOpportunityFormContext();

  // Check if all mandatory fields are filled for Investment Opportunity
  const isFormValid =
    formValues.owner &&
    formValues.name &&
    formValues.pipeline &&
    formValues.pipelineStage &&
    formValues.estimatedAmount &&
    !isNaN(parseFloat(formValues.estimatedAmount)) &&
    parseFloat(formValues.estimatedAmount) > 0 &&
    formValues.currency;

  // Helper function to convert values to strings safely
  const toStringOrUndefined = (value: string): string | undefined => {
    return value && value.trim() ? value.trim() : undefined;
  };

  // Handle form submission for Investment Opportunity
  const handleSubmit = async () => {
    // Prevent duplicate submissions
    if (isLoading) {
      console.log('🚫 Duplicate submission prevented - already loading');
      return;
    }

    try {
      console.log('⏳ Starting opportunity form submission');
      // Determine dealType: default to "INVESTMENT_DEAL" unless business context provides one
      const contextDealType = businessAppContext.additionalData?.dealType;
      const finalDealType = contextDealType || formValues.dealType || "INVESTMENT_DEAL";

      // Prepare comprehensive investment opportunity payload following the API structure
      const investmentOpportunityPayload: any = {
        sourceApp: "IRM",

        // Basic information (matching API structure exactly)
        name: toStringOrUndefined(formValues.name),
        investmentName: toStringOrUndefined(formValues.investmentName), // Separate investment name field
        code: toStringOrUndefined(formValues.code),
        businessKey: toStringOrUndefined(formValues.businessKey),
        dealType: finalDealType,

        // Financial information
        estimatedAmount: formValues.estimatedAmount
          ? parseFloat(formValues.estimatedAmount)
          : undefined,
        currencyRef: toStringOrUndefined(
          formValues.currency || formValues.currencyRef
        ),
        closeDate: toStringOrUndefined(formValues.closeDate),

        // Pipeline information (correct field names)
        opportunityPipelineRef: toStringOrUndefined(formValues.pipeline),
        opportunityPipelineStageRef: toStringOrUndefined(
          formValues.pipelineStage
        ),

        // Notes summary (top-level field as per API)
        notesSummary: toStringOrUndefined(formValues.notesSummary),

        // Investment-specific financial fields
        initialInvestmentAmount: formValues.initialInvestmentAmount
          ? parseFloat(formValues.initialInvestmentAmount)
          : undefined,
        forecastedProfitAmount: formValues.forecastedProfitAmount
          ? parseFloat(formValues.forecastedProfitAmount)
          : undefined,
        loanAmount: formValues.loanAmount
          ? parseFloat(formValues.loanAmount)
          : undefined,
        loanInterestRate: formValues.loanInterestRate
          ? parseFloat(formValues.loanInterestRate)
          : undefined,
        marketValue: formValues.marketValue
          ? parseFloat(formValues.marketValue)
          : undefined,
        requiredCapitalAmount: formValues.requiredCapitalAmount
          ? parseFloat(formValues.requiredCapitalAmount)
          : undefined,
        stakePercentage: formValues.stakePercentage
          ? parseFloat(formValues.stakePercentage)
          : undefined,
        annualNetColdRent: formValues.annualNetColdRent
          ? parseFloat(formValues.annualNetColdRent)
          : undefined,

        // Investment classification (catalog references)
        investmentGroupRef: toStringOrUndefined(formValues.investmentGroupRef),
        investmentTypeRef: toStringOrUndefined(formValues.investmentTypeRef),
        investmentRoleRef: toStringOrUndefined(formValues.investmentRoleRef),
        investmentStakeTypeRef: toStringOrUndefined(
          formValues.investmentStakeTypeRef
        ),

        // Real Estate specific fields
        buildingYear: formValues.buildingYear
          ? parseInt(formValues.buildingYear)
          : undefined,
        size: formValues.size
          ? parseFloat(formValues.size)
          : undefined,
        sizeMeasurementUnitRef: toStringOrUndefined(formValues.measurementUnit),

        // Relationships
        ownerEmployee: toStringOrUndefined(formValues.owner),
        account: toStringOrUndefined(formValues.account),


        // Additional properties (empty object as per API)
        additionalProperties: {},
      };

      // Determine change mode based on whether we have an ID
      const changeMode = formValues.id ? "UPDATE" : "INSERT";

      // Include ID and version for updates
      if (formValues.id) {
        investmentOpportunityPayload.id = formValues.id;
        investmentOpportunityPayload.version = formValues.version || 0;
      } else {
        // Set opportunityStatusRef to OPEN for new opportunities
        investmentOpportunityPayload.opportunityStatusRef = "InvestmentOpportunityStatus:v1:OPEN";
      }

      const payload = {
        investmentOpportunity: investmentOpportunityPayload,
        changeMode: changeMode,
      };

      // Dispatch process continue event FIRST (like account form)
      dispatchProcessContinueEvent("pse_submit", payload);

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
      console.error("Error submitting investment opportunity form:", err);
    }
  };

  // Handle form cancellation
  const handleCancel = async () => {
    try {
      await onCancel();

      // Dispatch process continue event for cancellation (pause)
      dispatchProcessContinueEvent("pse_pause", {});
    } catch (err) {
      console.error("Error cancelling investment opportunity form:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:p-8">
        <Spinner size="lg" />
        <span className="gba:ml-3 gba:text-gray-600">
          Loading investment opportunity data...
        </span>
      </div>
    );
  }

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:max-w-md gba:mx-auto gba:p-6">
      <div
        className="gba:h-full gba:flex gba:flex-col"
        data-testid={formatDataTestId(prefixDataTestId, "Form")}
      >
        {/* Form Fields Container - Takes up available space */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-8">
          {/* Investment Opportunity Information Section */}
          <OpportunityInformationSection />

          {/* Error Display */}
          {error && (
            <Alert
              variant="destructive"
              className="gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-md gba:p-4"
            >
              <AlertDescription className="gba:text-red-800 gba:text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Submit and Cancel Buttons - Fixed at bottom (only if not hidden) */}
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
              {formValues.id
                ? "Update Investment Opportunity"
                : "Create Investment Opportunity"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpportunityFormComponent;
