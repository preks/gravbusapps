import React from "react";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@newwork/nw-design-system";

export interface TopAccountItem {
  id: string;
  name: string;
  industry: string;
  opportunityCount?: number;
  wonOpportunities?: number;
  totalValue: number;
}

interface TopAccountsByRevenueProps {
  topAccounts: TopAccountItem[];
}

export const TopAccountsByRevenue: React.FC<TopAccountsByRevenueProps> = ({ topAccounts }) => {
  return (
    <Card data-testid="top-accounts-section">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:inline-block">{/* icon space parity with source */}</span>
          Top Accounts by Revenue
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topAccounts.length > 0 ? (
          <div className="gba:space-y-3">
            {topAccounts.map((account, index) => (
              <div
                key={account.id}
                className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg"
                data-testid={`top-account-${index}`}
              >
                <div className="gba:flex gba:items-center gba:gap-3">
                  <Badge variant="outline">#{index + 1}</Badge>
                  <div>
                    <div className="gba:font-medium">{account.name}</div>
                    <div className="gba:text-sm gba:text-gray-600">
                      {account.industry} • {account.wonOpportunities || account.opportunityCount} won opportunities
                    </div>
                  </div>
                </div>
                <div className="gba:text-right">
                  <div className="gba:font-bold">${account.totalValue.toLocaleString()}</div>
                  <div className="gba:text-sm gba:text-gray-600">Revenue</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="gba:text-center gba:text-gray-500 gba:py-8">No accounts with revenue available</div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopAccountsByRevenue;


