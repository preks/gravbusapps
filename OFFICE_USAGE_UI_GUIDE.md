# Office Usage & Presence - UI Components Guide

## Overview

This document explains the intention and behavior of each section in the Office Usage & Presence application.

---

## 1. **Office Usage vs. Capacity Chart**

### Purpose

Visual representation of office occupancy over time compared to total capacity.

### What It Shows

- **Blue solid line**: Actual office usage percentage (employees checked in / total desk capacity)
- **Gray dashed line**: 100% capacity baseline reference
- **X-axis**: Time (days or weeks based on granularity filter)
- **Y-axis**: Occupancy percentage (0-100%)

### Behavior

- **Dynamic**: Updates based on selected date range and granularity (Day/Week)
- **Interactive**: Hover to see exact percentages for specific dates
- **Responsive**: Adapts to filter changes (location, date range)

### Empty State

Shows "No attendance data available for chart visualization" when:

- No attendance records exist for the selected period
- Selected location filter excludes all attendance data
- All office locations have zero capacity

### Use Cases

- **Trend Analysis**: Identify patterns in office usage over time
- **Capacity Planning**: Understand if offices are over/under utilized
- **Peak Detection**: Visually spot high and low occupancy periods
- **Comparison**: See how actual usage compares to available capacity

---

## 2. **Per-Location Usage Cards (Bottom Section)**

### Purpose

Display detailed statistics for each office location in a card grid format.

### What It Shows

Each card displays:

- **Location Name**: Office name/identifier
- **Capacity**: Total desk capacity for the office
- **Main Percentage**: Average occupancy percentage (large, prominent)
- **Sparkline Chart**: Visual trend representation (placeholder for future enhancement)
- **Peak Occupancy**: Highest occupancy percentage reached
- **Peak Date**: When the peak occurred
- **Office Days Logged**: Total number of attendance records

### Layout

- **Horizontal Grid**: 4 columns on desktop, responsive on smaller screens
- **Clickable Cards**: Click to open detailed location analytics panel
- **Color Coding**: Primary blue color for average occupancy percentage

### Behavior

- **Filtered**: Shows only locations matching current filter selection
- **Sorted**: Ordered by location name (alphabetically)
- **Interactive**: Hover effect indicates clickability
- **Dynamic**: Updates when date range or filters change

---

## 3. **"No Location Data Available" Empty State**

### Purpose

Provide clear feedback when there are no location statistics to display.

### When It Appears

This empty state is shown when:

1. **No Office Locations Configured**: The structure has no site locations with desk capacity defined
2. **No Attendance Records**: Selected date range has zero attendance data
3. **All Locations Filtered Out**: Active filters exclude all available locations
4. **Zero Capacity Locations**: All locations have `deskCapacity = 0` or `null`

### Visual Design

- **Pin Icon**: Location marker icon (MapPin) to reinforce location context
- **Clear Message**: "No location data available for the selected period"
- **Neutral Styling**: Gray/muted colors to indicate absence of data

### User Actions

When users see this state, they should:

1. **Check Date Range**: Expand date range to include periods with data
2. **Clear Filters**: Remove location or other filters that might be too restrictive
3. **Verify Data**: Confirm that:
   - Site locations are configured with desk capacity
   - Employees have attendance records logged
   - The selected time period matches when the office was operational

### Technical Trigger

```typescript
// Component shows empty state when:
if (locations.length === 0) {
  return <EmptyState
    icon={<MapPin />}
    message="No location data available for the selected period."
  />;
}
```

### Differentiation from Chart Empty State

- **Chart Empty State**: "No attendance data available for chart visualization"
  - Means: No attendance records exist to plot on the chart
  - Scope: Only affects the chart visualization
- **Location Cards Empty State**: "No location data available for the selected period"
  - Means: No location statistics can be calculated or displayed
  - Scope: Affects the entire location cards section
  - Could be due to: No locations, no capacity data, or no attendance data

---

## 4. **Data Flow & Dependencies**

### Data Sources

1. **Site Locations**: From `nw_orgchart.site_location` table
   - Provides: Location name, desk capacity
2. **Employee Attendance**: From `nw_employee_time.employee_attendance` table
   - Provides: Check-in records, dates, employee IDs
3. **Employee Site Locations**: From `nw_orgchart.employee_site_location` table
   - Links: Which employees belong to which office

### Calculation Logic

```
For each location:
  1. Filter attendance records for that location
  2. Group by date (or week based on granularity)
  3. Count unique employees per date
  4. Calculate: (unique employees / desk capacity) × 100 = occupancy %
  5. Aggregate: Average, peak, total days
```

### Empty State Cascade

```
No Locations → Empty cards section
     ↓
No Capacity → Division by zero protection → 0% occupancy
     ↓
No Attendance → 0% occupancy for all dates
     ↓
All filters exclude data → Empty cards section
```

---

## 5. **User Experience Best Practices**

### When to Show Empty States

- **Always provide context**: Explain WHY there's no data
- **Suggest actions**: Guide users on what to do next
- **Use appropriate icons**: Visual cues reinforce the message

### Progressive Disclosure

1. **First**: Show high-level KPIs (4 summary cards at top)
2. **Then**: Show trend chart (temporal analysis)
3. **Finally**: Show detailed location breakdowns (individual statistics)

### Filter Feedback

- Empty states should update immediately when filters change
- Users should see the connection between their filter selections and empty results
- Clear filter buttons should be prominent when no data is shown

---

## 6. **Future Enhancements**

### Sparkline Charts

Currently showing placeholder icon, will display:

- Mini line chart showing occupancy trend for that location
- Last 7 days or last 4 weeks depending on granularity
- Visual at-a-glance trend indicator (increasing/decreasing/stable)

### Interactive Chart Features

- **Legend Filtering**: Click to show/hide specific locations on the chart
- **Multi-line Mode**: Compare multiple locations simultaneously
- **Zoom & Pan**: Explore specific time periods in detail
- **Export**: Download chart as image or data as CSV

### Advanced Analytics

- **Predictions**: Forecast future occupancy based on historical patterns
- **Anomaly Detection**: Highlight unusual occupancy events
- **Comparative Analysis**: Week-over-week, month-over-month comparisons
- **Heatmaps**: Show which days/times are busiest

---

## Summary

The Office Usage & Presence application provides a comprehensive view of office occupancy across multiple dimensions:

1. **Temporal Analysis** (Chart): See how usage changes over time
2. **Location Breakdown** (Cards): Compare different offices side-by-side
3. **Empty State Guidance** (No Data Message): Clear feedback when data is unavailable

Each section is designed to work together, providing both high-level insights and detailed drill-down capabilities while maintaining clear, actionable feedback when data is not available.
