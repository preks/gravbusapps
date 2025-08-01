import React from 'react';
import { DatePicker } from 'antd';
import dayjs, { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

interface RequestDateRangeFilterProps {
  requestDateRange: [Date | null, Date | null] | null;
  onDateRangeChange: (dateRange: [Date | null, Date | null] | null) => void;
  placeholder?: [string, string];
}

const RequestDateRangeFilter: React.FC<RequestDateRangeFilterProps> = ({
  requestDateRange,
  onDateRangeChange,
  placeholder = ['Start date', 'End date']
}) => {
  const handleDateChange = (dates: any) => {
    if (!dates || dates.length === 0) {
      onDateRangeChange(null);
    } else {
      onDateRangeChange([
        dates[0]?.toDate() || null,
        dates[1]?.toDate() || null
      ]);
    }
  };

  const value = requestDateRange && requestDateRange[0] && requestDateRange[1]
    ? [dayjs(requestDateRange[0]), dayjs(requestDateRange[1])]
    : null;

  return (
    <RangePicker
      value={value as [Dayjs | null, Dayjs | null] | null}
      onChange={handleDateChange}
      placeholder={placeholder}
      style={{ width: '100%' }}
      data-testid="request-date-range-filter"
    />
  );
};

export default RequestDateRangeFilter; 