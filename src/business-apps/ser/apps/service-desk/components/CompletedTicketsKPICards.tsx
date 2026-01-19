import React from 'react';
import { Clock, CheckCircle, TrendingUp, BarChart3 } from 'lucide-react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import type { StepInstance } from '../../../types';
import { calculateCompletedTicketsKPIs, type CompletedTicketsKPIData } from '../utils/completedTicketsKPIUtils';

// Import nw-design-system components
import { SectionKpiCards } from '@newwork/nw-design-system';

export interface CompletedTicketsKPICardsProps {
  tickets: StepInstance[];
  isLoading?: boolean;
}

export const CompletedTicketsKPICards: React.FC<CompletedTicketsKPICardsProps> = ({
  tickets,
  isLoading = false
}) => {
  const kpiData: CompletedTicketsKPIData = React.useMemo(() => {
    if (isLoading || !tickets.length) {
      return {
        averageResolutionTime: { hours: 0, formatted: '0h 0m' },
        slaComplianceRate: { percentage: 0, compliant: 0, total: 0 },
        weeklyCompletionRate: { thisWeek: 0, lastWeek: 0, changePercentage: 0, trend: 'stable' },
        peakCompletionHours: { peakHour: 9, peakHourFormatted: '9:00 AM', completionsAtPeak: 0 }
      };
    }
    return calculateCompletedTicketsKPIs(tickets);
  }, [tickets, isLoading]);

  // Convert our KPI data to the SectionKpiCards format
  const kpiCards = React.useMemo(() => {
    const getSLABadgeVariant = (percentage: number): "success" | "warning" | "destructive" | "default" => {
      if (percentage >= 90) return 'success';
      if (percentage >= 70) return 'warning';
      if (percentage < 50) return 'destructive';
      return 'default';
    };

    const getTrendData = (changePercentage: number, trend: 'up' | 'down' | 'stable') => {
      if (trend === 'stable') {
        return {
          value: '0%',
          positive: undefined,
          description: getTranslationFromI18nKeyAndLabel(
            'services.completed.kpi.weeklyCompletion.trend',
            'vs last week'
          ),
          trendIcon: 'none' as const
        };
      }
      
      return {
        value: `${changePercentage > 0 ? '+' : ''}${changePercentage}%`,
        positive: changePercentage > 0,
        description: getTranslationFromI18nKeyAndLabel(
          'services.completed.kpi.weeklyCompletion.trend',
          'vs last week'
        ),
        trendIcon: trend === 'up' ? 'up' as const : 'down' as const
      };
    };

    return [
      {
        id: 'avg-resolution-time',
        title: getTranslationFromI18nKeyAndLabel(
          'services.completed.kpi.avgResolutionTime',
          'Avg Resolution Time'
        ),
        value: kpiData.averageResolutionTime.formatted,
        icon: <Clock className="gba:w-4 gba:h-4" />,
        footer: getTranslationFromI18nKeyAndLabel(
          'services.completed.kpi.avgResolutionTime.subtitle',
          'Time to complete'
        ),
      },
      {
        id: 'sla-compliance',
        title: getTranslationFromI18nKeyAndLabel(
          'services.completed.kpi.slaCompliance',
          'SLA Compliance'
        ),
        value: kpiData.slaComplianceRate.percentage,
        suffix: '%',
        icon: <CheckCircle className="gba:w-4 gba:h-4" />,
        trend: {
          value: `${kpiData.slaComplianceRate.compliant}/${kpiData.slaComplianceRate.total}`,
          badgeVariant: getSLABadgeVariant(kpiData.slaComplianceRate.percentage),
          description: 'tasks completed on time',
          trendIcon: 'none' as const
        },
        footer: getTranslationFromI18nKeyAndLabel(
          'services.completed.kpi.slaCompliance.subtitle',
          'Tasks completed on time'
        ),
      },
      {
        id: 'weekly-completion',
        title: getTranslationFromI18nKeyAndLabel(
          'services.completed.kpi.weeklyCompletion',
          'This Week'
        ),
        value: kpiData.weeklyCompletionRate.thisWeek,
        icon: <TrendingUp className="gba:w-4 gba:h-4" />,
        trend: getTrendData(
          kpiData.weeklyCompletionRate.changePercentage,
          kpiData.weeklyCompletionRate.trend
        ),
        footer: getTranslationFromI18nKeyAndLabel(
          'services.completed.kpi.weeklyCompletion.subtitle',
          'Completed tasks'
        ),
      },
      {
        id: 'peak-hours',
        title: getTranslationFromI18nKeyAndLabel(
          'services.completed.kpi.peakHours',
          'Peak Hour'
        ),
        value: kpiData.peakCompletionHours.peakHourFormatted,
        icon: <BarChart3 className="gba:w-4 gba:h-4" />,
        footer: getTranslationFromI18nKeyAndLabel(
          'services.completed.kpi.peakHours.subtitle',
          `${kpiData.peakCompletionHours.completionsAtPeak} completions`
        ),
      },
    ];
  }, [kpiData]);

  return (
    <div className="gba:mb-6" data-testid="completed-tickets-kpi-cards">
      <SectionKpiCards cards={kpiCards} />
    </div>
  );
};
