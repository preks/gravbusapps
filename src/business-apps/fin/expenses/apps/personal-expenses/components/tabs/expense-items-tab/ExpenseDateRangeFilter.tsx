import React, { useCallback } from 'react';
import { DatePicker } from 'antd';
import dayjs, { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

interface ExpenseDateRangeFilterProps {
  expenseDateRange?: [Date | null, Date | null] | null;
  onDateRangeChange: (expenseDateRange: [Date | null, Date | null] | null) => void;
  className?: string;
  placeholder?: [string, string];
}

export const ExpenseDateRangeFilter: React.FC<ExpenseDateRangeFilterProps> = ({
  expenseDateRange,
  onDateRangeChange,
  className = '',
  placeholder = ['Start date', 'End date'] as [string, string]
}) => {
  // Convert Date objects to dayjs objects for the DatePicker
  const dateRange: [Dayjs | null, Dayjs | null] = [
    expenseDateRange?.[0] ? dayjs(expenseDateRange[0]) : null,
    expenseDateRange?.[1] ? dayjs(expenseDateRange[1]) : null
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
    <div className={`gba:flex gba:items-center gba:gap-2 gba:bg-white gba:p-3 gba:rounded-lg gba:border gba:border-gray-200 gba:shadow-sm ${className}`}>
      <RangePicker
        value={dateRange}
        onChange={handleDateRangeChange}
        placeholder={placeholder}
        format="MMM DD, YYYY"
        allowClear
        allowEmpty={[true, true]}
        size="small"
        style={{ width: 240 }}
        data-testid="expense-item-date-range-filter"
      />
    </div>
  );
}; 