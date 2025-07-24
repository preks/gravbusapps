import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@newwork/nw-design-system";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface YearComparisonSectionProps {
  data: any;
}

export const YearComparisonSection: React.FC<YearComparisonSectionProps> = ({ data }) => {
  // Use real data from the hook
  const chartData = data?.yearOverYearData || [];
  
  // Get current year and previous year for dynamic labels
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  return (
    <Card className="gba:shadow-sm" data-testid="year-comparison-section">
      <CardHeader>
        <CardTitle className="gba:text-lg gba:font-semibold">
          Year-over-Year Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey={previousYear.toString()} fill="#8884d8" />
              <Bar dataKey={currentYear.toString()} fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}; 