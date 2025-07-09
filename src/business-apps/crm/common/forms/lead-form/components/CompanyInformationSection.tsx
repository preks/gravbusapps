import React, { useState, useRef, useEffect } from 'react';
import { SelectField, InputField } from '@newwork/gravity-ui-catalog';
import { PiPhone, PiEnvelopeSimple, PiCaretDown, PiCaretUp } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useLeadFormContext } from '../context/LeadFormContext';
import { validateEmail, validatePhone, toStringOrUndefined } from '../utils/validationUtils';
import SearchableSelect from './SearchableSelect';

const prefixDataTestId = 'LeadForm';

const CompanyInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed
  
  const {
    formValues,
    setFormValues,
    isLoading,
    
    // Legal Forms
    legalForms,
    legalFormsLoading,
    legalFormsError,
    legalFormsHasMore,
    searchLegalForms,
    loadMoreLegalForms,
    
    // Industries
    industries,
    industriesLoading,
    industriesError,
    industriesHasMore,
    searchIndustries,
    loadMoreIndustries,
    
    numberOfEmployeesOptions,
    accountSuggestions,
    searchAccounts,
    isSearchingAccounts,
    setIsSearchingAccounts,
    setAccountSuggestions,
  } = useLeadFormContext();

  // State for collapsible additional info
  const [isAdditionalInfoExpanded, setIsAdditionalInfoExpanded] = useState(false);

  // State for company autocomplete
  const [companyInputValue, setCompanyInputValue] = useState(formValues.company || '');
  const [isCompanySuggestionsVisible, setIsCompanySuggestionsVisible] = useState(false);
  const [companyFocused, setCompanyFocused] = useState(false);
  const companyContainerRef = useRef<HTMLDivElement>(null);

  const companyEmailError = formValues.companyEmail && !validateEmail(formValues.companyEmail) ? 'Please enter a valid email address' : '';
  const companyPhoneError = formValues.companyPhone && !validatePhone(formValues.companyPhone) ? 'Please enter a valid phone number' : '';

  // Handle outside click for company suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (companyContainerRef.current && !companyContainerRef.current.contains(event.target as Node)) {
        setIsCompanySuggestionsVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle company input change with debounced search
  const handleCompanyInputChange = async (value: string) => {
    setCompanyInputValue(value);
    setFormValues({ company: value });

    if (value.trim().length > 2) {
      setIsSearchingAccounts(true);
      setIsCompanySuggestionsVisible(true);
      
      try {
        const suggestions = await searchAccounts(value);
        setAccountSuggestions(suggestions);
      } catch (error) {
        console.error('Error searching accounts:', error);
        setAccountSuggestions([]);
      } finally {
        setIsSearchingAccounts(false);
      }
    } else {
      setIsCompanySuggestionsVisible(false);
      setAccountSuggestions([]);
    }
  };

  const handleCompanyInputFocus = () => {
    setCompanyFocused(true);
    if (companyInputValue.trim().length > 2 && accountSuggestions.length > 0) {
      setIsCompanySuggestionsVisible(true);
    }
  };

  const handleCompanyInputBlur = () => {
    setCompanyFocused(false);
    // Delay hiding to allow clicking on suggestions
    setTimeout(() => {
      if (!companyFocused) {
        setIsCompanySuggestionsVisible(false);
      }
    }, 200);
  };

  const handleCompanySuggestionSelect = (suggestion: any) => {
    setCompanyInputValue(suggestion.name);
    setFormValues({ company: suggestion.name, accountId: suggestion.id });
    setIsCompanySuggestionsVisible(false);
    setAccountSuggestions([]);
  };

  return (
    <div className="gba:bg-white gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-100 gba:overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:w-full gba:px-6 gba:py-4 gba:border-b gba:border-gray-100 gba:bg-gradient-to-r gba:from-purple-200 gba:to-violet-200 gba:hover:from-purple-300 gba:hover:to-violet-300 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left"
        style={{
          background: 'linear-gradient(to right, #e9d5ff, #ddd6fe)',
          transition: 'background 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(to right, #d8b4fe, #c4b5fd)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(to right, #e9d5ff, #ddd6fe)';
        }}
        data-testid={formatDataTestId(prefixDataTestId, 'CompanyInfoToggle')}
      >
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-2 gba:h-2 gba:bg-purple-500 gba:rounded-full"></div>
          Company Information
        </h3>
        {isExpanded ? (
          <PiCaretUp className="gba:w-4 gba:h-4 gba:text-gray-500" />
        ) : (
          <PiCaretDown className="gba:w-4 gba:h-4 gba:text-gray-500" />
        )}
      </button>
      
      {isExpanded && (
        <div className="gba:p-6 gba:space-y-6">
          {/* Legal Form and Industry - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <SearchableSelect
              label="Legal Form"
              name="legalForm"
              value={formValues.legalForm}
              onChange={value => setFormValues({ legalForm: value })}
              options={legalForms}
              placeholder="Please Select..."
              loading={legalFormsLoading}
              hasMore={legalFormsHasMore}
              onLoadMore={loadMoreLegalForms}
              onSearch={searchLegalForms}
              error={legalFormsError}
              data-testid={formatDataTestId(prefixDataTestId, 'LegalFormSelect')}
            />

            <SearchableSelect
              label="Industry"
              name="industry"
              value={formValues.industry}
              onChange={value => setFormValues({ industry: value })}
              options={industries}
              placeholder="Please Select..."
              loading={industriesLoading}
              hasMore={industriesHasMore}
              onLoadMore={loadMoreIndustries}
              onSearch={searchIndustries}
              error={industriesError}
              data-testid={formatDataTestId(prefixDataTestId, 'IndustrySelect')}
            />
          </div>

          {/* Company Name with Autocomplete */}
          <div ref={companyContainerRef} className="gba:relative gba:z-[100]">
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              Company Name <span className="gba:text-red-500">*</span>
            </label>
            <div className="gba:relative">
              <InputField
                name="company"
                value={companyInputValue}
                onChange={e => handleCompanyInputChange(String(e.value || ''))}
                onFocus={handleCompanyInputFocus}
                onBlur={handleCompanyInputBlur}
                placeholder="Please Enter..."
                required
                data-testid={formatDataTestId(prefixDataTestId, 'CompanyInput')}
              />
              
              {/* Suggestions Dropdown */}
              {isCompanySuggestionsVisible && (
                <div 
                  className="gba:absolute gba:w-full gba:mt-1 gba:bg-white gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-xl gba:max-h-48 gba:overflow-y-auto gba:z-[9999]"
                  style={{ zIndex: 9999 }}
                >
                  {isSearchingAccounts && (
                    <div className="gba:px-4 gba:py-3 gba:text-sm gba:text-gray-500">
                      Searching accounts...
                    </div>
                  )}
                  
                  {!isSearchingAccounts && accountSuggestions.length === 0 && companyInputValue.trim().length > 2 && (
                    <div className="gba:px-4 gba:py-3 gba:text-sm gba:text-gray-500">
                      No matching accounts found. You can still enter a new company name.
                    </div>
                  )}
                  
                  {!isSearchingAccounts && accountSuggestions.map((suggestion, index) => (
                    <div
                      key={suggestion.id || index}
                      className="gba:px-4 gba:py-3 gba:cursor-pointer gba:hover:bg-gray-50 gba:border-b gba:border-gray-100 gba:last:border-b-0 gba:transition-colors"
                      onClick={() => handleCompanySuggestionSelect(suggestion)}
                      data-testid={`${formatDataTestId(prefixDataTestId, 'CompanySuggestion')}-${index}`}
                    >
                      <div className="gba:font-medium gba:text-gray-900">{suggestion.name}</div>
                      {suggestion.label && suggestion.label !== suggestion.name && (
                        <div className="gba:text-sm gba:text-gray-500 gba:truncate">{suggestion.label}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Collapsible Additional Information */}
          <div className="gba:border gba:border-gray-200 gba:rounded-lg gba:overflow-hidden">
            <button
              type="button"
              onClick={() => setIsAdditionalInfoExpanded(!isAdditionalInfoExpanded)}
              className="gba:w-full gba:px-4 gba:py-3 gba:bg-gray-50 gba:hover:bg-gray-100 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left"
              data-testid={formatDataTestId(prefixDataTestId, 'AdditionalInfoToggle')}
            >
              <span className="gba:font-medium gba:text-gray-700">Additional Information</span>
              {isAdditionalInfoExpanded ? (
                <PiCaretUp className="gba:w-4 gba:h-4 gba:text-gray-500" />
              ) : (
                <PiCaretDown className="gba:w-4 gba:h-4 gba:text-gray-500" />
              )}
            </button>
            
            {isAdditionalInfoExpanded && (
              <div className="gba:p-4 gba:space-y-4 gba:bg-white">
                {/* Website */}
                <InputField
                  label="Website"
                  name="website"
                  value={typeof formValues.website === 'string' ? formValues.website : ''}
                  onChange={e => setFormValues({ website: String(e.value || '') })}
                  placeholder="Please Enter..."
                  data-testid={formatDataTestId(prefixDataTestId, 'WebsiteInput')}
                />

                {/* Company Email */}
                <div>
                  <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                    Company Email
                  </label>
                  <div className="gba:relative">
                    <div className="gba:absolute gba:inset-y-0 gba:left-0 gba:pl-3 gba:flex gba:items-center gba:pointer-events-none gba:z-10">
                      <PiEnvelopeSimple className="gba:h-4 gba:w-4 gba:text-gray-400" />
                    </div>
                    <div className="gba:pl-10">
                      <InputField
                        name="companyEmail"
                        value={typeof formValues.companyEmail === 'string' ? formValues.companyEmail : ''}
                        onChange={e => setFormValues({ companyEmail: String(e.value || '') })}
                        placeholder="Please Enter..."
                        style={{
                          borderColor: companyEmailError ? '#ef4444' : undefined,
                        }}
                        data-testid={formatDataTestId(prefixDataTestId, 'CompanyEmailInput')}
                      />
                    </div>
                  </div>
                  {companyEmailError && (
                    <p className="gba:mt-1 gba:text-sm gba:text-red-600">
                      {companyEmailError}
                    </p>
                  )}
                </div>

                {/* Company Phone */}
                <div>
                  <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                    Company Phone
                  </label>
                  <div className="gba:relative">
                    <div className="gba:absolute gba:inset-y-0 gba:left-0 gba:pl-3 gba:flex gba:items-center gba:pointer-events-none gba:z-10">
                      <PiPhone className="gba:h-4 gba:w-4 gba:text-gray-400" />
                    </div>
                    <div className="gba:pl-10">
                      <InputField
                        name="companyPhone"
                        value={typeof formValues.companyPhone === 'string' ? formValues.companyPhone : ''}
                        onChange={e => setFormValues({ companyPhone: String(e.value || '') })}
                        placeholder="Please Enter..."
                        style={{
                          borderColor: companyPhoneError ? '#ef4444' : undefined,
                        }}
                        data-testid={formatDataTestId(prefixDataTestId, 'CompanyPhoneInput')}
                      />
                    </div>
                  </div>
                  {companyPhoneError && (
                    <p className="gba:mt-1 gba:text-sm gba:text-red-600">
                      {companyPhoneError}
                    </p>
                  )}
                </div>

                {/* Foundation Date and Number of Employees - Side by side */}
                <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:md:grid-cols-2">
                  <InputField
                    label="Foundation Date"
                    name="foundationDate"
                    value={typeof formValues.foundationDate === 'string' ? formValues.foundationDate : ''}
                    onChange={e => setFormValues({ foundationDate: String(e.value || '') })}
                    placeholder="Please Enter..."
                    data-testid={formatDataTestId(prefixDataTestId, 'FoundationDateInput')}
                  />

                  <SelectField
                    label="Number of Employees"
                    name="numberOfEmployees"
                    value={toStringOrUndefined(formValues.numberOfEmployees)}
                    onChange={e => setFormValues({ numberOfEmployees: String(e.value || '') })}
                    data={numberOfEmployeesOptions}
                    placeholder="Please Select..."
                    loading={isLoading}
                    filterOption={false}
                    data-testid={formatDataTestId(prefixDataTestId, 'NumberOfEmployeesSelect')}
                  />
                </div>

                {/* Annual Revenue */}
                <InputField
                  label="Annual Revenue"
                  name="annualRevenue"
                  value={typeof formValues.annualRevenue === 'string' ? formValues.annualRevenue : ''}
                  onChange={e => setFormValues({ annualRevenue: String(e.value || '') })}
                  placeholder="Please Enter..."
                  data-testid={formatDataTestId(prefixDataTestId, 'AnnualRevenueInput')}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyInformationSection; 