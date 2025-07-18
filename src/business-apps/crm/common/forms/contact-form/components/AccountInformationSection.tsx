import React, { useState } from 'react';
import { useContactFormContext } from '../context/ContactFormContext';
import { Input, Label } from '@newwork/nw-design-system';
import { PiCaretDown, PiCaretUp } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';

const prefixDataTestId = 'ContactForm';

const AccountInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed
  
  const {
    formValues,
    setFormValues,
    error,
  } = useContactFormContext();

  return (
    <div className="gba:bg-white gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-100 gba:overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:w-full gba:px-6 gba:py-4 gba:border-b gba:border-gray-100 gba:bg-gradient-to-r gba:from-indigo-200 gba:to-purple-200 gba:hover:from-indigo-300 gba:hover:to-purple-300 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left"

        data-testid={formatDataTestId(prefixDataTestId, 'AccountInfoToggle')}
      >
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-2 gba:h-2 gba:bg-indigo-500 gba:rounded-full"></div>
          Account Information
        </h3>
        {isExpanded ? (
          <PiCaretUp className="gba:w-4 gba:h-4 gba:text-gray-500" />
        ) : (
          <PiCaretDown className="gba:w-4 gba:h-4 gba:text-gray-500" />
        )}
      </button>
      
      {isExpanded && (
        <div className="gba:p-6 gba:space-y-6">
          {error && (
            <div className="gba:text-red-700 gba:text-sm gba:p-3 gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-lg">
              {error}
            </div>
          )}

          {/* Account ID */}
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              Account ID
            </label>
            <Input
              id="accountId"
              name="accountId"
              value={formValues.accountId}
              onChange={(e) => setFormValues({ accountId: e.target.value })}
              placeholder="Please Enter..."
              data-testid={formatDataTestId(prefixDataTestId, 'AccountIdInput')}
            />
          </div>

          {/* Owner Organization ID */}
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              Owner Organization ID
            </label>
            <Input
              id="ownerOrganizationId"
              name="ownerOrganizationId"
              value={formValues.ownerOrganizationId}
              onChange={(e) => setFormValues({ ownerOrganizationId: e.target.value })}
              placeholder="Please Enter..."
              data-testid={formatDataTestId(prefixDataTestId, 'OwnerOrganizationIdInput')}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountInformationSection; 