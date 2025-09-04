import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@newwork/nw-design-system";
import { ClockCircleOutlined } from "@ant-design/icons";

export interface ActivityHeatmapData {
  dayIndex: number; // 0-6
  hour: number;     // 0-23
  activities: number;
}

export interface ActivityHeatmapChartProps {
  data: ActivityHeatmapData[];
  isLoading?: boolean;
}

export const ActivityHeatmapChart: React.FC<ActivityHeatmapChartProps> = ({
  data,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card data-testid="activity-heatmap-loading">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <ClockCircleOutlined />
            Activity Heatmap (Last 30 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
            <div className="gba:animate-pulse gba:text-gray-500">
              Loading activity data...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxActivity = Math.max(...data.map((d) => d.activities));
  const getIntensity = (activities: number) => {
    if (activities === 0) return 0;
    return Math.min(1, activities / Math.max(1, maxActivity));
  };

  const getHeatmapColor = (intensity: number) => {
    if (intensity === 0) return "#F3F4F6";
    const alpha = Math.max(0.1, intensity);
    return `rgba(59, 130, 246, ${alpha})`;
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getActivityForDayHour = (dayIndex: number, hour: number) => {
    return (
      data.find((d) => d.dayIndex === dayIndex && d.hour === hour)
        ?.activities || 0
    );
  };

  const totalActivities = data.reduce((sum, d) => sum + d.activities, 0);
  const avgActivitiesPerHour = totalActivities / Math.max(1, data.length);

  return (
    <Card data-testid="activity-heatmap-chart">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <ClockCircleOutlined />
          Activity Heatmap (Last 30 days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-6">
          <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:text-sm gba:bg-gray-50 gba:p-4 gba:rounded-lg">
            <div className="gba:text-center">
              <div className="gba:font-bold gba:text-lg gba:text-gray-900">
                {totalActivities}
              </div>
              <div className="gba:text-gray-600">Total Activities</div>
            </div>
            <div className="gba:text-center">
              <div className="gba:font-bold gba:text-lg gba:text-gray-900">
                {avgActivitiesPerHour.toFixed(1)}
              </div>
              <div className="gba:text-gray-600">Avg per Hour</div>
            </div>
            <div className="gba:text-center">
              <div className="gba:font-bold gba:text-lg gba:text-gray-900">
                {maxActivity}
              </div>
              <div className="gba:text-gray-600">Peak Activity</div>
            </div>
          </div>
          <div className="gba:overflow-x-auto gba:pt-8">
            <div className="gba:inline-block gba:min-w-full">
              <div className="gba:grid gba:grid-cols-25 gba:gap-1 gba:mb-2">
                <div className="gba:w-8"></div>
                {hours.map((hour) => (
                  <div key={hour} className="gba:text-xs gba:text-gray-500 gba:text-center gba:w-4" style={{ fontSize: '10px' }}>
                    {hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`}
                  </div>
                ))}
              </div>
              {days.map((day, dayIndex) => (
                <div key={day} className="gba:grid gba:grid-cols-25 gba:gap-1 gba:mb-1">
                  <div className="gba:text-xs gba:text-gray-600 gba:w-8 gba:text-right gba:pr-2 gba:py-1">{day}</div>
                  {hours.map((hour) => {
                    const activities = getActivityForDayHour(dayIndex, hour);
                    const intensity = getIntensity(activities);
                    return (
                      <div
                        key={`${dayIndex}-${hour}`}
                        className="gba:w-4 gba:h-4 gba:rounded-sm gba:border gba:border-gray-200 gba:relative gba:group gba:cursor-pointer"
                        style={{ backgroundColor: getHeatmapColor(intensity) }}
                        title={`${day} ${hour}:00 - ${activities} activities`}
                        data-testid={`heatmap-cell-${dayIndex}-${hour}`}
                      >
                        <div className="gba:absolute gba:bottom-full gba:left-1/2 gba:transform gba:-translate-x-1/2 gba:mb-2 gba:px-2 gba:py-1 gba:bg-gray-900 gba:text-white gba:text-xs gba:rounded gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:pointer-events-none gba:whitespace-nowrap gba:z-50">
                          {day} {hour}:00 - {activities} activities
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="gba:flex gba:items-center gba:justify-center gba:space-x-4 gba:text-xs gba:text-gray-600">
            <span>Less</span>
            <div className="gba:flex gba:space-x-1">
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity) => (
                <div key={intensity} className="gba:w-3 gba:h-3 gba:rounded-sm gba:border gba:border-gray-200" style={{ backgroundColor: getHeatmapColor(intensity) }} />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityHeatmapChart;

