import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@newwork/nw-design-system";
import { ResponsiveContainer, PieChart, Pie, Tooltip, Legend, Cell } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export interface LeadsBySourceItem { source: string; count: number; }

export interface LeadsBySourcePieProps {
  data: LeadsBySourceItem[];
}

export const LeadsBySourcePie: React.FC<LeadsBySourcePieProps> = ({ data }) => {
  const formatter = (value: number, _name: string, props: any) => {
    const total = data?.reduce((sum, item) => sum + item.count, 0) || 0;
    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
    return [`${value} (${percentage}%)`, props.payload.source];
  };

  if (!data || data.length === 0) {
    return (
      <Card data-testid="leads-by-source-chart" className="gba:flex-1 gba:w-1/3">
        <CardHeader>
          <CardTitle>Leads by Source</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:items-center gba:justify-center gba:h-[300px] gba:text-gray-500">
            No lead source data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="leads-by-source-chart" className="gba:flex-1 gba:w-1/3">
      <CardHeader>
        <CardTitle>Leads by Source</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={data} cx="50%" cy="40%" outerRadius={75} fill="#8884d8" dataKey="count" label={false}>
              {data.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={formatter as any} />
            <Legend verticalAlign="bottom" height={40} formatter={(_value, entry: any) => {
              const payload = entry.payload;
              return `${payload?.source || 'Unknown'} (${payload?.count || 0})`;
            }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default LeadsBySourcePie;

