import React from "react";

const WorkPatternsSection: React.FC = () => (
  <div data-testid="work-patterns-section">
    <h3 className="gba:statisticsSectionTitle">Work Patterns</h3>
    <div className="gba:statisticsSubTitle">
      Your consecutive work day analysis
    </div>
    <div className="gba:workPatternsCurrentStreakCard">
      <div className="gba:workPatternsCurrentStreakValue">12</div>
      <div className="gba:workPatternsCurrentStreakLabel">
        Current consecutive work days
      </div>
      <div className="gba:workPatternsCurrentStreakSub">
        Since last time off
      </div>
    </div>
    <div className="gba:workPatternsStats">
      <div className="gba:workPatternsStat">
        <div className="gba:workPatternsStatRow">
          <div className="gba:workPatternsStatLabel">Longest Streak (2025)</div>
          <span className="gba:workPatternsStatValue gba:workPatternsStatValue--red">
            45
          </span>
        </div>
        <div className="gba:workPatternsStatRow">
          <div className="gba:workPatternsStatSub">March 1 - April 15</div>
          <span className="gba:workPatternsStatUnit">days</span>
        </div>
      </div>
      <div className="gba:workPatternsStat">
        <div className="gba:workPatternsStatRow">
          <div className="gba:workPatternsStatLabel">Average Streak</div>
          <span className="gba:workPatternsStatValue gba:workPatternsStatValue--blue">
            18
          </span>
        </div>
        <div className="gba:workPatternsStatRow">
          <div className="gba:workPatternsStatSub">Typical work period</div>
          <span className="gba:workPatternsStatUnit">days</span>
        </div>
      </div>
      <div className="gba:workPatternsStat">
        <div className="gba:workPatternsStatRow">
          <div className="gba:workPatternsStatLabel">Shortest Break</div>
          <span className="gba:workPatternsStatValue gba:workPatternsStatValue--green">
            1
          </span>
        </div>
        <div className="gba:workPatternsStatRow">
          <div className="gba:workPatternsStatSub">Between work periods</div>
          <span className="gba:workPatternsStatUnit">day</span>
        </div>
      </div>
    </div>
    <div className="gba:workPatternsRecommendation">
      <div className="gba:workPatternsRecommendationIcon">⚠️</div>
      <div className="gba:workPatternsRecommendationText">
        <span className="gba:workPatternsRecommendationTitle">
          Recommendation
        </span>
        <span className="gba:workPatternsRecommendationBody">
          Consider taking a break soon. Your current streak of 12 days is
          approaching your average of 18 days.
        </span>
      </div>
    </div>
  </div>
);

export default WorkPatternsSection;
