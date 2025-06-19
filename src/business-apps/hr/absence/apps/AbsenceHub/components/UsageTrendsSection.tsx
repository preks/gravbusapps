import React from "react";
import dayjs from "dayjs";

interface UsageTrendsSectionProps {
  absences: any[];
}

const months = [
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
];
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonthlyUsage(absences: any[], year: number) {
  const usage = Array(12).fill(0);
  absences.forEach((a) => {
    if (!a.startDate) return;
    const date = dayjs(a.startDate);
    if (date.year() === year) {
      usage[date.month()] += 1;
    }
  });
  return usage;
}

function getDayOfWeekUsage(absences: any[]) {
  const usage = Array(7).fill(0);
  absences.forEach((a) => {
    if (!a.startDate) return;
    const date = dayjs(a.startDate);
    usage[date.day() === 0 ? 6 : date.day() - 1] += 1;
  });
  return usage;
}

const UsageTrendsSection: React.FC<UsageTrendsSectionProps> = ({
  absences,
}) => {
  const currentYear = dayjs().year();
  const monthlyUsage = getMonthlyUsage(absences, currentYear);
  const dayOfWeekUsage = getDayOfWeekUsage(absences);
  const maxDay = Math.max(...dayOfWeekUsage);
  const mostCommonIdx = dayOfWeekUsage.findIndex((v) => v === maxDay);
  const total = dayOfWeekUsage.reduce((a, b) => a + b, 0);
  const mostCommonPct = total > 0 ? Math.round((maxDay / total) * 100) : 0;

  return (
    <section
      className="gba:statisticsTrends"
      aria-label="usage-trends-section"
      data-testid="usage-trends-section"
    >
      <h3 className="gba:statisticsSectionTitle" data-testid="usage-trends-section-title">Usage Trends & Patterns</h3>
      <div className="gba:statisticsSubTitle" data-testid="usage-trends-section-subtitle">
        Your absence patterns over time
      </div>
      <div className="gba:statisticsSubSection" data-testid="usage-trends-section-subsection">
        <div className="gba:statisticsSubSectionTitle" data-testid="usage-trends-section-subsection-title">
          Monthly Usage ({currentYear})
        </div>
        <div className="gba:statisticsMonthlyBarChart" data-testid="usage-trends-section-subsection-bar-chart">
          {monthlyUsage.map((val, i) => (
            <div className="gba:monthlyBarCol" key={months[i]}>
              <div
                className="gba:monthlyBarBg"
                style={{
                  height: 64,
                  display: "flex",
                  alignItems: "flex-end",
                  background: "#f3f4f6",
                  borderRadius: 6,
                  width: "100%",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: `${val > 0 ? val * 10 + 8 : 4}px`,
                    background: "#3390ff",
                    borderRadius: 6,
                    transition: "height 0.18s",
                  }}
                  aria-label={`month-bar-${months[i]}`}
                  data-testid={`month-bar-${months[i]}`}
                />
              </div>
              <div className="gba:monthlyBarMonth" data-testid="usage-trends-section-subsection-bar-chart-month">{months[i]}</div>
              <div
                className="gba:monthlyBarValue" 
                data-testid={`month-value-${months[i]}`}
              >
                {val}
              </div>
            </div>
          ))}
        </div>
        <div className="gba:statisticsSubSectionTitle" data-testid="usage-trends-section-subsection-week-bar-chart-title">
          Day of Week Preferences
        </div>
        <div className="gba:statisticsWeekBarChart" data-testid="usage-trends-section-subsection-week-bar-chart">
          {dayOfWeekUsage.map((val, i) => (
            <div
              className={`gba:weekBarCol${
                i === mostCommonIdx && val > 0
                  ? " gba:weekBarCol--highlight"
                  : ""
              }`}
              key={days[i]}
              aria-label={`weekday-bar-${days[i]}`}
              data-testid={`weekday-bar-${days[i]}`}
            >
              <div className="gba:weekBarBg">
                <div
                  className="gba:weekBarFg"
                  style={{
                    height: `${val > 0 ? val * 10 + 6 : 4}px`,
                  }}
                />
              </div>
              <div className="gba:weekBarDay" data-testid="usage-trends-section-subsection-week-bar-chart-day">{days[i]}</div>
              <div className="gba:weekBarValue" data-testid="usage-trends-section-subsection-week-bar-chart-value">{val} days</div>
            </div>
          ))}
        </div>
        <div className="gba:weekBarNote" data-testid="usage-trends-section-subsection-week-bar-chart-note">
          Most common:{" "}
          <span className="gba:font-semibold" data-testid="usage-trends-section-subsection-week-bar-chart-note-most-common">{days[mostCommonIdx]}</span> (
          {mostCommonPct}% of all absences)
        </div>
      </div>
    </section>
  );
};

export default UsageTrendsSection;
