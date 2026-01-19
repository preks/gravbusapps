import React from 'react'
import YearComparisonSection from './YearComparisonSection'
import KeyInsightsSection from './KeyInsightsSection'
import WorkPatternsSection from './WorkPatternsSection'
import UsageTrendsSection from './UsageTrendsSection'

export interface StatisticsTabProps {
  absences: any[]
}

export const StatisticsTab: React.FC<StatisticsTabProps> = ({ absences }) => (
  <div className="gba:statisticsRoot" data-testid="statistics-tab">
    <div className="gba:pb-6" data-testid="statistics-tab-key-insights">
      <KeyInsightsSection absences={absences} data-testid="statistics-tab-key-insights" />
    </div>
    <div className="gba:statisticsSection" data-testid="statistics-tab-usage-trends">
      <UsageTrendsSection absences={absences} data-testid="statistics-tab-usage-trends" />
    </div>
    <div className="gba:statisticsGrid" data-testid="statistics-tab-grid">
      <div
        className="gba:statisticsSection gba:statisticsSection--half"
        data-testid="statistics-tab-grid-year-comparison"
      >
        <YearComparisonSection absences={absences} data-testid="statistics-tab-grid-year-comparison" />
      </div>
      <div
        className="gba:statisticsSection gba:statisticsSection--half"
        data-testid="statistics-tab-grid-work-patterns"
      >
        <WorkPatternsSection absences={absences} data-testid="statistics-tab-grid-work-patterns" />
      </div>
    </div>
  </div>
)

export default StatisticsTab
