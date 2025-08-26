import React, { useEffect, useRef } from "react";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  Alert,
  AlertDescription,
} from "@newwork/nw-design-system";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { useOpportunityFormContext } from "../context/OpportunityFormContext";
import OwnerSelector from "./OwnerSelector";
import SearchableSelect from "./SearchableSelect";
import { useCurrenciesGraphQL } from "../hooks/useCurrenciesGraphQL";
import { useAccountsGraphQL } from "../hooks/useAccountsGraphQL";
import { DEAL_TYPES, RECORD_STATES } from "../types";

const prefixDataTestId = "InvestmentOpportunityForm";

const OpportunityInformationSection: React.FC = () => {
  const {
    formValues,
    setFormValues,
    error,
    employeePositions,
    employeePositionsLoading,
    employeePositionsError,
    employeePositionsHasMore,
    searchEmployeePositions,
    loadMoreEmployeePositions,
    pipelines,
    pipelineStages,
    pipelineStagesLoading,
    refetchStages,
    businessAppContext,
  } = useOpportunityFormContext();

  // Simple currencies hook
  const {
    options: simpleCurrencies,
    loading: simpleCurrenciesLoading,
    error: simpleCurrenciesError,
    hasMore: simpleCurrenciesHasMore,
    search: searchSimpleCurrencies,
    loadMore: loadMoreSimpleCurrencies,
  } = useCurrenciesGraphQL({
    accessToken: businessAppContext.accessToken,
  });

  // Simple accounts hook
  const {
    options: simpleAccounts,
    loading: simpleAccountsLoading,
    error: simpleAccountsError,
    hasMore: simpleAccountsHasMore,
    search: searchSimpleAccounts,
    loadMore: loadMoreSimpleAccounts,
  } = useAccountsGraphQL({
    accessToken: businessAppContext.accessToken,
  });

  // Ref to track previous pipeline to detect changes
  const previousPipelineRef = useRef<string>(formValues.pipeline);

  // Auto-select "Standard" pipeline option if not already selected, fallback to first option
  useEffect(() => {
    if (pipelines.length > 0 && !formValues.pipeline) {
      console.log(
        "🎯 Auto-selecting pipeline from",
        pipelines.length,
        "options"
      );

      // First try to find "Standard" pipeline (case-insensitive)
      const standardPipeline = pipelines.find(
        (pipeline) =>
          pipeline.label?.toLowerCase().includes("standard") ||
          pipeline.name?.toLowerCase().includes("standard") ||
          pipeline.value?.toLowerCase().includes("standard") ||
          pipeline.id?.toLowerCase().includes("standard")
      );

      // Select Standard if found, otherwise select first option
      const selectedPipeline = standardPipeline || pipelines[0];
      setFormValues({ pipeline: selectedPipeline.value });
    }
  }, [pipelines.length, formValues.pipeline, setFormValues]);

  // Handle pipeline changes: load stages for new pipeline
  useEffect(() => {
    const currentPipeline = formValues.pipeline;
    const previousPipeline = previousPipelineRef.current;

    console.log("🔍 Pipeline changed:", {
      currentPipeline,
      previousPipeline,
      hasRefetchStages: !!refetchStages,
    });

    if (currentPipeline && refetchStages) {
      console.log("📡 Loading stages for pipeline:", currentPipeline);
      refetchStages(currentPipeline);
    }

    // Update the ref to track current pipeline
    previousPipelineRef.current = currentPipeline;
  }, [formValues.pipeline, refetchStages]);

  // When stages are loaded, ALWAYS set first stage as selected
  useEffect(() => {
    if (formValues.pipeline && pipelineStages.length > 0) {
      const firstStage = pipelineStages[0];
      console.log(
        "🎯 Setting first stage:",
        firstStage.label,
        "Value:",
        firstStage.value
      );
      setFormValues({ pipelineStage: firstStage.value });
    }
  }, [formValues.pipeline, pipelineStages.length, setFormValues]);

  // Handle form field changes
  const handleInputChange = (field: string, value: string) => {
    console.log(`🔄 Updating ${field}:`, value);

    // Update the form values and also set the accountId for the backend
    if (field === "account") {
      const selectedAccount = simpleAccounts.find((acc) => acc.value === value);
      setFormValues({
        [field]: value,
        accountId: selectedAccount?.id || value, // Use account ID for backend
      });
    } else {
      setFormValues({ [field]: value });
    }
  };

  return (
    <Card
      className="gba:border-0 gba:shadow-none gba:bg-transparent"
      style={{
        border: "0",
        borderWidth: "0",
        borderStyle: "none",
        borderColor: "transparent",
        boxShadow: "none",
        padding: "0",
        background: "transparent",
      }}
    >
      <CardContent
        className="gba:space-y-6 gba:p-0"
        style={{
          border: "0",
          borderWidth: "0",
          borderStyle: "none",
          borderColor: "transparent",
          boxShadow: "none",
          padding: "0",
          background: "transparent",
        }}
      >
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Owner Selection */}
        <div className="gba:space-y-2">
          <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900">
            Owner <span className="gba:text-red-500">*</span>
          </Label>
          <OwnerSelector
            value={formValues.owner}
            onChange={(value) => handleInputChange("owner", value)}
            employees={employeePositions}
            loading={employeePositionsLoading}
            error={employeePositionsError}
            hasMore={employeePositionsHasMore}
            onSearch={searchEmployeePositions}
            onLoadMore={loadMoreEmployeePositions}
            dataTestId={formatDataTestId(prefixDataTestId, "owner")}
          />
        </div>

        {/* Investment Name */}
        <div className="gba:space-y-2">
          <Label
            htmlFor="investmentName"
            className="gba:block gba:text-sm gba:font-medium gba:text-gray-900"
          >
            Investment Name <span className="gba:text-red-500">*</span>
          </Label>
          <Input
            id="investmentName"
            value={formValues.name || ""}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="Please enter investment name..."
            className="gba:border-gray-300 gba:bg-white"
            data-testid={formatDataTestId(prefixDataTestId, "investment-name")}
          />
        </div>

        {/* Deal Type */}
        <div className="gba:space-y-2">
          <Label
            htmlFor="dealType"
            className="gba:block gba:text-sm gba:font-medium gba:text-gray-900"
          >
            Deal Type
          </Label>
          <Select
            value={formValues.dealType || ""}
            onValueChange={(value) => handleInputChange("dealType", value)}
            data-testid={formatDataTestId(prefixDataTestId, "deal-type")}
          >
            <SelectTrigger className="gba:border-gray-300 gba:bg-white">
              <SelectValue placeholder="Please select deal type..." />
            </SelectTrigger>
            <SelectContent>
              {DEAL_TYPES.map((dealType) => (
                <SelectItem key={dealType.id} value={dealType.value}>
                  {dealType.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Pipeline and Stage - Side by Side */}
        <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
          {/* Pipeline */}
          <div className="gba:space-y-2">
            <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900">
              Pipeline <span className="gba:text-red-500">*</span>
            </Label>
            <Select
              value={formValues.pipeline || ""}
              onValueChange={(value) => handleInputChange("pipeline", value)}
              data-testid={formatDataTestId(prefixDataTestId, "pipeline")}
            >
              <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                <SelectValue placeholder="Please select pipeline..." />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((pipeline) => (
                  <SelectItem key={pipeline.id} value={pipeline.value}>
                    {pipeline.label || pipeline.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pipeline Stage */}
          <div className="gba:space-y-2">
            <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900">
              Stage <span className="gba:text-red-500">*</span>
            </Label>
            <Select
              value={formValues.pipelineStage || ""}
              onValueChange={(value) =>
                handleInputChange("pipelineStage", value)
              }
              onOpenChange={() => {
                if (formValues.pipeline && refetchStages) {
                  refetchStages(formValues.pipeline);
                }
              }}
              disabled={!formValues.pipeline || pipelineStagesLoading}
              data-testid={formatDataTestId(prefixDataTestId, "pipeline-stage")}
            >
              <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                <SelectValue
                  placeholder={
                    !formValues.pipeline
                      ? "Select Pipeline First..."
                      : pipelineStages.length === 0 && !pipelineStagesLoading
                      ? "No Stages Available"
                      : "Please select stage..."
                  }
                />
              </SelectTrigger>
              <SelectContent
                className="gba:max-h-[200px] gba:overflow-y-auto"
                style={{ maxHeight: "200px", overflowY: "auto" }}
              >
                {pipelineStages.length === 0 && !pipelineStagesLoading ? (
                  <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-gray-500 gba:text-center">
                    {!formValues.pipeline
                      ? "Please select a pipeline first"
                      : "No stages available for this pipeline"}
                  </div>
                ) : (
                  pipelineStages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.value}>
                      {stage.label || stage.name}
                    </SelectItem>
                  ))
                )}
                {pipelineStagesLoading && (
                  <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-gray-600 gba:text-center">
                    Loading stages...
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Estimated Amount and Currency - Same Row */}
        <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
          <div className="gba:space-y-2">
            <Label
              htmlFor="estimatedAmount"
              className="gba:block gba:text-sm gba:font-medium gba:text-gray-900"
            >
              Estimated Amount <span className="gba:text-red-500">*</span>
            </Label>
            <Input
              id="estimatedAmount"
              type="number"
              value={formValues.estimatedAmount || ""}
              onChange={(e) =>
                handleInputChange("estimatedAmount", e.target.value)
              }
              placeholder="Please enter estimated amount..."
              className="gba:border-gray-300 gba:bg-white"
              data-testid={formatDataTestId(
                prefixDataTestId,
                "estimated-amount"
              )}
            />
          </div>

          <div className="gba:space-y-2">
            <SearchableSelect
              label="Currency *"
              name="currency"
              value={formValues.currency}
              onChange={(value) => handleInputChange("currency", value)}
              options={simpleCurrencies}
              loading={simpleCurrenciesLoading}
              error={simpleCurrenciesError}
              hasMore={simpleCurrenciesHasMore}
              onSearch={searchSimpleCurrencies}
              onLoadMore={loadMoreSimpleCurrencies}
              placeholder="Please Select..."
              data-testid={formatDataTestId(prefixDataTestId, "currency")}
            />
          </div>
        </div>

        {/* Close Date */}
        <div className="gba:space-y-2">
          <Label
            htmlFor="closeDate"
            className="gba:block gba:text-sm gba:font-medium gba:text-gray-900"
          >
            Expected Close Date
          </Label>
          <Input
            id="closeDate"
            type="date"
            value={formValues.closeDate || ""}
            onChange={(e) => handleInputChange("closeDate", e.target.value)}
            className="gba:border-gray-300 gba:bg-white"
            data-testid={formatDataTestId(prefixDataTestId, "close-date")}
          />
        </div>

        {/* Related Account */}
        <div className="gba:space-y-2">
          <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900">
            Related Investment Account
          </Label>
          <SearchableSelect
            name="account"
            value={formValues.account}
            onChange={(value) => handleInputChange("account", value)}
            options={simpleAccounts}
            loading={simpleAccountsLoading}
            error={simpleAccountsError}
            hasMore={simpleAccountsHasMore}
            onSearch={searchSimpleAccounts}
            onLoadMore={loadMoreSimpleAccounts}
            placeholder="Please select investment account..."
            data-testid={formatDataTestId(prefixDataTestId, "account")}
          />
        </div>

        {/* Forecasted Profit Amount */}
        <div className="gba:space-y-2">
          <Label
            htmlFor="forecastedProfitAmount"
            className="gba:block gba:text-sm gba:font-medium gba:text-gray-900"
          >
            Forecasted Profit
          </Label>
          <Input
            id="forecastedProfitAmount"
            type="number"
            value={formValues.forecastedProfitAmount || ""}
            onChange={(e) =>
              handleInputChange("forecastedProfitAmount", e.target.value)
            }
            placeholder="Please enter forecasted profit..."
            className="gba:border-gray-300 gba:bg-white"
            data-testid={formatDataTestId(
              prefixDataTestId,
              "forecasted-profit"
            )}
          />
        </div>

        {/* Initial Investment Amount */}
        <div className="gba:space-y-2">
          <Label
            htmlFor="initialInvestmentAmount"
            className="gba:block gba:text-sm gba:font-medium gba:text-gray-900"
          >
            Initial Investment Amount
          </Label>
          <Input
            id="initialInvestmentAmount"
            type="number"
            value={formValues.initialInvestmentAmount || ""}
            onChange={(e) =>
              handleInputChange("initialInvestmentAmount", e.target.value)
            }
            placeholder="Please enter initial investment amount..."
            className="gba:border-gray-300 gba:bg-white"
            data-testid={formatDataTestId(
              prefixDataTestId,
              "initial-investment"
            )}
          />
        </div>

        {/* Investment Code and Record State - Same Row */}
        <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
          <div className="gba:space-y-2">
            <Label
              htmlFor="code"
              className="gba:block gba:text-sm gba:font-medium gba:text-gray-900"
            >
              Investment Code
            </Label>
            <Input
              id="code"
              value={formValues.code || ""}
              onChange={(e) => handleInputChange("code", e.target.value)}
              placeholder="Please enter investment code..."
              className="gba:border-gray-300 gba:bg-white"
              data-testid={formatDataTestId(
                prefixDataTestId,
                "investment-code"
              )}
            />
          </div>

          <div className="gba:space-y-2">
            <Label
              htmlFor="recordState"
              className="gba:block gba:text-sm gba:font-medium gba:text-gray-900"
            >
              Record State
            </Label>
            <Select
              value={formValues.recordState || ""}
              onValueChange={(value) => handleInputChange("recordState", value)}
              data-testid={formatDataTestId(prefixDataTestId, "record-state")}
            >
              <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                <SelectValue placeholder="Please select record state..." />
              </SelectTrigger>
              <SelectContent>
                {RECORD_STATES.map((state) => (
                  <SelectItem key={state.id} value={state.value}>
                    {state.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OpportunityInformationSection;
