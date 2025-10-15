import React from 'react';
import { Checkbox } from 'antd';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface StatusFilterProps {
  value: { active: boolean; inactive: boolean };
  onChange: (value: { active: boolean; inactive: boolean }) => void;
  'data-testid'?: string;
}

const StatusFilter: React.FC<StatusFilterProps> = ({
  value,
  onChange,
  'data-testid': dataTestId
}) => {
  const handleToggle = (key: 'active' | 'inactive') => {
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <div className="gba:space-y-2" data-testid={dataTestId}>
      <Checkbox
        checked={value.active}
        onChange={() => handleToggle('active')}
      >
        {getTranslationFromI18nKeyAndLabel('common.active', 'Active')}
      </Checkbox>
      <Checkbox
        checked={value.inactive}
        onChange={() => handleToggle('inactive')}
      >
        {getTranslationFromI18nKeyAndLabel('common.inactive', 'Inactive')}
      </Checkbox>
    </div>
  );
};

export default StatusFilter;
