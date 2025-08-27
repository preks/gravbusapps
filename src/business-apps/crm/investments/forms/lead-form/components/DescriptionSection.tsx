import React, { useState } from "react";
import {
  Card,
  CardContent,
  Textarea,
  Label,
  Button,
} from "@newwork/nw-design-system";
import { PiCaretDown, PiCaretUp } from "react-icons/pi";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { useLeadFormContext } from "../context/LeadFormContext";

const prefixDataTestId = "LeadForm";

const DescriptionSection: React.FC = () => {
  const { formValues, setFormValues } = useLeadFormContext();

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

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
        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
        className="gba:w-full gba:px-4 gba:py-2 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left gba:rounded-lg gba:text-sm"
        style={{
          background: "linear-gradient(to right, #bfdbfe, #93c5fd)",
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
            "linear-gradient(to right, #93c5fd, #60a5fa)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background =
            "linear-gradient(to right, #bfdbfe, #93c5fd)";
        }}
        data-testid={formatDataTestId(prefixDataTestId, "DescriptionToggle")}
      >
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
          <div className="gba:w-2 gba:h-2 gba:bg-blue-500 gba:rounded-full"></div>
          <span className="gba:font-medium gba:text-gray-900">Description</span>
        </div>
        <div className="gba:flex gba:items-center">
          {isDescriptionExpanded ? (
            <PiCaretUp className="gba:w-4 gba:h-4 gba:text-gray-700" />
          ) : (
            <PiCaretDown className="gba:w-4 gba:h-4 gba:text-gray-700" />
          )}
        </div>
      </Button>

      {isDescriptionExpanded && (
        <CardContent
          className="gba:bg-white gba:border-0 gba:p-4 gba:mt-0"
          style={{
            border: "0",
            borderWidth: "0",
            borderStyle: "none",
            borderColor: "transparent",
            padding: "16px",
            marginTop: "0",
          }}
        >
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Description
            </Label>
            <Textarea
              name="notes"
              value={
                typeof formValues.notes === "string" ? formValues.notes : ""
              }
              onChange={(e) => setFormValues({ notes: e.target.value })}
              placeholder="Please Enter..."
              rows={4}
              className="gba:border-gray-300 gba:bg-white"
              data-testid={formatDataTestId(
                prefixDataTestId,
                "DescriptionTextarea"
              )}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default DescriptionSection;
