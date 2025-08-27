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
  // ✅ REMOVED: Employee size and revenue size open state no longer needed with SearchableSelect
  // const [isEmployeeSizeOpen, setIsEmployeeSizeOpen] = useState(false);
  // const [isRevenueSizeOpen, setIsRevenueSizeOpen] = useState(false);

  const {
    formValues,
    setFormValues,

    // Legal Forms
    legalForms,
    legalFormsLoading,
    legalFormsHasMore,
    legalFormsNeedsMoreData,
    legalFormsDisplayCount,
    legalFormsTotalFetched,
    loadMoreLegalForms,
    showMoreLegalForms,

    // Industries
    industries,
    industriesLoading,
    industriesHasMore,
    industriesNeedsMoreData,
    industriesDisplayCount,
    industriesTotalFetched,
    loadMoreIndustries,
    showMoreIndustries,

    // Employee Sizes
    employeeSizes,
    employeeSizesLoading,
    employeeSizesHasMore,
    employeeSizesNeedsMoreData,
    employeeSizesTotalFetched,
    loadMoreEmployeeSizes,

    // Revenue Sizes
    revenueSizes,
    revenueSizesLoading,
    revenueSizesHasMore,
    revenueSizesNeedsMoreData,
    revenueSizesTotalFetched,
    loadMoreRevenueSizes,

    // ✅ ADDED: Time Zones
    timeZones,
    timeZonesLoading,
    timeZonesHasMore,
    loadMoreTimeZones,
  } = useLeadFormContext();

  // ✅ DEBUG: Add debug logging for form values
  useEffect(() => {
    console.log("🔍 CompanyInformationSection Debug - Form Values:", {
      legalForm: formValues.legalForm,
      industry: formValues.industry,
      numberOfEmployees: formValues.numberOfEmployees,
      annualRevenue: formValues.annualRevenue,
      timeZone: formValues.timeZone,
      legalFormsCount: legalForms?.length || 0,
      industriesCount: industries?.length || 0,
      employeeSizesCount: employeeSizes?.length || 0,
      revenueSizesCount: revenueSizes?.length || 0,
      timeZonesCount: timeZones?.length || 0,
      // Check if values match any options
      legalFormMatch: legalForms?.find(
        (opt) =>
          opt.value === formValues.legalForm || opt.id === formValues.legalForm
      ),
      industryMatch: industries?.find(
        (opt) =>
          opt.value === formValues.industry || opt.id === formValues.industry
      ),
      employeeSizeMatch: employeeSizes?.find(
        (opt) =>
          opt.value === formValues.numberOfEmployees ||
          opt.id === formValues.numberOfEmployees
      ),
      revenueSizeMatch: revenueSizes?.find(
        (opt) =>
          opt.value === formValues.annualRevenue ||
          opt.id === formValues.annualRevenue
      ),
      timeZoneMatch: timeZones?.find(
        (opt) =>
          opt.value === formValues.timeZone || opt.id === formValues.timeZone
      ),
      // ✅ DEBUG: Check first few options to verify catalog content after fix
      employeeSizesFirst3: employeeSizes?.slice(0, 3) || [],
      revenueSizesFirst3: revenueSizes?.slice(0, 3) || [],
    });
  }, [
    formValues.legalForm,
    formValues.industry,
    formValues.numberOfEmployees,
    formValues.annualRevenue,
    formValues.timeZone,
    legalForms,
    industries,
    employeeSizes,
    revenueSizes,
    timeZones,
  ]);

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

  // ✅ REMOVED: Employee size dropdown open effect no longer needed with SearchableSelect

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

  // ✅ REMOVED: Revenue size dropdown open effect no longer needed with SearchableSelect

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

  // ✅ REMOVED: Manual load more handlers no longer needed with SearchableSelect
  // SearchableSelect handles loading more automatically

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

                {/* Time Zone - ✅ FIXED: Using standard Select like Legal Form */}
                <div className="gba:space-y-2">
                  <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                    Time Zone
                  </Label>
                  <Select
                    value={formValues.timeZone}
                    onValueChange={(value) =>
                      setFormValues({ timeZone: value })
                    }
                    data-testid={formatDataTestId(
                      prefixDataTestId,
                      "TimeZoneSelect"
                    )}
                  >
                    <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                      <SelectValue placeholder="Please Select..." />
                    </SelectTrigger>
                    <SelectContent className="gba:max-h-[200px] gba:overflow-y-auto">
                      {timeZones.map((option, index) => (
                        <SelectItem
                          key={`${option.id}-${index}`}
                          value={option.value}
                        >
                          {option.label}
                        </SelectItem>
                      ))}

                      {/* Load More button if needed */}
                      {timeZonesLoading && (
                        <div className="gba:p-2 gba:text-center gba:text-gray-500">
                          Loading more time zones...
                        </div>
                      )}
                      {timeZonesHasMore && !timeZonesLoading && (
                        <div className="gba:p-1">
                          <button
                            type="button"
                            onClick={loadMoreTimeZones}
                            className="gba:w-full gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded gba:hover:bg-blue-100 gba:transition-colors"
                          >
                            📥 Load More Time Zones
                          </button>
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Number of Employees - ✅ FIXED: Using standard Select like Legal Form */}
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
                    data-testid={formatDataTestId(
                      prefixDataTestId,
                      "NumberOfEmployeesSelect"
                    )}
                  >
                    <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                      <SelectValue placeholder="Please Select Company Size..." />
                    </SelectTrigger>
                    <SelectContent className="gba:max-h-[200px] gba:overflow-y-auto">
                      {employeeSizes.map((option, index) => (
                        <SelectItem
                          key={`${option.id}-${index}`}
                          value={option.value}
                        >
                          {option.label}
                        </SelectItem>
                      ))}

                      {/* Load More button if needed */}
                      {employeeSizesLoading && (
                        <div className="gba:p-2 gba:text-center gba:text-gray-500">
                          Loading more company sizes...
                        </div>
                      )}
                      {employeeSizesHasMore && !employeeSizesLoading && (
                        <div className="gba:p-1">
                          <button
                            type="button"
                            onClick={loadMoreEmployeeSizes}
                            className="gba:w-full gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded gba:hover:bg-blue-100 gba:transition-colors"
                          >
                            📥 Load More Company Sizes
                          </button>
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Annual Revenue - ✅ FIXED: Using standard Select like Legal Form */}
                <div className="gba:space-y-2">
                  <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                    Annual Revenue
                  </Label>
                  <Select
                    value={toStringOrUndefined(formValues.annualRevenue) || ""}
                    onValueChange={(value) =>
                      setFormValues({ annualRevenue: value || "" })
                    }
                    data-testid={formatDataTestId(
                      prefixDataTestId,
                      "AnnualRevenueSelect"
                    )}
                  >
                    <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                      <SelectValue placeholder="Please Select Revenue Band..." />
                    </SelectTrigger>
                    <SelectContent className="gba:max-h-[200px] gba:overflow-y-auto">
                      {revenueSizes.map((option, index) => (
                        <SelectItem
                          key={`${option.id}-${index}`}
                          value={option.value}
                        >
                          {option.label}
                        </SelectItem>
                      ))}

                      {/* Load More button if needed */}
                      {revenueSizesLoading && (
                        <div className="gba:p-2 gba:text-center gba:text-gray-500">
                          Loading more revenue bands...
                        </div>
                      )}
                      {revenueSizesHasMore && !revenueSizesLoading && (
                        <div className="gba:p-1">
                          <button
                            type="button"
                            onClick={loadMoreRevenueSizes}
                            className="gba:w-full gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded gba:hover:bg-blue-100 gba:transition-colors"
                          >
                            Load More Revenue Bands
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
