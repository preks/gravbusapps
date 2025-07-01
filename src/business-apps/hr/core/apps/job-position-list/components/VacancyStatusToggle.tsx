import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@newwork/gravity-ui-catalog';
import { PiCircle, PiCheckCircle, PiList } from 'react-icons/pi';
import { VacancyFilter } from '../hooks/useJobPositionListData';

interface VacancyStatusToggleProps {
  value: VacancyFilter;
  onChange: (value: VacancyFilter) => void;
  className?: string;
}

/**
 * VacancyStatusToggle component allows users to switch between different vacancy status filters.
 * It displays as a set of toggle buttons with icons and labels.
 */
export const VacancyStatusToggle: React.FC<VacancyStatusToggleProps> = ({
  value,
  onChange,
  className = ''
}) => {
  const { t } = useTranslation();

  const options = [
    {
      key: 'vacant' as VacancyFilter,
      label: t('job_position.vacant', 'Vacant'),
      icon: <PiCircle size={16} />,
      color: 'orange'
    },
    {
      key: 'filled' as VacancyFilter,
      label: t('job_position.filled', 'Filled'),
      icon: <PiCheckCircle size={16} />,
      color: 'green'
    },
    {
      key: 'all' as VacancyFilter,
      label: t('job_position.all', 'All'),
      icon: <PiList size={16} />,
      color: 'blue'
    }
  ];

  return (
    <div className={`gba:flex gba:items-center gba:gap-1 gba:bg-gray-50 gba:p-1 gba:rounded-lg ${className}`}>
      {options.map((option) => {
        const isSelected = value === option.key;
        return (
          <Button
            key={option.key}
            variant={isSelected ? 'primary' : 'text'}
            size="small"
            onClick={() => onChange(option.key)}
            className={`gba:flex gba:items-center gba:gap-2 gba:min-w-0 gba:px-3 gba:py-1.5 ${
              isSelected 
                ? 'gba:bg-primary gba:text-white gba:shadow-sm' 
                : 'gba:text-gray-600 hover:gba:bg-gray-100'
            }`}
          >
            <span className={`gba:flex-shrink-0 ${
              isSelected 
                ? 'gba:text-white' 
                : option.color === 'orange' 
                  ? 'gba:text-orange-500' 
                  : option.color === 'green' 
                    ? 'gba:text-green-500' 
                    : 'gba:text-blue-500'
            }`}>
              {option.icon}
            </span>
            <span className="gba:text-sm gba:font-medium gba:whitespace-nowrap">
              {option.label}
            </span>
          </Button>
        );
      })}
    </div>
  );
};

export default VacancyStatusToggle; 