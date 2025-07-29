import React, { useState } from 'react';
import { Input, Label } from '@newwork/nw-design-system';
import { PiCaretDown, PiCaretUp } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useAccountFormContext } from '../context/AccountFormContext';

const prefixDataTestId = 'AccountForm';

const ContactInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed
  
  const {
    formValues,
    setFormValues,
  } = useAccountFormContext();

  return (
    <div className="gba:bg-white gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-100 gba:overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:w-full gba:px-6 gba:py-4 gba:border-b gba:border-gray-100 gba:bg-gradient-to-r gba:from-green-200 gba:to-emerald-200 gba:hover:from-green-300 gba:hover:to-emerald-300 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left"
        style={{
          background: 'linear-gradient(to right, #bbf7d0, #a7f3d0)',
          transition: 'background 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(to right, #86efac, #6ee7b7)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(to right, #bbf7d0, #a7f3d0)';
        }}
        data-testid={formatDataTestId(prefixDataTestId, 'ContactInfoToggle')}
      >
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-2 gba:h-2 gba:bg-green-500 gba:rounded-full"></div>
          Contact Information
        </h3>
        {isExpanded ? (
          <PiCaretUp className="gba:w-4 gba:h-4 gba:text-gray-500" />
        ) : (
          <PiCaretDown className="gba:w-4 gba:h-4 gba:text-gray-500" />
        )}
      </button>
      
      {isExpanded && (
        <div className="gba:p-6 gba:space-y-6">
          
          {/* Phone and Email - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:w-full">
              <Label htmlFor="phone" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Phone
              </Label>
              <Input
                id="phone"
                name="phone"
                value={formValues.phone}
                onChange={(e) => setFormValues({ phone: e.target.value })}
                placeholder="Please Enter..."
                className="gba:w-full"
                data-testid={formatDataTestId(prefixDataTestId, 'PhoneInput')}
              />
            </div>

            <div className="gba:w-full">
              <Label htmlFor="email" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                value={formValues.email}
                onChange={(e) => setFormValues({ email: e.target.value })}
                placeholder="Please Enter..."
                className="gba:w-full"
                data-testid={formatDataTestId(prefixDataTestId, 'EmailInput')}
              />
            </div>
          </div>

          {/* Fax */}
          <div>
            <Label htmlFor="fax" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              Fax
            </Label>
            <Input
              id="fax"
              name="fax"
              value={formValues.fax}
              onChange={(e) => setFormValues({ fax: e.target.value })}
              placeholder="Please Enter..."
              data-testid={formatDataTestId(prefixDataTestId, 'FaxInput')}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactInformationSection; 