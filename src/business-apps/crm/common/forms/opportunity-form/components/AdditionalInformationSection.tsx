import React, { useState } from 'react';
import { Input, Label, Textarea } from '@newwork/nw-design-system';
import { PiCaretDown, PiCaretUp } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useOpportunityFormContext } from '../context/OpportunityFormContext';

const prefixDataTestId = 'OpportunityForm';

const AdditionalInformationSection: React.FC = () => {
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
        className="gba:w-full gba:px-6 gba:py-4 gba:border-b gba:border-gray-100 gba:bg-gradient-to-r gba:from-pink-200 gba:to-rose-200 gba:hover:from-pink-300 gba:hover:to-rose-300 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left"
        style={{
          background: 'linear-gradient(to right, #fce7f3, #fecaca)',
          transition: 'background 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(to right, #f9a8d4, #fb7185)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(to right, #fce7f3, #fecaca)';
        }}
        data-testid={formatDataTestId(prefixDataTestId, 'AdditionalInfoToggle')}
      >
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-2 gba:h-2 gba:bg-pink-500 gba:rounded-full"></div>
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
          
          {/* Notes Summary */}
          <div>
            <Label htmlFor="notesSummary" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              Notes Summary
            </Label>
            <Textarea
              id="notesSummary"
              name="notesSummary"
              rows={4}
              value={formValues.notesSummary}
              onChange={(e) => setFormValues({ notesSummary: e.target.value })}
              placeholder="Enter notes or comments about this opportunity..."
              data-testid={formatDataTestId(prefixDataTestId, 'NotesSummaryTextarea')}
              className="gba:w-full"
            />
          </div>

          {/* Last Interaction */}
          <div>
            <Label htmlFor="lastInteraction" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              Last Interaction
            </Label>
            <Input
              id="lastInteraction"
              name="lastInteraction"
              type="datetime-local"
              value={formValues.lastInteraction}
              onChange={(e) => setFormValues({ lastInteraction: e.target.value })}
              data-testid={formatDataTestId(prefixDataTestId, 'LastInteractionInput')}
            />
            <div className="gba:text-xs gba:text-gray-500 gba:mt-1">
              Date and time of the last interaction with this opportunity
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdditionalInformationSection; 