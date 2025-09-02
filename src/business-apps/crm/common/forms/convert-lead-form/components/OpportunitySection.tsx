import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Form } from "antd";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input as DesignInput,
  Select as DesignSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea as DesignTextarea,
  Label,
} from "@newwork/nw-design-system";
import SearchableSelect from "./SearchableSelect";
import OwnerSelector from "./OwnerSelector";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useAccountsGraphQL } from "../../opportunity-form/hooks/useAccountsGraphQL";
import { useCurrenciesGraphQL } from "../../opportunity-form/hooks/useCurrenciesGraphQL";
import { usePipelineCatalogs } from "../../opportunity-form/hooks/usePipelineCatalogs";
import { useOpportunityStatusCatalog } from "../../opportunity-form/hooks/useOpportunityStatusCatalog";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";

// Define SelectOption interface for SearchableSelect
interface SelectOption {
  id: string | number;
  value: string;
  label: string;
  name: string;
  extraInfo?: {
    pictureThumbnail?: string;
    jobPosition?: string;
    organizationalUnit?: string;
  };
}

export interface OpportunitySectionProps extends BusinessAppContextProps {
  form: any; // Ant Design form instance
  opportunityEmployeePositions: SelectOption[];
  opportunityEmployeePositionsLoading: boolean;
  opportunityEmployeePositionsHasMore: boolean;
  loadMoreOpportunityEmployeePositions: () => Promise<void>;
  searchOpportunityEmployeePositions: (searchTerm?: string) => void;
  opportunityEmployeePositionsError: string | null;
}

const OpportunitySection: React.FC<OpportunitySectionProps> = ({
  accessToken,
  form,
  opportunityEmployeePositions,
  opportunityEmployeePositionsLoading,
  opportunityEmployeePositionsHasMore,
  loadMoreOpportunityEmployeePositions,
  searchOpportunityEmployeePositions,
  opportunityEmployeePositionsError,
}) => {
  // State for pipeline management
  const [currentPipeline, setCurrentPipeline] = useState<string>("");

  // Hooks for opportunity data
  const { pipelineOptions, pipelineStageOptions, refetchStages } =
    usePipelineCatalogs({ accessToken }, currentPipeline);

  // Accounts hook for account selection
  const {
    options: simpleAccounts,
    loading: simpleAccountsLoading,
    hasMore: simpleAccountsHasMore,
    search: searchSimpleAccounts,
    loadMore: loadMoreSimpleAccounts,
    error: simpleAccountsError,
  } = useAccountsGraphQL({ accessToken });

  // Currencies hook
  const {
    options: stringCurrencies,
    loading: currenciesLoading,
    hasMore: currenciesHasMore,
    search: searchCurrencies,
    loadMore: loadMoreCurrencies,
    error: currenciesError,
  } = useCurrenciesGraphQL({
    accessToken,
  });

  // Opportunity status hook
  const { opportunityStatusOptions } = useOpportunityStatusCatalog({
    accessToken,
  });

  // Transform pipeline and stage options
  const pipelines = useMemo(
    () => pipelineOptions as SelectOption[],
    [pipelineOptions]
  );

  const salesPipelineStages = useMemo(
    () => pipelineStageOptions as SelectOption[],
    [pipelineStageOptions]
  );

  // Auto-set default pipeline when pipelines are loaded
  useEffect(() => {
    if (pipelines.length > 0 && !form.getFieldValue("opportunityPipeline")) {
      // Try to find "standard" pipeline first, otherwise use the first one
      const standardPipeline = pipelines.find(
        (p) =>
          p?.label?.toLowerCase().includes("standard") ||
          p?.value?.toLowerCase().includes("standard") ||
          p?.name?.toLowerCase().includes("standard")
      );

      const selectedPipeline = standardPipeline || pipelines[0];
      form.setFieldsValue({ opportunityPipeline: selectedPipeline.value });
      setCurrentPipeline(selectedPipeline.value); // Trigger stages refetch automatically
    }
  }, [pipelines, form]);

  // Initialize form with CRM default source app
  useEffect(() => {
    if (!form.getFieldValue("opportunitySourceApp")) {
      form.setFieldsValue({ opportunitySourceApp: "CRM" });
    }
  }, [form]);

  // Auto-set default stage when stages are loaded
  useEffect(() => {
    if (currentPipeline) {
      if (salesPipelineStages.length > 0) {
        form.setFieldsValue({
          opportunitySalesPipelineStage: salesPipelineStages[0].value,
        });
      } else if (form.getFieldValue("opportunitySalesPipelineStage")) {
        // Clear the stage if no stages are available for the selected pipeline
        form.setFieldsValue({ opportunitySalesPipelineStage: "" });
      }
    }
  }, [salesPipelineStages, currentPipeline, form]);

  return (
    <Card className="gba:mb-4" data-testid="opportunity-section">
      <CardHeader>
        <CardTitle className="gba:text-lg gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel(
            "crm:convertLead.opportunity",
            "Opportunity"
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-2">
          {/* Opportunity Name */}
          <div>
            <Form.Item
              name="opportunityName"
              label={getTranslationFromI18nKeyAndLabel(
                "crm:opportunity.name",
                "Opportunity Name"
              )}
              rules={[
                {
                  required: true,
                  message: getTranslationFromI18nKeyAndLabel(
                    "crm:opportunity.nameRequired",
                    "Please enter opportunity name"
                  ),
                },
              ]}
            >
              <DesignInput
                data-testid="opportunity-name"
                className="gba:h-11 gba:px-3 gba:text-sm"
              />
            </Form.Item>
          </div>

          {/* Account Selection for Opportunity */}
          <div>
            <Form.Item
              name="opportunityAccountId"
              label={getTranslationFromI18nKeyAndLabel(
                "crm:opportunity.account",
                "Account"
              )}
            >
              <SearchableSelect
                name="opportunityAccountId"
                value={form.getFieldValue("opportunityAccountId")}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  "crm:opportunity.selectAccount",
                  "Search and select account..."
                )}
                options={simpleAccounts.map((account: any) => ({
                  id: account.id,
                  value: account.id,
                  label: account?.name,
                  name: account?.name,
                }))}
                onSearch={searchSimpleAccounts}
                loading={simpleAccountsLoading}
                hasMore={simpleAccountsHasMore}
                onLoadMore={loadMoreSimpleAccounts}
                onChange={(value: string) => {
                  form.setFieldsValue({ opportunityAccountId: value });
                }}
                error={simpleAccountsError}
                data-testid="opportunity-account-select"
              />
            </Form.Item>
          </div>

          {/* Pipeline and Stage */}
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-2">
            <div>
              <Form.Item
                name="opportunityPipeline"
                label={getTranslationFromI18nKeyAndLabel(
                  "crm:opportunity.pipeline",
                  "Pipeline"
                )}
                rules={[
                  {
                    required: true,
                    message: getTranslationFromI18nKeyAndLabel(
                      "crm:opportunity.pipelineRequired",
                      "Please select pipeline"
                    ),
                  },
                ]}
              >
                <DesignSelect
                  value={form.getFieldValue("opportunityPipeline")}
                  onValueChange={(value) => {
                    form.setFieldsValue({
                      opportunityPipeline: value,
                      opportunitySalesPipelineStage: "", // Reset stage when pipeline changes
                    });
                    setCurrentPipeline(value); // Trigger stages refetch automatically
                  }}
                  data-testid="opportunity-pipeline-select"
                >
                  <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                    <SelectValue
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        "crm:opportunity.selectPipeline",
                        "Select Pipeline"
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent
                    className="gba:max-h-[200px] gba:overflow-y-auto"
                    style={{
                      maxHeight: "200px",
                      overflowY: "auto",
                    }}
                  >
                    {pipelines.map((option) => (
                      <SelectItem key={option.id} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </DesignSelect>
              </Form.Item>
            </div>
            <div>
              <Form.Item
                name="opportunitySalesPipelineStage"
                label={getTranslationFromI18nKeyAndLabel(
                  "crm:opportunity.salesPipelineStage",
                  "Sales Pipeline Stage"
                )}
                rules={[
                  {
                    required: true,
                    message: getTranslationFromI18nKeyAndLabel(
                      "crm:opportunity.stageRequired",
                      "Please select stage"
                    ),
                  },
                ]}
              >
                <DesignSelect
                  value={form.getFieldValue("opportunitySalesPipelineStage")}
                  onValueChange={(value) =>
                    form.setFieldsValue({
                      opportunitySalesPipelineStage: value,
                    })
                  }
                  data-testid="opportunity-sales-pipeline-stage-select"
                >
                  <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                    <SelectValue
                      placeholder={
                        !form.getFieldValue("opportunityPipeline")
                          ? getTranslationFromI18nKeyAndLabel(
                              "crm:opportunity.selectPipelineFirst",
                              "Select Pipeline First..."
                            )
                          : salesPipelineStages.length === 0
                          ? getTranslationFromI18nKeyAndLabel(
                              "crm:opportunity.noStagesAvailable",
                              "No Stages Available"
                            )
                          : getTranslationFromI18nKeyAndLabel(
                              "crm:opportunity.selectStage",
                              "Select Stage"
                            )
                      }
                    />
                  </SelectTrigger>
                  <SelectContent
                    className="gba:max-h-[200px] gba:overflow-y-auto"
                    style={{
                      maxHeight: "200px",
                      overflowY: "auto",
                    }}
                  >
                    {salesPipelineStages.length === 0 ? (
                      <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-gray-500 gba:text-center">
                        {!form.getFieldValue("opportunityPipeline")
                          ? "Please select a pipeline first"
                          : "No stages available for this pipeline"}
                      </div>
                    ) : (
                      salesPipelineStages.map((option) => (
                        <SelectItem key={option.id} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </DesignSelect>
              </Form.Item>
            </div>
          </div>

          {/* Estimated Amount and Currency */}
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-2">
            <div>
              <Form.Item
                name="opportunityEstimatedAmount"
                label={getTranslationFromI18nKeyAndLabel(
                  "crm:opportunity.estimatedAmount",
                  "Estimated Amount"
                )}
              >
                <DesignInput
                  data-testid="opportunity-estimated-amount"
                  type="number"
                  step="0.01"
                  className="gba:h-11 gba:px-3 gba:text-sm"
                />
              </Form.Item>
            </div>
            <div>
              <Form.Item
                name="opportunityCurrency"
                label={getTranslationFromI18nKeyAndLabel(
                  "crm:opportunity.currency",
                  "Currency"
                )}
              >
                <SearchableSelect
                  name="opportunityCurrency"
                  value={form.getFieldValue("opportunityCurrency")}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    "crm:opportunity.selectCurrency",
                    "Select Currency"
                  )}
                  options={stringCurrencies}
                  loading={currenciesLoading}
                  hasMore={currenciesHasMore}
                  onSearch={searchCurrencies}
                  onLoadMore={loadMoreCurrencies}
                  onChange={(value) => {
                    form.setFieldsValue({ opportunityCurrency: value });
                  }}
                  error={currenciesError}
                  data-testid="opportunity-currency-select"
                />
              </Form.Item>
            </div>
          </div>

          {/* Winning Chance and Close Date */}
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-2">
            <div>
              <Form.Item
                name="opportunityWinningChance"
                label={getTranslationFromI18nKeyAndLabel(
                  "crm:opportunity.winningChance",
                  "Winning Chance (%)"
                )}
              >
                <DesignInput
                  data-testid="opportunity-winning-chance"
                  type="number"
                  min="0"
                  max="100"
                  className="gba:h-11 gba:px-3 gba:text-sm"
                />
              </Form.Item>
            </div>
            <div>
              <Form.Item
                name="opportunityExpectedCloseDate"
                label={getTranslationFromI18nKeyAndLabel(
                  "crm:opportunity.expectedCloseDate",
                  "Expected Close Date"
                )}
              >
                <DesignInput
                  data-testid="opportunity-expected-close-date"
                  type="date"
                  className="gba:h-11 gba:px-3 gba:text-sm"
                />
              </Form.Item>
            </div>
          </div>

          {/* Note Summary - Full Width Row */}
          <div>
            <Form.Item
              name="opportunityNoteSummary"
              label={getTranslationFromI18nKeyAndLabel(
                "crm:opportunity.noteSummary",
                "Note Summary"
              )}
            >
              <DesignTextarea
                data-testid="opportunity-note-summary"
                rows={3}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  "crm:opportunity.noteSummaryPlaceholder",
                  "Enter note summary..."
                )}
                className="gba:px-3 gba:py-2 gba:text-sm gba:resize-none"
                style={{ minHeight: "80px" }}
              />
            </Form.Item>
          </div>

          {/* Source App - Separate Row */}
          <div>
            <Form.Item
              name="opportunitySourceApp"
              label={getTranslationFromI18nKeyAndLabel(
                "crm:opportunity.sourceApp",
                "Source App"
              )}
              rules={[
                {
                  required: true,
                  message: getTranslationFromI18nKeyAndLabel(
                    "crm:opportunity.sourceAppRequired",
                    "Please select source app"
                  ),
                },
              ]}
              initialValue="CRM"
            >
              <DesignSelect
                value={form.getFieldValue("opportunitySourceApp") || "CRM"}
                defaultValue="CRM"
                onValueChange={(value: string) => {
                  form.setFieldsValue({ opportunitySourceApp: value });
                }}
                data-testid="opportunity-source-app-select"
              >
                <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                  <SelectValue
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      "crm:opportunity.selectSourceApp",
                      "Select Source App"
                    )}
                  />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  className="gba:bg-white gba:border gba:border-gray-300 gba:rounded-md gba:shadow-lg gba:z-50"
                >
                  {/* CRM should be first/default option */}
                  <SelectItem value="CRM">CRM</SelectItem>
                  <SelectItem value="IRM">IRM</SelectItem>
                </SelectContent>
              </DesignSelect>
            </Form.Item>
          </div>

          {/* Owner Information Section */}
          <div className="gba:bg-white gba:p-4 gba:rounded-lg gba:border gba:border-gray-200 gba:mt-4">
            <h4
              className="gba:text-lg gba:font-bold gba:mb-3 gba:text-gray-900 gba:border-b gba:border-gray-400 gba:pb-2"
              style={{
                fontWeight: "700 !important",
                fontSize: "18px",
                color: "#111827",
              }}
            >
              {getTranslationFromI18nKeyAndLabel(
                "crm:opportunity.ownerInformation",
                "Owner Information"
              )}
            </h4>
            <div className="gba:space-y-2">
              <Label htmlFor="opportunity-owner-select">
                {getTranslationFromI18nKeyAndLabel(
                  "crm:opportunity.ownerEmployee",
                  "Owner Employee"
                )}
                <span className="gba:text-red-500 gba:ml-1">*</span>
              </Label>
              <Form.Item
                name="opportunityOwnerEmployee"
                style={{ margin: 0 }}
                rules={[
                  {
                    required: true,
                    message: getTranslationFromI18nKeyAndLabel(
                      "crm:opportunity.ownerEmployeeRequired",
                      "Please select owner employee"
                    ),
                  },
                ]}
              >
                <OwnerSelector
                  value={form.getFieldValue("opportunityOwnerEmployee") || ""}
                  onChange={(value: string) => {
                    form.setFieldsValue({ opportunityOwnerEmployee: value });
                    // Force form to update
                    form.validateFields(["opportunityOwnerEmployee"]);
                  }}
                  employees={opportunityEmployeePositions as any}
                  loading={opportunityEmployeePositionsLoading}
                  hasMore={opportunityEmployeePositionsHasMore}
                  onLoadMore={loadMoreOpportunityEmployeePositions}
                  onSearch={(searchTerm: string) => {
                    searchOpportunityEmployeePositions(searchTerm);
                  }}
                  error={opportunityEmployeePositionsError}
                  dataTestId="opportunity-owner-select"
                />
              </Form.Item>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OpportunitySection;
