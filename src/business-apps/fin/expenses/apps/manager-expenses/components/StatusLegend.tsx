import React from 'react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { PillType } from '@/components/pill/Pill';
import { getPillColor } from '@/components/pill/pillColors';

const pillTypeColorMap = {
  draft: getPillColor('draft'),
  completed: getPillColor('completed'),
  waiting: getPillColor('waiting'),
  task: getPillColor('task'),
  error: getPillColor('error'),
  preparing: getPillColor('preparing'),
} as const;

const pillTypeLabelMap: Record<PillType, string> = {
  draft: getTranslationFromI18nKeyAndLabel('lowcoder:status_legend.draft', 'Draft'),
  completed: getTranslationFromI18nKeyAndLabel('lowcoder:status_legend.completed', 'Completed'),
  waiting: getTranslationFromI18nKeyAndLabel('lowcoder:status_legend.waiting', 'Waiting'),
  task: getTranslationFromI18nKeyAndLabel('lowcoder:status_legend.task', 'Task'),
  error: getTranslationFromI18nKeyAndLabel('lowcoder:status_legend.error', 'Error'),
  preparing: getTranslationFromI18nKeyAndLabel('lowcoder:status_legend.preparing', 'Preparing'),
};

export const StatusLegend: React.FC<{ id?: string }> = ({ id }) => (
  <div className="gba:mt-3 gba:flex gba:flex-wrap gba:gap-3" data-testid={id ? `${id}-status-legend` : 'status-legend'}>
    {(Object.keys(pillTypeColorMap) as PillType[]).map((type) => (
      <div key={type} className="gba:flex gba:items-center gba:gap-2">
        <span
          aria-hidden="true"
          className="gba:inline-block gba:h-3 gba:w-3 gba:rounded-full"
          style={{ backgroundColor: pillTypeColorMap[type] }}
        />
        <span className="gba:text-xs gba:text-muted-foreground">{pillTypeLabelMap[type]}</span>
      </div>
    ))}
  </div>
);

// Expose color map globally for charts that need to resolve colors without importing maps everywhere
if (typeof window !== 'undefined') {
  (window as any).__nw_pill_colors = pillTypeColorMap;
}

export default StatusLegend;


