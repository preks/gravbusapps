import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@newwork/nw-design-system";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { LeadsAnalytics } from "../types/analyticsTypes";

interface LeadPieChartsProps {
  data: LeadsAnalytics;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export const LeadPieCharts: React.FC<LeadPieChartsProps> = ({ data }) => {
  // Custom tooltip formatter functions that include percentages
  const createPieTooltipFormatter = (
    dataArray: any[],
    valueKey: string,
    labelKey: string
  ) => {
    return (value: number, name: string, props: any) => {
      const total =
        dataArray?.reduce((sum, item) => sum + item[valueKey], 0) || 0;
      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
      return [`${value} (${percentage}%)`, props.payload[labelKey]];
    };
  };

  return (
    <>
      {/* Charts Row 1 - Pie Charts Side by Side */}
      <div className="gba:flex gba:gap-4">
        {/* Leads by Source */}
        <Card
          data-testid="leads-by-source-chart"
          className="gba:flex-1 gba:w-1/2"
        >
          <CardHeader>
            <CardTitle>Leads by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.leadsBySource}
                  cx="50%"
                  cy="40%"
                  outerRadius={75}
                  fill="#8884d8"
                  dataKey="count"
                  label={false}
                >
                  {data.leadsBySource.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={
                    data?.leadsBySource
                      ? createPieTooltipFormatter(
                          data.leadsBySource,
                          "count",
                          "source"
                        )
                      : undefined
                  }
                />
                <Legend
                  verticalAlign="bottom"
                  height={40}
                  formatter={(value, entry: any) =>
                    `${(entry.payload as any).source} (${
                      (entry.payload as any).count
                    })`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Leads by Rating */}
        <Card
          data-testid="leads-by-rating-chart"
          className="gba:flex-1 gba:w-1/2"
        >
          <CardHeader>
            <CardTitle>Leads by Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.leadsByRating}
                  cx="50%"
                  cy="40%"
                  outerRadius={75}
                  fill="#8884d8"
                  dataKey="count"
                  label={false}
                >
                  {data.leadsByRating.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[(index + 2) % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={
                    data
                      ? createPieTooltipFormatter(
                          data.leadsByRating,
                          "count",
                          "rating"
                        )
                      : undefined
                  }
                />
                <Legend
                  verticalAlign="bottom"
                  height={40}
                  formatter={(value, entry: any) =>
                    `${(entry.payload as any).rating} (${
                      (entry.payload as any).count
                    })`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 - More Pie Charts */}
      <div className="gba:flex gba:gap-4">
        {/* Leads by Status */}
        <Card
          data-testid="leads-by-status-chart"
          className="gba:flex-1 gba:w-1/2"
        >
          <CardHeader>
            <CardTitle>Leads by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.leadsByStatus}
                  cx="50%"
                  cy="40%"
                  outerRadius={75}
                  fill="#8884d8"
                  dataKey="count"
                  label={false}
                >
                  {data.leadsByStatus.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={
                    data
                      ? createPieTooltipFormatter(
                          data.leadsByStatus,
                          "count",
                          "status"
                        )
                      : undefined
                  }
                />
                <Legend
                  verticalAlign="bottom"
                  height={40}
                  formatter={(value, entry: any) =>
                    `${(entry.payload as any).status} (${
                      (entry.payload as any).count
                    })`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Leads by Company Size */}
        <Card
          data-testid="leads-by-company-size-chart"
          className="gba:flex-1 gba:w-1/2"
        >
          <CardHeader>
            <CardTitle>Leads by Company Size</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.leadsByCompanySize}
                  cx="50%"
                  cy="40%"
                  outerRadius={75}
                  fill="#8884d8"
                  dataKey="count"
                  label={false}
                >
                  {data.leadsByCompanySize.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[(index + 3) % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={
                    data
                      ? createPieTooltipFormatter(
                          data.leadsByCompanySize,
                          "count",
                          "sizeCategory"
                        )
                      : undefined
                  }
                />
                <Legend
                  verticalAlign="bottom"
                  height={40}
                  formatter={(value, entry: any) =>
                    `${(entry.payload as any).sizeCategory} (${
                      (entry.payload as any).count
                    })`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
};
