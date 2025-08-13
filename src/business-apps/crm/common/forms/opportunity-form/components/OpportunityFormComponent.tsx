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
import AdditionalInformationSection from "./AdditionalInformationSection";
import SearchableSelect from "./SearchableSelect";

const prefixDataTestId = "OpportunityForm";

const OpportunityFormComponent: React.FC = () => {
  const {
    formValues,
    setFormValues,
    onSubmit,
    onCancel,
    isLoading,
    error,
    salesCampaigns,
    salesCampaignsLoading,
    salesCampaignsError,
    salesCampaignsHasMore,
    searchSalesCampaigns,
    loadMoreSalesCampaigns,
  } = useOpportunityFormContext();

  // Check if all mandatory fields are filled - Pipeline is now mandatory instead of opportunity status
  const isFormValid =
    formValues.owner &&
    formValues.name &&
    formValues.pipeline &&
    formValues.estimatedAmount &&
    !isNaN(parseFloat(formValues.estimatedAmount)) &&
    parseFloat(formValues.estimatedAmount) > 0 &&
    formValues.currency;

  // Helper function to convert values to strings safely
  const toStringOrUndefined = (value: string): string | undefined => {
    return value && value.trim() ? value.trim() : undefined;
  };

  // Handle form submission
  const handleSubmit = async () => {
    console.log("Form values:", formValues);
    try {
      await onSubmit(formValues);

      // Prepare comprehensive opportunity payload following the API structure
      const opportunityPayload: any = {
        sourceApp: "CRM",
        name: toStringOrUndefined(formValues.name),
        accountId: toStringOrUndefined(formValues.accountId), // Account ID from selected company
        salesCampaign: toStringOrUndefined(formValues.salesCampaignId), // Campaign ID for backend
        opportunityStatusRef: toStringOrUndefined(formValues.opportunityStatus),
        pipelineRef: toStringOrUndefined(formValues.pipeline),
        salesPipelineRef: toStringOrUndefined(formValues.pipeline), // Same as pipelineRef
        salesPipelineStageRef: toStringOrUndefined(
          formValues.salesPipelineStage
        ),
        stage: toStringOrUndefined(formValues.stage),
        status: toStringOrUndefined(formValues.status),
        estimatedAmount: formValues.estimatedAmount
          ? parseFloat(formValues.estimatedAmount)
          : undefined,
        currencyRef: toStringOrUndefined(formValues.currency),
        closeDate: toStringOrUndefined(formValues.closeDate),
        winningChance: formValues.winningChance
          ? Number(formValues.winningChance)
          : undefined,
        personal: formValues.personal || false,
        notesSummary: toStringOrUndefined(formValues.notesSummary),
        ownerEmployee: toStringOrUndefined(formValues.owner),
      };

      const changeMode = "INSERT";

      const payload = {
        opportunity: opportunityPayload,
        changeMode: changeMode,
      };

      // Dispatch process continue event on successful submission
      dispatchProcessContinueEvent("pse_submit", payload);
    } catch (err) {
      console.error("Error submitting opportunity form:", err);
    }
  };

  // Handle form cancellation
  const handleCancel = async () => {
    try {
      await onCancel();

      // Dispatch process continue event for cancellation (pause)
      dispatchProcessContinueEvent("pse_pause", null);
    } catch (err) {
      console.error("Error cancelling opportunity form:", err);
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
          {/* Opportunity Information Section */}
          <OpportunityInformationSection />

          {/* Campaign Section */}
          <div className="gba:space-y-2">
            <SearchableSelect
              label="Sales Campaign"
              name="salesCampaignId"
              value={formValues.salesCampaignId}
              placeholder="Please Select Campaign..."
              options={salesCampaigns as any}
              loading={salesCampaignsLoading}
              hasMore={salesCampaignsHasMore}
              onSearch={searchSalesCampaigns}
              onLoadMore={loadMoreSalesCampaigns}
              onChange={(value) => {
                setFormValues({
                  salesCampaignId: value, // Store only ID for backend
                });
              }}
              error={salesCampaignsError}
              className="gba:w-full gba:min-w-[300px]"
              data-testid={formatDataTestId(prefixDataTestId, "CampaignSelect")}
            />
          </div>

          {/* Additional Information Section */}
          <AdditionalInformationSection />

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
            {formValues.id ? "Update Opportunity" : "Create Opportunity"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OpportunityFormComponent;
