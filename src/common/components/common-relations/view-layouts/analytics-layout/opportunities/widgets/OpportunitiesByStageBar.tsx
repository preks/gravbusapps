import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@newwork/nw-design-system";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

export interface StageItem { stage: string; count: number; value: number }

interface OpportunitiesByStageBarProps {
  data: StageItem[];
}

export const OpportunitiesByStageBar: React.FC<OpportunitiesByStageBarProps> = ({ data }) => {
  return (
    <Card data-testid="opportunities-by-stage-chart">
      <CardHeader>
        <CardTitle>Opportunities by Stage</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ bottom: 60 }}>
            <XAxis dataKey="stage" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} interval={0} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value: number, name: string) => [name === 'count' ? `${value}` : `€${Number(value).toLocaleString()}`, name === 'count' ? 'Opportunities' : 'Total Value']} />
            <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} />
            <Bar dataKey="count" fill="#3B82F6" name="Opportunities" radius={[2, 2, 0, 0]} />
            <Bar dataKey="value" fill="#10B981" name="Total Value" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default OpportunitiesByStageBar;


