import React, { useState } from 'react';
import { DatePicker } from 'antd';
import { useSalesTaskFormContext } from '../context/SalesTaskFormContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import dayjs from 'dayjs';

const prefixDataTestId = 'SalesTaskForm-Deadline';

const DeadlineSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed
  
  const {
    formValues,
    setFormValues,
  } = useSalesTaskFormContext();

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
        data-testid={formatDataTestId(prefixDataTestId, 'Toggle')}
      >
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-2 gba:h-2 gba:bg-yellow-500 gba:rounded-full"></div>
          {getTranslationFromI18nKeyAndLabel('crm:salesTask.scheduling', 'Scheduling')}
        </h3>
        <span className="gba:text-gray-500 gba:text-lg">
          {isExpanded ? '▲' : '▼'}
        </span>
      </button>
      
      {isExpanded && (
        <div className="gba:p-6">
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              {getTranslationFromI18nKeyAndLabel('crm:salesTask.deadline', 'Deadline')} <span className="gba:text-red-500">*</span>
            </label>
            <DatePicker 
              data-testid={formatDataTestId(prefixDataTestId, 'DeadlineInput')}
              value={formValues.deadline ? dayjs(formValues.deadline) : null}
              onChange={(date) => setFormValues({ deadline: date ? date.format('YYYY-MM-DD') : null })}
              className="gba:w-full" 
              placeholder={getTranslationFromI18nKeyAndLabel('crm:salesTask.selectDeadline', 'Select deadline')}
            />
            {!formValues.deadline && (
              <div className="gba:text-red-500 gba:text-sm gba:mt-1">
                {getTranslationFromI18nKeyAndLabel('crm:salesTask.deadlineRequired', 'Deadline is required')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeadlineSection; 