import React, { useState } from 'react';
import { InputField } from '@newwork/gravity-ui-catalog';
import { PiPlus, PiMinus, PiCaretDown, PiCaretUp } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useLeadFormContext } from '../context/LeadFormContext';
import SearchableSelect from './SearchableSelect';

const prefixDataTestId = 'LeadForm';

const AddressInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const {
    formValues,
    setFormValues,
    isLoading,
    
    // Countries
    countries,
    countriesLoading,
    countriesError,
    countriesHasMore,
    searchCountries,
    loadMoreCountries,
    
    addressLineCount,
    addAddressLine,
    removeAddressLine,
  } = useLeadFormContext();

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
            <SearchableSelect
              label="Country"
              name="country"
              value={formValues.country}
              onChange={value => setFormValues({ country: value })}
              options={countries}
              placeholder="Please Select..."
              loading={countriesLoading}
              hasMore={countriesHasMore}
              onLoadMore={loadMoreCountries}
              onSearch={searchCountries}
              error={countriesError}
              data-testid={formatDataTestId(prefixDataTestId, 'CountrySelect')}
            />

            <InputField
              label="Region/State"
              name="region"
              value={typeof formValues.region === 'string' ? formValues.region : ''}
              onChange={e => setFormValues({ region: String(e.value || '') })}
              placeholder="Please Enter..."
              data-testid={formatDataTestId(prefixDataTestId, 'RegionInput')}
            />
          </div>

          {/* Dynamic Address Lines */}
          <div className="gba:space-y-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900">
                Address Lines
              </label>
              <div className="gba:flex gba:items-center gba:gap-2">
                {addressLineCount > 1 && (
                  <button
                    type="button"
                    onClick={removeAddressLine}
                    className="gba:inline-flex gba:items-center gba:gap-1 gba:px-3 gba:py-1 gba:text-sm gba:font-medium gba:text-red-700 gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-md gba:hover:bg-red-100 gba:transition-colors"
                    data-testid={formatDataTestId(prefixDataTestId, 'RemoveAddressLineButton')}
                  >
                    <PiMinus className="gba:w-3 gba:h-3" />
                    Remove Line
                  </button>
                )}
                {addressLineCount < 4 && (
                  <button
                    type="button"
                    onClick={addAddressLine}
                    className="gba:inline-flex gba:items-center gba:gap-1 gba:px-3 gba:py-1 gba:text-sm gba:font-medium gba:text-blue-700 gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded-md gba:hover:bg-blue-100 gba:transition-colors"
                    data-testid={formatDataTestId(prefixDataTestId, 'AddAddressLineButton')}
                  >
                    <PiPlus className="gba:w-3 gba:h-3" />
                    Add Line
                  </button>
                )}
              </div>
            </div>

            {Array.from({ length: addressLineCount }, (_, index) => {
              const lineNumber = index + 1;
              const fieldName = `addressLine${lineNumber}` as keyof typeof formValues;
              const value = formValues[fieldName];
              
              return (
                <InputField
                  key={fieldName}
                  label={`Address Line ${lineNumber}`}
                  name={fieldName}
                  value={typeof value === 'string' ? value : ''}
                  onChange={e => setFormValues({ [fieldName]: String(e.value || '') })}
                  placeholder="Please Enter..."
                  data-testid={formatDataTestId(prefixDataTestId, `AddressLine${lineNumber}Input`)}
                />
              );
            })}
          </div>

          {/* Postal Code and City - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <InputField
              label="Postal Code"
              name="postalCode"
              value={typeof formValues.postalCode === 'string' ? formValues.postalCode : ''}
              onChange={e => setFormValues({ postalCode: String(e.value || '') })}
              placeholder="Please Enter..."
              data-testid={formatDataTestId(prefixDataTestId, 'PostalCodeInput')}
            />

            <InputField
              label="City"
              name="city"
              value={typeof formValues.city === 'string' ? formValues.city : ''}
              onChange={e => setFormValues({ city: String(e.value || '') })}
              placeholder="Please Enter..."
              data-testid={formatDataTestId(prefixDataTestId, 'CityInput')}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressInformationSection; 