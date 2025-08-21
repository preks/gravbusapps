import React from "react";
import { Card } from "@newwork/nw-design-system";
import YearComparisonSection from "./YearComparisonSection";
import KeyInsightsSection from "./KeyInsightsSection";
import WorkPatternsSection from "./WorkPatternsSection";
import UsageTrendsSection from "./UsageTrendsSection";

export interface StatisticsTabProps {
  absences: any[];
}

export const StatisticsTab: React.FC<StatisticsTabProps> = ({ absences }) => (
  <div className="gba:space-y-6" data-testid="statistics-tab">
    {/* Key Insights Section */}
    <div data-testid="statistics-tab-key-insights">
      <KeyInsightsSection absences={absences} />
    </div>
    
    {/* Usage Trends Section */}
    <Card className="gba:p-6" data-testid="statistics-tab-usage-trends">
      <UsageTrendsSection absences={absences} />
    </Card>
    
    {/* Two-column grid for Year Comparison and Work Patterns */}
    <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6" data-testid="statistics-tab-grid">
      <Card className="gba:p-6" data-testid="statistics-tab-grid-year-comparison">
        <YearComparisonSection absences={absences} />
      </Card>
      <Card className="gba:p-6" data-testid="statistics-tab-grid-work-patterns">
        <WorkPatternsSection absences={absences} />
      </Card>
    </div>
  </div>
);

export default StatisticsTab;
