import React from "react";
import { PipelineFunnel, AggregatedFunnelStage } from "./widgets/PipelineFunnel";
import { LeadSourceChart, LeadSourceItem } from "./widgets/LeadSourceChart";
import { RecordSummary, RecentRecordItem } from "./widgets/RecordSummary";
import { TaskSummary, TaskItem } from "./widgets/TaskSummary";
import { ActivitySummary, ActivityItem } from "./widgets/ActivitySummary";
import { DealSummary, DealItem } from "./widgets/DealSummary";

export interface OverviewTabLayoutProps {
  moduleColor?: string;
  
  // Data props for widgets
  aggregatedFunnel: AggregatedFunnelStage[];
  revenueBySource: LeadSourceItem[];
  totalRevenue: number;
  recentRecords: RecentRecordItem[];
  activeTasks: TaskItem[];
  todaysActivities: ActivityItem[];
  keyDeals: DealItem[];
}

export const OverviewTabLayout: React.FC<OverviewTabLayoutProps> = ({
  moduleColor = "default",
  aggregatedFunnel,
  revenueBySource,
  totalRevenue,
  recentRecords,
  activeTasks,
  todaysActivities,
  keyDeals,
}) => {
  return (
    <div className="gba:space-y-6">
      {/* Main Dashboard Grid */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-12 gba:xl:grid-cols-3 gba:gap-6">
        <div className="gba:lg:col-span-4 gba:xl:col-span-1">
          <PipelineFunnel 
            aggregatedFunnel={aggregatedFunnel} 
            moduleColor={moduleColor} 
          />
        </div>
        <div className="gba:lg:col-span-4 gba:xl:col-span-1">
          <LeadSourceChart 
            items={revenueBySource} 
            totalLeads={totalRevenue} 
            moduleColor={moduleColor} 
          />
        </div>
        <div className="gba:lg:col-span-4 gba:xl:col-span-1">
          <RecordSummary 
            records={recentRecords} 
            moduleColor={moduleColor} 
          />
        </div>
      </div>

      {/* Bottom Row - Tasks and Activities */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6">
        <div>
          <TaskSummary tasks={activeTasks} moduleColor={moduleColor} />
        </div>
        <div>
          <ActivitySummary activities={todaysActivities} moduleColor={moduleColor} />
        </div>
      </div>

      {/* Key Deals Section */}
      <div>
        <DealSummary deals={keyDeals} moduleColor={moduleColor} />
      </div>
    </div>
  );
};

export default OverviewTabLayout;
