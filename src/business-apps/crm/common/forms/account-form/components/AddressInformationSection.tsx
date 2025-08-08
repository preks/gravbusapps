import React, { useState } from "react";
import {
  Input,
  Label,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
} from "@newwork/nw-design-system";
import { PiPlus, PiMinus, PiCaretDown, PiCaretUp } from "react-icons/pi";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { useAccountFormContext } from "../context/AccountFormContext";
import SearchableSelect from "./SearchableSelect";

const prefixDataTestId = "AccountForm";

const AddressInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed

  const {
    formValues,
    setFormValues,
    countries,
    countriesLoading,
    countriesError,
    countriesHasMore,
    searchCountries,
    loadMoreCountries,
    addressLineCount,
    addAddressLine,
    removeAddressLine,
  } = useAccountFormContext();

  // Only allow countries with string labels
  const stringCountries = countries.filter((c) => typeof c.label === "string");

  // No complex mapping needed - just pass the value directly

  const renderAddressLine = (lineNumber: number) => {
    const fieldName = `addressLine${lineNumber}` as keyof typeof formValues;
    const value = formValues[fieldName] as string;

    return (
      <div key={lineNumber} className="gba:space-y-2">
        <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
          Address Line {lineNumber}
        </Label>
        <Input
          name={fieldName}
          value={value || ""}
          onChange={(e) => setFormValues({ [fieldName]: e.target.value })}
          placeholder="Please Enter..."
          className="gba:border-gray-300 gba:bg-white"
          data-testid={formatDataTestId(
            prefixDataTestId,
            `AddressLine${lineNumber}Input`
          )}
        />
      </div>
    );
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
        data-testid={formatDataTestId(prefixDataTestId, "AddressInfoToggle")}
      >
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
          <div className="gba:w-2 gba:h-2 gba:bg-orange-500 gba:rounded-full"></div>
          <span className="gba:font-medium gba:text-gray-900">
            Address Information
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
          {/* Country and Region - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:space-y-2">
              <SearchableSelect
                label="Country"
                name="country"
                value={formValues.country}
                placeholder="Please Select..."
                options={stringCountries}
                loading={countriesLoading}
                hasMore={countriesHasMore}
                onSearch={searchCountries}
                onLoadMore={loadMoreCountries}
                onChange={(value) => {
                  // Store the option value directly
                  setFormValues({ country: value });
                }}
                error={countriesError}
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "CountrySelect"
                )}
              />
            </div>

            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Region/State
              </Label>
              <Input
                name="region"
                value={formValues.region}
                onChange={(e) => setFormValues({ region: e.target.value })}
                placeholder="Please Enter..."
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, "RegionInput")}
              />
            </div>
          </div>

          {/* Address Lines */}
          <div className="gba:space-y-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Address Lines
              </Label>
              <div className="gba:flex gba:items-center gba:gap-2">
                {addressLineCount > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={removeAddressLine}
                    className="gba:text-red-700 gba:border-gray-300 gba:bg-white gba:hover:bg-red-50 gba:text-xs gba:px-2 gba:py-1"
                    data-testid={formatDataTestId(
                      prefixDataTestId,
                      "RemoveAddressLineButton"
                    )}
                  >
                    <PiMinus className="gba:w-3 gba:h-3 gba:mr-1" />
                    Remove Line
                  </Button>
                )}
                {addressLineCount < 4 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addAddressLine}
                    className="gba:text-blue-700 gba:border-gray-300 gba:bg-white gba:hover:bg-blue-50 gba:text-xs gba:px-2 gba:py-1"
                    data-testid={formatDataTestId(
                      prefixDataTestId,
                      "AddAddressLineButton"
                    )}
                  >
                    <PiPlus className="gba:w-3 gba:h-3 gba:mr-1" />
                    Add Line
                  </Button>
                )}
              </div>
            </div>

            {Array.from({ length: addressLineCount }, (_, index) =>
              renderAddressLine(index + 1)
            )}
          </div>

          {/* Postal Code and City - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Postal Code
              </Label>
              <Input
                name="postalCode"
                value={formValues.postalCode}
                onChange={(e) => setFormValues({ postalCode: e.target.value })}
                placeholder="Please Enter..."
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "PostalCodeInput"
                )}
              />
            </div>

            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                City
              </Label>
              <Input
                name="city"
                value={formValues.city}
                onChange={(e) => setFormValues({ city: e.target.value })}
                placeholder="Please Enter..."
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, "CityInput")}
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AddressInformationSection;
