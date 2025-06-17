import React from "react";
import YearComparisonSection from "./YearComparisonSection";
import WorkPatternsSection from "./WorkPatternsSection";
import "../styles/statisticsTab.css";

const monthlyUsage = [2, 1, 3, 0, 4, 2, 8, 5, 3, 1, 2, 4];
const daysOfWeek = [5, 2, 3, 4, 6, 0, 0];

export const StatisticsTab: React.FC = () => (
  <div className="gba:statisticsRoot" data-testid="statistics-tab">
    <div className="gba:statisticsSection">
      <h3 className="gba:statisticsSectionTitle">Key Insights</h3>
      <section className="gba:statisticsKeyInsights">
        <div className="gba:insightCard gba:insightCard--blue">
          <div className="gba:insightValue">68%</div>
          <div className="gba:insightTitle">Planned Absences</div>
          <div className="gba:insightSub">vs 32% unplanned (sick leave)</div>
        </div>
        <div className="gba:insightCard gba:insightCard--green">
          <div className="gba:insightValue">2.3</div>
          <div className="gba:insightTitle">Avg Days per Request</div>
          <div className="gba:insightSub">Efficient leave planning</div>
        </div>
        <div className="gba:insightCard gba:insightCard--purple">
          <div className="gba:insightValue">95%</div>
          <div className="gba:insightTitle">Approval Rate</div>
          <div className="gba:insightSub">Excellent planning & timing</div>
        </div>
      </section>
    </div>
    <div className="gba:statisticsSection">
      <section className="gba:statisticsTrends">
        <h3 className="gba:statisticsSectionTitle">Usage Trends & Patterns</h3>
        <div className="gba:statisticsSubTitle">
          Your absence patterns over time
        </div>
        <div className="gba:statisticsSubSection">
          <div className="gba:statisticsSubSectionTitle">
            Monthly Usage (2025)
          </div>
          <div className="gba:statisticsMonthlyBarChart">
            {monthlyUsage.map((val, i) => (
              <div className="gba:monthlyBarCol" key={i}>
                <div className="gba:monthlyBarBg">
                  <div
                    className="gba:monthlyBarFg"
                    style={{ height: `${val * 12}px` }}
                  />
                </div>
                <div className="gba:monthlyBarMonth">
                  {
                    [
                      "Jan",
                      "Feb",
                      "Mar",
                      "Apr",
                      "May",
                      "Jun",
                      "Jul",
                      "Aug",
                      "Sep",
                      "Oct",
                      "Nov",
                      "Dec",
                    ][i]
                  }
                </div>
                <div className="gba:monthlyBarValue">{val}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="gba:statisticsSubSection">
          <div className="gba:statisticsSubSectionTitle">
            Day of Week Preferences
          </div>
          <div className="gba:statisticsWeekBarChart">
            {daysOfWeek.map((val, i) => (
              <div className="gba:weekBarCol" key={i}>
                <div className="gba:weekBarBg">
                  <div
                    className="gba:weekBarFg"
                    style={{ height: `${val * 12}px` }}
                  />
                </div>
                <div className="gba:weekBarDay">
                  {[
                    "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
                  ][i]}
                </div>
                <div className="gba:weekBarValue">{val} days</div>
              </div>
            ))}
          </div>
          <div className="gba:weekBarNote">
            Most common: Friday (30% of all absences)
          </div>
        </div>
      </section>
    </div>
    <div className="gba:statisticsGrid">
      <div className="gba:statisticsSection gba:statisticsSection--half">
        <YearComparisonSection />
      </div>
      <div className="gba:statisticsSection gba:statisticsSection--half">
        <WorkPatternsSection />
      </div>
    </div>
  </div>
);

export default StatisticsTab;
