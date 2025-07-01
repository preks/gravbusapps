import React from 'react';
import { Card } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface KpiCardProps extends BusinessAppContextProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  kpiKey: string;
  subLabel?: string;
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
  active = false,
  onClick,
  'data-testid': dataTestid,
}) => {
  return (
    <Card
      hoverable
      className={`gba:h-full ${active ? 'gba:bg-gray-100' : ''}`}
      onClick={onClick}
      data-testid={dataTestid}
    >
      <div className="gba:flex gba:flex-col gba:gap-1">
        <div className="gba:text-sm gba:text-gray-500">{label}</div>
        <div className="gba:flex gba:items-center">
          {(kpiKey === 'all' || kpiKey === 'tenure') && (
            <div className="gba:text-2xl gba:text-gray-400 gba:mr-2">
              {icon}
            </div>
          )}
          <div className="gba:text-2xl gba:font-bold">{value}</div>
        </div>
        {subLabel && (
          <div className="gba:text-sm gba:text-gray-500">{subLabel}</div>
        )}
      </div>
    </Card>
  );
};

export default KpiCard;
