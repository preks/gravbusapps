import React, { useState } from 'react';
import { useContactFormContext } from '../context/ContactFormContext';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@newwork/nw-design-system';
import { PiCaretDown, PiCaretUp } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';

const prefixDataTestId = 'ContactForm';

const PersonalInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed
  
  const {
    formValues,
    setFormValues,
    error,
    academicTitles,
    languages,
  } = useContactFormContext();

  return (
    <div className="gba:bg-white gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-100 gba:overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:w-full gba:px-6 gba:py-4 gba:border-b gba:border-gray-100 gba:bg-gradient-to-r gba:from-green-200 gba:to-emerald-200 gba:hover:from-green-300 gba:hover:to-emerald-300 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left"
        data-testid={formatDataTestId(prefixDataTestId, 'PersonalInfoToggle')}
      >
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-2 gba:h-2 gba:bg-green-500 gba:rounded-full"></div>
          Personal Information
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

          {/* Academic Title and Language - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Academic Title
              </label>
              <Select
                value={formValues.academicTitleRef}
                onValueChange={(value) => setFormValues({ academicTitleRef: value })}
                data-testid={formatDataTestId(prefixDataTestId, 'AcademicTitleSelect')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Please Select..." />
                </SelectTrigger>
                <SelectContent>
                  {academicTitles.map((title) => (
                    <SelectItem key={title.id} value={title.value}>
                      {title.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Language
              </label>
              <Select
                value={formValues.languageRef}
                onValueChange={(value) => setFormValues({ languageRef: value })}
                data-testid={formatDataTestId(prefixDataTestId, 'LanguageSelect')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Please Select..." />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((language) => (
                    <SelectItem key={language.id} value={language.value}>
                      {language.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Birth Date */}
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              Birth Date
            </label>
            <Input
              id="birthDate"
              name="birthDate"
              type="date"
              value={formValues.birthDate}
              onChange={(e) => setFormValues({ birthDate: e.target.value })}
              data-testid={formatDataTestId(prefixDataTestId, 'BirthDateInput')}
            />
          </div>

          {/* Picture URL */}
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              Picture URL
            </label>
            <Input
              id="pictureUrl"
              name="pictureUrl"
              type="url"
              value={formValues.pictureUrl}
              onChange={(e) => setFormValues({ pictureUrl: e.target.value })}
              placeholder="Please Enter..."
              data-testid={formatDataTestId(prefixDataTestId, 'PictureUrlInput')}
            />
          </div>

          {/* LinkedIn and XING URLs - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                LinkedIn Profile
              </label>
              <Input
                id="linkedinUrl"
                name="linkedinUrl"
                type="url"
                value={formValues.linkedinUrl}
                onChange={(e) => setFormValues({ linkedinUrl: e.target.value })}
                placeholder="Please Enter..."
                data-testid={formatDataTestId(prefixDataTestId, 'LinkedinUrlInput')}
              />
            </div>

            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                XING Profile
              </label>
              <Input
                id="xingUrl"
                name="xingUrl"
                type="url"
                value={formValues.xingUrl}
                onChange={(e) => setFormValues({ xingUrl: e.target.value })}
                placeholder="Please Enter..."
                data-testid={formatDataTestId(prefixDataTestId, 'XingUrlInput')}
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              Bio
            </label>
            <Textarea
              id="bio"
              name="bio"
              value={formValues.bio}
              onChange={(e) => setFormValues({ bio: e.target.value })}
              placeholder="Please Enter..."
              rows={3}
              data-testid={formatDataTestId(prefixDataTestId, 'BioTextarea')}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalInformationSection; 