import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useFlowAnalytics, useFlowManagementAnalytics, useTemplatePerformanceAnalytics } from '../../../../hooks/useManagerAnalytics';
import { TimeframeSelector, LoadingSpinner } from './shared';

/**
 * Request Analytics Dashboard - Detailed request performance and bottleneck analysis
 */
export interface FlowAnalyticsDashboardProps extends BusinessAppContextProps {}

export const FlowAnalyticsDashboard: React.FC<FlowAnalyticsDashboardProps> = ({
  accessToken,
  userInfo,
}) => {
  const [timeframe, setTimeframe] = useState<'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom'>('wtd');

  const { data: flowData, isLoading: flowLoading } = useFlowAnalytics({
    accessToken,
    userInfo,
    params: { timeframe },
  });

  const { data: managementData, isLoading: managementLoading } = useFlowManagementAnalytics({
    accessToken,
    userInfo,
    params: { timeframe },
  });

  const { data: templateData, isLoading: templateLoading } = useTemplatePerformanceAnalytics({
    accessToken,
    userInfo,
    params: { timeframe, limit: 10 },
  });

  // Debug logging to see actual data structure
  console.log('[FlowAnalyticsDashboard] Debug - API Data:', {
    flowData: flowData?.data,
    managementData: managementData?.data,
    templateData: templateData?.data
  });

  if (flowLoading || managementLoading || templateLoading) {
    return <LoadingSpinner message="Loading request analytics..." />;
  }

  return (
    <div className="gba:space-y-6" data-testid="flow-analytics-dashboard">
      {/* Header with Timeframe Selector */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">
            {getTranslationFromI18nKeyAndLabel('services.analytics.flow.title', 'Request Analytics')}
          </h3>
          <p className="gba:text-sm gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel('services.analytics.flow.description', 'Request performance, efficiency metrics, and bottleneck analysis')}
          </p>
        </div>
        <TimeframeSelector value={timeframe} onChange={setTimeframe} />
      </div>

      {/* Request Metrics Overview */}
      <div className="gba:grid gba:grid-cols-3 gba:gap-4">
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel('services.analytics.flow.totalFlows', 'Total Requests')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:text-3xl gba:font-bold">
              {flowData?.data?.businessKpis?.totalWorkflows || 0}
            </div>
            <p className="gba:text-sm gba:text-gray-500 gba:mt-1">
              {managementData?.data?.statusMetrics?.completed_workflows || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel('services.analytics.flow.successRate', 'Success Rate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:text-3xl gba:font-bold gba:text-green-600">
              {flowData?.data?.businessKpis?.completionRate || 0}%
            </div>
            <p className="gba:text-sm gba:text-gray-500 gba:mt-1">
              {getTranslationFromI18nKeyAndLabel('services.analytics.flow.completionRate', 'Completion rate')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel('services.analytics.flow.activeFlows', 'Active Requests')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:text-3xl gba:font-bold gba:text-blue-600">
              {managementData?.data?.statusMetrics?.pending_workflows || 0}
            </div>
            <p className="gba:text-sm gba:text-gray-500 gba:mt-1">
              {getTranslationFromI18nKeyAndLabel('services.analytics.flow.currentlyRunning', 'Currently running')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Request Efficiency & Bottlenecks */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel('services.analytics.flow.efficiency', 'Request Efficiency')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:text-3xl gba:font-bold gba:mb-4 gba:text-blue-600">
              {managementData?.data?.statusMetrics?.workflow_completion_rate || 0}%
            </div>
            <div className="gba:space-y-2">
              <h4 className="gba:font-medium gba:text-gray-900 gba:mb-2">
                {getTranslationFromI18nKeyAndLabel('services.analytics.flow.recommendations', 'Recommendations')}
              </h4>
              {flowData?.data?.optimizationRecommendations?.slice(0, 3)?.map((rec, index) => (
                <div key={index} className="gba:text-sm gba:text-gray-600 gba:flex gba:items-start">
                  <span className={`gba:w-2 gba:h-2 gba:rounded-full gba:mt-2 gba:mr-2 gba:flex-shrink-0 ${
                    rec.priority === 1 ? 'gba:bg-red-500' :
                    rec.priority === 2 ? 'gba:bg-yellow-500' :
                    'gba:bg-green-500'
                  }`} />
                  {rec.recommendation}
                </div>
              )) || (
                <p className="gba:text-sm gba:text-gray-500">
                  {getTranslationFromI18nKeyAndLabel('services.analytics.flow.noRecommendations', 'No recommendations available')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel('services.analytics.flow.bottlenecks', 'Current Bottlenecks')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-3">
              {flowData?.data?.performanceMetrics?.bottlenecks?.map((bottleneck, index) => (
                <div key={index} className="gba:flex gba:justify-between gba:items-center gba:p-3 gba:border gba:rounded-lg">
                  <div className="gba:flex-1">
                    <span className="gba:font-medium gba:text-gray-900">{bottleneck.component}</span>
                    <p className="gba:text-sm gba:text-gray-500">
                      {bottleneck.description}
                    </p>
                  </div>
                  <span className={`gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium ${
                    bottleneck.severity === 'High' ? 'gba:bg-red-100 gba:text-red-800' :
                    bottleneck.severity === 'Medium' ? 'gba:bg-yellow-100 gba:text-yellow-800' :
                    'gba:bg-green-100 gba:text-green-800'
                  }`}>
                    {bottleneck.severity} impact
                  </span>
                </div>
              )) || (
                <p className="gba:text-sm gba:text-gray-500 gba:text-center gba:py-4">
                  {getTranslationFromI18nKeyAndLabel('services.analytics.flow.noBottlenecks', 'No bottlenecks detected')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Template Performance Chart */}
      {templateData?.data?.templates && templateData.data?.templates?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel('services.analytics.flow.templatePerformance', 'Template Performance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={templateData.data?.templates?.slice(0, 8) || []}>
                <XAxis 
                  dataKey="templateName" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip />
                <Bar 
                  dataKey="completionRate" 
                  fill="#3b82f6" 
                  name="Completion Rate (%)"
                />
                <Bar 
                  dataKey="totalWorkflows" 
                  fill="#10b981" 
                  name="Total Workflows"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Template Details Table */}
      {templateData?.data?.templates && templateData.data?.templates?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel('services.analytics.flow.templateDetails', 'Template Details')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:overflow-x-auto">
              <table className="gba:w-full gba:text-sm">
                <thead>
                  <tr className="gba:border-b">
                    <th className="gba:text-left gba:p-2">
                      {getTranslationFromI18nKeyAndLabel('services.analytics.flow.template', 'Template')}
                    </th>
                    <th className="gba:text-right gba:p-2">
                      {getTranslationFromI18nKeyAndLabel('services.analytics.flow.totalWorkflows', 'Total')}
                    </th>
                    <th className="gba:text-right gba:p-2">
                      {getTranslationFromI18nKeyAndLabel('services.analytics.flow.completed', 'Completed')}
                    </th>
                    <th className="gba:text-right gba:p-2">
                      {getTranslationFromI18nKeyAndLabel('services.analytics.flow.avgDuration', 'Avg Duration')}
                    </th>
                    <th className="gba:text-right gba:p-2">
                      {getTranslationFromI18nKeyAndLabel('services.analytics.flow.successRate', 'Success Rate')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {templateData.data?.templates?.slice(0, 10)?.map((template) => (
                    <tr key={template.templateId} className="gba:border-b">
                      <td className="gba:p-2 gba:font-medium">{template.templateName || 'N/A'}</td>
                      <td className="gba:p-2 gba:text-right">{template.totalWorkflows || 0}</td>
                      <td className="gba:p-2 gba:text-right">{template.completedWorkflows || 0}</td>
                      <td className="gba:p-2 gba:text-right">{(template.avgCycleTime || 0).toFixed(1)}h</td>
                      <td className="gba:p-2 gba:text-right">
                        <span className={`gba:font-medium ${
                          (template.completionRate || 0) > 90 ? 'gba:text-green-600' :
                          (template.completionRate || 0) > 70 ? 'gba:text-yellow-600' :
                          'gba:text-red-600'
                        }`}>
                          {(template.completionRate || 0).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  )) || []}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
