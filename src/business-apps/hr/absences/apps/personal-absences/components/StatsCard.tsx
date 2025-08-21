import React from "react";
import { Card, Progress, Badge } from "@newwork/nw-design-system";
import type { StatsCardProps } from "../types/absenceTypes";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { Calendar, TrendingUp } from "lucide-react";

export const StatsCard = ({ stat }: StatsCardProps) => {
  const { title, used, total, progress, daysLeft, color, checkEntitlement } =
    stat as any;

  // Calculate progress percentage and status
  const progressPercentage = progress || (total && total > 0 ? Math.round((used || 0) / total * 100) : 0);
  
  const getStatusBadge = () => {
    if (checkEntitlement === false) {
      return <Badge variant="outline" className="gba:text-xs">Unlimited</Badge>;
    }
    if (!total) return null;
    const usagePercent = (used || 0) / total;
    if (usagePercent >= 1) return <Badge variant="destructive" className="gba:text-xs">Exhausted</Badge>;
    if (usagePercent >= 0.9) return <Badge variant="destructive" className="gba:text-xs">Critical</Badge>;
    if (usagePercent >= 0.75) return <Badge variant="secondary" className="gba:text-xs">Low</Badge>;
    return <Badge variant="default" className="gba:text-xs">Available</Badge>;
  };

  const getProgressColor = () => {
    if (checkEntitlement === false) return 'var(--nw-color-primary-500)';
    if (!total) return 'var(--nw-color-neutral-500)';
    const usagePercent = (used || 0) / total;
    if (usagePercent >= 0.9) return 'var(--nw-color-danger-500)';
    if (usagePercent >= 0.75) return 'var(--nw-color-warning-500)';
    return 'var(--nw-color-success-500)';
  };

  // Unified modern card design
  return (
    <Card className="gba:p-4 gba:space-y-3 gba:hover:shadow-md gba:transition-all gba:duration-200" data-testid="stats-card">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-2">
          <div 
            className="gba:w-8 gba:h-8 gba:rounded-lg gba:flex gba:items-center gba:justify-center gba:flex-shrink-0" 
            style={{ 
              backgroundColor: color ? (color.startsWith("#") ? `${color}20` : `#${color}20`) : 'var(--nw-color-primary-100)'
            }}
          >
            <Calendar 
              className="gba:w-4 gba:h-4" 
              style={{ 
                color: color ? (color.startsWith("#") ? color : `#${color}`) : 'var(--nw-color-primary-500)' 
              }}
            />
          </div>
          <h4 className="gba:font-medium gba:text-sm gba:text-foreground" data-testid="stats-card-title">
            {title}
          </h4>
        </div>
        {getStatusBadge()}
      </div>

      {/* Main metric */}
      <div className="gba:text-center">
        <div className="gba:text-2xl gba:font-bold gba:text-foreground" data-testid="stats-card-main-value">
          {checkEntitlement === false ? used || 0 : `${used || 0}/${total || 0}`}
        </div>
        <div className="gba:text-xs gba:text-muted-foreground">
          {checkEntitlement === false ? (
            <>
              {getTranslationFromI18nKeyAndLabel(
                used === 1 ? 'lowcoder:absence_hub.day' : 'lowcoder:absence_hub.days',
                used === 1 ? 'day' : 'days'
              )} {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.used', 'used')}
            </>
          ) : (
            <>
              {getTranslationFromI18nKeyAndLabel(
                used === 1 ? 'lowcoder:absence_hub.day' : 'lowcoder:absence_hub.days',
                used === 1 ? 'day' : 'days'
              )} • {daysLeft || 0} {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.days_left', 'left')}
            </>
          )}
        </div>
      </div>

      {/* Progress bar for limited entitlements */}
      {checkEntitlement !== false && total && (
        <Progress 
          value={progressPercentage} 
          className="gba:h-1"
          style={{
            '--progress-background': 'var(--nw-color-neutral-200)',
            '--progress-foreground': getProgressColor()
          } as React.CSSProperties}
        />
      )}
    </Card>
  );


};

export default StatsCard;
