import React, { useState } from 'react';
import { TextAreaField } from '@newwork/gravity-ui-catalog';
import { PiCaretDown, PiCaretUp } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useLeadFormContext } from '../context/LeadFormContext';

const prefixDataTestId = 'LeadForm';

const DescriptionSection: React.FC = () => {
  const {
    formValues,
    setFormValues,
  } = useLeadFormContext();

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  return (
    <div className="gba:bg-white gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-100 gba:overflow-hidden">
      <button
        type="button"
        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
        className="gba:w-full gba:px-6 gba:py-4 gba:border-b gba:border-gray-100 gba:bg-gradient-to-r gba:from-blue-200 gba:to-sky-200 gba:hover:from-blue-300 gba:hover:to-sky-300 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left"
        style={{
          background: 'linear-gradient(to right, #bfdbfe, #bae6fd)',
          transition: 'background 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(to right, #93c5fd, #7dd3fc)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(to right, #bfdbfe, #bae6fd)';
        }}
        data-testid={formatDataTestId(prefixDataTestId, 'DescriptionToggle')}
      >
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-2 gba:h-2 gba:bg-blue-500 gba:rounded-full"></div>
          Description
        </h3>
        {isDescriptionExpanded ? (
          <PiCaretUp className="gba:w-4 gba:h-4 gba:text-gray-500" />
        ) : (
          <PiCaretDown className="gba:w-4 gba:h-4 gba:text-gray-500" />
        )}
      </button>
      
      {isDescriptionExpanded && (
        <div className="gba:p-6">
          <TextAreaField
            label="Description"
            name="notes"
            value={typeof formValues.notes === 'string' ? formValues.notes : ''}
            onChange={(e: any) => setFormValues({ notes: String(e.value || '') })}
            placeholder="Please Enter..."
            rows={4}
            data-testid={formatDataTestId(prefixDataTestId, 'DescriptionTextarea')}
          />
        </div>
      )}
    </div>
  );
};

export default DescriptionSection; 