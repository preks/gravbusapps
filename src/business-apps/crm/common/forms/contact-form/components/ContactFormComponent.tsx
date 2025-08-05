import React, { useState, useEffect, useRef } from "react";
import { useContactFormContext } from "../context/ContactFormContext";
import {
  Button,
  Spinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
  Input,
  Label,
} from "@newwork/nw-design-system";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { dispatchProcessContinueEvent } from "@/common/utils/processEventUtils";

import OwnerInformationSection from "./OwnerInformationSection";
import PersonalInformationSection from "./PersonalInformationSection";
import ProfessionalInformationSection from "./ProfessionalInformationSection";
import AdditionalInformationSection from "./AdditionalInformationSection";

const prefixDataTestId = "ContactForm";

const ContactFormComponent: React.FC = () => {
  const {
    formValues,
    setFormValues,
    onSubmit,
    onCancel,
    isLoading,
    error,
    businessAppContext,
    accountSuggestions,
    searchAccounts,
    loadMoreAccounts,
    accountsHasMore,
    accountsLoading,
  } = useContactFormContext();

  // Company search dropdown state
  const [companyInputValue, setCompanyInputValue] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [visibleAccountsCount, setVisibleAccountsCount] = useState(5);
  const companyContainerRef = useRef<HTMLDivElement>(null);
  const suggestionsScrollRef = useRef<HTMLDivElement>(null);

  // Safety check - if context is not properly initialized, show error
  if (!formValues) {
    return (
      <div className="gba:p-6 gba:text-center">
        <div className="gba:text-red-500">
          Error: Form context not properly initialized. Please refresh the page.
        </div>
      </div>
    );
  }

  // Company input change handler
  const handleCompanyInputChange = (value: string) => {
    setCompanyInputValue(value);
    if (value.trim().length >= 3) {
      searchAccounts(value);
      setIsDropdownOpen(true);
    } else if (value.trim().length === 0) {
      searchAccounts("");
      setIsDropdownOpen(true);
    }
    // Clear accountId when user types manually
    if (formValues.accountId) {
      setFormValues({ accountId: "" });
    }
  };

  // Arrow click handler
  const handleArrowClick = () => {
    if (!isDropdownOpen) {
      // Load initial data when dropdown is opened
      searchAccounts("");
      setIsDropdownOpen(true);
      setVisibleAccountsCount(5);
    } else {
      setIsDropdownOpen(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: any) => {
    setCompanyInputValue(suggestion.name);
    setFormValues({
      accountId: String(suggestion.id),
    });
    setIsDropdownOpen(false);
    setVisibleAccountsCount(5);
  };

  // Handle scroll to load more
  const handleSuggestionsScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Load more when user scrolls to 80% of the list
    if (
      scrollPercentage > 0.8 &&
      accountsHasMore &&
      !accountsLoading &&
      accountSuggestions.length > 0
    ) {
      try {
        await loadMoreAccounts();
        // Show more items after loading
        setVisibleAccountsCount((prev) =>
          Math.min(prev + 10, accountSuggestions.length)
        );
      } catch (error) {
        console.error("Error loading more accounts:", error);
      }
    }
  };

  // Check if all mandatory fields are filled
  const isFormValid =
    formValues.firstName &&
    formValues.lastName &&
    formValues.email &&
    formValues.accountId &&
    formValues.ownerEmployeeId;

  // Helper function to convert values to strings safely
  const toStringOrUndefined = (value: string): string | undefined => {
    return value && value.trim() ? value.trim() : undefined;
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      await onSubmit(formValues);

      // Determine if this is an update or create operation
      const isUpdate = formValues.id;

      // Prepare comprehensive contact payload following the API structure
      const contactPayload: any = {
        sourceApp: "CRM",
        firstName: toStringOrUndefined(formValues.firstName),
        lastName: toStringOrUndefined(formValues.lastName),
        academicTitleRef: toStringOrUndefined(formValues.academicTitleRef),
        birthDate: toStringOrUndefined(formValues.birthDate),
        languageRef: toStringOrUndefined(formValues.languageRef),
        bio: toStringOrUndefined(formValues.bio),
        pictureUrl: toStringOrUndefined(formValues.pictureUrl),
        jobTitle: toStringOrUndefined(formValues.jobTitle),
        department: toStringOrUndefined(formValues.department),
        contactRole: toStringOrUndefined(formValues.contactRole),
        //contactType: toStringOrUndefined(formValues.contactType),
        workExperienceYears: formValues.workExperienceYears
          ? parseInt(formValues.workExperienceYears)
          : undefined,
        email: toStringOrUndefined(formValues.email),
        phone: toStringOrUndefined(formValues.phone),
        fax: toStringOrUndefined(formValues.fax),
        linkedinUrl: toStringOrUndefined(formValues.linkedinUrl),
        xingUrl: toStringOrUndefined(formValues.xingUrl),
        companyName: companyInputValue
          ? toStringOrUndefined(companyInputValue)
          : undefined,
        accountId: toStringOrUndefined(formValues.accountId),
        ownerEmployee:
          businessAppContext.userInfo?.employeeDetails?.employeeId ||
          toStringOrUndefined(formValues.ownerEmployeeId),
        ownerOrganization: undefined, // Will be set by backend based on owner employee
        notesSummary: toStringOrUndefined(formValues.notesSummary),
        recordState: formValues.recordState || "ACTIVE",
      };

      // For updates, include the contact ID and version
      if (isUpdate) {
        contactPayload.id = formValues.id;
        if (formValues.version !== undefined) {
          contactPayload.version = formValues.version;
        }
      }

      // Initialize empty arrays for relationships
      contactPayload.addresses = [];
      contactPayload.communicationChannels = [];
      contactPayload.tags = [];

      // Determine change mode based on whether we have an ID
      const changeMode = isUpdate ? "UPDATE" : "INSERT";

      const payload = {
        contact: contactPayload,
        changeMode: changeMode,
      };

      // Debug logs for accountId
      console.log("🔍 Contact Form Debug:");
      console.log("  formValues.accountId:", formValues.accountId);
      console.log("  companyInputValue:", companyInputValue);
      console.log("  contactPayload.accountId:", contactPayload.accountId);
      console.log("  contactPayload.companyName:", contactPayload.companyName);

      // Log the payload for debugging
      console.log(
        `${isUpdate ? "Updating" : "Creating"} contact with payload:`,
        payload
      );

      // Dispatch process continue event on successful submission
      dispatchProcessContinueEvent("pse_submit", payload);
    } catch (err) {
      console.error("Error submitting contact form:", err);
    }
  };

  // Handle form cancellation
  const handleCancel = async () => {
    try {
      await onCancel();

      // Dispatch process continue event for cancellation (pause)
      dispatchProcessContinueEvent("pse_pause", null);
    } catch (err) {
      console.error("Error cancelling contact form:", err);
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
          {/* Contact Owner Section - First and most important */}
          <OwnerInformationSection />

          {/* Company Name Section - Second field */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Company Name <span className="gba:text-red-500">*</span>
            </Label>
            <div ref={companyContainerRef} className="gba:relative gba:w-full">
              <Input
                name="companyName"
                value={companyInputValue}
                onChange={(e) => handleCompanyInputChange(e.target.value)}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Please Enter or Select..."
                required
                className="gba:border-gray-300 gba:bg-white gba:pr-14"
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "CompanyNameInput"
                )}
              />
              <div className="gba:absolute gba:inset-y-0 gba:right-0 gba:flex gba:items-center gba:pr-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gba:h-auto gba:w-auto gba:p-0 gba:bg-transparent gba:border-0 gba:shadow-none hover:gba:bg-transparent focus:gba:bg-transparent gba:cursor-pointer"
                  onClick={handleArrowClick}
                  data-testid={formatDataTestId(
                    prefixDataTestId,
                    "CompanyNameArrowButton"
                  )}
                >
                  {isDropdownOpen ? (
                    <UpOutlined className="gba:text-xs gba:text-gray-600" />
                  ) : (
                    <DownOutlined className="gba:text-xs gba:text-gray-600" />
                  )}
                </Button>
              </div>

              {isDropdownOpen && (
                <div
                  ref={suggestionsScrollRef}
                  className="gba:absolute gba:z-10 gba:w-full gba:bg-white gba:border gba:border-gray-300 gba:rounded-md gba:shadow-lg gba:max-h-60 gba:overflow-y-auto"
                  style={{ maxHeight: "200px", overflowY: "auto" }}
                  onScroll={handleSuggestionsScroll}
                >
                  {accountsLoading && accountSuggestions.length === 0 && (
                    <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-gray-500 gba:text-center">
                      Loading...
                    </div>
                  )}
                  {accountSuggestions.length === 0 && !accountsLoading && (
                    <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-gray-500 gba:text-center">
                      No companies found
                    </div>
                  )}
                  {accountSuggestions
                    .slice(0, visibleAccountsCount)
                    .map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className="gba:px-3 gba:py-2 gba:cursor-pointer gba:hover:bg-gray-100"
                        onClick={() => handleSuggestionSelect(suggestion)}
                      >
                        {suggestion.name}
                      </div>
                    ))}
                  {!accountsLoading &&
                    accountSuggestions.length > visibleAccountsCount &&
                    accountsHasMore && (
                      <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-gray-400 gba:text-center">
                        Scroll down to load more companies
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>

          {/* Personal Information Section */}
          <PersonalInformationSection />

          {/* Professional Information Section */}
          <ProfessionalInformationSection />

          {/* Additional Information Section */}
          <AdditionalInformationSection />

          {/* Error Display */}
          {error && (
            <Alert
              variant="destructive"
              data-testid={formatDataTestId(prefixDataTestId, "ErrorAlert")}
            >
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
            {formValues.id ? "Update Contact" : "Create Contact"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ContactFormComponent;
