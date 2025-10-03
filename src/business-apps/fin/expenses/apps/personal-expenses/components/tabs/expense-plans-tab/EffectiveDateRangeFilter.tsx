import React, { useCallback } from 'react';
import { DatePicker } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

const { RangePicker } = DatePicker;

interface EffectiveDateRangeFilterProps {
  effectiveDateRange?: [Date | null, Date | null] | null;
  onDateRangeChange: (dateRange: [Date | null, Date | null] | null) => void;
  placeholder?: [string, string];
}

const EffectiveDateRangeFilter: React.FC<EffectiveDateRangeFilterProps> = ({
  effectiveDateRange,
  onDateRangeChange,
  placeholder = [
    getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date','Start date'),
    getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date','End date')
  ]
}) => {
  const handleDateChange = useCallback((dates: [Dayjs | null, Dayjs | null] | null) => {
    if (!dates) {
      onDateRangeChange(null);
    } else {
      onDateRangeChange([
        dates[0]?.toDate() || null,
        dates[1]?.toDate() || null
      ]);
    }
  }, [onDateRangeChange]);

  const value = effectiveDateRange && (effectiveDateRange[0] || effectiveDateRange[1])
    ? [effectiveDateRange[0] ? dayjs(effectiveDateRange[0]) : null, effectiveDateRange[1] ? dayjs(effectiveDateRange[1]) : null]
    : null;

  return (
    <RangePicker
      value={value as [Dayjs | null, Dayjs | null] | null}
      onChange={handleDateChange}
      placeholder={placeholder}
      style={{ width: '100%' }}
      data-testid="effective-date-range-filter"
    />
  );
};

export default EffectiveDateRangeFilter;


