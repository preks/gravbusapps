import React, { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

export interface KPICardProps {
  title: string;
  value: string | number;
  trend?: number;
  trendDirection?: 'up' | 'down' | 'stable';
  isLoading?: boolean;
  icon?: ReactNode;
  description?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  trend,
  trendDirection = 'stable',
  isLoading = false,
  icon,
  description,
}) => {
  const getTrendColor = () => {
    if (trendDirection === 'up') return 'gba:text-green-600';
    if (trendDirection === 'down') return 'gba:text-red-600';
    return 'gba:text-gray-600';
  };

  const getTrendIcon = () => {
    if (trendDirection === 'up') return <TrendingUp className="gba:w-3 gba:h-3" />;
    if (trendDirection === 'down') return <TrendingDown className="gba:w-3 gba:h-3" />;
    return <ArrowRight className="gba:w-3 gba:h-3" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0 gba:pb-2">
          <CardTitle className="gba:text-sm gba:font-medium">{title}</CardTitle>
          {icon && <span className="gba:text-lg">{icon}</span>}
        </CardHeader>
        <CardContent>
          <div className="gba:animate-pulse">
            <div className="gba:h-8 gba:bg-gray-200 gba:rounded gba:mb-2"></div>
            <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-20"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid={`kpi-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0 gba:pb-2">
        <CardTitle className="gba:text-sm gba:font-medium">{title}</CardTitle>
        {icon && <span className="gba:text-lg">{icon}</span>}
      </CardHeader>
      <CardContent>
        <div className="gba:text-2xl gba:font-bold">{value}</div>
        {trend !== undefined && (
          <p className={`gba:text-xs gba:flex gba:items-center gba:mt-1 ${getTrendColor()}`}>
            <span className="gba:mr-1 gba:flex gba:items-center">{getTrendIcon()}</span>
            {Math.abs(trend)}%{' '}
            {getTranslationFromI18nKeyAndLabel(
              'services.analytics.fromLastPeriod',
              'from last period'
            )}
          </p>
        )}
        {description && (
          <p className="gba:text-xs gba:text-gray-500 gba:mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};
