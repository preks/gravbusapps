import React, { useState } from 'react';
import { Input, Label, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system';
import { PiPlus, PiMinus, PiCaretDown, PiCaretUp } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useAccountFormContext } from '../context/AccountFormContext';
import SearchableSelect from './SearchableSelect';

const prefixDataTestId = 'AccountForm';

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
  const stringCountries = countries.filter(c => typeof c.label === 'string');
  
  // No complex mapping needed - just pass the value directly

  const renderAddressLine = (lineNumber: number) => {
    const fieldName = `addressLine${lineNumber}` as keyof typeof formValues;
    const value = formValues[fieldName] as string;

    return (
      <div key={lineNumber}>
        <Label htmlFor={fieldName} className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
          Address Line {lineNumber}
        </Label>
        <Input
          id={fieldName}
          name={fieldName}
          value={value || ''}
          onChange={(e) => setFormValues({ [fieldName]: e.target.value })}
          placeholder="Please Enter..."
          className="gba:w-full"
          data-testid={formatDataTestId(prefixDataTestId, `AddressLine${lineNumber}Input`)}
        />
      </div>
    );
  };

  return (
    <div className="gba:bg-white gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-100 gba:overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:w-full gba:px-6 gba:py-4 gba:border-b gba:border-gray-100 gba:bg-gradient-to-r gba:from-orange-200 gba:to-amber-200 gba:hover:from-orange-300 gba:hover:to-amber-300 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left"
        style={{
          background: 'linear-gradient(to right, #fed7aa, #fde68a)',
          transition: 'background 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(to right, #fdba74, #fcd34d)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(to right, #fed7aa, #fde68a)';
        }}
        data-testid={formatDataTestId(prefixDataTestId, 'AddressInfoToggle')}
      >
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-2 gba:h-2 gba:bg-orange-500 gba:rounded-full"></div>
          Address Information
        </h3>
        {isExpanded ? (
          <PiCaretUp className="gba:w-4 gba:h-4 gba:text-gray-500" />
        ) : (
          <PiCaretDown className="gba:w-4 gba:h-4 gba:text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <div className="gba:p-6 gba:space-y-6">

                    {/* Country and Region - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:w-full gba:min-w-0 gba:overflow-hidden">
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
                className="gba:w-full gba:max-w-full"
                data-testid={formatDataTestId(prefixDataTestId, 'CountrySelect')}
              />
            </div>

            <div className="gba:w-full gba:min-w-0 gba:overflow-hidden">
              <Label htmlFor="region" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Region/State
              </Label>
              <Input
                id="region"
                name="region"
                value={formValues.region}
                onChange={(e) => setFormValues({ region: e.target.value })}
                placeholder="Please Enter..."
                className="gba:w-full gba:max-w-full"
                data-testid={formatDataTestId(prefixDataTestId, 'RegionInput')}
              />
            </div>
          </div>

          {/* Address Lines */}
          <div className="gba:space-y-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900">
                Address
              </label>
              <div className="gba:flex gba:gap-2">
                {addressLineCount < 4 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={addAddressLine}
                    data-testid={formatDataTestId(prefixDataTestId, 'AddAddressLineButton')}
                  >
                    <PiPlus className="gba:mr-2 gba:h-4 gba:w-4" />
                    Add Line
                  </Button>
                )}
                {addressLineCount > 1 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={removeAddressLine}
                    data-testid={formatDataTestId(prefixDataTestId, 'RemoveAddressLineButton')}
                  >
                    <PiMinus className="gba:mr-2 gba:h-4 gba:w-4" />
                    Remove Line
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
            <div className="gba:w-full">
              <Label htmlFor="postalCode" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Postal Code
              </Label>
              <Input
                id="postalCode"
                name="postalCode"
                value={formValues.postalCode}
                onChange={(e) => setFormValues({ postalCode: e.target.value })}
                placeholder="Please Enter..."
                className="gba:w-full"
                data-testid={formatDataTestId(prefixDataTestId, 'PostalCodeInput')}
              />
            </div>

            <div className="gba:w-full">
              <Label htmlFor="city" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                City
              </Label>
              <Input
                id="city"
                name="city"
                value={formValues.city}
                onChange={(e) => setFormValues({ city: e.target.value })}
                placeholder="Please Enter..."
                className="gba:w-full"
                data-testid={formatDataTestId(prefixDataTestId, 'CityInput')}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressInformationSection; 