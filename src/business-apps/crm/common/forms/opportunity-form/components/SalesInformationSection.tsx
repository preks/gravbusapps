import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Label,
  Card,
  CardContent,
  Button,
} from "@newwork/nw-design-system";
import { PiCaretDown, PiCaretUp } from "react-icons/pi";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { useOpportunityFormContext } from "../context/OpportunityFormContext";

const prefixDataTestId = "OpportunityForm";

const SalesInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed

  const {
    formValues,
    setFormValues,
    currencies,
    pipelines,
    salesPipelineStages,
  } = useOpportunityFormContext();

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
        data-testid={formatDataTestId(prefixDataTestId, "SalesInfoToggle")}
      >
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
          <div className="gba:w-2 gba:h-2 gba:bg-blue-500 gba:rounded-full"></div>
          <span className="gba:font-medium gba:text-gray-900">
            Sales Information
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
          {/* Winning Chance and Close Date - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Winning Chance (%)
              </Label>
              <Input
                name="winningChance"
                type="number"
                min="0"
                max="100"
                step="1"
                value={formValues.winningChance || ""}
                onChange={(e) =>
                  setFormValues({ winningChance: e.target.value })
                }
                placeholder="0"
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "WinningChanceInput"
                )}
              />
            </div>

            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Close Date
              </Label>
              <Input
                name="closeDate"
                type="date"
                value={formValues.closeDate || ""}
                onChange={(e) => setFormValues({ closeDate: e.target.value })}
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "CloseDateInput"
                )}
              />
            </div>
          </div>

          {/* Stage and Status - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Stage
              </Label>
              <Input
                name="stage"
                value={formValues.stage || ""}
                onChange={(e) => setFormValues({ stage: e.target.value })}
                placeholder="Please Enter..."
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, "StageInput")}
              />
            </div>

            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Status
              </Label>
              <Input
                name="status"
                value={formValues.status || ""}
                onChange={(e) => setFormValues({ status: e.target.value })}
                placeholder="Please Enter..."
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, "StatusInput")}
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default SalesInformationSection;
