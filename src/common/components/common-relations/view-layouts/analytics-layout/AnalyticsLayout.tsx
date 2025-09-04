import React, { useMemo, useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@newwork/nw-design-system";
import {
  BarChartOutlined,
  TeamOutlined,
  BankOutlined,
  DollarCircleOutlined,
  ContactsOutlined,
} from "@ant-design/icons";

import { OverviewTabLayout, OverviewTabLayoutProps } from "./overview/OverviewTabLayout";
import { LeadsTabLayout, LeadsTabLayoutProps } from "./leads/LeadsTabLayout";
import { AccountsTabLayout, AccountsTabLayoutProps } from "./accounts/AccountsTabLayout";
import { OpportunitiesTabLayout, OpportunitiesTabLayoutProps } from "./opportunities/OpportunitiesTabLayout";
import ContactsTabLayout, { ContactsTabLayoutProps } from "./contacts/ContactsTabLayout";

export type AnalyticsTabKey = "overview" | "leads" | "accounts" | "opportunities" | "contacts";

export interface AnalyticsLayoutProps {
  defaultTab?: AnalyticsTabKey;
  onTabChange?: (tab: AnalyticsTabKey) => void;
  overviewProps?: OverviewTabLayoutProps;
  leadsProps?: LeadsTabLayoutProps;
  accountsProps?: AccountsTabLayoutProps;
  opportunitiesProps?: OpportunitiesTabLayoutProps;
  contactsProps?: ContactsTabLayoutProps;
}

export const AnalyticsLayout: React.FC<AnalyticsLayoutProps> = ({
  defaultTab = "overview",
  onTabChange,
  overviewProps,
  leadsProps,
  accountsProps,
  opportunitiesProps,
  contactsProps,
}) => {
  const tabs = useMemo(() => {
    const items: Array<{ key: AnalyticsTabKey; label: string; icon: React.ReactNode; content: React.ReactNode }> = [];
    if (overviewProps) {
      items.push({ key: "overview", label: "Overview", icon: <BarChartOutlined className="gba:mr-2" />, content: <OverviewTabLayout {...overviewProps} /> });
    }
    if (leadsProps) {
      items.push({ key: "leads", label: "Leads", icon: <TeamOutlined className="gba:mr-2" />, content: <LeadsTabLayout {...leadsProps} /> });
    }
    if (accountsProps) {
      items.push({ key: "accounts", label: "Accounts", icon: <BankOutlined className="gba:mr-2" />, content: <AccountsTabLayout {...accountsProps} /> });
    }
    if (opportunitiesProps) {
      items.push({ key: "opportunities", label: "Opportunities", icon: <DollarCircleOutlined className="gba:mr-2" />, content: <OpportunitiesTabLayout {...opportunitiesProps} /> });
    }
    if (contactsProps) {
      items.push({ key: "contacts", label: "Contacts", icon: <ContactsOutlined className="gba:mr-2" />, content: <ContactsTabLayout {...contactsProps} /> });
    }
    return items;
  }, [overviewProps, leadsProps, accountsProps, opportunitiesProps, contactsProps]);

  const initialTab = useMemo<AnalyticsTabKey>(() => {
    const availableKeys = tabs.map((t) => t.key);
    return (availableKeys.includes(defaultTab) ? defaultTab : (availableKeys[0] || "overview")) as AnalyticsTabKey;
  }, [tabs, defaultTab]);

  const [activeTab, setActiveTab] = useState<AnalyticsTabKey>(initialTab);

  const handleTabChange = (key: string) => {
    const k = key as AnalyticsTabKey;
    setActiveTab(k);
    onTabChange?.(k);
  };

  return (
    <div data-testid="analytics-layout" className="gba:h-full">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:h-full" data-testid="analytics-tabs">
        <TabsList className="gba:mb-6 gba:grid gba:w-full gba:grid-cols-5">
          {tabs.map((t) => (
            <TabsTrigger key={t.key} value={t.key} data-testid={`${t.key}-analytics-tab`}>
              {t.icon}
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((t) => (
          <TabsContent key={t.key} value={t.key} className="gba:h-full gba:overflow-auto">
            {t.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default AnalyticsLayout;

