import React, { useState, useEffect } from 'react'
import { Input, Label, Button, Card, CardContent } from '@newwork/nw-design-system'
import { PiCaretDown, PiCaretUp, PiPlus, PiMinus } from 'react-icons/pi'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useAccountFormContext } from '../context/AccountFormContext'
import SearchableSelect from '../../lead-form/components/SearchableSelect'

const prefixDataTestId = 'AccountForm'

const AddressInformationSection: React.FC = () => {
  const {
    formValues,
    countriesRegions,
    countriesRegionsLoading,
    countriesRegionsError,
    countriesRegionsHasMore,
    searchCountriesRegions,
    loadMoreCountriesRegions,
    regions,
    regionsLoading,
    regionsError,
    searchRegions,
    selectedCountryCode,
    setSelectedCountry,
    updateAddress
  } = useAccountFormContext()

  // Get the first address (we'll support single address for now)
  const address = formValues.addresses?.[0]

  const [isExpanded, setIsExpanded] = useState(false) // Start collapsed

  // Sync selected country when form values change (hook must be unconditional)
  useEffect(() => {
    if (address?.countryRef && address.countryRef !== selectedCountryCode) {
      setSelectedCountry(address.countryRef)
    }
  }, [address?.countryRef, selectedCountryCode, setSelectedCountry])

  // Safety check - if no address exists, don't render (after all hooks)
  // Also check if addresses array is empty or undefined
  if (!address || !formValues.addresses || formValues.addresses.length === 0) {
    return null
  }

  // Handle country selection change
  const handleCountryChange = (countryId: string) => {
    if (address) {
      updateAddress(address.id, { countryRef: countryId })
      setSelectedCountry(countryId)
      updateAddress(address.id, { regionRef: '' }) // Clear region when country changes
    }
  }

  // Handle region selection change
  const handleRegionChange = (regionId: string) => {
    if (address) {
      updateAddress(address.id, { regionRef: regionId })
    }
  }

  // Handle other field changes
  const handleFieldChange = (field: string, value: string) => {
    if (address) {
      updateAddress(address.id, { [field]: value })
    }
  }

  // Handle address line changes
  const handleAddressLineChange = (index: number, value: string) => {
    if (address) {
      const newAddressLines = [...address.addressLines]
      newAddressLines[index] = value
      updateAddress(address.id, { addressLines: newAddressLines })
    }
  }

  // Add address line
  const addAddressLine = () => {
    if (address) {
      const newAddressLines = [...address.addressLines, '']
      updateAddress(address.id, { addressLines: newAddressLines })
    }
  }

  // Remove address line
  const removeAddressLine = (index: number) => {
    if (address && address.addressLines.length > 1) {
      const newAddressLines = address.addressLines.filter((_, i) => i !== index)
      updateAddress(address.id, { addressLines: newAddressLines })
    }
  }

  return (
    <Card
      className="gba:border-0 gba:shadow-none gba:bg-transparent gba:p-0"
      style={{
        border: '0',
        borderWidth: '0',
        borderStyle: 'none',
        borderColor: 'transparent',
        boxShadow: 'none',
        padding: '0',
        background: 'transparent'
      }}
      data-testid={formatDataTestId(prefixDataTestId, 'address-information-section')}
    >
      <Button
        type="button"
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:w-full gba:px-4 gba:py-2 gba:transition-all gba:flex gba:items-center gba:justify-between gba:text-left gba:rounded-xl gba:text-sm gba:bg-warning-secondary hover:gba:bg-warning gba:border-0"
        data-testid={formatDataTestId(prefixDataTestId, 'address-info-toggle')}
      >
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
          <div className="gba:w-2 gba:h-2 gba:bg-orange-500 gba:rounded-full"></div>
          <span className="gba:font-medium gba:text-gray-900">
            {getTranslationFromI18nKeyAndLabel('account.address.title', 'Address')}
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
            border: '0',
            borderWidth: '0',
            borderStyle: 'none',
            borderColor: 'transparent',
            padding: '16px',
            marginTop: '0'
          }}
          data-testid={formatDataTestId(prefixDataTestId, 'address-form-content')}
        >
          {/* Address Lines */}
          <div className="gba:space-y-4" data-testid={formatDataTestId(prefixDataTestId, 'address-lines-section')}>
            <div className="gba:flex gba:items-center gba:justify-between">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                {getTranslationFromI18nKeyAndLabel('account.address.lines.label', 'Address Lines')}
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAddressLine}
                className="gba:flex gba:items-center gba:gap-2"
                data-testid={formatDataTestId(prefixDataTestId, 'add-address-line-button')}
              >
                <PiPlus className="gba:w-4 gba:h-4" />
                {getTranslationFromI18nKeyAndLabel('account.address.lines.addButton', 'Add Line')}
              </Button>
            </div>

            {address.addressLines.map((line, index) => (
              <div
                key={index}
                className="gba:flex gba:items-center gba:gap-2"
                data-testid={formatDataTestId(prefixDataTestId, `address-line-${index + 1}-container`)}
              >
                <Input
                  value={line}
                  onChange={e => handleAddressLineChange(index, e.target.value)}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'account.address.lines.placeholder',
                    `Address line ${index + 1}...`
                  )}
                  className="gba:border-gray-300 gba:bg-white gba:flex-1"
                  data-testid={formatDataTestId(prefixDataTestId, `address-line-${index + 1}-input`)}
                />
                {address.addressLines.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeAddressLine(index)}
                    className="gba:flex gba:items-center gba:gap-1 gba:text-red-600 gba:border-red-300 hover:gba:bg-red-50"
                    data-testid={formatDataTestId(prefixDataTestId, `remove-address-line-${index + 1}-button`)}
                  >
                    <PiMinus className="gba:w-4 gba:h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Postal Code and Locality - Side by side */}
          <div
            className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2"
            data-testid={formatDataTestId(prefixDataTestId, 'postal-locality-section')}
          >
            <div className="gba:space-y-2" data-testid={formatDataTestId(prefixDataTestId, 'postal-code-section')}>
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                {getTranslationFromI18nKeyAndLabel('account.address.postalCode.label', 'Postal Code')}
              </Label>
              <Input
                name="postalCode"
                value={address.postalCode}
                onChange={e => handleFieldChange('postalCode', e.target.value)}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'account.address.postalCode.placeholder',
                  'Please Enter...'
                )}
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'postal-code-input')}
              />
            </div>

            <div className="gba:space-y-2" data-testid={formatDataTestId(prefixDataTestId, 'locality-section')}>
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
                {getTranslationFromI18nKeyAndLabel('account.address.locality.label', 'Locality (City)')}
              </Label>
              <Input
                name="locality"
                value={address.locality}
                onChange={e => handleFieldChange('locality', e.target.value)}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'account.address.locality.placeholder',
                  'Please Enter...'
                )}
                className="gba:border-gray-300 gba:bg-white"
                data-testid={formatDataTestId(prefixDataTestId, 'locality-input')}
              />
            </div>
          </div>

          {/* Country and Region - Side by side */}
          <div
            className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2"
            data-testid={formatDataTestId(prefixDataTestId, 'country-region-section')}
          >
            <div className="gba:space-y-2" data-testid={formatDataTestId(prefixDataTestId, 'country-section')}>
              <SearchableSelect
                label={getTranslationFromI18nKeyAndLabel('account.address.country.label', 'Country')}
                name="countryRef"
                value={address.countryRef}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'account.address.country.placeholder',
                  'Please Select...'
                )}
                options={countriesRegions}
                loading={countriesRegionsLoading}
                hasMore={countriesRegionsHasMore}
                onSearch={searchCountriesRegions}
                onLoadMore={loadMoreCountriesRegions}
                onChange={handleCountryChange}
                error={countriesRegionsError}
                data-testid={formatDataTestId(prefixDataTestId, 'country-select')}
              />
            </div>

            <div className="gba:space-y-2" data-testid={formatDataTestId(prefixDataTestId, 'region-section')}>
              <SearchableSelect
                label={getTranslationFromI18nKeyAndLabel('account.address.region.label', 'Region/State')}
                name="regionRef"
                value={address.regionRef}
                placeholder={
                  selectedCountryCode
                    ? getTranslationFromI18nKeyAndLabel('account.address.region.placeholder', 'Please Select...')
                    : getTranslationFromI18nKeyAndLabel(
                        'account.address.region.selectCountryFirst',
                        'Select country first...'
                      )
                }
                options={regions}
                loading={regionsLoading}
                hasMore={false} // We load all regions at once
                onSearch={searchRegions}
                onLoadMore={() => {}} // No pagination needed
                onChange={handleRegionChange}
                error={regionsError}
                disabled={!selectedCountryCode || regions.length === 0}
                data-testid={formatDataTestId(prefixDataTestId, 'region-select')}
              />
              {selectedCountryCode && regions.length === 0 && (
                <p
                  className="gba:text-xs gba:text-gray-500 gba:mt-1"
                  data-testid={formatDataTestId(prefixDataTestId, 'no-regions-message')}
                >
                  {getTranslationFromI18nKeyAndLabel(
                    'account.address.region.noRegionsAvailable',
                    'No regions available for selected country'
                  )}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default AddressInformationSection
