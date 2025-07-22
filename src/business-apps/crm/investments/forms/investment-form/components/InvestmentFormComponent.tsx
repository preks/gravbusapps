import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Checkbox, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system';
import { PiBuildings, PiCaretDown, PiCaretUp, PiCurrencyDollar } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useInvestmentFormContext } from '../context/InvestmentFormContext';
import { toStringOrUndefined, toNumberOrUndefined } from '../utils/validationUtils';
import { saveInvestment } from '../utils/apiClient';
import OwnerSelector from './OwnerSelector';
import FormattedNumberInput from './FormattedNumberInput';

const prefixDataTestId = 'InvestmentForm';

const InvestmentFormComponent: React.FC = () => {
  const {
    formValues,
    setFormValues,
    onSubmit,
    onCancel,
    isLoading,
    error,
    validationErrors,
    isFormValid,
    businessAppContext,
    
    // Investment groups
    investmentGroups,
    investmentGroupsLoading,
    investmentGroupsError,
    investmentGroupsHasMore,
    searchInvestmentGroups,
    loadMoreInvestmentGroups,
    
    // Investment roles
    investmentRoles,
    investmentRolesLoading,
    investmentRolesError,
    investmentRolesHasMore,
    searchInvestmentRoles,
    loadMoreInvestmentRoles,
    
    // Real estate types
    realEstateTypes,
    realEstateTypesLoading,
    realEstateTypesError,
    realEstateTypesHasMore,
    searchRealEstateTypes,
    loadMoreRealEstateTypes,
    
    // Investment ownership structures
    investmentOwnershipStructures,
    investmentOwnershipStructuresLoading,
    investmentOwnershipStructuresError,
    investmentOwnershipStructuresHasMore,
    searchInvestmentOwnershipStructures,
    loadMoreInvestmentOwnershipStructures,
    
    // Interest payment frequencies
    interestPaymentFrequencies,
    interestPaymentFrequenciesLoading,
    interestPaymentFrequenciesError,
    interestPaymentFrequenciesHasMore,
    searchInterestPaymentFrequencies,
    loadMoreInterestPaymentFrequencies,
    
    // Account autocomplete
    accountSuggestions,
    searchAccounts,
    isSearchingAccounts,
    setIsSearchingAccounts,
    setAccountSuggestions,
  } = useInvestmentFormContext();

  // Local state for account autocomplete
  const [accountSearchTerm, setAccountSearchTerm] = useState('');
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [accountFocused, setAccountFocused] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  
  const accountContainerRef = useRef<HTMLDivElement>(null);

  // Check if this is an update operation
  const isUpdate = Boolean(formValues.id);



  // Clear equity information when investment type changes away from EQUITY
  React.useEffect(() => {
    if (formValues.group !== "InvestmentGroup:v1:EQUITY") {
      if (formValues.equityRole || formValues.currentCompanyValue || formValues.lastReportedTurnover || formValues.lastReportedEbitda) {
        setFormValues({
          equityRole: '',
          currentCompanyValue: '',
          lastReportedTurnover: '',
          lastReportedEbitda: '',
          equityInvestmentId: '',
          equityInvestmentVersion: ''
        });
      }
    }
  }, [formValues.group, formValues.equityRole, formValues.currentCompanyValue, formValues.lastReportedTurnover, formValues.lastReportedEbitda, setFormValues]);

  // Clear private equity information when investment type changes away from PRIVATE_EQUITY
  React.useEffect(() => {
    if (formValues.group !== "InvestmentGroup:v1:PRIVATE_EQUITY") {
      if (formValues.privateEquityRole) {
        setFormValues({
          privateEquityRole: '',
          privateEquityInvestmentId: '',
          privateEquityInvestmentVersion: ''
        });
      }
    }
  }, [formValues.group, formValues.privateEquityRole, setFormValues]);

  // Clear real estate information when investment type changes away from REAL_ESTATE
  React.useEffect(() => {
    if (formValues.group !== "InvestmentGroup:v1:REAL_ESTATE") {
      if (formValues.realEstateTypeRef || formValues.investmentOwnershipStructureRef || formValues.numberOfUnits || formValues.buildingYear) {
        setFormValues({
          realEstateTypeRef: '',
          investmentOwnershipStructureRef: '',
          numberOfUnits: '',
          buildingYear: '',
          realEstateInvestmentId: '',
          realEstateInvestmentVersion: ''
        });
      }
    }
  }, [formValues.group, formValues.realEstateTypeRef, formValues.investmentOwnershipStructureRef, formValues.numberOfUnits, formValues.buildingYear, setFormValues]);

  // Clear liquid fund information when investment type changes away from LIQUID_FUND
  React.useEffect(() => {
    if (formValues.group !== "InvestmentGroup:v1:LIQUID_FUND") {
      if (formValues.accountNumber || formValues.earlyTerminationAllowed || formValues.interestRate || formValues.interestPaymentFrequencyRef || formValues.maturityDate) {
        setFormValues({
          accountNumber: '',
          earlyTerminationAllowed: false,
          interestRate: '',
          interestPaymentFrequencyRef: '',
          maturityDate: '',
          liquidFundInvestmentId: '',
          liquidFundInvestmentVersion: ''
        });
      }
    }
  }, [formValues.group, formValues.accountNumber, formValues.earlyTerminationAllowed, formValues.interestRate, formValues.interestPaymentFrequencyRef, formValues.maturityDate, setFormValues]);

  // Find selected account from current suggestions (only when not actively typing)
  useEffect(() => {
    if (formValues.accountId && accountSuggestions.length > 0 && !isUserTyping) {
      const account = accountSuggestions.find(acc => acc.value === formValues.accountId);
      if (account) {
        setSelectedAccount(account);
        setAccountSearchTerm(account.label);
      }
    }
  }, [formValues.accountId, accountSuggestions, isUserTyping]);

  // Handle click outside to close account dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountContainerRef.current && !accountContainerRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
        setAccountFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle account search
  const handleAccountSearch = async (value: string) => {
    setIsUserTyping(true);
    setAccountSearchTerm(value);
    setIsAccountDropdownOpen(true);
    
    // Clear selection if user clears the input
    if (!value.trim()) {
      setSelectedAccount(null);
      setFormValues({ accountId: '' });
    }
    
    // Always search, as searchAccounts now handles empty/short terms by returning default accounts
    setIsSearchingAccounts(true);
    try {
      const results = await searchAccounts(value);
      setAccountSuggestions(results);
    } catch (err) {
      console.error('Error searching accounts:', err);
      setAccountSuggestions([]);
    } finally {
      setIsSearchingAccounts(false);
    }
  };

  // Handle account selection
  const handleAccountSelect = (account: any) => {
    setIsUserTyping(false);
    setSelectedAccount(account);
    setAccountSearchTerm(account.label);
    setFormValues({ accountId: account.value });
    setIsAccountDropdownOpen(false);
    setAccountFocused(false);
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      // Check if access token exists
      if (!businessAppContext.accessToken) {
        throw new Error('No access token available. Please refresh the page and try again.');
      }

      // Use the API client to save the investment
      const apiResponse = await saveInvestment(formValues, businessAppContext.accessToken);
      
      if (!apiResponse.success) {
        throw new Error(apiResponse.error || 'Failed to save investment');
      }
      
      // Call the form's onSubmit handler
      await onSubmit(formValues);
    } catch (err) {
      console.error('Error submitting investment form:', err);
      throw err; // Re-throw to let the context handle it
    }
  };

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:max-w-md gba:mx-auto gba:p-6">
      <div className="gba:h-full gba:flex gba:flex-col" data-testid={formatDataTestId(prefixDataTestId, 'Form')}>
        
        {/* Form Title */}
        <div className="gba:mb-6">
          <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900">
            {isUpdate ? 'Update Investment' : 'Create Investment'}
          </h2>
        </div>

        {/* Form Fields Container - Takes up available space */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-6">
          
          {/* Owner Field */}
          <OwnerSelector />

          {/* Name Field */}
          <div className="gba:space-y-2">
            <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
              Name <span className="gba:text-red-500">*</span>
            </Label>
            <Input
              name="name"
              value={formValues.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormValues({ name: String(e.target.value || '') })}
              placeholder="Enter investment name"
              data-testid={formatDataTestId(prefixDataTestId, 'NameInput')}
            />
            {validationErrors.name && (
              <p className="gba:mt-1 gba:text-sm gba:text-red-600">
                {validationErrors.name}
              </p>
            )}
          </div>

          {/* Account Name Field */}
          <div className="gba:space-y-2" ref={accountContainerRef}>
            <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
              Account Name <span className="gba:text-red-500">*</span>
            </Label>

            <div className="gba:relative">
              <div className={`gba:relative gba:border gba:rounded-md gba:shadow-sm ${
                validationErrors.accountId ? 'gba:border-red-300' : accountFocused ? 'gba:border-blue-500' : 'gba:border-gray-300'
              }`}>
                <input
                  type="text"
                  value={accountSearchTerm}
                  onChange={(e) => handleAccountSearch(e.target.value)}
                  onFocus={async () => {
                    setAccountFocused(true);
                    setIsAccountDropdownOpen(true);
                    setIsUserTyping(false); // Reset typing state on focus
                    
                    // Load default accounts if no search term and no suggestions
                    if (!accountSearchTerm.trim() && accountSuggestions.length === 0) {
                      setIsSearchingAccounts(true);
                      try {
                        const results = await searchAccounts('');
                        setAccountSuggestions(results);
                      } catch (err) {
                        console.error('Error loading default accounts on focus:', err);
                      } finally {
                        setIsSearchingAccounts(false);
                      }
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      if (!accountContainerRef.current?.contains(document.activeElement)) {
                        setAccountFocused(false);
                        setIsAccountDropdownOpen(false);
                        setIsUserTyping(false);
                      }
                    }, 150);
                  }}
                  placeholder="Search accounts..."
                  className="gba:w-full gba:pl-10 gba:pr-10 gba:py-2 gba:border-0 gba:rounded-md gba:focus:ring-0 gba:focus:outline-none"
                  data-testid={formatDataTestId(prefixDataTestId, 'AccountSearchInput')}
                />
                
                {/* Search Icon */}
                <div className="gba:absolute gba:inset-y-0 gba:left-0 gba:pl-3 gba:flex gba:items-center gba:pointer-events-none">
                  <PiBuildings className="gba:h-4 gba:w-4 gba:text-gray-400" />
                </div>

                {/* Dropdown Arrow */}
                <div className="gba:absolute gba:inset-y-0 gba:right-0 gba:pr-3 gba:flex gba:items-center gba:pointer-events-none">
                  {isAccountDropdownOpen ? (
                    <PiCaretUp className="gba:h-4 gba:w-4 gba:text-gray-400" />
                  ) : (
                    <PiCaretDown className="gba:h-4 gba:w-4 gba:text-gray-400" />
                  )}
                </div>
              </div>

              {/* Account Dropdown */}
              {isAccountDropdownOpen && (
                <div className="gba:absolute gba:z-50 gba:mt-1 gba:w-full gba:bg-white gba:border gba:border-gray-300 gba:rounded-md gba:shadow-lg gba:max-h-48 gba:overflow-y-auto">
                  {isSearchingAccounts && (
                    <div className="gba:p-3 gba:text-center gba:text-gray-500">
                      Searching accounts...
                    </div>
                  )}

                  {!isSearchingAccounts && accountSuggestions.length === 0 && accountSearchTerm.trim() && (
                    <div className="gba:p-3 gba:text-center gba:text-gray-500">
                      No accounts found
                    </div>
                  )}

                  {!isSearchingAccounts && accountSuggestions.length > 0 && (
                    <>
                      {accountSuggestions.map((account: any) => (
                        <div
                          key={account.id}
                          className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:cursor-pointer hover:gba:bg-gray-50 gba:border-b gba:border-gray-100"
                          onClick={() => handleAccountSelect(account)}
                          data-testid={formatDataTestId(prefixDataTestId, `AccountOption-${account.id}`)}
                        >
                          <PiBuildings className="gba:w-5 gba:h-5 gba:text-gray-400" />
                          <span className="gba:text-sm gba:text-gray-900">{account.label}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {validationErrors.accountId && (
              <div className="gba:text-sm gba:text-red-600" data-testid={formatDataTestId(prefixDataTestId, 'AccountError')}>
                {validationErrors.accountId}
              </div>
            )}
          </div>

          {/* Initial Investment Amount Field */}
          <div className="gba:space-y-2">
            <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
              Initial Investment Amount <span className="gba:text-red-500">*</span>
            </Label>
            <div className="gba:relative">
              <div className="gba:absolute gba:inset-y-0 gba:left-0 gba:pl-3 gba:flex gba:items-center gba:pointer-events-none">
                <PiCurrencyDollar className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <FormattedNumberInput
                name="initialInvestmentAmount"
                value={formValues.initialInvestmentAmount}
                onChange={(value) => setFormValues({ initialInvestmentAmount: value })}
                placeholder="0.00"
                className="gba:pl-10"
                min="0"
                step="0.01"
                data-testid={formatDataTestId(prefixDataTestId, 'InitialInvestmentAmountInput')}
              />
            </div>
            {validationErrors.initialInvestmentAmount && (
              <p className="gba:mt-1 gba:text-sm gba:text-red-600">
                {validationErrors.initialInvestmentAmount}
              </p>
            )}
          </div>

          {/* Type Field */}
          <div className="gba:space-y-2 gba:w-full">
            <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
              Type <span className="gba:text-red-500">*</span>
            </Label>
            <div className="gba:w-full">
              <Select 
                value={formValues.group} 
                onValueChange={(value: string) => setFormValues({ group: value })}
                disabled={isUpdate}
              >
                <SelectTrigger className="gba:w-full" data-testid={formatDataTestId(prefixDataTestId, 'TypeSelect')}>
                  <SelectValue placeholder="Please Select..." />
                </SelectTrigger>
                <SelectContent>
                  {investmentGroups.map((option) => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(investmentGroupsError || validationErrors.group) && (
              <p className="gba:mt-1 gba:text-sm gba:text-red-600">
                {investmentGroupsError || validationErrors.group}
              </p>
            )}
          </div>

          {/* Equity Information Section - Only show for EQUITY type */}
          {formValues.group === "InvestmentGroup:v1:EQUITY" && (
            <div className="gba:space-y-4 gba:border gba:border-gray-200 gba:rounded-lg gba:p-4 gba:bg-gray-50">
              <h3 className="gba:text-lg gba:font-medium gba:text-gray-900 gba:mb-4">
                Equity Information
              </h3>

              {/* Role Field */}
              <div className="gba:space-y-2 gba:w-full">
                <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
                  Role <span className="gba:text-red-500">*</span>
                </Label>
                <div className="gba:w-full">
                  <Select 
                    value={formValues.equityRole || ''} 
                    onValueChange={(value: string) => setFormValues({ equityRole: value })}
                  >
                    <SelectTrigger className="gba:w-full" data-testid={formatDataTestId(prefixDataTestId, 'EquityRoleSelect')}>
                      <SelectValue placeholder="Please Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {investmentRoles.map((option) => (
                        <SelectItem key={option.id} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(investmentRolesError || validationErrors.equityRole) && (
                  <p className="gba:mt-1 gba:text-sm gba:text-red-600">
                    {investmentRolesError || validationErrors.equityRole}
                  </p>
                )}
              </div>

              {/* Current Company Value Field */}
              <div className="gba:space-y-2">
                <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
                  Current Company Value <span className="gba:text-red-500">*</span>
                </Label>
                <div className="gba:relative">
                  <div className="gba:absolute gba:inset-y-0 gba:left-0 gba:pl-3 gba:flex gba:items-center gba:pointer-events-none">
                    <PiCurrencyDollar className="gba:h-4 gba:w-4 gba:text-gray-400" />
                  </div>
                  <FormattedNumberInput
                    name="currentCompanyValue"
                    value={formValues.currentCompanyValue || ''}
                    onChange={(value) => setFormValues({ currentCompanyValue: value })}
                    placeholder="0.00"
                    className="gba:pl-10"
                    min="0"
                    step="0.01"
                    data-testid={formatDataTestId(prefixDataTestId, 'CurrentCompanyValueInput')}
                  />
                </div>
                {validationErrors.currentCompanyValue && (
                  <p className="gba:mt-1 gba:text-sm gba:text-red-600">
                    {validationErrors.currentCompanyValue}
                  </p>
                )}
              </div>

              {/* Last Reported Turnover and EBITDA Fields - Same Line */}
              <div className="gba:flex gba:gap-4">
                {/* Last Reported Turnover Field */}
                <div className="gba:flex-1 gba:space-y-2">
                  <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
                    Last Reported Turnover
                  </Label>
                  <div className="gba:relative">
                    <div className="gba:absolute gba:inset-y-0 gba:left-0 gba:pl-3 gba:flex gba:items-center gba:pointer-events-none">
                      <PiCurrencyDollar className="gba:h-4 gba:w-4 gba:text-gray-400" />
                    </div>
                    <FormattedNumberInput
                      name="lastReportedTurnover"
                      value={formValues.lastReportedTurnover || ''}
                      onChange={(value) => setFormValues({ lastReportedTurnover: value })}
                      placeholder="0.00"
                      className="gba:pl-10"
                      min="0"
                      step="0.01"
                      data-testid={formatDataTestId(prefixDataTestId, 'LastReportedTurnoverInput')}
                    />
                  </div>
                  {validationErrors.lastReportedTurnover && (
                    <p className="gba:mt-1 gba:text-sm gba:text-red-600">
                      {validationErrors.lastReportedTurnover}
                    </p>
                  )}
                </div>

                {/* Last Reported EBITDA Field */}
                <div className="gba:flex-1 gba:space-y-2">
                  <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
                    Last Reported EBITDA
                  </Label>
                  <div className="gba:relative">
                    <div className="gba:absolute gba:inset-y-0 gba:left-0 gba:pl-3 gba:flex gba:items-center gba:pointer-events-none">
                      <PiCurrencyDollar className="gba:h-4 gba:w-4 gba:text-gray-400" />
                    </div>
                    <FormattedNumberInput
                      name="lastReportedEbitda"
                      value={formValues.lastReportedEbitda || ''}
                      onChange={(value) => setFormValues({ lastReportedEbitda: value })}
                      placeholder="0.00"
                      className="gba:pl-10"
                      step="0.01"
                      data-testid={formatDataTestId(prefixDataTestId, 'LastReportedEbitdaInput')}
                    />
                  </div>
                  {validationErrors.lastReportedEbitda && (
                    <p className="gba:mt-1 gba:text-sm gba:text-red-600">
                      {validationErrors.lastReportedEbitda}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Private Equity Information Section - Only show for PRIVATE_EQUITY type */}
          {formValues.group === "InvestmentGroup:v1:PRIVATE_EQUITY" && (
            <div className="gba:space-y-4 gba:border gba:border-gray-200 gba:rounded-lg gba:p-4 gba:bg-gray-50">
              <h3 className="gba:text-lg gba:font-medium gba:text-gray-900 gba:mb-4">
                Private Equity Information
              </h3>

              {/* Role Field */}
              <div className="gba:space-y-2 gba:w-full">
                <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
                  Role <span className="gba:text-red-500">*</span>
                </Label>
                <div className="gba:w-full">
                  <Select 
                    value={formValues.privateEquityRole || ''} 
                    onValueChange={(value: string) => setFormValues({ privateEquityRole: value })}
                  >
                    <SelectTrigger className="gba:w-full" data-testid={formatDataTestId(prefixDataTestId, 'PrivateEquityRoleSelect')}>
                      <SelectValue placeholder="Please Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {investmentRoles.map((option) => (
                        <SelectItem key={option.id} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(investmentRolesError || validationErrors.privateEquityRole) && (
                  <p className="gba:mt-1 gba:text-sm gba:text-red-600">
                    {investmentRolesError || validationErrors.privateEquityRole}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Real Estate Information Section - Only show for REAL_ESTATE type */}
          {formValues.group === "InvestmentGroup:v1:REAL_ESTATE" && (
            <div className="gba:space-y-4 gba:border gba:border-gray-200 gba:rounded-lg gba:p-4 gba:bg-gray-50">
              <h3 className="gba:text-lg gba:font-medium gba:text-gray-900 gba:mb-4">
                Real Estate Information
              </h3>

              {/* Real Estate Type and Ownership Structure Fields - Same Line */}
              <div className="gba:flex gba:gap-4">
                {/* Real Estate Type Field */}
                <div className="gba:flex-1 gba:space-y-2">
                  <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
                    Real Estate Type <span className="gba:text-red-500">*</span>
                  </Label>
                  <div className="gba:w-full">
                    <Select 
                      value={formValues.realEstateTypeRef || ''} 
                      onValueChange={(value: string) => setFormValues({ realEstateTypeRef: value })}
                    >
                      <SelectTrigger className="gba:w-full" data-testid={formatDataTestId(prefixDataTestId, 'RealEstateTypeSelect')}>
                        <SelectValue placeholder="Please Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {realEstateTypes.map((option) => (
                          <SelectItem key={option.id} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {(realEstateTypesError || validationErrors.realEstateTypeRef) && (
                    <p className="gba:mt-1 gba:text-sm gba:text-red-600">
                      {realEstateTypesError || validationErrors.realEstateTypeRef}
                    </p>
                  )}
                </div>

                {/* Ownership Structure Field */}
                <div className="gba:flex-1 gba:space-y-2">
                  <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
                    Ownership Structure <span className="gba:text-red-500">*</span>
                  </Label>
                  <div className="gba:w-full">
                    <Select 
                      value={formValues.investmentOwnershipStructureRef || ''} 
                      onValueChange={(value: string) => setFormValues({ investmentOwnershipStructureRef: value })}
                    >
                      <SelectTrigger className="gba:w-full" data-testid={formatDataTestId(prefixDataTestId, 'OwnershipStructureSelect')}>
                        <SelectValue placeholder="Please Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {investmentOwnershipStructures.map((option) => (
                          <SelectItem key={option.id} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {(investmentOwnershipStructuresError || validationErrors.investmentOwnershipStructureRef) && (
                    <p className="gba:mt-1 gba:text-sm gba:text-red-600">
                      {investmentOwnershipStructuresError || validationErrors.investmentOwnershipStructureRef}
                    </p>
                  )}
                </div>
              </div>

              {/* Number of Units and Building Year Fields - Same Line */}
              <div className="gba:flex gba:gap-4">
                {/* Number of Units Field */}
                <div className="gba:flex-1 gba:space-y-2">
                  <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
                    Number of Units <span className="gba:text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    name="numberOfUnits"
                    value={formValues.numberOfUnits || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const value = e.target.value;
                      setFormValues({ numberOfUnits: value ? Number(value) : '' });
                    }}
                    placeholder="Enter number of units"
                    min="1"
                    step="1"
                    data-testid={formatDataTestId(prefixDataTestId, 'NumberOfUnitsInput')}
                  />
                  {validationErrors.numberOfUnits && (
                    <p className="gba:mt-1 gba:text-sm gba:text-red-600">
                      {validationErrors.numberOfUnits}
                    </p>
                  )}
                </div>

                {/* Building Year Field */}
                <div className="gba:flex-1 gba:space-y-2">
                  <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
                    Building Year <span className="gba:text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    name="buildingYear"
                    value={formValues.buildingYear || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const value = e.target.value;
                      setFormValues({ buildingYear: value ? Number(value) : '' });
                    }}
                    placeholder="Enter building year"
                    min="1700"
                    max="2100"
                    step="1"
                    data-testid={formatDataTestId(prefixDataTestId, 'BuildingYearInput')}
                  />
                  {validationErrors.buildingYear && (
                    <p className="gba:mt-1 gba:text-sm gba:text-red-600">
                      {validationErrors.buildingYear}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Liquid Fund Information Section - Only show for LIQUID_FUND type */}
          {formValues.group === "InvestmentGroup:v1:LIQUID_FUND" && (
            <div className="gba:space-y-4 gba:border gba:border-gray-200 gba:rounded-lg gba:p-4 gba:bg-gray-50">
              <h3 className="gba:text-lg gba:font-medium gba:text-gray-900 gba:mb-4">
                Liquid Fund Information
              </h3>

              {/* Account Number Field */}
              <div className="gba:space-y-2">
                <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
                  Account No. <span className="gba:text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  name="accountNumber"
                  value={formValues.accountNumber || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setFormValues({ accountNumber: e.target.value });
                  }}
                  placeholder="Enter account number"
                  data-testid={formatDataTestId(prefixDataTestId, 'AccountNumberInput')}
                />
                {validationErrors.accountNumber && (
                  <p className="gba:mt-1 gba:text-sm gba:text-red-600">
                    {validationErrors.accountNumber}
                  </p>
                )}
              </div>

              {/* Allow Early Termination Field */}
              <div className="gba:space-y-2">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Checkbox
                    id="earlyTerminationAllowed"
                    name="earlyTerminationAllowed"
                    checked={formValues.earlyTerminationAllowed || false}
                    onCheckedChange={(checked: boolean) => {
                      setFormValues({ earlyTerminationAllowed: checked });
                    }}
                    data-testid={formatDataTestId(prefixDataTestId, 'EarlyTerminationAllowedInput')}
                  />
                  <Label 
                    htmlFor="earlyTerminationAllowed"
                    className="gba:text-sm gba:font-medium gba:text-gray-700 gba:cursor-pointer"
                  >
                    Allow Early Termination
                  </Label>
                </div>
              </div>

              {/* Interest Rate Field */}
              <div className="gba:space-y-2">
                <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
                  Interest Rate <span className="gba:text-red-500">*</span>
                </Label>
                <FormattedNumberInput
                  name="interestRate"
                  value={formValues.interestRate || ''}
                  onChange={(value) => setFormValues({ interestRate: value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  data-testid={formatDataTestId(prefixDataTestId, 'InterestRateInput')}
                />
                {validationErrors.interestRate && (
                  <p className="gba:mt-1 gba:text-sm gba:text-red-600">
                    {validationErrors.interestRate}
                  </p>
                )}
              </div>

              {/* Payment Frequency Field */}
              <div className="gba:space-y-2 gba:w-full">
                <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
                  Payment Frequency <span className="gba:text-red-500">*</span>
                </Label>
                <div className="gba:w-full">
                  <Select 
                    value={formValues.interestPaymentFrequencyRef || ''} 
                    onValueChange={(value: string) => setFormValues({ interestPaymentFrequencyRef: value })}
                  >
                    <SelectTrigger className="gba:w-full" data-testid={formatDataTestId(prefixDataTestId, 'PaymentFrequencySelect')}>
                      <SelectValue placeholder="Please Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {interestPaymentFrequencies.map((option) => (
                        <SelectItem key={option.id} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(interestPaymentFrequenciesError || validationErrors.interestPaymentFrequencyRef) && (
                  <p className="gba:mt-1 gba:text-sm gba:text-red-600">
                    {interestPaymentFrequenciesError || validationErrors.interestPaymentFrequencyRef}
                  </p>
                )}
              </div>

              {/* Maturity Date Field */}
              <div className="gba:space-y-2">
                <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
                  Maturity Date <span className="gba:text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  name="maturityDate"
                  value={formValues.maturityDate || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setFormValues({ maturityDate: e.target.value });
                  }}
                  data-testid={formatDataTestId(prefixDataTestId, 'MaturityDateInput')}
                />
                {validationErrors.maturityDate && (
                  <p className="gba:mt-1 gba:text-sm gba:text-red-600">
                    {validationErrors.maturityDate}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-md gba:p-4">
              <div className="gba:text-red-800 gba:text-sm">
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Submit and Cancel Buttons - Fixed at bottom */}
        <div className="gba:pt-6 gba:border-t gba:border-gray-200 gba:space-y-3">
          {/* Primary action and Cancel buttons */}
          <div className="gba:flex gba:gap-3">
            {/* Cancel Button */}
            <Button
              onClick={onCancel}
              disabled={isLoading}
              variant="secondary"
              className="gba:flex-1"
              data-testid={formatDataTestId(prefixDataTestId, 'CancelButton')}
            >
              Cancel
            </Button>

            {/* Create/Update Button */}
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || isLoading}
              variant="default"
              className="gba:flex-1"
              data-testid={formatDataTestId(prefixDataTestId, isUpdate ? 'UpdateButton' : 'CreateButton')}
            >
              {isUpdate ? 'Update Investment' : 'Create Investment'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestmentFormComponent; 