import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { 
  FlowAnalyticsResponse, 
  TaskPerformanceAnalyticsResponse, 
  FlowManagementAnalyticsResponse 
} from '../../../../../types/managerAnalytics';

export interface QuickInsightsProps {
  flowData: FlowAnalyticsResponse | null;
  taskData: TaskPerformanceAnalyticsResponse | null;
  managementData: FlowManagementAnalyticsResponse | null;
  isLoading: boolean;
}

export const QuickInsights: React.FC<QuickInsightsProps> = ({
  flowData,
  taskData,
  managementData,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel('services.analytics.insights.title', 'Quick Insights')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:animate-pulse gba:space-y-3">
            <div className="gba:h-4 gba:bg-gray-200 gba:rounded"></div>
            <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-3/4"></div>
            <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const insights = [];

  // Flow completion insights
  if (flowData?.data?.businessKpis) {
    const { totalWorkflows, completionRate } = flowData.data.businessKpis;
    if (completionRate > 90) {
      insights.push({
        type: 'success',
        message: getTranslationFromI18nKeyAndLabel(
          'services.analytics.insights.highSuccess',
          `Excellent performance! ${completionRate}% completion rate with ${totalWorkflows} workflows.`
        ),
      });
    } else if (completionRate < 70) {
      insights.push({
        type: 'warning',
        message: getTranslationFromI18nKeyAndLabel(
          'services.analytics.insights.lowSuccess',
          `Completion rate of ${completionRate}% needs attention. Consider reviewing bottlenecks.`
        ),
      });
    }
  }

  // Task performance insights
  if (taskData?.data?.userProductivity?.length > 0) {
    const avgProductivity = taskData.data.userProductivity.reduce((sum, user) => sum + user.productivityScore, 0) / taskData.data.userProductivity.length;
    if (avgProductivity > 1000) {
      insights.push({
        type: 'success',
        message: getTranslationFromI18nKeyAndLabel(
          'services.analytics.insights.highEfficiency',
          'Team productivity is excellent! Your team is performing exceptionally well.'
        ),
      });
    } else if (avgProductivity < 100) {
      insights.push({
        type: 'warning',
        message: getTranslationFromI18nKeyAndLabel(
          'services.analytics.insights.lowEfficiency',
          'Team productivity could be improved. Consider reviewing workflows and bottlenecks.'
        ),
      });
    }
  }

  // Bottleneck insights
  if (flowData?.data?.performanceMetrics?.bottlenecks && flowData.data.performanceMetrics.bottlenecks.length > 0) {
    const highImpactBottlenecks = flowData.data.performanceMetrics.bottlenecks.filter(b => b.severity === 'High');
    if (highImpactBottlenecks.length > 0) {
      insights.push({
        type: 'error',
        message: getTranslationFromI18nKeyAndLabel(
          'services.analytics.insights.bottlenecks',
          `${highImpactBottlenecks.length} high-impact bottleneck(s) detected: ${highImpactBottlenecks.map(b => b.stepName).join(', ')}.`
        ),
      });
    }
  }

  // Active flows insight
  if (flowData?.data?.operationalMetrics?.activeFlows) {
    const activeFlows = flowData.data.operationalMetrics.activeFlows;
    if (activeFlows > 50) {
      insights.push({
        type: 'info',
        message: getTranslationFromI18nKeyAndLabel(
          'services.analytics.insights.highActivity',
          `High activity period with ${activeFlows} active flows currently in progress.`
        ),
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      type: 'info',
      message: getTranslationFromI18nKeyAndLabel(
        'services.analytics.insights.noInsights',
        'All systems operating normally. No critical insights at this time.'
      ),
    });
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="gba:w-5 gba:h-5 gba:text-green-600" />;
      case 'warning': return <AlertTriangle className="gba:w-5 gba:h-5 gba:text-yellow-600" />;
      case 'error': return <AlertCircle className="gba:w-5 gba:h-5 gba:text-red-600" />;
      default: return <Info className="gba:w-5 gba:h-5 gba:text-blue-600" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'success': return 'gba:text-green-700 gba:bg-green-50 gba:border-green-200';
      case 'warning': return 'gba:text-yellow-700 gba:bg-yellow-50 gba:border-yellow-200';
      case 'error': return 'gba:text-red-700 gba:bg-red-50 gba:border-red-200';
      default: return 'gba:text-blue-700 gba:bg-blue-50 gba:border-blue-200';
    }
  };

  return (
    <Card data-testid="quick-insights">
      <CardHeader>
        <CardTitle>
          {getTranslationFromI18nKeyAndLabel('services.analytics.insights.title', 'Quick Insights')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-3">
          {insights.slice(0, 4).map((insight, index) => (
            <div
              key={index}
              className={`gba:p-3 gba:rounded-lg gba:border gba:flex gba:items-start gba:space-x-3 ${getInsightColor(insight.type)}`}
            >
              <span className="gba:text-lg gba:flex-shrink-0">{getInsightIcon(insight.type)}</span>
              <p className="gba:text-sm gba:flex-1">{insight.message}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
