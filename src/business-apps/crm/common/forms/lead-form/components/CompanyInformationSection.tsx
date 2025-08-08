import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
} from "@newwork/nw-design-system";
import {
  PiPhone,
  PiEnvelopeSimple,
  PiCaretDown,
  PiCaretUp,
} from "react-icons/pi";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { useLeadFormContext } from "../context/LeadFormContext";
import {
  validateEmail,
  validatePhone,
  toStringOrUndefined,
} from "../utils/validationUtils";

const prefixDataTestId = "LeadForm";

const CompanyInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAdditionalInfoExpanded, setIsAdditionalInfoExpanded] =
    useState(false);
  const [isLegalFormOpen, setIsLegalFormOpen] = useState(false);
  const [isIndustryOpen, setIsIndustryOpen] = useState(false);
  const [isEmployeeSizeOpen, setIsEmployeeSizeOpen] = useState(false);
  const [isRevenueSizeOpen, setIsRevenueSizeOpen] = useState(false);

  const {
    formValues,
    setFormValues,
    isLoading,

    // Legal Forms
    legalForms,
    legalFormsLoading,
    legalFormsError,
    legalFormsHasMore,
    legalFormsNeedsMoreData,
    legalFormsDisplayCount,
    legalFormsTotalFetched,
    searchLegalForms,
    loadMoreLegalForms,
    showMoreLegalForms,

    // Industries
    industries,
    industriesLoading,
    industriesError,
    industriesHasMore,
    industriesNeedsMoreData,
    industriesDisplayCount,
    industriesTotalFetched,
    searchIndustries,
    loadMoreIndustries,
    showMoreIndustries,

    // Employee Sizes
    employeeSizes,
    employeeSizesLoading,
    employeeSizesError,
    employeeSizesHasMore,
    employeeSizesNeedsMoreData,
    employeeSizesDisplayCount,
    employeeSizesTotalFetched,
    searchEmployeeSizes,
    loadMoreEmployeeSizes,
    showMoreEmployeeSizes,

    // Revenue Sizes
    revenueSizes,
    revenueSizesLoading,
    revenueSizesError,
    revenueSizesHasMore,
    revenueSizesNeedsMoreData,
    revenueSizesDisplayCount,
    revenueSizesTotalFetched,
    searchRevenueSizes,
    loadMoreRevenueSizes,
    showMoreRevenueSizes,
  } = useLeadFormContext();

  // Simple effect to load more legal forms when needed
  useEffect(() => {
    if (legalFormsNeedsMoreData && !legalFormsLoading && legalFormsHasMore) {
      loadMoreLegalForms();
    }
  }, [
    legalFormsNeedsMoreData,
    legalFormsLoading,
    legalFormsHasMore,
    legalFormsTotalFetched,
    loadMoreLegalForms,
  ]);

  // Simple effect to load more industries when needed
  useEffect(() => {
    if (industriesNeedsMoreData && !industriesLoading && industriesHasMore) {
      console.log(
        `🚀 Auto-loading more industries from API (${industriesTotalFetched} fetched so far, loading 100 more)`
      );
      loadMoreIndustries();
    }
  }, [
    industriesNeedsMoreData,
    industriesLoading,
    industriesHasMore,
    industriesTotalFetched,
    loadMoreIndustries,
  ]);

  // When Legal Form dropdown opens, show more if we have them cached
  useEffect(() => {
    if (
      isLegalFormOpen &&
      legalFormsDisplayCount < legalFormsTotalFetched &&
      legalFormsTotalFetched > 5
    ) {
      showMoreLegalForms();
    }
  }, [
    isLegalFormOpen,
    legalFormsDisplayCount,
    legalFormsTotalFetched,
    showMoreLegalForms,
  ]);

  // When Industry dropdown opens, show more if we have them cached
  useEffect(() => {
    if (
      isIndustryOpen &&
      industriesDisplayCount < industriesTotalFetched &&
      industriesTotalFetched > 5
    ) {
      console.log(
        `🚀 Industry dropdown opened - showing more from cache (${industriesDisplayCount}/${industriesTotalFetched})`
      );
      showMoreIndustries();
    }
  }, [
    isIndustryOpen,
    industriesDisplayCount,
    industriesTotalFetched,
    showMoreIndustries,
  ]);

  // Employee Sizes auto-loading effects
  useEffect(() => {
    if (
      employeeSizesNeedsMoreData &&
      !employeeSizesLoading &&
      employeeSizesHasMore
    ) {
      console.log(
        `🚀 Auto-loading more employee sizes from API (${employeeSizesTotalFetched} fetched so far, loading 100 more)`
      );
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

  const handleLoadMoreLegalForms = () => {
    if (legalFormsNeedsMoreData && !legalFormsLoading && legalFormsHasMore) {
      console.log(
        `🚀 Manual load more - fetching next 100 legal forms from API`
      );
      loadMoreLegalForms();
    } else if (legalFormsDisplayCount < legalFormsTotalFetched) {
      console.log(
        `🚀 Manual load more - showing more legal forms from cache (${legalFormsDisplayCount}/${legalFormsTotalFetched})`
      );
      showMoreLegalForms();
    }
  };

  const handleLoadMoreIndustries = () => {
    if (industriesNeedsMoreData && !industriesLoading && industriesHasMore) {
      console.log(
        `🚀 Manual load more - fetching next 100 industries from API`
      );
      loadMoreIndustries();
    } else if (industriesDisplayCount < industriesTotalFetched) {
      console.log(
        `🚀 Manual load more - showing more industries from cache (${industriesDisplayCount}/${industriesTotalFetched})`
      );
      showMoreIndustries();
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

  const companyEmailError =
    formValues.companyEmail && !validateEmail(formValues.companyEmail)
      ? "Please enter a valid email address"
      : "";
  const companyPhoneError =
    formValues.companyPhone && !validatePhone(formValues.companyPhone)
      ? "Please enter a valid phone number"
      : "";

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
          background: "linear-gradient(to right, #ddd6fe, #c4b5fd)",
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
            "linear-gradient(to right, #c4b5fd, #a78bfa)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background =
            "linear-gradient(to right, #ddd6fe, #c4b5fd)";
        }}
        data-testid={formatDataTestId(prefixDataTestId, "CompanyInfoToggle")}
      >
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
          <div className="gba:w-2 gba:h-2 gba:bg-purple-500 gba:rounded-full"></div>
          <span className="gba:font-medium gba:text-gray-900">
            Company Information
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
          {/* Legal Form and Industry - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            {/* Legal Form dropdown like Country */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Legal Form
              </Label>
              <Select
                value={formValues.legalForm}
                onValueChange={(value) => setFormValues({ legalForm: value })}
                onOpenChange={setIsLegalFormOpen}
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "LegalFormSelect"
                )}
              >
                <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                  <SelectValue placeholder="Please Select..." />
                </SelectTrigger>
                <SelectContent
                  className="gba:max-h-[200px] gba:overflow-y-auto"
                  style={{ maxHeight: "200px", overflowY: "auto" }}
                >
                  {legalForms.map((option, index) => (
                    <SelectItem
                      key={`${option.id}-${index}`}
                      value={option.value}
                    >
                      {option.label}
                    </SelectItem>
                  ))}

                  {/* Load More button or loading message */}
                  {legalFormsLoading && (
                    <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:text-center gba:font-medium">
                      🔄 Loading more legal forms...
                    </div>
                  )}

                  {!legalFormsLoading && legalFormsHasMore && (
                    <div className="gba:px-2 gba:py-1">
                      <button
                        type="button"
                        onClick={handleLoadMoreLegalForms}
                        className="gba:w-full gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded gba:hover:bg-blue-100 gba:transition-colors"
                      >
                        📥 Load More Legal Forms ({legalFormsDisplayCount}/
                        {legalFormsTotalFetched} shown)
                      </button>
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Industry dropdown like Country */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Industry
              </Label>
              <Select
                value={formValues.industry}
                onValueChange={(value) => setFormValues({ industry: value })}
                onOpenChange={setIsIndustryOpen}
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "IndustrySelect"
                )}
              >
                <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                  <SelectValue placeholder="Please Select..." />
                </SelectTrigger>
                <SelectContent
                  className="gba:max-h-[200px] gba:overflow-y-auto"
                  style={{ maxHeight: "200px", overflowY: "auto" }}
                >
                  {industries.map((option, index) => (
                    <SelectItem
                      key={`${option.id}-${index}`}
                      value={option.value}
                    >
                      {option.label}
                    </SelectItem>
                  ))}

                  {/* Load More button or loading message */}
                  {industriesLoading && (
                    <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:text-center gba:font-medium">
                      🔄 Loading more industries...
                    </div>
                  )}

                  {!industriesLoading && industriesHasMore && (
                    <div className="gba:px-2 gba:py-1">
                      <button
                        type="button"
                        onClick={handleLoadMoreIndustries}
                        className="gba:w-full gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded gba:hover:bg-blue-100 gba:transition-colors"
                      >
                        📥 Load More Industries ({industriesDisplayCount}/
                        {industriesTotalFetched} shown)
                      </button>
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Collapsible Additional Information */}
          <Card
            className="gba:border-0 gba:shadow-none gba:bg-white"
            style={{
              border: "0",
              borderWidth: "0",
              borderStyle: "none",
              borderColor: "transparent",
              boxShadow: "none",
              background: "white",
            }}
          >
            <Button
              variant="ghost"
              onClick={() =>
                setIsAdditionalInfoExpanded(!isAdditionalInfoExpanded)
              }
              className="gba:w-full gba:px-4 gba:py-2 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left gba:rounded-lg gba:text-sm"
              style={{
                background: "linear-gradient(to right, #f3f4f6, #e5e7eb)",
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
                  "linear-gradient(to right, #e5e7eb, #d1d5db)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  "linear-gradient(to right, #f3f4f6, #e5e7eb)";
              }}
              data-testid={formatDataTestId(
                prefixDataTestId,
                "AdditionalInfoToggle"
              )}
            >
              <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
                <div className="gba:w-2 gba:h-2 gba:bg-gray-500 gba:rounded-full"></div>
                <span className="gba:font-medium gba:text-gray-900">
                  Additional Information
                </span>
              </div>
              <div className="gba:flex gba:items-center">
                {isAdditionalInfoExpanded ? (
                  <PiCaretUp className="gba:w-4 gba:h-4 gba:text-gray-700" />
                ) : (
                  <PiCaretDown className="gba:w-4 gba:h-4 gba:text-gray-700" />
                )}
              </div>
            </Button>

            {isAdditionalInfoExpanded && (
              <CardContent
                className="gba:space-y-4 gba:bg-white gba:border-0 gba:p-3"
                style={{
                  border: "0",
                  borderWidth: "0",
                  borderStyle: "none",
                  borderColor: "transparent",
                  padding: "12px",
                  background: "white",
                }}
              >
                {/* Website */}
                <div className="gba:space-y-2">
                  <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                    Website
                  </Label>
                  <Input
                    name="website"
                    value={
                      typeof formValues.website === "string"
                        ? formValues.website
                        : ""
                    }
                    onChange={(e) => setFormValues({ website: e.target.value })}
                    placeholder="Please Enter..."
                    className="gba:border-gray-300 gba:bg-white"
                    data-testid={formatDataTestId(
                      prefixDataTestId,
                      "WebsiteInput"
                    )}
                  />
                </div>

                {/* Company Email */}
                <div className="gba:space-y-2">
                  <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                    Company Email
                  </Label>
                  <div className="gba:relative">
                    <div className="gba:absolute gba:inset-y-0 gba:left-0 gba:pl-2 gba:flex gba:items-center gba:pointer-events-none gba:z-10">
                      <PiEnvelopeSimple className="gba:h-5 gba:w-5 gba:text-gray-400" />
                    </div>
                    <Input
                      name="companyEmail"
                      value={
                        typeof formValues.companyEmail === "string"
                          ? formValues.companyEmail
                          : ""
                      }
                      onChange={(e) =>
                        setFormValues({ companyEmail: e.target.value })
                      }
                      placeholder="Please Enter..."
                      className="gba:pl-8 gba:border-gray-300 gba:bg-white"
                      style={{
                        borderColor: companyEmailError ? "#ef4444" : "#d1d5db",
                        paddingLeft: "32px",
                      }}
                      data-testid={formatDataTestId(
                        prefixDataTestId,
                        "CompanyEmailInput"
                      )}
                    />
                  </div>
                  {companyEmailError && (
                    <p className="gba:text-sm gba:text-red-600">
                      {companyEmailError}
                    </p>
                  )}
                </div>

                {/* Company Phone */}
                <div className="gba:space-y-2">
                  <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                    Company Phone
                  </Label>
                  <div className="gba:relative">
                    <div className="gba:absolute gba:inset-y-0 gba:left-0 gba:pl-2 gba:flex gba:items-center gba:pointer-events-none gba:z-10">
                      <PiPhone className="gba:h-5 gba:w-5 gba:text-gray-400" />
                    </div>
                    <Input
                      name="companyPhone"
                      value={
                        typeof formValues.companyPhone === "string"
                          ? formValues.companyPhone
                          : ""
                      }
                      onChange={(e) =>
                        setFormValues({ companyPhone: e.target.value })
                      }
                      placeholder="Please Enter..."
                      className="gba:pl-8 gba:border-gray-300 gba:bg-white"
                      style={{
                        borderColor: companyPhoneError ? "#ef4444" : "#d1d5db",
                        paddingLeft: "32px",
                      }}
                      data-testid={formatDataTestId(
                        prefixDataTestId,
                        "CompanyPhoneInput"
                      )}
                    />
                  </div>
                  {companyPhoneError && (
                    <p className="gba:text-sm gba:text-red-600">
                      {companyPhoneError}
                    </p>
                  )}
                </div>

                {/* Number of Employees - Full width */}
                <div className="gba:space-y-2">
                  <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                    Number of Employees
                  </Label>
                  <Select
                    value={
                      toStringOrUndefined(formValues.numberOfEmployees) || ""
                    }
                    onValueChange={(value) =>
                      setFormValues({ numberOfEmployees: value || "" })
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
                          🔄 Loading more employee sizes...
                        </div>
                      )}

                      {!employeeSizesLoading && employeeSizesHasMore && (
                        <div className="gba:px-2 gba:py-1">
                          <button
                            type="button"
                            onClick={handleLoadMoreEmployeeSizes}
                            className="gba:w-full gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded gba:hover:bg-blue-100 gba:transition-colors"
                          >
                            📥 Load More Employee Sizes (
                            {employeeSizesDisplayCount}/
                            {employeeSizesTotalFetched} shown)
                          </button>
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Annual Revenue */}
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
                            📥 Load More Revenue Sizes (
                            {revenueSizesDisplayCount}/
                            {revenueSizesTotalFetched} shown)
                          </button>
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            )}
          </Card>
        </CardContent>
      )}
    </Card>
  );
};

export default CompanyInformationSection;
