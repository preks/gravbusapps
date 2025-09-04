import React from "react";

export interface OverviewTabLayoutProps {
  left: React.ReactNode;   // PipelineFunnel
  center: React.ReactNode; // LeadSourceChart
  right: React.ReactNode;  // RecordSummary
  bottomLeft: React.ReactNode;  // TaskSummary
  bottomRight: React.ReactNode; // ActivitySummary
  bottomFull: React.ReactNode;  // DealSummary
}

export const OverviewTabLayout: React.FC<OverviewTabLayoutProps> = ({
  left,
  center,
  right,
  bottomLeft,
  bottomRight,
  bottomFull,
}) => {
  return (
    <div className="gba:space-y-6">
      {/* Main Dashboard Grid */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-12 gba:xl:grid-cols-3 gba:gap-6">
        <div className="gba:lg:col-span-4 gba:xl:col-span-1">{left}</div>
        <div className="gba:lg:col-span-4 gba:xl:col-span-1">{center}</div>
        <div className="gba:lg:col-span-4 gba:xl:col-span-1">{right}</div>
      </div>

      {/* Bottom Row - Tasks and Activities */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6">
        <div>{bottomLeft}</div>
        <div>{bottomRight}</div>
      </div>

      {/* Key Deals Section */}
      <div>{bottomFull}</div>
    </div>
  );
};

export default OverviewTabLayout;
