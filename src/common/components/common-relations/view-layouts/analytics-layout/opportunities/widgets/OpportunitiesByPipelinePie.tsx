import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@newwork/nw-design-system";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

export interface PipelineItem { pipeline: string; count: number; percentage: number }

interface OpportunitiesByPipelinePieProps {
  data: PipelineItem[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export const OpportunitiesByPipelinePie: React.FC<OpportunitiesByPipelinePieProps> = ({ data }) => {
  return (
    <Card data-testid="opportunities-by-pipeline-chart">
      <CardHeader>
        <CardTitle className="gba:text-sm">Opportunities by Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" outerRadius={60} dataKey="count" label={({ percentage }) => `${percentage}%`}>
              {data.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number, _name: string, props: any) => { const total = data.reduce((s, i) => s + i.count, 0); const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'; return [`${value} (${percentage}%)`, props.payload.pipeline]; }} />
            <Legend content={() => (
              <div className="gba:mt-2 gba:flex gba:flex-wrap gba:gap-4 gba:justify-center">
                {data.map((item, index) => (
                  <div key={item.pipeline} className="gba:flex gba:items-center gba:gap-1 gba:text-xs">
                    <div className="gba:w-3 gba:h-3 gba:rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="gba:text-gray-700">{item.pipeline}: {item.count}</span>
                  </div>
                ))}
              </div>
            )} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default OpportunitiesByPipelinePie;


