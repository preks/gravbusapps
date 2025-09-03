import React, { useState } from "react";
import { WidgetGroup } from "@/components/widget-group";
import { ContactsOutlined, TeamOutlined, DollarCircleOutlined, RiseOutlined } from "@ant-design/icons";
import { Card, CardContent, CardHeader, CardTitle, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@newwork/nw-design-system";
import { ContactInsightsDashboard, ContactInsightsDashboardData } from "./widgets/ContactInsightsDashboard";
import { ContactQualityMatrix, ContactQualityData } from "./widgets/ContactQualityMatrix";
import { TopRevenueEarners, TopRevenueContact } from "./widgets/TopRevenueEarners";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

export type TimeFilter = "month" | "quarter" | "year" | "historical";

export interface ContactsOverTimePoint { date: string; count: number; cumulative: number }

export interface ContactsTabLayoutProps {
  title?: string;
  totalContacts: number;
  thisMonth: number;
  lastMonth: number;
  growth?: number;
  totalLastMonth?: number;
  totalGrowth?: number;
  avgPerAccount?: number;
  avgPerAccountLastMonth?: number;
  selectedTimeFilter: TimeFilter;
  onTimeFilterChange: (filter: TimeFilter) => void;
  overTimeData: ContactsOverTimePoint[];
  topAccountsByContacts: Array<{ accountName: string; contactCount: number }>;
  recentContacts: Array<{ id: string; name: string; accountName?: string; createdDate: string; daysSinceCreated: number }>;
  insightsData?: ContactInsightsDashboardData; // optional: if provided, show dashboard widget
  qualityData?: ContactQualityData;
  topRevenueContacts?: TopRevenueContact[];
  topRevenueLoading?: boolean;
}

export const ContactsTabLayout: React.FC<ContactsTabLayoutProps> = ({
  title = "Contacts Analytics",
  totalContacts,
  thisMonth,
  lastMonth,
  growth,
  totalLastMonth,
  totalGrowth,
  avgPerAccount,
  avgPerAccountLastMonth,
  selectedTimeFilter,
  onTimeFilterChange,
  overTimeData,
  topAccountsByContacts,
  recentContacts,
  insightsData,
  qualityData,
  topRevenueContacts,
  topRevenueLoading,
}) => {
  const [visibleLines, setVisibleLines] = useState({ totalContacts: true, accountLinked: true });
  const safeThisMonth = thisMonth || 0;
  const safeLastMonth = lastMonth || 0;
  const newThisMonthTrendPercent = safeLastMonth > 0
    ? Math.abs(((safeThisMonth - safeLastMonth) / safeLastMonth) * 100)
    : (safeThisMonth > 0 ? 100 : 0);
  const newThisMonthPositive = safeThisMonth >= safeLastMonth;

  const safeAvg = avgPerAccount || 0;
  const safeAvgLast = avgPerAccountLastMonth ?? undefined;
  const avgPerAccountTrendPercent = safeAvgLast !== undefined
    ? (safeAvgLast > 0 ? Math.abs(((safeAvg - safeAvgLast) / safeAvgLast) * 100) : (safeAvg > 0 ? 100 : 0))
    : undefined;
  const avgPerAccountPositive = safeAvgLast !== undefined ? safeAvg >= safeAvgLast : undefined;
  const kpis = [
    { key: "total-contacts", title: "Total Contacts", value: totalContacts || 0, prefix: <ContactsOutlined />, description: "All contacts in the system", ...((totalGrowth !== undefined && totalLastMonth !== undefined) ? { trend: { value: `${Math.abs(totalGrowth).toFixed(1)}%`, positive: (totalGrowth || 0) >= 0, description: `${totalContacts} total vs ${totalLastMonth} last month` } } : {}) },
    { key: "contacts-this-month", title: "New This Month", value: thisMonth || 0, prefix: <RiseOutlined />, description: "Contacts created this month", ...((thisMonth !== undefined && lastMonth !== undefined) ? { trend: { value: `${newThisMonthTrendPercent.toFixed(1)}%`, positive: newThisMonthPositive, description: `${thisMonth} this month vs ${lastMonth} last month` } } : {}) },
    { key: "growth-rate", title: "Monthly Growth", value: growth || 0, suffix: "%", prefix: <DollarCircleOutlined />, description: "Month-over-month growth", ...(growth !== undefined ? { trend: { value: (growth || 0) >= 0 ? "Positive" : "Negative", positive: (growth || 0) >= 0, description: `${thisMonth} this month vs ${lastMonth} last month` } } : {}) },
    { key: "avg-contacts-per-account", title: "Average per Account", value: avgPerAccount || 0, precision: 1, prefix: <TeamOutlined />, description: "Average contacts per account", ...((avgPerAccount !== undefined && avgPerAccountLastMonth !== undefined) ? { trend: { value: `${(avgPerAccountTrendPercent ?? 0).toFixed(1)}%`, positive: !!avgPerAccountPositive, description: `${(avgPerAccount ?? 0).toFixed(1)} now vs ${(avgPerAccountLastMonth ?? 0).toFixed(1)} last month` } } : {}) },
  ];

  return (
    <div className="gba:space-y-6" data-testid="contacts-analytics-tab">
      <div>
        <h2 className="gba:text-2xl gba:font-bold gba:mb-4">{title}</h2>
        <WidgetGroup widgets={kpis} data-testid="contacts-key-metrics" />
      </div>

      <Card data-testid="contact-lifecycle-chart">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle>Contact Lifecycle Overview</CardTitle>
            <div className="gba:flex gba:items-center gba:gap-4">
              <Select value={selectedTimeFilter} onValueChange={(v: string) => onTimeFilterChange(v as TimeFilter)}>
                <SelectTrigger className="gba:w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                  <SelectItem value="historical">Historical</SelectItem>
                </SelectContent>
              </Select>
              <div className="gba:flex gba:items-center gba:gap-2">
                <Button variant={visibleLines.totalContacts ? "default" : "outline"} size="sm" onClick={() => setVisibleLines((p) => ({ ...p, totalContacts: !p.totalContacts }))}>Monthly</Button>
                <Button variant={visibleLines.accountLinked ? "default" : "outline"} size="sm" onClick={() => setVisibleLines((p) => ({ ...p, accountLinked: !p.accountLinked }))}>Cumulative</Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={overTimeData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip labelFormatter={(value) => `Date: ${value}`} formatter={(value: number, name: string) => [value, name === 'count' ? 'Monthly Created' : 'Total Contacts']} />
              {/* recharts Legend is not part of design-system exports; omit for parity */}
              {visibleLines.totalContacts && (<Area type="monotone" dataKey="count" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} name="Monthly Created" />)}
              {visibleLines.accountLinked && (<Area type="monotone" dataKey="cumulative" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.4} name="Cumulative Total" />)}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/** Optional full insights dashboard (exact copy from originals) */}
      {insightsData && (<ContactInsightsDashboard data={insightsData} />)}

      {!insightsData && (
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        <Card data-testid="top-accounts-by-contacts">
          <CardHeader><CardTitle>Top Accounts by Contact Count</CardTitle></CardHeader>
          <CardContent>
            <div className="gba:space-y-3 gba:max-h-80 gba:overflow-y-auto">
              {topAccountsByContacts.slice(0, 8).map((account, index) => (
                <div key={account.accountName} className="gba:p-3 gba:bg-gray-50 gba:border gba:border-gray-200 gba:rounded-lg" data-testid={`top-account-${index}`}>
                  <div className="gba:flex gba:justify-between gba:items-center">
                    <div className="gba:flex-1">
                      <h5 className="gba:font-medium gba:text-gray-900 gba:text-sm">{account.accountName}</h5>
                    </div>
                    <div className="gba:text-right">
                      <span className="gba:text-xs gba:text-gray-600">{account.contactCount} contacts</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="recent-contacts">
          <CardHeader><CardTitle>Recent Contacts</CardTitle></CardHeader>
          <CardContent>
            <div className="gba:space-y-3">
              {recentContacts.map((contact) => (
                <div key={contact.id} className="gba:p-3 gba:bg-gray-50 gba:border gba:border-gray-200 gba:rounded-lg" data-testid={`recent-contact-${contact.id}`}>
                  <div className="gba:flex gba:justify-between gba:items-start">
                    <div className="gba:flex-1">
                      <h5 className="gba:font-medium gba:text-gray-900 gba:text-sm">{contact.name}</h5>
                      {contact.accountName && (<p className="gba:text-xs gba:text-gray-600 gba:mt-1">{contact.accountName}</p>)}
                    </div>
                    <div className="gba:text-right"><span className="gba:text-xs gba:text-gray-500">{contact.daysSinceCreated === 0 ? 'Today' : `${contact.daysSinceCreated}d ago`}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>) }

      {qualityData && (<ContactQualityMatrix data={qualityData} />)}

      {topRevenueContacts && (
        <TopRevenueEarners contacts={topRevenueContacts} isLoading={topRevenueLoading} />
      )}
    </div>
  );
};

export default ContactsTabLayout;


