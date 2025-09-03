import React from "react";
import { Card, CardContent } from "@newwork/nw-design-system";
import { TrophyOutlined } from "@ant-design/icons";

export interface TopPerformerItem {
  employeeId: string;
  employeeName: string;
  dealsWon: number;
  totalValue: number;
}

export interface TopPerformersProps {
  performers: TopPerformerItem[];
}

export const TopPerformers: React.FC<TopPerformersProps> = ({ performers }) => {
  return (
    <Card data-testid="top-performers-section">
      <CardContent className="gba:p-6">
        <h3 className="gba:text-lg gba:font-semibold gba:mb-4 gba:flex gba:items-center gba:gap-2">
          <TrophyOutlined />
          Top Performers
        </h3>
        {performers.length > 0 ? (
          <div className="gba:space-y-3">
            {performers.map((performer, index) => (
              <div
                key={performer.employeeId}
                className="gba:flex gba:items-center gba:justify-between gba:p-4 gba:border gba:rounded-lg gba:hover:bg-gray-50 gba:transition-colors"
                data-testid={`top-performer-${index}`}
              >
                <div className="gba:flex gba:items-center gba:gap-3">
                  <div className="gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:bg-blue-100 gba:text-blue-600 gba:rounded-full gba:font-bold gba:text-sm">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="gba:font-medium">{performer.employeeName}</div>
                    <div className="gba:text-sm gba:text-gray-600">{performer.dealsWon} deals won</div>
                  </div>
                </div>
                <div className="gba:text-right">
                  <div className="gba:font-bold gba:text-lg">${performer.totalValue.toLocaleString()}</div>
                  <div className="gba:text-sm gba:text-gray-600">Total Value</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="gba:text-center gba:text-gray-500 gba:py-12">
            <TrophyOutlined className="gba:text-4xl gba:mb-4 gba:opacity-50" />
            <p>No performance data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopPerformers;

