import React from 'react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface CascadingFilterProps {
  value: { true: boolean; false: boolean };
  onChange: (value: { true: boolean; false: boolean }) => void;
  'data-testid'?: string;
}

const CascadingFilter: React.FC<CascadingFilterProps> = ({
  value,
  onChange,
  'data-testid': dataTestId
}) => {
  const handleToggle = (key: 'true' | 'false') => {
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <div className="gba:space-y-2" data-testid={dataTestId}>
      <label className="gba:flex gba:items-center gba:gap-2 gba:p-2 gba:rounded gba:cursor-pointer hover:gba:bg-gray-50">
        <input
          type="checkbox"
          checked={value.true}
          onChange={() => handleToggle('true')}
          className="gba:w-4 gba:h-4 gba:rounded gba:border-gray-300"
        />
        <span className="gba:text-sm">{getTranslationFromI18nKeyAndLabel('common.yes', 'Yes')}</span>
      </label>
      <label className="gba:flex gba:items-center gba:gap-2 gba:p-2 gba:rounded gba:cursor-pointer hover:gba:bg-gray-50">
        <input
          type="checkbox"
          checked={value.false}
          onChange={() => handleToggle('false')}
          className="gba:w-4 gba:h-4 gba:rounded gba:border-gray-300"
        />
        <span className="gba:text-sm">{getTranslationFromI18nKeyAndLabel('common.no', 'No')}</span>
      </label>
    </div>
  );
};

export default CascadingFilter;

