import React from 'react';
import { Checkbox } from 'antd';
import { MileageRulePeriod, MileageRulePeriodLabels } from '../../../types/ExpenseEnums';

interface RulePeriodFilterProps {
  selectedPeriods: Record<MileageRulePeriod, boolean>;
  onChange: (periods: Record<MileageRulePeriod, boolean>) => void;
  prefixDataTestId?: string;
}

const RulePeriodFilter: React.FC<RulePeriodFilterProps> = ({
  selectedPeriods,
  onChange,
  prefixDataTestId = 'rule-period-filter'
}) => {
  const handlePeriodToggle = (period: MileageRulePeriod) => {
    onChange({
      ...selectedPeriods,
      [period]: !selectedPeriods[period]
    });
  };

  return (
    <div className="gba:space-y-2" data-testid={prefixDataTestId}>
      {Object.values(MileageRulePeriod).map((period) => (
        <div key={period}>
          <Checkbox
            checked={selectedPeriods[period] || false}
            onChange={() => handlePeriodToggle(period)}
            data-testid={`${prefixDataTestId}-${period.toLowerCase()}`}
          >
            {MileageRulePeriodLabels[period]}
          </Checkbox>
        </div>
      ))}
    </div>
  );
};

export default RulePeriodFilter;
