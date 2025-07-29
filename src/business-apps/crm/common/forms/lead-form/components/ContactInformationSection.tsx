import React, { useState } from 'react';
import { SelectField, InputField } from '@newwork/gravity-ui-catalog';
import { PiPhone, PiEnvelopeSimple, PiCaretDown, PiCaretUp } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useLeadFormContext } from '../context/LeadFormContext';
import { validateEmail, validatePhone, toStringOrUndefined } from '../utils/validationUtils';
import { useAcademicTitles } from '../hooks/useAcademicTitles';

const prefixDataTestId = 'LeadForm';

const ContactInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded
  
  const {
    formValues,
    setFormValues,
    isLoading,
    accessToken,
  } = useLeadFormContext();

  // Fetch academic titles from catalog
  const {
    academicTitleOptions,
    isLoading: academicTitlesLoading
  } = useAcademicTitles(accessToken);

  const emailError = formValues.email && !validateEmail(formValues.email) ? 'Please enter a valid email address' : '';
  const phoneError = formValues.phone && !validatePhone(formValues.phone) ? 'Please enter a valid phone number' : '';

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
          {/* Salutation */}
          <SelectField
            label="Salutation"
            name="salutation"
            value={toStringOrUndefined(formValues.salutation)}
            onChange={e => setFormValues({ salutation: String(e.value || '') })}
            data={academicTitleOptions}
            placeholder="Please Select..."
            loading={isLoading || academicTitlesLoading}
            filterOption={false}
            data-testid={formatDataTestId(prefixDataTestId, 'SalutationSelect')}
          />

          {/* First Name and Last Name - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <InputField
              label="First Name"
              name="firstName"
              value={typeof formValues.firstName === 'string' ? formValues.firstName : ''}
              onChange={e => setFormValues({ firstName: String(e.value || '') })}
              placeholder="Please Enter..."
              required
              data-testid={formatDataTestId(prefixDataTestId, 'FirstNameInput')}
            />

            <InputField
              label="Last Name"
              name="lastName"
              value={typeof formValues.lastName === 'string' ? formValues.lastName : ''}
              onChange={e => setFormValues({ lastName: String(e.value || '') })}
              placeholder="Please Enter..."
              required
              data-testid={formatDataTestId(prefixDataTestId, 'LastNameInput')}
            />
          </div>

          {/* Job Position */}
          <InputField
            label="Job Position"
            name="jobPosition"
            value={typeof formValues.jobPosition === 'string' ? formValues.jobPosition : ''}
            onChange={e => setFormValues({ jobPosition: String(e.value || '') })}
            placeholder="Please Enter..."
            data-testid={formatDataTestId(prefixDataTestId, 'JobPositionInput')}
          />

          {/* Phone */}
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              Phone
            </label>
            <div className="gba:relative">
              <div className="gba:absolute gba:inset-y-0 gba:left-0 gba:pl-3 gba:flex gba:items-center gba:pointer-events-none gba:z-10">
                <PiPhone className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <div className="gba:pl-10">
                <InputField
                  name="phone"
                  value={typeof formValues.phone === 'string' ? formValues.phone : ''}
                  onChange={e => setFormValues({ phone: String(e.value || '') })}
                  placeholder="Please Enter..."
                  style={{
                    borderColor: phoneError ? '#ef4444' : undefined,
                  }}
                  data-testid={formatDataTestId(prefixDataTestId, 'PhoneInput')}
                />
              </div>
            </div>
            {phoneError && (
              <p className="gba:mt-1 gba:text-sm gba:text-red-600">
                {phoneError}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              Email
            </label>
            <div className="gba:relative">
              <div className="gba:absolute gba:inset-y-0 gba:left-0 gba:pl-3 gba:flex gba:items-center gba:pointer-events-none gba:z-10">
                <PiEnvelopeSimple className="gba:h-4 gba:w-4 gba:text-gray-400" />
              </div>
              <div className="gba:pl-10">
                <InputField
                  name="email"
                  value={typeof formValues.email === 'string' ? formValues.email : ''}
                  onChange={e => setFormValues({ email: String(e.value || '') })}
                  placeholder="Please Enter..."
                  style={{
                    borderColor: emailError ? '#ef4444' : undefined,
                  }}
                  data-testid={formatDataTestId(prefixDataTestId, 'EmailInput')}
                />
              </div>
            </div>
            {emailError && (
              <p className="gba:mt-1 gba:text-sm gba:text-red-600">
                {emailError}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactInformationSection; 