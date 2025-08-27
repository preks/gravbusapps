import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Input,
  Label,
  Button,
} from "@newwork/nw-design-system";
import { PiCaretDown, PiCaretUp } from "react-icons/pi";
import { formatDataTestId } from "@/common/utils/formatDataTestId";
import { useLeadFormContext } from "../context/LeadFormContext";
import SearchableSelect from "./SearchableSelect";
import { useCountriesRegions } from "../hooks/useCountriesRegions";

const prefixDataTestId = "LeadForm";

const AddressInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const { formValues, setFormValues, businessAppContext } =
    useLeadFormContext();

  // Use the new countries and regions hook with business app context (same as account form)
  const {
    countries,
    countriesLoading,
    countriesError,
    countriesHasMore,
    searchCountries,
    loadMoreCountries,
    regions,
    regionsLoading,
    regionsError,
    searchRegions,
    selectedCountryCode,
    setSelectedCountry,
  } = useCountriesRegions(businessAppContext);

  // ✅ DEBUG: Log address form values and countries data
  useEffect(() => {
    console.log("🔍 AddressInformationSection Debug:", {
      countryValue: formValues.country,
      countryValueType: typeof formValues.country,
      regionValue: formValues.region,
      countriesCount: countries?.length || 0,
      countriesFirst: countries?.[0] || null,
      countryMatch: countries?.find(
        (opt) =>
          opt.value === formValues.country || opt.id === formValues.country
      ),
      regionMatch: regions?.find(
        (opt) => opt.value === formValues.region || opt.id === formValues.region
      ),
      // Check different format possibilities
      countryMatchById: countries?.find((opt) => opt.id === formValues.country),
      countryMatchByValue: countries?.find(
        (opt) => opt.value === formValues.country
      ),
    });
  }, [formValues.country, formValues.region, countries, regions]);

  // Handle country selection change
  const handleCountryChange = (countryId: string) => {
    setFormValues({ country: countryId });
    setSelectedCountry(countryId);
    setFormValues({ region: "" }); // Clear region when country changes
  };

  // Handle region selection change
  const handleRegionChange = (regionId: string) => {
    setFormValues({ region: regionId });
  };

  // Sync selected country when form values change
  useEffect(() => {
    if (formValues.country && formValues.country !== selectedCountryCode) {
      console.log(
        `🌍 AddressInformationSection: Setting country from form value "${formValues.country}"`
      );
      setSelectedCountry(formValues.country);
    }
  }, [formValues.country, selectedCountryCode, setSelectedCountry]);

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
                options={countries}
                loading={countriesLoading}
                hasMore={countriesHasMore}
                onSearch={searchCountries}
                onLoadMore={loadMoreCountries}
                onChange={handleCountryChange}
                error={countriesError}
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "CountrySelect"
                )}
              />
            </div>

            <div className="gba:space-y-2">
              <SearchableSelect
                label="Region/State"
                name="region"
                value={formValues.region}
                placeholder={
                  selectedCountryCode
                    ? "Please Select..."
                    : "Select country first..."
                }
                options={regions}
                loading={regionsLoading}
                hasMore={false} // We load all regions at once
                onSearch={searchRegions}
                onLoadMore={() => {}} // No pagination needed
                onChange={handleRegionChange}
                error={regionsError}
                disabled={!selectedCountryCode || regions.length === 0}
                data-testid={formatDataTestId(prefixDataTestId, "RegionSelect")}
              />
              {selectedCountryCode && regions.length === 0 && (
                <p className="gba:text-xs gba:text-gray-500 gba:mt-1">
                  No regions available for selected country
                </p>
              )}
            </div>
          </div>

          {/* Single Address Line */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Address Line
            </Label>
            <Input
              name="addressLine"
              value={formValues.addressLine || ""}
              onChange={(e) => setFormValues({ addressLine: e.target.value })}
              placeholder="Enter address..."
              className="gba:border-gray-300 gba:bg-white"
              data-testid={formatDataTestId(
                prefixDataTestId,
                "AddressLineInput"
              )}
            />
          </div>

          {/* Postal Code and City - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                Postal Code
              </Label>
              <Input
                name="postalCode"
                value={formValues.postalCode || ""}
                onChange={(e) => setFormValues({ postalCode: e.target.value })}
                placeholder="Enter postal code..."
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
                name="locality"
                value={formValues.locality || ""}
                onChange={(e) => setFormValues({ locality: e.target.value })}
                placeholder="Enter city..."
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(
                  prefixDataTestId,
                  "LocalityInput"
                )}
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AddressInformationSection;
