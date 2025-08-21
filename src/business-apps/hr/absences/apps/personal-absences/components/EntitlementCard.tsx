import React from "react";
import { Card, Progress, Badge } from "@newwork/nw-design-system";
import { Calendar, TrendingUp, Clock, CheckCircle } from "lucide-react";
import type { EntitlementCardProps } from "../types/entitlementTypes";
import dayjs from 'dayjs';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

const EntitlementCard: React.FC<EntitlementCardProps> = ({ entitlement }) => {
  const { type, color, used, total, pending, available, checkEntitlement } = entitlement;
  const year = dayjs().year();
  
  // Calculate progress percentage
  const progressPercentage = total && total > 0 ? Math.round((used || 0) / total * 100) : 0;
  
  // Determine status and colors
  const getStatusColor = () => {
    if (!total || checkEntitlement === false) return 'var(--nw-color-primary-500)';
    const usagePercent = (used || 0) / total;
    if (usagePercent >= 0.9) return 'var(--nw-color-danger-500)';
    if (usagePercent >= 0.75) return 'var(--nw-color-warning-500)';
    return 'var(--nw-color-success-500)';
  };
  
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

  // Unified card design for all entitlement types
  return (
    <Card className="gba:p-6 gba:space-y-4 gba:hover:shadow-lg gba:transition-all gba:duration-200" data-testid="entitlement-card">
      {/* Header with icon, title, and status badge */}
      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-3">
          <div 
            className="gba:w-10 gba:h-10 gba:rounded-lg gba:flex gba:items-center gba:justify-center gba:flex-shrink-0" 
            style={{ 
              backgroundColor: color ? (color.startsWith("#") ? `${color}20` : `#${color}20`) : 'var(--nw-color-primary-100)'
            }}
          >
            <Calendar 
              className="gba:w-5 gba:h-5" 
              style={{ 
                color: color ? (color.startsWith("#") ? color : `#${color}`) : 'var(--nw-color-primary-500)' 
              }}
            />
          </div>
          <div>
            <h4 className="gba:font-semibold gba:text-lg gba:text-foreground">{type}</h4>
            <p className="gba:text-sm gba:text-muted-foreground">
              {checkEntitlement === false ? 
                getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.unlimited_entitlement', 'Unlimited entitlement') :
                getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.entitlement_year', `${year} Entitlement`, { year })
              }
            </p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Progress section - different for unlimited vs limited entitlements */}
      {checkEntitlement === false ? (
        // Unlimited entitlement - just show usage
        <div className="gba:space-y-3">
          <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
            <span className="gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.total_usage', 'Total Usage')}
            </span>
            <span className="gba:font-medium">
              {used || 0} {getTranslationFromI18nKeyAndLabel(used === 1 ? 'lowcoder:absence_hub.day' : 'lowcoder:absence_hub.days', used === 1 ? 'day' : 'days')}
            </span>
          </div>
          
          <div className="gba:text-center gba:py-4 gba:bg-muted gba:rounded-lg">
            <div className="gba:text-3xl gba:font-bold gba:text-primary">{used || 0}</div>
            <div className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                used === 1 ? 'lowcoder:absence_hub.day' : 'lowcoder:absence_hub.days',
                used === 1 ? 'day' : 'days'
              )} {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.used', 'used')} {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.in_year', `in ${year}`, { year })}
            </div>
          </div>
        </div>
      ) : (
        // Limited entitlement - show progress and breakdown
        <div className="gba:space-y-3">
          <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
            <span className="gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.usage_progress', 'Usage Progress')}
            </span>
            <span className="gba:font-medium">
              {used || 0}/{total || 0} {getTranslationFromI18nKeyAndLabel(used === 1 ? 'lowcoder:absence_hub.day' : 'lowcoder:absence_hub.days', used === 1 ? 'day' : 'days')}
            </span>
          </div>
          
          <Progress 
            value={progressPercentage} 
            className="gba:h-2"
            style={{
              '--progress-background': 'var(--nw-color-neutral-200)',
              '--progress-foreground': getStatusColor()
            } as React.CSSProperties}
          />
          
          <div className="gba:text-xs gba:text-center gba:text-muted-foreground">
            {progressPercentage}% {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.used', 'used')}
          </div>
        </div>
      )}

      {/* Details grid - unified for both types */}
      <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:pt-2 gba:border-t">
        <div className="gba:text-center">
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:mb-1">
            <CheckCircle className="gba:w-4 gba:h-4 gba:text-success" />
            <span className="gba:text-xs gba:text-muted-foreground gba:uppercase gba:tracking-wide">
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.used', 'Used')}
            </span>
          </div>
          <div className="gba:text-lg gba:font-bold gba:text-success">{used || 0}</div>
        </div>
        
        {pending !== undefined && (
          <div className="gba:text-center">
            <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:mb-1">
              <Clock className="gba:w-4 gba:h-4 gba:text-warning" />
              <span className="gba:text-xs gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.pending', 'Pending')}
              </span>
            </div>
            <div className="gba:text-lg gba:font-bold gba:text-warning">{pending}</div>
          </div>
        )}
        
        {checkEntitlement !== false && typeof available === "number" && (
          <div className="gba:text-center">
            <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:mb-1">
              <TrendingUp className="gba:w-4 gba:h-4 gba:text-primary" />
              <span className="gba:text-xs gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.available', 'Available')}
              </span>
            </div>
            <div className="gba:text-lg gba:font-bold gba:text-primary">{available}</div>
          </div>
        )}
        
        {checkEntitlement === false && (
          <div className="gba:text-center">
            <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:mb-1">
              <TrendingUp className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <span className="gba:text-xs gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.unlimited', 'Unlimited')}
              </span>
            </div>
            <div className="gba:text-lg gba:font-bold gba:text-muted-foreground">∞</div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default EntitlementCard;
