import React from "react";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from "@newwork/nw-design-system";
import { TrendingUp } from "lucide-react";

export interface DealItem {
  id: string;
  name: string;
  stage: string;
  value: string; // already formatted value in original
  owner?: string;
  closeDate?: string;
}

export interface DealSummaryProps {
  deals: DealItem[];
  moduleColor?: string;
}

export const DealSummary: React.FC<DealSummaryProps> = ({ deals, moduleColor = "default" }) => {
  // Remove unused variable warning
  const _ = moduleColor;
  return (
    <Card className="gba:h-full">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:p-2 gba:bg-indigo-100 gba:rounded-lg">
              <TrendingUp className="gba:text-indigo-600 gba:h-6 gba:w-6" />
            </div>
            <CardTitle>Key Deals - Recent Opportunities</CardTitle>
          </div>
          <Button variant="link" size="sm" className="gba:text-blue-600">
            View All Key Deals
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4">
          {deals.slice(0, 6).map((deal) => (
            <div
              key={deal.id}
              className="gba:p-4 gba:rounded-lg gba:border gba:border-gray-200 hover:gba:shadow-md gba:transition-all"
            >
              <div className="gba:flex gba:items-start gba:justify-between gba:mb-2">
                <div className="gba:text-sm gba:font-semibold gba:text-gray-900">
                  {deal.name}
                </div>
                <Badge variant="secondary">{deal.stage}</Badge>
              </div>
              <div className="gba:text-lg gba:font-bold gba:text-blue-600 gba:mb-1">
                {deal.value}
              </div>
              <div className="gba:text-xs gba:text-gray-500">
                {deal.owner} • {deal.closeDate}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DealSummary;
