import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system';
import { ExpenseRule } from '../../../types/ExpenseRuleTypes';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface RuleFilterProps {
  rules: ExpenseRule[];
  selectedRuleIds: string[];
  onChange: (ruleIds: string[]) => void;
  'data-testid'?: string;
}

const RuleFilter: React.FC<RuleFilterProps> = ({
  rules,
  selectedRuleIds,
  onChange,
  'data-testid': dataTestId
}) => {
  const handleToggle = (ruleId: string) => {
    const newSelection = selectedRuleIds.includes(ruleId)
      ? selectedRuleIds.filter(id => id !== ruleId)
      : [...selectedRuleIds, ruleId];
    onChange(newSelection);
  };

  const sortedRules = [...rules].sort((a, b) => (a.code || '').localeCompare(b.code || ''));

  return (
    <div className="gba:space-y-2" data-testid={dataTestId}>
      <div className="gba:max-h-[300px] gba:overflow-y-auto gba:space-y-1 gba:pr-2">
        {sortedRules.map(rule => (
          <label
            key={rule.id}
            className="gba:flex gba:items-center gba:gap-2 gba:p-2 gba:rounded gba:cursor-pointer hover:gba:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={selectedRuleIds.includes(rule.id)}
              onChange={() => handleToggle(rule.id)}
              className="gba:w-4 gba:h-4 gba:rounded gba:border-gray-300"
            />
            <div className="gba:flex gba:flex-col gba:flex-1">
              <span className="gba:text-sm gba:font-medium">{rule.code}</span>
              {rule.name && (
                <span className="gba:text-xs gba:text-gray-500">{rule.name}</span>
              )}
            </div>
          </label>
        ))}
      </div>
      {selectedRuleIds.length > 0 && (
        <div className="gba:text-xs gba:text-gray-500 gba:pt-2 gba:border-t">
          {getTranslationFromI18nKeyAndLabel('common.selected', 'Selected')}: {selectedRuleIds.length}
        </div>
      )}
    </div>
  );
};

export default RuleFilter;

