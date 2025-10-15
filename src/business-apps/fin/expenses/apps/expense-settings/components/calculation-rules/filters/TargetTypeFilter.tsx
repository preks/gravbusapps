import React from 'react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface TargetTypeFilterProps {
  value: { employee: boolean; company: boolean; orgUnit: boolean; general: boolean };
  onChange: (value: { employee: boolean; company: boolean; orgUnit: boolean; general: boolean }) => void;
  'data-testid'?: string;
}

const TargetTypeFilter: React.FC<TargetTypeFilterProps> = ({
  value,
  onChange,
  'data-testid': dataTestId
}) => {
  const handleToggle = (key: keyof typeof value) => {
    onChange({ ...value, [key]: !value[key] });
  };

  const options = [
    { key: 'employee' as const, label: getTranslationFromI18nKeyAndLabel('expenseSettings.filters.employee', 'Employee') },
    { key: 'company' as const, label: getTranslationFromI18nKeyAndLabel('expenseSettings.filters.company', 'Company') },
    { key: 'orgUnit' as const, label: getTranslationFromI18nKeyAndLabel('expenseSettings.filters.orgUnit', 'Organizational Unit') },
    { key: 'general' as const, label: getTranslationFromI18nKeyAndLabel('expenseSettings.filters.general', 'General') }
  ];

  return (
    <div className="gba:space-y-2" data-testid={dataTestId}>
      {options.map(option => (
        <label
          key={option.key}
          className="gba:flex gba:items-center gba:gap-2 gba:p-2 gba:rounded gba:cursor-pointer hover:gba:bg-gray-50"
        >
          <input
            type="checkbox"
            checked={value[option.key]}
            onChange={() => handleToggle(option.key)}
            className="gba:w-4 gba:h-4 gba:rounded gba:border-gray-300"
          />
          <span className="gba:text-sm">{option.label}</span>
        </label>
      ))}
    </div>
  );
};

export default TargetTypeFilter;

