import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input, Label, Textarea } from '@newwork/nw-design-system';
import { PiCaretDown, PiCaretUp } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useAccountFormContext } from '../context/AccountFormContext';

const prefixDataTestId = 'AccountForm';

const CompanyInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed
  
  const {
    formValues,
    setFormValues,
    legalForms,
    industries,
    parentAccountSuggestions,
    searchParentAccounts,
    isSearchingParentAccounts,
  } = useAccountFormContext();

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
          
          {/* Parent Account */}
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              Parent Account
            </label>
            <Select
              value={formValues.parentAccount}
              onValueChange={(value) => setFormValues({ parentAccount: value })}
              data-testid={formatDataTestId(prefixDataTestId, 'ParentAccountSelect')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Please Select..." />
              </SelectTrigger>
              <SelectContent>
                {parentAccountSuggestions.map((option) => (
                  <SelectItem key={option.id} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
                {isSearchingParentAccounts && (
                  <SelectItem disabled value="loading">Loading...</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Legal Form and Industry - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:w-full">
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Legal Form
              </label>
              <Select
                value={formValues.legalForm}
                onValueChange={(value) => setFormValues({ legalForm: value })}
                data-testid={formatDataTestId(prefixDataTestId, 'LegalFormSelect')}
              >
                <SelectTrigger className="gba:w-full">
                  <SelectValue placeholder="Please Select..." />
                </SelectTrigger>
                <SelectContent>
                  {legalForms.map((option) => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="gba:w-full">
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Industry
              </label>
              <Select
                value={formValues.industry}
                onValueChange={(value) => setFormValues({ industry: value })}
                data-testid={formatDataTestId(prefixDataTestId, 'IndustrySelect')}
              >
                <SelectTrigger className="gba:w-full">
                  <SelectValue placeholder="Please Select..." />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((option) => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Website */}
          <div>
            <Label htmlFor="website" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              Website
            </Label>
            <Input
              id="website"
              name="website"
              value={formValues.website}
              onChange={(e) => setFormValues({ website: e.target.value })}
              placeholder="Please Enter..."
              data-testid={formatDataTestId(prefixDataTestId, 'WebsiteInput')}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              Description
            </Label>
            <Textarea
              id="description"
              name="description"
              value={formValues.description}
              onChange={(e) => setFormValues({ description: e.target.value })}
              placeholder="Please Enter..."
              rows={4}
              data-testid={formatDataTestId(prefixDataTestId, 'DescriptionTextarea')}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyInformationSection; 