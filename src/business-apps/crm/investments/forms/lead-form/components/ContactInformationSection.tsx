import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Input,
  Label,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@newwork/nw-design-system";
import {
  PiPhone,
  PiEnvelopeSimple,
  PiCaretDown,
  PiCaretUp,
} from "react-icons/pi";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { useLeadFormContext } from "../context/LeadFormContext";
import { validateEmail, validatePhone } from "../utils/validationUtils";

const prefixDataTestId = "LeadForm";

const ContactInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed

  const {
    formValues,
    setFormValues,

    // ✅ UPDATED: Use searchable catalog properties from context
    academicTitles,
    academicTitlesLoading,
    academicTitlesHasMore,
    loadMoreAcademicTitles,
  } = useLeadFormContext();

  const emailError =
    formValues.email && !validateEmail(formValues.email)
      ? "Please enter a valid email address"
      : "";
  const phoneError =
    formValues.phone && !validatePhone(formValues.phone)
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
        type="button"
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:w-full gba:px-4 gba:py-2 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left gba:rounded-lg gba:text-sm"
        style={{
          background: "linear-gradient(to right, #bbf7d0, #6ee7b7)",
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
            "linear-gradient(to right, #86efac, #34d399)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background =
            "linear-gradient(to right, #bbf7d0, #6ee7b7)";
        }}
        data-testid={formatDataTestId(prefixDataTestId, "contact-info-toggle-button")}
      >
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
          <div className="gba:w-2 gba:h-2 gba:bg-green-500 gba:rounded-full"></div>
          <span className="gba:font-medium gba:text-gray-900">
            Contact Information
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

          {/* Academic Title - ✅ FIXED: Using standard Select like Legal Form */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Academic Title
            </Label>
            <Select
              value={formValues.academicTitle}
              onValueChange={(value) => setFormValues({ academicTitle: value })}
              data-testid={formatDataTestId(
                prefixDataTestId,
                "AcademicTitleSelect"
              )}
            >
              <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                <SelectValue placeholder="Please Select..." />
              </SelectTrigger>
              <SelectContent className="gba:max-h-[200px] gba:overflow-y-auto">
                {academicTitles.map((option, index) => (
                  <SelectItem
                    key={`${option.id}-${index}`}
                    value={option.value}
                  >
                    {option.label}
                  </SelectItem>
                ))}

                {/* Load More button if needed */}
                {academicTitlesLoading && (
                  <div className="gba:p-2 gba:text-center gba:text-gray-500">
                    Loading more academic titles...
                  </div>
                )}
                {academicTitlesHasMore && !academicTitlesLoading && (
                  <div className="gba:p-1">
                    <button
                      type="button"
                      onClick={loadMoreAcademicTitles}
                      className="gba:w-full gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded gba:hover:bg-blue-100 gba:transition-colors"
                      data-testid={formatDataTestId(prefixDataTestId, "load-more-academic-titles-button")}
                    >
                      📥 Load More Academic Titles
                    </button>
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Job Position */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Job Position
            </Label>
            <Input
              name="jobPosition"
              value={
                typeof formValues.jobPosition === "string"
                  ? formValues.jobPosition
                  : ""
              }
              onChange={(e) => setFormValues({ jobPosition: e.target.value })}
              placeholder="Please Enter..."
              className="gba:border-gray-300 gba:bg-white"
              data-testid={formatDataTestId(
                prefixDataTestId,
                "JobPositionInput"
              )}
            />
          </div>

          {/* Phone */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Phone
            </Label>
            <div className="gba:relative">
              <div className="gba:absolute gba:inset-y-0 gba:left-0 gba:pl-2 gba:flex gba:items-center gba:pointer-events-none gba:z-10">
                <PiPhone className="gba:h-5 gba:w-5 gba:text-gray-400" />
              </div>
              <Input
                name="phone"
                value={
                  typeof formValues.phone === "string" ? formValues.phone : ""
                }
                onChange={(e) => setFormValues({ phone: e.target.value })}
                placeholder="Please Enter..."
                className="gba:pl-8 gba:border-gray-300 gba:bg-white"
                style={{
                  borderColor: phoneError ? "#ef4444" : "#d1d5db",
                  paddingLeft: "32px",
                }}
                data-testid={formatDataTestId(prefixDataTestId, "phone-input")}
              />
            </div>
            {phoneError && (
              <p className="gba:text-sm gba:text-red-600">{phoneError}</p>
            )}
          </div>

          {/* Email */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Email
            </Label>
            <div className="gba:relative">
              <div className="gba:absolute gba:inset-y-0 gba:left-0 gba:pl-2 gba:flex gba:items-center gba:pointer-events-none gba:z-10">
                <PiEnvelopeSimple className="gba:h-5 gba:w-5 gba:text-gray-400" />
              </div>
              <Input
                name="email"
                value={
                  typeof formValues.email === "string" ? formValues.email : ""
                }
                onChange={(e) => setFormValues({ email: e.target.value })}
                placeholder="Please Enter..."
                className="gba:pl-8 gba:border-gray-300 gba:bg-white"
                style={{
                  borderColor: emailError ? "#ef4444" : "#d1d5db",
                  paddingLeft: "32px",
                }}
                data-testid={formatDataTestId(prefixDataTestId, "email-input")}
              />
            </div>
            {emailError && (
              <p className="gba:text-sm gba:text-red-600">{emailError}</p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default ContactInformationSection;
