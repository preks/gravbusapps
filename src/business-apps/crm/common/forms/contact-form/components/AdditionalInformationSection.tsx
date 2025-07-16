import React, { useState } from 'react';
import { useContactFormContext } from '../context/ContactFormContext';
import { Input, Label, Textarea } from '@newwork/nw-design-system';
import { PiCaretDown, PiCaretUp } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';

const prefixDataTestId = 'ContactForm';

const AdditionalInformationSection: React.FC = () => {
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
        className="gba:w-full gba:px-6 gba:py-4 gba:border-b gba:border-gray-100 gba:bg-gradient-to-r gba:from-gray-200 gba:to-slate-200 gba:hover:from-gray-300 gba:hover:to-slate-300 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left"

        data-testid={formatDataTestId(prefixDataTestId, 'AdditionalInfoToggle')}
      >
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-2 gba:h-2 gba:bg-gray-500 gba:rounded-full"></div>
          Additional Information
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

          {/* Notes Summary */}
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              Notes Summary
            </label>
            <Textarea
              id="notesSummary"
              name="notesSummary"
              value={formValues.notesSummary}
              onChange={(e) => setFormValues({ notesSummary: e.target.value })}
              placeholder="Please Enter..."
              rows={4}
              data-testid={formatDataTestId(prefixDataTestId, 'NotesSummaryTextarea')}
            />
          </div>

          {/* Record State */}
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              Record State
            </label>
            <Input
              id="recordState"
              name="recordState"
              value={formValues.recordState}
              onChange={(e) => setFormValues({ recordState: e.target.value })}
              placeholder="Please Enter..."
              data-testid={formatDataTestId(prefixDataTestId, 'RecordStateInput')}
            />
          </div>

          {/* Version (for updates) */}
          {formValues.version !== undefined && (
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Version
              </label>
              <Input
                id="version"
                name="version"
                type="number"
                value={formValues.version || ''}
                onChange={(e) => setFormValues({ version: parseInt(e.target.value) || 0 })}
                placeholder="Please Enter..."
                disabled
                data-testid={formatDataTestId(prefixDataTestId, 'VersionInput')}
              />
            </div>
          )}

          {/* ID (for updates) */}
          {formValues.id && (
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Contact ID
              </label>
              <Input
                id="contactId"
                name="contactId"
                value={formValues.id}
                placeholder="System generated"
                disabled
                data-testid={formatDataTestId(prefixDataTestId, 'ContactIdInput')}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdditionalInformationSection; 