import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system';

export type DashboardTabKey = 'overview' | 'pipeline-details' | string;

export interface DashboardTabConfig {
  key: DashboardTabKey;
  label: React.ReactNode;
  content: React.ReactNode;
  dataTestId?: string;
}

export interface DashboardLayoutProps {
  header?: React.ReactNode;
  tabs: DashboardTabConfig[];
  initialTab?: DashboardTabKey;
  dataTestId?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ header, tabs, initialTab, dataTestId }) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab || (tabs[0]?.key as string));

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  return (
    <div className="gba:p-6" data-testid={dataTestId || 'dashboard-layout'}>
      {header}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:h-full">
        <TabsList className="gba:mb-6">
          {tabs.map((t) => (
            <TabsTrigger key={t.key} value={t.key} data-testid={t.dataTestId || `${t.key}-tab`}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((t) => (
          <TabsContent key={t.key} value={t.key} className="gba:space-y-6">
            {t.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default DashboardLayout;
