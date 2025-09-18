import React, { useState, useEffect } from "react";
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
  Button,
} from "@newwork/nw-design-system";
import { PiCaretDown, PiCaretUp } from "react-icons/pi";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { useAccountFormContext } from "../context/AccountFormContext";
import { toStringOrUndefined } from "../utils/validationUtils";
// ✅ REMOVED: SearchableSelect import - not used after currency field removal

const prefixDataTestId = "AccountForm";

const FinancialInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed
  const [isTimeZoneOpen, setIsTimeZoneOpen] = useState(false); // ✅ RE-ENABLED: TimeZone field restored
  const [isEmployeeSizeOpen, setIsEmployeeSizeOpen] = useState(false);
  const [isRevenueSizeOpen, setIsRevenueSizeOpen] = useState(false);

  const {
    formValues,
    setFormValues,

    // Currencies with search functionality
    // ✅ REMOVED: Currency context variables - not used after currency field removal

    // Time Zones - ✅ RE-ENABLED: TimeZone works with v1 format, fixed dropdown to send ID
    timeZones,
    timeZonesLoading,
    timeZonesHasMore,
    timeZonesNeedsMoreData,
    timeZonesDisplayCount,
    timeZonesTotalFetched,
    loadMoreTimeZones,
    showMoreTimeZones,

    // Employee Sizes
    employeeSizes,
    employeeSizesLoading,
    // employeeSizesError, // ✅ REMOVED: Not used in UI
    employeeSizesHasMore,
    employeeSizesNeedsMoreData,
    employeeSizesDisplayCount,
    employeeSizesTotalFetched,
    // searchEmployeeSizes, // ✅ REMOVED: Not used - employeeSize uses Select, not SearchableSelect
    loadMoreEmployeeSizes,
    showMoreEmployeeSizes,

    // Revenue Sizes
    revenueSizes,
    revenueSizesLoading,
    // revenueSizesError, // ✅ REMOVED: Not used in UI
    revenueSizesHasMore,
    revenueSizesNeedsMoreData,
    revenueSizesDisplayCount,
    revenueSizesTotalFetched,
    // searchRevenueSizes, // ✅ REMOVED: Not used - revenueSize uses Select, not SearchableSelect
    loadMoreRevenueSizes,
    showMoreRevenueSizes,
  } = useAccountFormContext();

  // Time Zones auto-loading effects - ✅ RE-ENABLED: TimeZone field restored
  useEffect(() => {
    if (timeZonesNeedsMoreData && !timeZonesLoading && timeZonesHasMore) {
      loadMoreTimeZones();
    }
  }, [
    timeZonesNeedsMoreData,
    timeZonesLoading,
    timeZonesHasMore,
    timeZonesTotalFetched,
    loadMoreTimeZones,
  ]);

  useEffect(() => {
    if (
      isTimeZoneOpen &&
      timeZonesDisplayCount < timeZonesTotalFetched &&
      timeZonesTotalFetched > 5
    ) {
      showMoreTimeZones();
    }
  }, [
    isTimeZoneOpen,
    timeZonesDisplayCount,
    timeZonesTotalFetched,
    showMoreTimeZones,
  ]);

  // Employee Sizes auto-loading effects
  useEffect(() => {
    if (
      employeeSizesNeedsMoreData &&
      !employeeSizesLoading &&
      employeeSizesHasMore
    ) {
      loadMoreEmployeeSizes();
    }
  }, [
    employeeSizesNeedsMoreData,
    employeeSizesLoading,
    employeeSizesHasMore,
    employeeSizesTotalFetched,
    loadMoreEmployeeSizes,
  ]);

  useEffect(() => {
    if (
      isEmployeeSizeOpen &&
      employeeSizesDisplayCount < employeeSizesTotalFetched &&
      employeeSizesTotalFetched > 5
    ) {
      console.log(
        `🚀 Employee size dropdown opened - showing more from cache (${employeeSizesDisplayCount}/${employeeSizesTotalFetched})`
      );
      showMoreEmployeeSizes();
    }
  }, [
    isEmployeeSizeOpen,
    employeeSizesDisplayCount,
    employeeSizesTotalFetched,
    showMoreEmployeeSizes,
  ]);

  // Revenue Sizes auto-loading effects
  useEffect(() => {
    if (
      revenueSizesNeedsMoreData &&
      !revenueSizesLoading &&
      revenueSizesHasMore
    ) {
      console.log(
        `🚀 Auto-loading more revenue sizes from API (${revenueSizesTotalFetched} fetched so far, loading 100 more)`
      );
      loadMoreRevenueSizes();
    }
  }, [
    revenueSizesNeedsMoreData,
    revenueSizesLoading,
    revenueSizesHasMore,
    revenueSizesTotalFetched,
    loadMoreRevenueSizes,
  ]);

  useEffect(() => {
    if (
      isRevenueSizeOpen &&
      revenueSizesDisplayCount < revenueSizesTotalFetched &&
      revenueSizesTotalFetched > 5
    ) {
      console.log(
        `🚀 Revenue size dropdown opened - showing more from cache (${revenueSizesDisplayCount}/${revenueSizesTotalFetched})`
      );
      showMoreRevenueSizes();
    }
  }, [
    isRevenueSizeOpen,
    revenueSizesDisplayCount,
    revenueSizesTotalFetched,
    showMoreRevenueSizes,
  ]);

  // ✅ REMOVED: handleLoadMoreTimeZones - not needed for simple Select component

  const handleLoadMoreRevenueSizes = () => {
    if (
      revenueSizesNeedsMoreData &&
      !revenueSizesLoading &&
      revenueSizesHasMore
    ) {
      console.log(
        `🚀 Manual load more - fetching next 100 revenue sizes from API`
      );
      loadMoreRevenueSizes();
    } else if (revenueSizesDisplayCount < revenueSizesTotalFetched) {
      console.log(
        `🚀 Manual load more - showing more revenue sizes from cache (${revenueSizesDisplayCount}/${revenueSizesTotalFetched})`
      );
      showMoreRevenueSizes();
    }
  };

  const handleLoadMoreEmployeeSizes = () => {
    if (
      employeeSizesNeedsMoreData &&
      !employeeSizesLoading &&
      employeeSizesHasMore
    ) {
      console.log(
        `🚀 Manual load more - fetching next 100 employee sizes from API`
      );
      loadMoreEmployeeSizes();
    } else if (employeeSizesDisplayCount < employeeSizesTotalFetched) {
      console.log(
        `🚀 Manual load more - showing more employee sizes from cache (${employeeSizesDisplayCount}/${employeeSizesTotalFetched})`
      );
      showMoreEmployeeSizes();
    }
  };

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
        type="button"
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:w-full gba:px-4 gba:py-2 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left gba:rounded-lg gba:text-sm"
        style={{
          background: "linear-gradient(to right, #fecaca, #fbb6ce)",
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
            "linear-gradient(to right, #fca5a5, #f9a8d4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background =
            "linear-gradient(to right, #fecaca, #fbb6ce)";
        }}
        data-testid={formatDataTestId(prefixDataTestId, "FinancialInfoToggle")}
      >
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
          <div className="gba:w-2 gba:h-2 gba:bg-red-500 gba:rounded-full"></div>
          <span className="gba:font-medium gba:text-gray-900">
            Financial Information
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
          {/* Annual Revenue and Currency - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Annual Revenue
              </Label>
              <Select
                value={toStringOrUndefined(formValues.annualRevenue) || ""}
                onValueChange={(value) =>
                  setFormValues({ annualRevenue: value || "" })
                }
                onOpenChange={setIsRevenueSizeOpen}
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "AnnualRevenueSelect"
                )}
              >
                <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                  <SelectValue placeholder="Please Select..." />
                </SelectTrigger>
                <SelectContent
                  className="gba:max-h-[200px] gba:overflow-y-auto"
                  style={{ maxHeight: "200px", overflowY: "auto" }}
                >
                  {revenueSizes.map((option, index) => (
                    <SelectItem
                      key={`${option.id}-${index}`}
                      value={option.value}
                    >
                      {option.label}
                    </SelectItem>
                  ))}

                  {/* Load More button or loading message */}
                  {revenueSizesLoading && (
                    <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:text-center gba:font-medium">
                      🔄 Loading more revenue sizes...
                    </div>
                  )}

                  {!revenueSizesLoading && revenueSizesHasMore && (
                    <div className="gba:px-2 gba:py-1">
                      <button
                        type="button"
                        onClick={handleLoadMoreRevenueSizes}
                        className="gba:w-full gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded gba:hover:bg-blue-100 gba:transition-colors"
                      >
                        📥 Load More Revenue Sizes ({revenueSizesDisplayCount}/
                        {revenueSizesTotalFetched} shown)
                      </button>
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* ✅ REMOVED: Currency field - not available in InvestmentAccount schema */}
          </div>

          {/* ✅ FIXED: Number of Employees and Time Zone - Side by side (TimeZone re-enabled) */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Number of Employees
              </Label>
              <Select
                value={formValues.numberOfEmployees}
                onValueChange={(value) =>
                  setFormValues({ numberOfEmployees: value })
                }
                onOpenChange={setIsEmployeeSizeOpen}
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "NumberOfEmployeesSelect"
                )}
              >
                <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                  <SelectValue placeholder="Please Select..." />
                </SelectTrigger>
                <SelectContent
                  className="gba:max-h-[200px] gba:overflow-y-auto"
                  style={{ maxHeight: "200px", overflowY: "auto" }}
                >
                  {employeeSizes.map((option, index) => {
                    // Format display value to remove leading zeros (e.g., "01-10" becomes "1-10")
                    const displayValue = (
                      option.label ||
                      option.name ||
                      ""
                    ).replace(/\b0+(\d)/g, "$1");
                    return (
                      <SelectItem
                        key={`${option.id}-${index}`}
                        value={option.value}
                      >
                        {displayValue}
                      </SelectItem>
                    );
                  })}

                  {/* Load More button or loading message */}
                  {employeeSizesLoading && (
                    <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:text-center gba:font-medium">
                      Loading more employee sizes...
                    </div>
                  )}

                  {!employeeSizesLoading && employeeSizesHasMore && (
                    <div className="gba:px-2 gba:py-1">
                      <button
                        type="button"
                        onClick={handleLoadMoreEmployeeSizes}
                        className="gba:w-full gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded gba:hover:bg-blue-100 gba:transition-colors"
                      >
                        Load More Employee Sizes ({employeeSizesDisplayCount}/
                        {employeeSizesTotalFetched} shown)
                      </button>
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Time Zone
              </Label>
              <Select
                value={formValues.timeZone}
                onValueChange={(value) => setFormValues({ timeZone: value })}
                onOpenChange={setIsTimeZoneOpen}
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "TimeZoneSelect"
                )}
              >
                <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                  <SelectValue placeholder="Please Select..." />
                </SelectTrigger>
                <SelectContent
                  className="gba:max-h-[200px] gba:overflow-y-auto"
                  style={{ maxHeight: "200px", overflowY: "auto" }}
                >
                  {timeZones.map((option, index) => (
                    <SelectItem
                      key={`${option.id}-${index}`}
                      value={String(option.id)}
                    >
                      {option.label}
                    </SelectItem>
                  ))}

                  {timeZonesLoading && (
                    <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:text-center gba:font-medium">
                      🔄 Loading more time zones...
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Foundation Date and Ticker Symbol - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Foundation Date
              </Label>
              <Input
                name="foundationDate"
                type="date"
                value={formValues.foundationDate || ""}
                onChange={(e) =>
                  setFormValues({ foundationDate: e.target.value })
                }
                className="gba:border-gray-300 gba:bg-white gba:focus:border-blue-500 gba:focus:ring-2 gba:focus:ring-blue-200 gba:transition-all gba:duration-200"
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "FoundationDateInput"
                )}
              />
            </div>

            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Ticker Symbol
              </Label>
              <Input
                name="tickerSymbol"
                value={formValues.tickerSymbol}
                onChange={(e) =>
                  setFormValues({ tickerSymbol: e.target.value })
                }
                placeholder="Please Enter..."
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "TickerSymbolInput"
                )}
              />
            </div>
          </div>

          {/* ✅ REMOVED: SIC Code - not available in InvestmentAccount schema */}
        </CardContent>
      )}
    </Card>
  );
};

export default FinancialInformationSection;
