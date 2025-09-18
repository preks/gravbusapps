import React from "react";
import { Button } from "@newwork/nw-design-system";
import { Settings, PieChart } from "lucide-react";

const DashboardHeader: React.FC = () => {
  return (
    <div className="gba:bg-white gba:border-b gba:px-6 gba:py-4">
      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:p-2 gba:bg-blue-100 gba:rounded-lg">
            <PieChart className="gba:h-6 gba:w-6 gba:text-blue-600" />
          </div>
          <h1
            className="gba:text-2xl gba:font-semibold gba:text-gray-900"
            data-testid="dashboard-title"
          >
            Investment Portfolio
          </h1>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
