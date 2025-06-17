import React from "react";

const yearData = [
  { year: 2025, label: "2025 (Current)", value: 18, color: "#3390ff" },
  { year: 2024, label: "2024", value: 24, color: "#bfc7d1" },
  { year: 2023, label: "2023", value: 21, color: "#bfc7d1" },
];
const leaveTypeData = [
  {
    year: 2025,
    total: 18,
    types: [
      { label: "Sick", value: 3, color: "#ef5350" },
      { label: "Vacation", value: 12, color: "#27ae60" },
      { label: "Special", value: 1, color: "#f7b731" },
      { label: "Work", value: 2, color: "#2980b9" },
    ],
  },
  {
    year: 2024,
    total: 24,
    types: [
      { label: "Sick", value: 6, color: "#ef5350" },
      { label: "Vacation", value: 12, color: "#27ae60" },
      { label: "Special", value: 2, color: "#f7b731" },
      { label: "Work", value: 4, color: "#2980b9" },
    ],
  },
];

const YearComparisonSection: React.FC = () => (
  <div data-testid="year-comparison-section">
    <h3 className="gba:statisticsSectionTitle">Year-over-Year Comparison</h3>
    <div className="gba:statisticsSubTitle">How your absence patterns have changed over time</div>
    <div className="gba:yearComparisonRows">
      {yearData.map((row) => (
        <div className="gba:yearComparisonRow" key={row.year}>
          <span className="gba:yearComparisonLabel">{row.label}</span>
          <div className="gba:yearComparisonBarBg">
            <div
              className="gba:yearComparisonBarFg"
              style={{ width: `${row.value * 6}px`, background: row.color }}
            />
          </div>
          <span className="gba:yearComparisonValue">{row.value} days</span>
        </div>
      ))}
    </div>
    <div className="gba:yearComparisonImprovement">
      <span className="gba:improvementIcon">↓</span> 25% decrease from last year – Good work-life balance improvement
    </div>
    <div className="gba:leaveTypeTitle">Leave Type Distribution by Year</div>
    <div className="gba:leaveTypeRows">
      {leaveTypeData.map((row) => (
        <div className="gba:leaveTypeRow" key={row.year}>
          <div className="gba:leaveTypeYear" style={{ marginBottom: 6 }}>{row.year}<span style={{
              alignSelf: 'flex-end',
              color: '#8a939b',
              fontWeight: 500,
              fontSize: 16,
            }}>{row.total} days total</span></div>
          
          <div
            className="gba:leaveTypeBarBg"
            style={{
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
            }}
          >
            {row.types.map((type, idx) => (
              <div
                key={type.label}
                className="gba:leaveTypeBarFg"
                style={{
                  width: `${(type.value / row.total) * 100}%`,
                  background: type.color,
                  borderTopLeftRadius: idx === 0 ? 14 : 0,
                  borderBottomLeftRadius: idx === 0 ? 14 : 0,
                  borderTopRightRadius: idx === row.types.length - 1 ? 14 : 0,
                  borderBottomRightRadius: idx === row.types.length - 1 ? 14 : 0,
                }}
              />
            ))}
          </div>
          <div
            className="gba:leaveTypeLegendTypes"
          >
            {row.types.map((type) => (
              <span
                key={type.label}
                style={{
                  color: '#6b7683',
                  fontWeight: 500,
                  fontSize: 16,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {type.label}: {type.value}d
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default YearComparisonSection;
