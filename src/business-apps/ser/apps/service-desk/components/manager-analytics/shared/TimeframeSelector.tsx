import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

export interface TimeframeSelectorProps {
  value: 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom';
  onChange: (value: 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom') => void;
  disabled?: boolean;
}

export const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const timeframeOptions = [
    {
      value: 'last24h' as const,
      label: getTranslationFromI18nKeyAndLabel('services.analytics.timeframe.last24h', 'Last 24 Hours'),
    },
    {
      value: 'wtd' as const,
      label: getTranslationFromI18nKeyAndLabel('services.analytics.timeframe.wtd', 'Week to Date'),
    },
    {
      value: 'mtd' as const,
      label: getTranslationFromI18nKeyAndLabel('services.analytics.timeframe.mtd', 'Month to Date'),
    },
    {
      value: 'qtd' as const,
      label: getTranslationFromI18nKeyAndLabel('services.analytics.timeframe.qtd', 'Quarter to Date'),
    },
    {
      value: 'ytd' as const,
      label: getTranslationFromI18nKeyAndLabel('services.analytics.timeframe.ytd', 'Year to Date'),
    },
  ];

  return (
    <div className="gba:flex gba:items-center gba:space-x-2" data-testid="timeframe-selector">
      <label className="gba:text-sm gba:font-medium gba:text-gray-700">
        {getTranslationFromI18nKeyAndLabel('services.analytics.timeframe.label', 'Time Period:')}
      </label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="gba:w-48">
          <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('services.analytics.timeframe.placeholder', 'Select period')} />
        </SelectTrigger>
        <SelectContent>
          {timeframeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
