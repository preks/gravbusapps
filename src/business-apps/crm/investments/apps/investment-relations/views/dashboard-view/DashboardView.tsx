import { MODULE_COLORS } from '@/common/constants/ui';
import React, { useState } from 'react';
import { Alert, AlertTitle, AlertDescription, Button, Spinner } from '@newwork/nw-design-system';
import { Home, PieChart as PieChartIcon, LineChart } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { PipelineInfo, DateRange } from './types/dashboardTypes';
import { useOverviewData } from './hooks/useOverviewData';
import EmptyState from '@/components/empty-state/EmptyState';
import { formatCurrency } from './utils/dashboardUtils';
import { DashboardLayout } from '@/common/components/common-relations/view-layouts/dashboard-layout/DashboardLayout';
import { OverviewTabLayout } from '@/common/components/common-relations/view-layouts/dashboard-layout/overview/OverviewTabLayout';
import { PipelineTabLayout } from '@/common/components/common-relations/view-layouts/dashboard-layout/pipeline/PipelineTabLayout';
import { PipelineFunnel as OverviewPipelineFunnel } from '@/common/components/common-relations/view-layouts/dashboard-layout/overview/widgets/PipelineFunnel';
import { LeadSourceChart } from '@/common/components/common-relations/view-layouts/dashboard-layout/overview/widgets/LeadSourceChart';
import { RecordSummary } from '@/common/components/common-relations/view-layouts/dashboard-layout/overview/widgets/RecordSummary';
import { TaskSummary } from '@/common/components/common-relations/view-layouts/dashboard-layout/overview/widgets/TaskSummary';
import { ActivitySummary } from '@/common/components/common-relations/view-layouts/dashboard-layout/overview/widgets/ActivitySummary';
import { DealSummary } from '@/common/components/common-relations/view-layouts/dashboard-layout/overview/widgets/DealSummary';
import { OpportunityFunnel } from '@/common/components/common-relations/view-layouts/dashboard-layout/pipeline/widgets/OpportunityFunnel';
import { ActivityVolume } from '@/common/components/common-relations/view-layouts/dashboard-layout/pipeline/widgets/ActivityVolume';
import { ConversionPerformance } from '@/common/components/common-relations/view-layouts/dashboard-layout/pipeline/widgets/ConversionPerformance';
import { PerformanceLeaderboard } from '@/common/components/common-relations/view-layouts/dashboard-layout/pipeline/widgets/PerformanceLeaderboard';
import { PipelineStatistics } from '@/common/components/common-relations/view-layouts/dashboard-layout/pipeline/widgets/PipelineStatistics';
import { usePipelineData } from './hooks/usePipelineData';

export interface DashboardViewProps extends BusinessAppContextProps {
  pipelines: PipelineInfo[];
  dateRange: DateRange;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  pipelines,
  dateRange,
  ...context
}) => {
  const moduleVariant = MODULE_COLORS.IRM;
  const [activeTab] = useState<string>('overview');
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>(
    pipelines.length > 0 ? pipelines[0].id : ''
  );

  const { overviewData, isLoading, error, refetch } = useOverviewData(
    context,
    pipelines,
    dateRange
  );

  // Tab state is handled in DashboardLayout; keep only initial tab value

  const handlePipelineChange = (pipelineId: string) => {
    setSelectedPipelineId(pipelineId);
  };

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);

  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
        <div className="gba:text-center">
          <Spinner size="lg" />
          <div className="gba:mt-4 gba:text-gray-600">
            Loading dashboard data...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" className="gba:shadow-sm">
          <AlertTitle>Error Loading Dashboard Data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button size="sm" onClick={refetch} variant="default">
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <DashboardLayout
      dataTestId="dashboard-view"
      initialTab={activeTab}
      tabs={[
        {
          key: 'overview',
          dataTestId: 'overview-dashboard-tab',
          label: (
            <>
              <Home className="gba:mr-2 gba:h-4 gba:w-4" />
              Overview
            </>
          ),
          content: !overviewData ? (
            <EmptyState title="No Overview Data" description="Unable to load overview data" />
          ) : (
            <OverviewTabLayout
              left={(
                <OverviewPipelineFunnel
                  aggregatedFunnel={overviewData.aggregatedFunnel}
                  variant={moduleVariant}
                />
              )}
              center={(
                <LeadSourceChart items={overviewData.revenueBySource} totalLeads={overviewData.totalRevenue} variant={moduleVariant} />
              )}
              right={(
                <RecordSummary records={overviewData.recentRecords} variant={moduleVariant} />
              )}
              bottomLeft={(
                <TaskSummary tasks={overviewData.activeTasks.map(t => ({
                  id: t.id,
                  name: t.name,
                  description: t.description,
                  assignedTo: t.assignedTo,
                  relatedTo: t.relatedTo,
                  dueDate: t.dueDate ?? undefined,
                  isOverdue: t.isOverdue,
                  priority: t.priority,
                  status: t.status,
                }))} />
              )}
              bottomRight={(
                <ActivitySummary activities={overviewData.todaysActivities.map(a => ({
                  id: a.id,
                  title: a.title,
                  type: a.type,
                  owner: a.owner,
                  relatedTo: a.relatedTo,
                  createdAt: a.createdAt,
                  completedAt: a.completedAt ?? undefined,
                }))} />
              )}
              bottomFull={(
                <DealSummary deals={overviewData.keyDeals} />
              )}
            />
          )
        },
        {
          key: 'pipeline-details',
          dataTestId: 'pipeline-details-dashboard-tab',
          label: (
            <>
              <PieChartIcon className="gba:mr-2 gba:h-4 gba:w-4" />
              Pipeline Details
            </>
          ),
          content: (
            pipelines.length === 0 ? (
              <EmptyState title="No Pipelines Available" description="Configure sales pipelines to see detailed analytics" />
            ) : !selectedPipeline ? (
              <EmptyState title="Select Pipeline" description="Choose a pipeline to view detailed analytics" />
            ) : (
              <PipelineDetailsContent
                {...context}
                pipeline={selectedPipeline}
                pipelines={pipelines}
                selectedPipelineId={selectedPipelineId}
                onPipelineChange={handlePipelineChange}
                dateRange={dateRange}
              />
            )
          )
        }
      ]}
    />
  );
};

interface PipelineDetailsContentProps extends BusinessAppContextProps {
  pipeline: PipelineInfo;
  pipelines: PipelineInfo[];
  selectedPipelineId: string;
  onPipelineChange: (id: string) => void;
  dateRange: DateRange;
}

const PipelineDetailsContent: React.FC<PipelineDetailsContentProps> = ({ accessToken, userInfo, additionalData, pipeline, pipelines, selectedPipelineId, onPipelineChange, dateRange }) => {
  const context = { accessToken, userInfo, additionalData } as BusinessAppContextProps;
  const { pipelineData, isLoading, error, refetch } = usePipelineData(context, pipeline, dateRange);

  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
        <div className="gba:text-center">
          <Spinner size="lg" />
          <div className="gba:mt-4 gba:text-gray-600">
            Loading {pipeline.name} data...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" className="gba:shadow-sm">
          <AlertTitle>Error Loading Pipeline Data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button size="sm" onClick={refetch} variant="default">
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  if (!pipelineData) {
    return (
      <EmptyState title="No Pipeline Data" description="Unable to load data for this pipeline" />
    );
  }

  const { metrics, winRateMetrics, activityVolume, funnelData, leaderboard } = pipelineData;

  return (
    <PipelineTabLayout
      headerLeft={(
        <div className="gba:p-3 gba:rounded-xl gba:shadow-sm gba:bg-blue-100">
          <LineChart className="gba:h-6 gba:w-6 gba:text-blue-600" />
        </div>
      )}
      pipelineTitle={pipeline.name}
      pipelineDescription={pipeline.description}
      pipelines={pipelines.map(p => ({ id: p.id, name: p.name }))}
      selectedPipelineId={selectedPipelineId}
      onPipelineChange={onPipelineChange}
      pipelineHeaderBadges={[
        { label: `${metrics.totalOpportunities} opportunities`, variant: 'secondary' },
        { label: `${formatCurrency(metrics.totalValue)}`, variant: 'default' },
        { label: `${metrics.conversionRate.toFixed(1)}% conversion`, variant: 'outline' }
      ]}
      metrics={<PipelineStatistics pipelineId={pipeline.id} metrics={{ totalValue: metrics.totalValue, avgDealSize: metrics.avgDealSize, conversionRate: metrics.conversionRate, avgSalesCycle: metrics.avgSalesCycle }} />}
      leftTop={<OpportunityFunnel funnelData={funnelData} pipelineId={pipeline.id} />} 
      leftBottom={<ConversionPerformance winRateMetrics={winRateMetrics} pipelineId={pipeline.id} />}
      rightTop={<ActivityVolume activityVolume={activityVolume} pipelineId={pipeline.id} />}
      rightBottom={<PerformanceLeaderboard leaderboard={leaderboard} pipelineId={pipeline.id} />}
    />
  );
}

export default DashboardView;

