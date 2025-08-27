import React, { useState } from "react";
import {
  Input,
  Label,
  Card,
  CardContent,
  Button,
} from "@newwork/nw-design-system";
import { PiCaretDown, PiCaretUp } from "react-icons/pi";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { useLeadFormContext } from "../context/LeadFormContext";
import { toStringOrUndefined } from "../utils/validationUtils";
import SearchableSelect from "./SearchableSelect";

const prefixDataTestId = "LeadForm";

const InvestmentInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed

  const {
    formValues,
    setFormValues,
    investmentGroups,
    investmentTypes,
    investmentRoles,
    investmentStakeTypes,

    // ✅ ADDED: Searchable Investment catalogs
    investmentTypesSearchable,
    investmentTypesLoading,
    investmentTypesError,
    investmentTypesHasMore,
    searchInvestmentTypes,
    loadMoreInvestmentTypes,

    investmentGroupsSearchable,
    investmentGroupsLoading,
    investmentGroupsError,
    investmentGroupsHasMore,
    searchInvestmentGroups,
    loadMoreInvestmentGroups,

    investmentRolesSearchable,
    investmentRolesLoading,
    investmentRolesError,
    investmentRolesHasMore,
    searchInvestmentRoles,
    loadMoreInvestmentRoles,

    investmentStakeTypesSearchable,
    investmentStakeTypesLoading,
    investmentStakeTypesError,
    investmentStakeTypesHasMore,
    searchInvestmentStakeTypes,
    loadMoreInvestmentStakeTypes,
  } = useLeadFormContext();

  // Debug logging for Investment Group (working fields)
  console.log("✅ InvestmentInformationSection Debug:", {
    investmentGroupValue: formValues.investmentGroup,
    investmentTypeValue: formValues.investmentType,
    investmentRoleValue: formValues.investmentRole,
    investmentStakeTypeValue: formValues.investmentStakeType,
    investmentGroupsCount: investmentGroupsSearchable?.length || 0,
    investmentTypesCount: investmentTypesSearchable?.length || 0,
    investmentRolesCount: investmentRolesSearchable?.length || 0,
    investmentStakeTypesCount: investmentStakeTypesSearchable?.length || 0,
    investmentGroupsFirst: investmentGroupsSearchable?.[0] || null,
    investmentTypesFirst: investmentTypesSearchable?.[0] || null,
  });

  return (
    <Card
      className="gba:border-0 gba:shadow-none gba:bg-transparent gba:p-0"
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
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:w-full gba:px-4 gba:py-2 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left gba:rounded-lg gba:text-sm"
        style={{
          background: "linear-gradient(to right, #e0f2fe, #e1f5fe)",
          transition: "all 0.3s ease",
          border: "0",
          borderWidth: "0",
          borderStyle: "none",
          borderColor: "transparent",
          outline: "none",
          outlineWidth: "0",
          outlineStyle: "none",
          boxShadow: "none",
          borderRadius: "12px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background =
            "linear-gradient(to right, #b3e5fc, #b2ebf2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background =
            "linear-gradient(to right, #e0f2fe, #e1f5fe)";
        }}
        data-testid={formatDataTestId(prefixDataTestId, "InvestmentInfoToggle")}
      >
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
          <div className="gba:w-2 gba:h-2 gba:bg-blue-500 gba:rounded-full"></div>
          <span className="gba:font-medium gba:text-gray-900">
            Investment Information
          </span>
        </div>
        <div className="gba:flex gba:items-center">
          {isExpanded ? (
            <PiCaretUp className="gba:w-4 gba:h-4 gba:text-gray-700" />
          ) : (
            <PiCaretDown className="gba:w-4 gba:h-4 gba:text-gray-700" />
          )}
        </div>
      </Button>

      {isExpanded && (
        <CardContent
          className="gba:space-y-6 gba:bg-white gba:border-0 gba:p-4 gba:mt-0"
          style={{
            border: "0",
            borderWidth: "0",
            borderStyle: "none",
            borderColor: "transparent",
            padding: "16px",
            marginTop: "0",
          }}
        >
          {/* Investment Name */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Investment Name
            </Label>
            <Input
              name="investmentName"
              value={formValues.investmentName || ""}
              onChange={(e) =>
                setFormValues({ investmentName: e.target.value })
              }
              placeholder="Enter investment name..."
              className="gba:border-gray-300 gba:bg-white"
              data-testid={formatDataTestId(
                prefixDataTestId,
                "InvestmentNameInput"
              )}
            />
          </div>

          {/* Investment Group and Type - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            {/* Investment Group - ✅ UPDATED: Now uses SearchableSelect with search functionality */}
            <SearchableSelect
              label="Investment Group"
              name="investmentGroup"
              value={formValues.investmentGroup}
              placeholder="Search and select investment group..."
              options={investmentGroupsSearchable}
              loading={investmentGroupsLoading}
              hasMore={investmentGroupsHasMore}
              onSearch={searchInvestmentGroups}
              onLoadMore={loadMoreInvestmentGroups}
              onChange={(value) => setFormValues({ investmentGroup: value })}
              error={investmentGroupsError}
              data-testid={formatDataTestId(
                prefixDataTestId,
                "InvestmentGroupSelect"
              )}
              className="gba:w-full"
            />

            {/* Investment Type - ✅ UPDATED: Now uses SearchableSelect with search functionality */}
            <SearchableSelect
              label="Investment Type"
              name="investmentType"
              value={formValues.investmentType}
              placeholder="Search and select investment type..."
              options={investmentTypesSearchable}
              loading={investmentTypesLoading}
              hasMore={investmentTypesHasMore}
              onSearch={searchInvestmentTypes}
              onLoadMore={loadMoreInvestmentTypes}
              onChange={(value) => setFormValues({ investmentType: value })}
              error={investmentTypesError}
              data-testid={formatDataTestId(
                prefixDataTestId,
                "InvestmentTypeSelect"
              )}
              className="gba:w-full"
            />
          </div>

          {/* Investment Role and Stake Type - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            {/* Investment Role - ✅ UPDATED: Now uses SearchableSelect with search functionality */}
            <SearchableSelect
              label="Investment Role"
              name="investmentRole"
              value={formValues.investmentRole}
              placeholder="Search and select investment role..."
              options={investmentRolesSearchable}
              loading={investmentRolesLoading}
              hasMore={investmentRolesHasMore}
              onSearch={searchInvestmentRoles}
              onLoadMore={loadMoreInvestmentRoles}
              onChange={(value) => setFormValues({ investmentRole: value })}
              error={investmentRolesError}
              data-testid={formatDataTestId(
                prefixDataTestId,
                "InvestmentRoleSelect"
              )}
              className="gba:w-full"
            />

            {/* Investment Stake Type - ✅ UPDATED: Now uses SearchableSelect with search functionality */}
            <SearchableSelect
              label="Investment Stake Type"
              name="investmentStakeType"
              value={formValues.investmentStakeType}
              placeholder="Search and select stake type..."
              options={investmentStakeTypesSearchable}
              loading={investmentStakeTypesLoading}
              hasMore={investmentStakeTypesHasMore}
              onSearch={searchInvestmentStakeTypes}
              onLoadMore={loadMoreInvestmentStakeTypes}
              onChange={(value) =>
                setFormValues({ investmentStakeType: value })
              }
              error={investmentStakeTypesError}
              data-testid={formatDataTestId(
                prefixDataTestId,
                "InvestmentStakeTypeSelect"
              )}
              className="gba:w-full"
            />
          </div>

          {/* Financial Fields - ✅ UPDATED: Two columns instead of three */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Stake Percentage (%)
              </Label>
              <Input
                name="stakePercentage"
                type="number"
                value={formValues.stakePercentage || ""}
                onChange={(e) =>
                  setFormValues({ stakePercentage: e.target.value })
                }
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "StakePercentageInput"
                )}
              />
            </div>

            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Market Value
              </Label>
              <Input
                name="marketValue"
                type="number"
                value={formValues.marketValue || ""}
                onChange={(e) => setFormValues({ marketValue: e.target.value })}
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "MarketValueInput"
                )}
              />
            </div>

            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Initial Investment
              </Label>
              <Input
                name="initialInvestmentAmount"
                type="number"
                value={formValues.initialInvestmentAmount || ""}
                onChange={(e) =>
                  setFormValues({ initialInvestmentAmount: e.target.value })
                }
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "InitialInvestmentInput"
                )}
              />
            </div>
          </div>

          {/* Additional Financial Fields - ✅ UPDATED: Two columns instead of three */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Required Capital
              </Label>
              <Input
                name="requiredCapitalAmount"
                type="number"
                value={formValues.requiredCapitalAmount || ""}
                onChange={(e) =>
                  setFormValues({ requiredCapitalAmount: e.target.value })
                }
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "RequiredCapitalInput"
                )}
              />
            </div>

            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Forecasted Profit
              </Label>
              <Input
                name="forecastedProfitAmount"
                type="number"
                value={formValues.forecastedProfitAmount || ""}
                onChange={(e) =>
                  setFormValues({ forecastedProfitAmount: e.target.value })
                }
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "ForecastedProfitInput"
                )}
              />
            </div>

            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Annual Net Cold Rent
              </Label>
              <Input
                name="annualNetColdRent"
                type="number"
                value={formValues.annualNetColdRent || ""}
                onChange={(e) =>
                  setFormValues({ annualNetColdRent: e.target.value })
                }
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "AnnualNetColdRentInput"
                )}
              />
            </div>
          </div>

          {/* Loan Information - Two columns */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Loan Amount
              </Label>
              <Input
                name="loanAmount"
                type="number"
                value={formValues.loanAmount || ""}
                onChange={(e) => setFormValues({ loanAmount: e.target.value })}
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "LoanAmountInput"
                )}
              />
            </div>

            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Loan Interest Rate (%)
              </Label>
              <Input
                name="loanInterestRate"
                type="number"
                value={formValues.loanInterestRate || ""}
                onChange={(e) =>
                  setFormValues({ loanInterestRate: e.target.value })
                }
                placeholder="0.00"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "LoanInterestRateInput"
                )}
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default InvestmentInformationSection;
