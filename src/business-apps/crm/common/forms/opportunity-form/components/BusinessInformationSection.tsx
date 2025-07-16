import React, { useState } from 'react';
import { Input, Label, Switch } from '@newwork/nw-design-system';
import { PiCaretDown, PiCaretUp } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useOpportunityFormContext } from '../context/OpportunityFormContext';

const prefixDataTestId = 'OpportunityForm';

const BusinessInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed
  
  const {
    formValues,
    setFormValues,
  } = useOpportunityFormContext();

  return (
    <div className="gba:bg-white gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-100 gba:overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:w-full gba:px-6 gba:py-4 gba:border-b gba:border-gray-100 gba:bg-gradient-to-r gba:from-yellow-200 gba:to-amber-200 gba:hover:from-yellow-300 gba:hover:to-amber-300 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left"
        style={{
          background: 'linear-gradient(to right, #fef3c7, #fde68a)',
          transition: 'background 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(to right, #fcd34d, #f59e0b)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(to right, #fef3c7, #fde68a)';
        }}
        data-testid={formatDataTestId(prefixDataTestId, 'BusinessInfoToggle')}
      >
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-2 gba:h-2 gba:bg-yellow-500 gba:rounded-full"></div>
          Business Information
        </h3>
        {isExpanded ? (
          <PiCaretUp className="gba:w-4 gba:h-4 gba:text-gray-500" />
        ) : (
          <PiCaretDown className="gba:w-4 gba:h-4 gba:text-gray-500" />
        )}
      </button>
      
      {isExpanded && (
        <div className="gba:p-6 gba:space-y-6">
          
          {/* Business Key and Code - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:w-full">
              <Label htmlFor="businessKey" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Business Key
              </Label>
              <Input
                id="businessKey"
                name="businessKey"
                value={formValues.businessKey}
                onChange={(e) => setFormValues({ businessKey: e.target.value })}
                placeholder="Please Enter..."
                data-testid={formatDataTestId(prefixDataTestId, 'BusinessKeyInput')}
              />
            </div>

            <div className="gba:w-full">
              <Label htmlFor="code" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Code
              </Label>
              <Input
                id="code"
                name="code"
                value={formValues.code}
                onChange={(e) => setFormValues({ code: e.target.value })}
                placeholder="Please Enter..."
                data-testid={formatDataTestId(prefixDataTestId, 'CodeInput')}
              />
            </div>
          </div>

          {/* Source App and Personal - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:w-full">
              <Label htmlFor="sourceApp" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Source App
              </Label>
              <Input
                id="sourceApp"
                name="sourceApp"
                value={formValues.sourceApp}
                onChange={(e) => setFormValues({ sourceApp: e.target.value })}
                placeholder="CRM"
                data-testid={formatDataTestId(prefixDataTestId, 'SourceAppInput')}
              />
            </div>

            <div className="gba:w-full">
              <div className="gba:flex gba:items-center gba:space-x-3">
                <Switch
                  id="personal"
                  checked={formValues.personal}
                  onCheckedChange={(checked) => setFormValues({ personal: checked })}
                  data-testid={formatDataTestId(prefixDataTestId, 'PersonalSwitch')}
                />
                <Label htmlFor="personal" className="gba:text-sm gba:font-medium gba:text-gray-900">
                  Personal Opportunity
                </Label>
              </div>
              <div className="gba:text-xs gba:text-gray-500 gba:mt-1">
                Mark this opportunity as personal
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessInformationSection; 