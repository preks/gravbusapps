import React from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

export interface KpiCardProps extends BusinessAppContextProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  kpiKey: string;
  subLabel?: string;
  accentColor: string;
  active?: boolean;
  onClick?: () => void;
  'data-testid'?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({
  icon,
  value,
  label,
  kpiKey,
  subLabel,
  accentColor,
  active = false,
  onClick,
  'data-testid': dataTestid,
}) => {
  return (
    <div
      tabIndex={0}
      role="button"
      aria-pressed={active}
      className={[
        'gba:relative',
        'gba:w-[200px] gba:min-h-[120px] gba:p-6',
        'gba:rounded-2xl',
        'gba:border gba:border-l-[8px] gba:shadow-md',
        active ? 'gba:bg-gray-50' : 'gba:bg-white',
        'gba:cursor-pointer gba:transition-all gba:outline-none',
        'hover:gba:shadow-lg',
        'focus:gba:ring-2 focus:gba:ring-ring',
      ].join(' ')}
      onClick={onClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
      data-testid={dataTestid}
      style={{
        border: '1px solid #e5e7eb',
        // borderLeftColor: accentColor,
      }}
    >
      <div>
        <div
          className="gba:text-sm gba:text-muted-foreground"
          data-testid={`${dataTestid}-label`}
        >
          {getTranslationFromI18nKeyAndLabel(label, label)}
        </div>
        <div
          className="gba:text-4xl gba:font-bold gba:text-card-foreground gba:my-1"
          data-testid={`${dataTestid}-value`}
        >
          {value}
        </div>
        {subLabel && (
          <div
            className="gba:text-sm gba:text-muted-foreground"
            data-testid={`${dataTestid}-sublabel`}
          >
            {getTranslationFromI18nKeyAndLabel(subLabel, subLabel)}
          </div>
        )}
      </div>
      <div
        className="gba:absolute gba:top-6 gba:right-6 gba:text-2xl"
        data-testid={`${dataTestid}-icon`}
        style={{ color: accentColor }}
      >
        {(kpiKey === 'all' || kpiKey === 'tenure') && icon}
      </div>
    </div>
  );
};

export default KpiCard;
