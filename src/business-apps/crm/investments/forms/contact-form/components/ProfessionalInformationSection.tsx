import React, { useState } from "react";
import { useContactFormContext } from "../context/ContactFormContext";
import {
  Input,
  Label,
  Card,
  CardContent,
  Button,
  Alert,
  AlertDescription,
} from "@newwork/nw-design-system";
import { PiCaretDown, PiCaretUp } from "react-icons/pi";
import { formatDataTestId } from "@/common/utils/formatDataTestId";

const prefixDataTestId = "ContactForm";

const ProfessionalInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed

  const { formValues, setFormValues, error } = useContactFormContext();

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
          background: "linear-gradient(to right, #fed7aa, #fdba74)",
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
            "linear-gradient(to right, #fdba74, #fb923c)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background =
            "linear-gradient(to right, #fed7aa, #fdba74)";
        }}
        data-testid={formatDataTestId(
          prefixDataTestId,
          "professional-info-toggle"
        )}
      >
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
          <div className="gba:w-2 gba:h-2 gba:bg-orange-500 gba:rounded-full"></div>
          <span className="gba:font-medium gba:text-gray-900">
            Professional Information
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
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Job Position and Department - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Job Position
              </Label>
              <Input
                name="jobPosition"
                value={formValues.jobPosition}
                onChange={(e) => setFormValues({ jobPosition: e.target.value })}
                placeholder="Please enter job position..."
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "job-position-input"
                )}
              />
            </div>

            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Department
              </Label>
              <Input
                name="department"
                value={formValues.department}
                onChange={(e) => setFormValues({ department: e.target.value })}
                placeholder="Please enter department..."
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "department-input"
                )}
              />
            </div>
          </div>

          {/* Code - Full width */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Business Code
            </Label>
            <Input
              name="code"
              value={formValues.code}
              onChange={(e) => setFormValues({ code: e.target.value })}
              placeholder="Please enter business code..."
              className="gba:border-gray-300 gba:bg-white"
              data-testid={formatDataTestId(prefixDataTestId, "code-input")}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default ProfessionalInformationSection;
