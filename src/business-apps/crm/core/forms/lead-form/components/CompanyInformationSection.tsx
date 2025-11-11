import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button
} from '@newwork/nw-design-system'
import { PiPhone, PiEnvelopeSimple, PiCaretDown, PiCaretUp, PiPlus, PiMinus } from 'react-icons/pi'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useLeadFormContext } from '../context/LeadFormContext'
import { validateEmail, validatePhone, toStringOrUndefined } from '../utils/validationUtils'
import SearchableSelect from './SearchableSelect'
import { useCountriesRegions } from '../hooks/useCountriesRegions'

const prefixDataTestId = 'LeadForm'

const CompanyInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isAdditionalInfoExpanded, setIsAdditionalInfoExpanded] = useState(false)
  const [isLegalFormOpen, setIsLegalFormOpen] = useState(false)
  const [isIndustryOpen, setIsIndustryOpen] = useState(false)
  const [isEmployeeSizeOpen, setIsEmployeeSizeOpen] = useState(false)
  const [isRevenueSizeOpen, setIsRevenueSizeOpen] = useState(false)

  const {
    formValues,
    setFormValues,
    businessAppContext,

    // Legal Forms
    legalForms,
    legalFormsLoading,
    legalFormsHasMore,
    legalFormsNeedsMoreData,
    legalFormsDisplayCount,
    legalFormsTotalFetched,
    loadMoreLegalForms,
    showMoreLegalForms,

    // Industries
    industries,
    industriesLoading,
    industriesHasMore,
    industriesNeedsMoreData,
    industriesDisplayCount,
    industriesTotalFetched,
    loadMoreIndustries,
    showMoreIndustries,

    // Employee Sizes
    employeeSizes,
    employeeSizesLoading,
    employeeSizesHasMore,
    employeeSizesNeedsMoreData,
    employeeSizesDisplayCount,
    employeeSizesTotalFetched,
    loadMoreEmployeeSizes,
    showMoreEmployeeSizes,

    // Revenue Sizes
    revenueSizes,
    revenueSizesLoading,
    revenueSizesHasMore,
    revenueSizesNeedsMoreData,
    revenueSizesDisplayCount,
    revenueSizesTotalFetched,
    loadMoreRevenueSizes,
    showMoreRevenueSizes,

    // Address line management
    addressLineCount,
    addAddressLine,
    removeAddressLineAtIndex
  } = useLeadFormContext()

  // Use the countries and regions hook with business app context
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
    setSelectedCountry
  } = useCountriesRegions(businessAppContext)

  // Handle country selection change
  const handleCountryChange = (countryId: string) => {
    setFormValues({ country: countryId })
    setSelectedCountry(countryId)
    setFormValues({ region: '' }) // Clear region when country changes
  }

  // Handle region selection change
  const handleRegionChange = (regionId: string) => {
    setFormValues({ region: regionId })
  }

  // Sync selected country when form values change
  useEffect(() => {
    if (formValues.country && formValues.country !== selectedCountryCode) {
      console.log('🔄 Lead Form - Syncing selected country:', {
        formValuesCountry: formValues.country,
        currentSelectedCountryCode: selectedCountryCode
      })
      setSelectedCountry(formValues.country)
    }
  }, [formValues.country, selectedCountryCode, setSelectedCountry])

  // Simple effect to load more legal forms when needed
  useEffect(() => {
    if (legalFormsNeedsMoreData && !legalFormsLoading && legalFormsHasMore) {
      loadMoreLegalForms()
    }
  }, [legalFormsNeedsMoreData, legalFormsLoading, legalFormsHasMore, legalFormsTotalFetched, loadMoreLegalForms])

  // Simple effect to load more industries when needed
  useEffect(() => {
    if (industriesNeedsMoreData && !industriesLoading && industriesHasMore) {
      loadMoreIndustries()
    }
  }, [industriesNeedsMoreData, industriesLoading, industriesHasMore, industriesTotalFetched, loadMoreIndustries])

  // When Legal Form dropdown opens, show more if we have them cached
  useEffect(() => {
    if (isLegalFormOpen && legalFormsDisplayCount < legalFormsTotalFetched && legalFormsTotalFetched > 5) {
      showMoreLegalForms()
    }
  }, [isLegalFormOpen, legalFormsDisplayCount, legalFormsTotalFetched, showMoreLegalForms])

  // When Industry dropdown opens, show more if we have them cached
  useEffect(() => {
    if (isIndustryOpen && industriesDisplayCount < industriesTotalFetched && industriesTotalFetched > 5) {
      showMoreIndustries()
    }
  }, [isIndustryOpen, industriesDisplayCount, industriesTotalFetched, showMoreIndustries])

  // Employee Sizes auto-loading effects
  useEffect(() => {
    if (employeeSizesNeedsMoreData && !employeeSizesLoading && employeeSizesHasMore) {
      loadMoreEmployeeSizes()
    }
  }, [
    employeeSizesNeedsMoreData,
    employeeSizesLoading,
    employeeSizesHasMore,
    employeeSizesTotalFetched,
    loadMoreEmployeeSizes
  ])

  useEffect(() => {
    if (isEmployeeSizeOpen && employeeSizesDisplayCount < employeeSizesTotalFetched && employeeSizesTotalFetched > 5) {
      showMoreEmployeeSizes()
    }
  }, [isEmployeeSizeOpen, employeeSizesDisplayCount, employeeSizesTotalFetched, showMoreEmployeeSizes])

  // Revenue Sizes auto-loading effects
  useEffect(() => {
    if (revenueSizesNeedsMoreData && !revenueSizesLoading && revenueSizesHasMore) {
      loadMoreRevenueSizes()
    }
  }, [
    revenueSizesNeedsMoreData,
    revenueSizesLoading,
    revenueSizesHasMore,
    revenueSizesTotalFetched,
    loadMoreRevenueSizes
  ])

  useEffect(() => {
    if (isRevenueSizeOpen && revenueSizesDisplayCount < revenueSizesTotalFetched && revenueSizesTotalFetched > 5) {
      showMoreRevenueSizes()
    }
  }, [isRevenueSizeOpen, revenueSizesDisplayCount, revenueSizesTotalFetched, showMoreRevenueSizes])

  const handleLoadMoreLegalForms = () => {
    if (legalFormsNeedsMoreData && !legalFormsLoading && legalFormsHasMore) {
      loadMoreLegalForms()
    } else if (legalFormsDisplayCount < legalFormsTotalFetched) {
      showMoreLegalForms()
    }
  }

  const handleLoadMoreIndustries = () => {
    if (industriesNeedsMoreData && !industriesLoading && industriesHasMore) {
      loadMoreIndustries()
    } else if (industriesDisplayCount < industriesTotalFetched) {
      showMoreIndustries()
    }
  }

  const handleLoadMoreEmployeeSizes = () => {
    if (employeeSizesNeedsMoreData && !employeeSizesLoading && employeeSizesHasMore) {
      loadMoreEmployeeSizes()
    } else if (employeeSizesDisplayCount < employeeSizesTotalFetched) {
      showMoreEmployeeSizes()
    }
  }

  const handleLoadMoreRevenueSizes = () => {
    if (revenueSizesNeedsMoreData && !revenueSizesLoading && revenueSizesHasMore) {
      loadMoreRevenueSizes()
    } else if (revenueSizesDisplayCount < revenueSizesTotalFetched) {
      showMoreRevenueSizes()
    }
  }

  const companyEmailError =
    formValues.companyEmail && !validateEmail(formValues.companyEmail) ? 'Please enter a valid email address' : ''
  const companyPhoneError =
    formValues.companyPhone && !validatePhone(formValues.companyPhone) ? 'Please enter a valid phone number' : ''

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
    >
      <Button
        type="button"
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:w-full gba:px-4 gba:py-2 gba:transition-all gba:flex gba:items-center gba:justify-between gba:text-left gba:rounded-xl gba:text-sm gba:bg-info-secondary hover:gba:bg-info gba:border-0"
        style={{
          outlineWidth: '0',
          outlineStyle: 'none',
          boxShadow: 'none',
          borderRadius: '12px'
        }}
        data-testid={formatDataTestId(prefixDataTestId, 'CompanyInfoToggle')}
      >
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
          <div className="gba:w-2 gba:h-2 gba:bg-purple-500 gba:rounded-full"></div>
          <span className="gba:font-medium gba:text-gray-900">Company Information</span>
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
        >
          {/* Legal Form and Industry - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            {/* Legal Form dropdown like Country */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Legal Form</Label>
              <Select
                value={formValues.legalForm}
                onValueChange={value => setFormValues({ legalForm: value })}
                onOpenChange={setIsLegalFormOpen}
                data-testid={formatDataTestId(prefixDataTestId, 'LegalFormSelect')}
              >
                <SelectTrigger className="gba:border-gray-300 gba:bg-hsl(var(--background))">
                  <SelectValue placeholder="Please Select..." />
                </SelectTrigger>
                <SelectContent
                  className="gba:max-h-[200px] gba:overflow-y-auto"
                  style={{ maxHeight: '200px', overflowY: 'auto' }}
                >
                  {legalForms.map((option, index) => (
                    <SelectItem key={`${option.id}-${index}`} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}

                  {/* Load More button or loading message */}
                  {legalFormsLoading && (
                    <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:text-center gba:font-medium">
                      🔄 Loading more legal forms...
                    </div>
                  )}

                  {!legalFormsLoading && legalFormsHasMore && (
                    <div className="gba:px-2 gba:py-1">
                      <button
                        type="button"
                        onClick={handleLoadMoreLegalForms}
                        className="gba:w-full gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded gba:hover:bg-blue-100 gba:transition-colors"
                      >
                        📥 Load More Legal Forms ({legalFormsDisplayCount}/{legalFormsTotalFetched} shown)
                      </button>
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Industry dropdown like Country */}
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Industry</Label>
              <Select
                value={formValues.industry}
                onValueChange={value => setFormValues({ industry: value })}
                onOpenChange={setIsIndustryOpen}
                data-testid={formatDataTestId(prefixDataTestId, 'IndustrySelect')}
              >
                <SelectTrigger className="gba:border-gray-300 gba:bg-hsl(var(--background))">
                  <SelectValue placeholder="Please Select..." />
                </SelectTrigger>
                <SelectContent
                  className="gba:max-h-[200px] gba:overflow-y-auto"
                  style={{ maxHeight: '200px', overflowY: 'auto' }}
                >
                  {industries.map((option, index) => (
                    <SelectItem key={`${option.id}-${index}`} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}

                  {/* Load More button or loading message */}
                  {industriesLoading && (
                    <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:text-center gba:font-medium">
                      🔄 Loading more industries...
                    </div>
                  )}

                  {!industriesLoading && industriesHasMore && (
                    <div className="gba:px-2 gba:py-1">
                      <button
                        type="button"
                        onClick={handleLoadMoreIndustries}
                        className="gba:w-full gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded gba:hover:bg-blue-100 gba:transition-colors"
                      >
                        📥 Load More Industries ({industriesDisplayCount}/{industriesTotalFetched} shown)
                      </button>
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Address Information */}
          <div
            className="gba:space-y-6"
            data-testid={formatDataTestId(prefixDataTestId, 'address-information-section')}
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
                  data-testid={formatDataTestId(prefixDataTestId, 'CountrySelect')}
                />
              </div>

              <div className="gba:space-y-2">
                <SearchableSelect
                  label="Region/State"
                  name="region"
                  value={formValues.region}
                  placeholder={selectedCountryCode ? 'Please Select...' : 'Select country first...'}
                  options={regions}
                  loading={regionsLoading}
                  hasMore={false}
                  onSearch={searchRegions}
                  onLoadMore={() => {}}
                  onChange={handleRegionChange}
                  error={regionsError}
                  disabled={!selectedCountryCode || regions.length === 0}
                  data-testid={formatDataTestId(prefixDataTestId, 'region-select')}
                />
                {selectedCountryCode && regions.length === 0 && (
                  <p
                    className="gba:text-xs gba:text-gray-500 gba:mt-1"
                    data-testid={formatDataTestId(prefixDataTestId, 'region-empty-state')}
                  >
                    No regions available for selected country
                  </p>
                )}
              </div>
            </div>

            {/* Address Lines */}
            <div className="gba:space-y-4" data-testid={formatDataTestId(prefixDataTestId, 'address-lines-section')}>
              <div className="gba:flex gba:items-center gba:justify-between">
                <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Address Lines</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAddressLine}
                  className="gba:flex gba:items-center gba:gap-2"
                  data-testid={formatDataTestId(prefixDataTestId, 'add-address-line-button')}
                >
                  <PiPlus className="gba:w-4 gba:h-4" />
                  Add Line
                </Button>
              </div>

              {Array.from({ length: addressLineCount }, (_, index) => {
                const lineNumber = index + 1
                const fieldName = `addressLine${lineNumber}` as keyof typeof formValues
                const value = formValues[fieldName] as string

                return (
                  <div
                    key={lineNumber}
                    className="gba:flex gba:items-center gba:gap-2"
                    data-testid={formatDataTestId(prefixDataTestId, `address-line-${lineNumber}-container`)}
                  >
                    <Input
                      value={value || ''}
                      onChange={e => setFormValues({ [fieldName]: e.target.value })}
                      placeholder={`Address line ${lineNumber}...`}
                      className="gba:border-gray-300 gba:bg-white gba:flex-1"
                      data-testid={formatDataTestId(prefixDataTestId, `address-line-${lineNumber}-input`)}
                    />
                    {addressLineCount > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeAddressLineAtIndex(lineNumber)}
                        className="gba:flex gba:items-center gba:gap-1 gba:text-red-600 gba:border-red-300 hover:gba:bg-red-50"
                        data-testid={formatDataTestId(prefixDataTestId, `remove-address-line-${lineNumber}-button`)}
                      >
                        <PiMinus className="gba:w-4 gba:h-4" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Postal Code and City - Side by side */}
            <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
              <div className="gba:space-y-2">
                <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Postal Code</Label>
                <Input
                  name="postalCode"
                  value={formValues.postalCode || ''}
                  onChange={e => setFormValues({ postalCode: e.target.value })}
                  placeholder="Enter postal code..."
                  className="gba:border-gray-300 gba:bg-white"
                  data-testid={formatDataTestId(prefixDataTestId, 'PostalCodeInput')}
                />
              </div>

              <div className="gba:space-y-2">
                <Label className="gba:text-sm gba:font-medium gba:text-gray-900">City</Label>
                <Input
                  name="city"
                  value={formValues.city || ''}
                  onChange={e => setFormValues({ city: e.target.value })}
                  placeholder="Enter city..."
                  className="gba:border-gray-300 gba:bg-white"
                  data-testid={formatDataTestId(prefixDataTestId, 'CityInput')}
                />
              </div>
            </div>
          </div>

          {/* Collapsible Additional Information */}
          <Card
            className="gba:border-0 gba:shadow-none gba:bg-background"
            style={{
              border: '0',
              borderWidth: '0',
              borderStyle: 'none',
              borderColor: 'transparent',
              boxShadow: 'none'
            }}
          >
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAdditionalInfoExpanded(!isAdditionalInfoExpanded)}
              className="gba:w-full gba:px-4 gba:py-2 gba:transition-all gba:flex gba:items-center gba:justify-between gba:text-left gba:rounded-lg gba:text-sm gba:bg-muted hover:gba:bg-muted/80 gba:border-0"
              style={{
                outlineWidth: '0',
                outlineStyle: 'none',
                boxShadow: 'none',
                borderRadius: '8px'
              }}
              data-testid={formatDataTestId(prefixDataTestId, 'AdditionalInfoToggle')}
            >
              <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
                <div className="gba:w-2 gba:h-2 gba:bg-gray-500 gba:rounded-full"></div>
                <span className="gba:font-medium gba:text-gray-900">Additional Information</span>
              </div>
              <div className="gba:flex gba:items-center">
                {isAdditionalInfoExpanded ? (
                  <PiCaretUp className="gba:w-4 gba:h-4 gba:text-gray-700" />
                ) : (
                  <PiCaretDown className="gba:w-4 gba:h-4 gba:text-gray-700" />
                )}
              </div>
            </Button>

            {isAdditionalInfoExpanded && (
              <CardContent
                className="gba:space-y-4 gba:bg-white gba:border-0 gba:p-3"
                style={{
                  border: '0',
                  borderWidth: '0',
                  borderStyle: 'none',
                  borderColor: 'transparent',
                  padding: '12px'
                }}
              >
                {/* Website */}
                <div className="gba:space-y-2">
                  <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Website</Label>
                  <Input
                    name="website"
                    value={typeof formValues.website === 'string' ? formValues.website : ''}
                    onChange={e => setFormValues({ website: e.target.value })}
                    placeholder="Please Enter..."
                    className="gba:border-gray-300 gba:bg-white"
                    data-testid={formatDataTestId(prefixDataTestId, 'WebsiteInput')}
                  />
                </div>

                {/* Company Email */}
                <div className="gba:space-y-2">
                  <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Company Email</Label>
                  <div className="gba:relative">
                    <div className="gba:absolute gba:inset-y-0 gba:left-0 gba:pl-2 gba:flex gba:items-center gba:pointer-events-none gba:z-10">
                      <PiEnvelopeSimple className="gba:h-5 gba:w-5 gba:text-gray-400" />
                    </div>
                    <Input
                      name="companyEmail"
                      value={typeof formValues.companyEmail === 'string' ? formValues.companyEmail : ''}
                      onChange={e => setFormValues({ companyEmail: e.target.value })}
                      placeholder="Please Enter..."
                      className="gba:pl-8 gba:border-gray-300 gba:bg-hsl(var(--background))"
                      style={{
                        borderColor: companyEmailError ? '#ef4444' : '#d1d5db',
                        paddingLeft: '32px'
                      }}
                      data-testid={formatDataTestId(prefixDataTestId, 'CompanyEmailInput')}
                    />
                  </div>
                  {companyEmailError && <p className="gba:text-sm gba:text-red-600">{companyEmailError}</p>}
                </div>

                {/* Company Phone */}
                <div className="gba:space-y-2">
                  <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Company Phone</Label>
                  <div className="gba:relative">
                    <div className="gba:absolute gba:inset-y-0 gba:left-0 gba:pl-2 gba:flex gba:items-center gba:pointer-events-none gba:z-10">
                      <PiPhone className="gba:h-5 gba:w-5 gba:text-gray-400" />
                    </div>
                    <Input
                      name="companyPhone"
                      value={typeof formValues.companyPhone === 'string' ? formValues.companyPhone : ''}
                      onChange={e => setFormValues({ companyPhone: e.target.value })}
                      placeholder="Please Enter..."
                      className="gba:pl-8 gba:border-gray-300 gba:bg-hsl(var(--background))"
                      style={{
                        borderColor: companyPhoneError ? '#ef4444' : '#d1d5db',
                        paddingLeft: '32px'
                      }}
                      data-testid={formatDataTestId(prefixDataTestId, 'CompanyPhoneInput')}
                    />
                  </div>
                  {companyPhoneError && <p className="gba:text-sm gba:text-red-600">{companyPhoneError}</p>}
                </div>

                {/* Number of Employees - Full width */}
                <div className="gba:space-y-2">
                  <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Number of Employees</Label>
                  <Select
                    value={toStringOrUndefined(formValues.numberOfEmployees) || ''}
                    onValueChange={value => setFormValues({ numberOfEmployees: value || '' })}
                    onOpenChange={setIsEmployeeSizeOpen}
                    data-testid={formatDataTestId(prefixDataTestId, 'NumberOfEmployeesSelect')}
                  >
                    <SelectTrigger className="gba:border-gray-300 gba:bg-hsl(var(--background))">
                      <SelectValue placeholder="Please Select..." />
                    </SelectTrigger>
                    <SelectContent
                      className="gba:max-h-[200px] gba:overflow-y-auto"
                      style={{ maxHeight: '200px', overflowY: 'auto' }}
                    >
                      {employeeSizes.map((option, index) => {
                        // Format display value to remove leading zeros (e.g., "01-10" becomes "1-10")
                        const displayValue = (option.label || option.name || '').replace(/\b0+(\d)/g, '$1')
                        return (
                          <SelectItem key={`${option.id}-${index}`} value={option.value}>
                            {displayValue}
                          </SelectItem>
                        )
                      })}

                      {/* Load More button or loading message */}
                      {employeeSizesLoading && (
                        <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:text-center gba:font-medium">
                          🔄 Loading more employee sizes...
                        </div>
                      )}

                      {!employeeSizesLoading && employeeSizesHasMore && (
                        <div className="gba:px-2 gba:py-1">
                          <button
                            type="button"
                            onClick={handleLoadMoreEmployeeSizes}
                            className="gba:w-full gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded gba:hover:bg-blue-100 gba:transition-colors"
                          >
                            📥 Load More Employee Sizes ({employeeSizesDisplayCount}/{employeeSizesTotalFetched} shown)
                          </button>
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Annual Revenue */}
                <div className="gba:space-y-2">
                  <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Annual Revenue</Label>
                  <Select
                    value={toStringOrUndefined(formValues.annualRevenue) || ''}
                    onValueChange={value => setFormValues({ annualRevenue: value || '' })}
                    onOpenChange={setIsRevenueSizeOpen}
                    data-testid={formatDataTestId(prefixDataTestId, 'AnnualRevenueSelect')}
                  >
                    <SelectTrigger className="gba:border-gray-300 gba:bg-hsl(var(--background))">
                      <SelectValue placeholder="Please Select..." />
                    </SelectTrigger>
                    <SelectContent
                      className="gba:max-h-[200px] gba:overflow-y-auto"
                      style={{ maxHeight: '200px', overflowY: 'auto' }}
                    >
                      {revenueSizes.map((option, index) => (
                        <SelectItem key={`${option.id}-${index}`} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}

                      {/* Load More button or loading message */}
                      {revenueSizesLoading && (
                        <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:text-center gba:font-medium">
                          🔄 Loading more revenue sizes...
                        </div>
                      )}

                      {!revenueSizesLoading && revenueSizesHasMore && (
                        <div className="gba:px-2 gba:py-1">
                          <button
                            type="button"
                            onClick={handleLoadMoreRevenueSizes}
                            className="gba:w-full gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded gba:hover:bg-blue-100 gba:transition-colors"
                          >
                            📥 Load More Revenue Sizes ({revenueSizesDisplayCount}/{revenueSizesTotalFetched} shown)
                          </button>
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            )}
          </Card>
        </CardContent>
      )}
    </Card>
  )
}

export default CompanyInformationSection
