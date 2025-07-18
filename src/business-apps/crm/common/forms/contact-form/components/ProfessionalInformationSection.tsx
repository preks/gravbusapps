import React, { useState } from 'react';
import { useContactFormContext } from '../context/ContactFormContext';
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system';
import { PiCaretDown, PiCaretUp } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';

const prefixDataTestId = 'ContactForm';

const ProfessionalInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed
  
  const {
    formValues,
    setFormValues,
    error,
    contactTypes,
    contactRoles,
    departments,
  } = useContactFormContext();

  return (
    <div className="gba:bg-white gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-100 gba:overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:w-full gba:px-6 gba:py-4 gba:border-b gba:border-gray-100 gba:bg-gradient-to-r gba:from-orange-200 gba:to-amber-200 gba:hover:from-orange-300 gba:hover:to-amber-300 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left"

        data-testid={formatDataTestId(prefixDataTestId, 'ProfessionalInfoToggle')}
      >
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-2 gba:h-2 gba:bg-orange-500 gba:rounded-full"></div>
          Professional Information
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

          {/* Job Title */}
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              Job Title
            </label>
            <Input
              id="jobTitle"
              name="jobTitle"
              value={formValues.jobTitle}
              onChange={(e) => setFormValues({ jobTitle: e.target.value })}
              placeholder="Please Enter..."
              data-testid={formatDataTestId(prefixDataTestId, 'JobTitleInput')}
            />
          </div>

          {/* Department */}
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              Department
            </label>
            <Select
              value={formValues.department}
              onValueChange={(value) => setFormValues({ department: value })}
              data-testid={formatDataTestId(prefixDataTestId, 'DepartmentSelect')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Please Select..." />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.value}>
                    {dept.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contact Type and Role - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Contact Type
              </label>
              <Select
                value={formValues.contactType}
                onValueChange={(value) => setFormValues({ contactType: value })}
                data-testid={formatDataTestId(prefixDataTestId, 'ContactTypeSelect')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Please Select..." />
                </SelectTrigger>
                <SelectContent>
                  {contactTypes.map((type) => (
                    <SelectItem key={type.id} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Contact Role
              </label>
              <Select
                value={formValues.contactRole}
                onValueChange={(value) => setFormValues({ contactRole: value })}
                data-testid={formatDataTestId(prefixDataTestId, 'ContactRoleSelect')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Please Select..." />
                </SelectTrigger>
                <SelectContent>
                  {contactRoles.map((role) => (
                    <SelectItem key={role.id} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Work Experience Years */}
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              Work Experience (Years)
            </label>
            <Input
              id="workExperienceYears"
              name="workExperienceYears"
              type="number"
              min="0"
              max="50"
              value={formValues.workExperienceYears}
              onChange={(e) => setFormValues({ workExperienceYears: e.target.value })}
              placeholder="Please Enter..."
              data-testid={formatDataTestId(prefixDataTestId, 'WorkExperienceInput')}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalInformationSection; 