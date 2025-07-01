import React from 'react';
import { Typography, Radio, Divider } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import { DateRangeOption } from '../../hooks/useTeamSpendingAnalytics';

const { Text } = Typography;

interface AnalyticsFilterPanelProps {
  dateRange: DateRangeOption;
  setDateRange: (range: DateRangeOption) => void;
  onClearAllFilters: () => void;
}

const AnalyticsFilterPanel: React.FC<AnalyticsFilterPanelProps> = ({
  dateRange,
  setDateRange,
  onClearAllFilters
}) => {
  // No additional handlers needed for now as we're only including the time filter

  return (
    <div className="gba:w-64 gba:border-r gba:border-gray-200 gba:pr-4 gba:flex gba:flex-col gba:gap-4" data-testid="analytics-filter-panel">
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
        <Text strong className="gba:text-base"><FilterOutlined className="gba:mr-1" /> Filters</Text>
        <Text 
          type="secondary" 
          className="gba:text-xs gba:cursor-pointer gba:hover:text-blue-500" 
          onClick={onClearAllFilters}
          data-testid="clear-all-filters"
        >
          Clear All
        </Text>
      </div>
      
      <Divider className="gba:my-2" />
      
      {/* Filter by Time Period */}
      <div>
        <Text strong className="gba:block gba:mb-2">Time Period</Text>
        <Radio.Group 
          value={dateRange} 
          onChange={(e) => setDateRange(e.target.value)}
          data-testid="date-range-selector"
          className="gba:flex gba:flex-col gba:gap-1"
        >
          <Radio value={DateRangeOption.LAST_30_DAYS}>Last 30 Days</Radio>
          <Radio value={DateRangeOption.LAST_90_DAYS}>Last 90 Days</Radio>
          <Radio value={DateRangeOption.LAST_6_MONTHS}>Last 6 Months</Radio>
          <Radio value={DateRangeOption.LAST_YEAR}>Last Year</Radio>
          <Radio value={DateRangeOption.YEAR_TO_DATE}>Year to Date</Radio>
          <Radio value={DateRangeOption.ALL_TIME}>All Time</Radio>
        </Radio.Group>
      </div>
      
      {/* Additional filters will be added in future iterations */}
    </div>
  );
};

export default AnalyticsFilterPanel;
