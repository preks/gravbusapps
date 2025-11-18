import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { PiCircle, PiCheckCircle, PiList, PiWarning } from 'react-icons/pi'
import { VacancyFilter } from '../hooks/useJobPositionListData'
import translations from '../_i18n'

export type ExtendedVacancyFilter = VacancyFilter | 'missing-profile'

interface VacancyStatusToggleProps {
  value: ExtendedVacancyFilter
  onChange: (value: ExtendedVacancyFilter) => void
  missingJobProfileCount?: number
  className?: string
}

/**
 * VacancyStatusToggle component allows users to switch between different vacancy status filters.
 * It displays as a select dropdown with icons and labels.
 */
export const VacancyStatusToggle: React.FC<VacancyStatusToggleProps> = ({
  value,
  onChange,
  missingJobProfileCount = 0,
  className = ''
}) => {
  const { t } = useTranslation(translations)

  const options = [
    {
      key: 'vacant' as ExtendedVacancyFilter,
      label: t('hr-positions-vacant'),
      icon: <PiCircle size={16} />,
      color: 'warning'
    },
    {
      key: 'filled' as ExtendedVacancyFilter,
      label: t('hr-positions-filled'),
      icon: <PiCheckCircle size={16} />,
      color: 'success'
    },
    {
      key: 'all' as ExtendedVacancyFilter,
      label: t('hr-positions-all'),
      icon: <PiList size={16} />,
      color: 'info'
    },
    {
      key: 'missing-profile' as ExtendedVacancyFilter,
      label: `${t('hr-positions-missing-profile')} (${missingJobProfileCount})`,
      icon: <PiWarning size={16} />,
      color: 'destructive'
    }
  ]

  // Find the current selected option for display
  const selectedOption = options.find(option => option.key === value)

  return (
    <div className={`gba:w-64 ${className}`} data-testid="vacancy-status-toggle">
      <Select value={value} onValueChange={(newValue: ExtendedVacancyFilter) => onChange(newValue)}>
        <SelectTrigger className="gba:w-full gba:h-9" data-testid="vacancy-status-select-trigger">
          <SelectValue>
            {selectedOption && (
              <div className="gba:flex gba:items-center gba:gap-2">
                <span
                  style={{ color: `var(--nw-color-${selectedOption.color})` }}
                  className="gba:flex gba:items-center"
                >
                  {selectedOption.icon}
                </span>
                <span className="gba:text-sm">{selectedOption.label}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent data-testid="vacancy-status-select-content">
          {options.map(option => (
            <SelectItem
              key={option.key}
              value={option.key}
              data-testid={`vacancy-status-${option.key}-option`}
              className="gba:cursor-pointer"
            >
              <div className="gba:flex gba:items-center gba:gap-2">
                <span style={{ color: `var(--nw-color-${option.color})` }} className="gba:flex gba:items-center">
                  {option.icon}
                </span>
                <span className="gba:text-sm">{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default VacancyStatusToggle
