import React, { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertTitle,
  AlertDescription,
  Button,
} from "@newwork/nw-design-system";
import { Spinner } from "@newwork/nw-design-system";
import {
  BarChartOutlined,
  TeamOutlined,
  BankOutlined,
  DollarCircleOutlined,
  ContactsOutlined
} from "@ant-design/icons";
// Megaphone removed with Campaigns feature
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { OverviewTab } from "./tabs/overview-tab/OverviewTab";
import { LeadTab } from "./tabs/lead-tab/LeadTab";
import { AccountTab } from "./tabs/account-tab/AccountTab";
import { OpportunityTab } from "./tabs/opportunity-tab/OpportunityTab";
import { ContactTab } from "./tabs/contact-tab/ContactTab";
import { useCrmAnalyticsData } from "./hooks/useCrmAnalyticsData";
// Removed CampaignsAnalyticsTab and related resources

export interface AnalyticsViewProps extends BusinessAppContextProps {}

export const AnalyticsView: React.FC<AnalyticsViewProps> = (context) => {
  const [activeTab, setActiveTab] = useState<string>("overview");

  const { data, isLoading, error, refetch } = useCrmAnalyticsData(context);
  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  if (isLoading) {
    return (
      <div
        data-testid="crm-analytics-loading"
        className="gba:flex gba:items-center gba:justify-center gba:min-h-screen"
      >
        <div className="gba:text-center">
          <Spinner size="lg" />
          <div className="gba:mt-4 gba:text-gray-600 gba:text-lg">
            Loading CRM Analytics...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="crm-analytics-error"
        className="gba:min-h-screen gba:p-6 gba:flex gba:items-center gba:justify-center"
      >
        <div className="gba:max-w-lg gba:w-full">
          <Alert variant="destructive" className="gba:shadow-lg">
            <AlertTitle>Error Loading Analytics</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button size="sm" onClick={refetch} variant="default">
              Retry
            </Button>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="crm-analytics" className="gba:h-full gba:p-6">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="gba:h-full"
      >
        <TabsList className="gba:mb-6 gba:grid gba:w-full gba:grid-cols-5">
          <TabsTrigger value="overview" data-testid="overview-analytics-tab">
            <BarChartOutlined className="gba:mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="leads" data-testid="leads-analytics-tab">
            <TeamOutlined className="gba:mr-2" />
            Leads
          </TabsTrigger>
          <TabsTrigger value="accounts" data-testid="accounts-analytics-tab">
            <BankOutlined className="gba:mr-2" />
            Accounts
          </TabsTrigger>
          <TabsTrigger
            value="opportunities"
            data-testid="opportunities-analytics-tab"
          >
            <DollarCircleOutlined className="gba:mr-2" />
            Opportunities
          </TabsTrigger>
          <TabsTrigger value="contacts" data-testid="contacts-analytics-tab">
            <ContactsOutlined className="gba:mr-2" />
            Contacts
          </TabsTrigger>
          {/* Campaigns tab removed */}
        </TabsList>

        <TabsContent value="overview" className="gba:h-full gba:overflow-auto">
          {data?.overview ? (
            <OverviewTab data={data.overview} {...context} />
          ) : null}
        </TabsContent>

        <TabsContent value="leads" className="gba:h-full gba:overflow-auto">
          <LeadTab data={data?.leads} {...context} />
        </TabsContent>

        <TabsContent value="accounts" className="gba:h-full gba:overflow-auto">
          <AccountTab data={data?.accounts} {...context} />
        </TabsContent>

        <TabsContent
          value="opportunities"
          className="gba:h-full gba:overflow-auto"
        >
          <OpportunityTab data={data?.opportunities} {...context} />
        </TabsContent>

        <TabsContent value="contacts" className="gba:h-full gba:overflow-auto">
          <ContactTab {...context} />
        </TabsContent>

        {/* Campaigns content removed */}
      </Tabs>
    </div>
  );
};

export default AnalyticsView;