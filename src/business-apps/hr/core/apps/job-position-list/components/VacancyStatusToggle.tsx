import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@newwork/nw-design-system';
import { PiCircle, PiCheckCircle, PiList, PiWarning } from 'react-icons/pi';
import { VacancyFilter } from '../hooks/useJobPositionListData';

export type ExtendedVacancyFilter = VacancyFilter | 'missing-profile';

interface VacancyStatusToggleProps {
  value: ExtendedVacancyFilter;
  onChange: (value: ExtendedVacancyFilter) => void;
  missingJobProfileCount?: number;
  className?: string;
}

/**
 * VacancyStatusToggle component allows users to switch between different vacancy status filters.
 * It displays as a set of toggle buttons with icons and labels.
 */
export const VacancyStatusToggle: React.FC<VacancyStatusToggleProps> = ({
  value,
  onChange,
  missingJobProfileCount = 0,
  className = ''
}) => {
  const { t } = useTranslation();

  const options = [
    {
      key: 'vacant' as ExtendedVacancyFilter,
      label: t('job_position.vacant', 'Vacant'),
      icon: <PiCircle size={16} />,
      color: 'warning'
    },
    {
      key: 'filled' as ExtendedVacancyFilter,
      label: t('job_position.filled', 'Filled'),
      icon: <PiCheckCircle size={16} />,
      color: 'success'
    },
    {
      key: 'all' as ExtendedVacancyFilter,
      label: t('job_position.all', 'All'),
      icon: <PiList size={16} />,
      color: 'info'
    },
    {
      key: 'missing-profile' as ExtendedVacancyFilter,
      label: `${t('job_position.missing_profile', 'Missing Job Profile')} (${missingJobProfileCount})`,
      icon: <PiWarning size={16} />,
      color: 'destructive'
    }
  ];

  return (
    <div className={`flex ${className}`} data-testid="vacancy-status-toggle">
      {options.map((option) => (
        <Button
          key={option.key}
          variant={value === option.key ? "default" : "secondary"}
          size="sm"
          onClick={() => onChange(option.key)}
          data-testid={`vacancy-status-${option.key}-button`}
          style={{
            marginRight: 'var(--spacing-2)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-2)',
            color: value === option.key 
              ? `var(--color-${option.color}-foreground)` 
              : `var(--color-${option.color})`,
            backgroundColor: value === option.key 
              ? `var(--color-${option.color})` 
              : 'transparent',
            borderColor: `var(--color-${option.color})`,
            borderWidth: 'var(--spacing-px)',
            borderStyle: 'solid'
          }}
        >
          {option.icon}
          <span>{option.label}</span>
        </Button>
      ))}
    </div>
  );
};

export default VacancyStatusToggle; 