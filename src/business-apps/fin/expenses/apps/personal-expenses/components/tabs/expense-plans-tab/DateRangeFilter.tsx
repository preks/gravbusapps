import React, { useCallback } from 'react';
import { DatePicker, Space } from 'antd';
import dayjs, { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

interface DateRangeFilterProps {
  startDateRange?: [Date | null, Date | null] | null;
  onDateRangeChange: (startDateRange: [Date | null, Date | null] | null) => void;
  className?: string;
  placeholder?: [string, string];
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDateRange,
  onDateRangeChange,
  className = '',
  placeholder = ['Start date', 'End date']
}) => {
  // Convert Date objects to dayjs objects for the DatePicker
  const dateRange: [Dayjs | null, Dayjs | null] = [
    startDateRange?.[0] ? dayjs(startDateRange[0]) : null,
    startDateRange?.[1] ? dayjs(startDateRange[1]) : null
  ];

  const handleDateRangeChange = useCallback((
    dates: [Dayjs | null, Dayjs | null] | null
  ) => {
    if (!dates) {
      // Clear the date range
      onDateRangeChange(null);
    } else {
      // Convert to Date objects for the filter system
      const startDate = dates[0] ? dates[0].toDate() : null;
      const endDate = dates[1] ? dates[1].toDate() : null;
      onDateRangeChange([startDate, endDate]);
    }
  }, [onDateRangeChange]);

  return (
    <RangePicker
      value={dateRange}
      onChange={handleDateRangeChange}
      placeholder={placeholder}
      format="MMM DD, YYYY"
      allowClear
      allowEmpty={[true, true]}
      style={{ width: '100%' }}
      data-testid="expense-plan-start-date-range-filter"
    />
  );
}; 