import React, { useState } from "react";
import {
  Input,
  Label,
  Card,
  CardContent,
  Button,
  Textarea,
} from "@newwork/nw-design-system";
import { PiCaretDown, PiCaretUp } from "react-icons/pi";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { useOpportunityFormContext } from "../context/OpportunityFormContext";

const prefixDataTestId = "OpportunityForm";

const AdditionalInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed

  const { formValues, setFormValues } = useOpportunityFormContext();

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
        data-testid={formatDataTestId(prefixDataTestId, "AdditionalInfoToggle")}
      >
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
          <div className="gba:w-2 gba:h-2 gba:bg-purple-500 gba:rounded-full"></div>
          <span className="gba:font-medium gba:text-gray-900">
            Additional Information
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
              <div className="gba:relative">
                <Input
                  name="winningChance"
                  type="number"
                  min="0"
                  max="100"
                  value={formValues.winningChance || ""}
                  onChange={(e) =>
                    setFormValues({ winningChance: e.target.value })
                  }
                  placeholder="Enter percentage..."
                  className="gba:border-gray-300 gba:bg-white gba:focus:border-blue-500 gba:focus:ring-2 gba:focus:ring-blue-200 gba:transition-all gba:duration-200 gba:pr-8"
                  data-testid={formatDataTestId(
                    prefixDataTestId,
                    "WinningChanceInput"
                  )}
                />
                <div className="gba:absolute gba:inset-y-0 gba:right-0 gba:pr-3 gba:flex gba:items-center gba:pointer-events-none">
                  <span className="gba:text-gray-500 gba:text-sm">%</span>
                </div>
              </div>
            </div>

            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Expected Close Date
              </Label>
              <Input
                name="closeDate"
                type="date"
                value={formValues.closeDate || ""}
                onChange={(e) => setFormValues({ closeDate: e.target.value })}
                className="gba:border-gray-300 gba:bg-white gba:focus:border-blue-500 gba:focus:ring-2 gba:focus:ring-blue-200 gba:transition-all gba:duration-200"
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "CloseDateInput"
                )}
              />
            </div>
          </div>

          {/* Code */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Code
            </Label>
            <Input
              name="code"
              value={formValues.code || ""}
              onChange={(e) => setFormValues({ code: e.target.value })}
              placeholder="Enter code..."
              className="gba:border-gray-300 gba:bg-white gba:focus:border-blue-500 gba:focus:ring-2 gba:focus:ring-blue-200 gba:transition-all gba:duration-200"
              data-testid={formatDataTestId(prefixDataTestId, "CodeInput")}
            />
          </div>

          {/* Personal Opportunity Toggle */}
          <div className="gba:flex gba:items-center gba:space-x-3 gba:py-2">
            <div className="gba:relative gba:inline-flex gba:items-center">
              <input
                type="checkbox"
                checked={formValues.personal || false}
                onChange={(e) => setFormValues({ personal: e.target.checked })}
                className="gba:sr-only"
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "PersonalCheckbox"
                )}
              />
              <div
                className="gba:w-11 gba:h-6 gba:rounded-full gba:relative gba:cursor-pointer gba:transition-all gba:duration-300 gba:ease-in-out"
                style={{
                  background: formValues.personal
                    ? "linear-gradient(to right, #ddd6fe, #c4b5fd)"
                    : "#d1d5db",
                }}
                onClick={() =>
                  setFormValues({ personal: !(formValues.personal || false) })
                }
              >
                <div
                  className="gba:absolute gba:top-1/2 gba:w-5 gba:h-5 gba:bg-white gba:rounded-full gba:shadow-md gba:transition-all gba:duration-300 gba:ease-in-out gba:-translate-y-1/2"
                  style={{
                    transform: formValues.personal
                      ? "translateX(20px) translateY(-50%)"
                      : "translateX(2px) translateY(-50%)",
                  }}
                />
              </div>
            </div>
            <Label
              className="gba:text-sm gba:font-medium gba:text-gray-900 gba:cursor-pointer"
              onClick={() =>
                setFormValues({ personal: !(formValues.personal || false) })
              }
            >
              Personal Opportunity
            </Label>
          </div>

          {/* Notes Summary */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Notes Summary
            </Label>
            <Textarea
              name="notesSummary"
              value={formValues.notesSummary || ""}
              onChange={(e) => setFormValues({ notesSummary: e.target.value })}
              placeholder="Add notes about this opportunity..."
              rows={4}
              className="gba:border-gray-300 gba:bg-white"
              data-testid={formatDataTestId(
                prefixDataTestId,
                "NotesSummaryInput"
              )}
            />
            <div className="gba:text-xs gba:text-gray-400 gba:text-right">
              {(formValues.notesSummary || "").length}/500
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AdditionalInformationSection;
