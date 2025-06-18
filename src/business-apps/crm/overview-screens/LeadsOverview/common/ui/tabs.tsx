import React from 'react';
import { Tabs as AntTabs } from 'antd';

const { TabPane } = AntTabs;

interface TabsProps extends React.ComponentProps<typeof AntTabs> {
  className?: string;
  defaultValue?: string;
}

export const Tabs: React.FC<TabsProps> = ({ className, children, defaultValue, ...props }) => (
  <AntTabs 
    className={`gba:tabs ${className || ''}`}
    data-testid="tabs-component"
    defaultActiveKey={defaultValue}
    {...props}
  >
    {children}
  </AntTabs>
);

interface TabsContentProps {
  value: string;
  className?: string;
  children?: React.ReactNode;
}

export const TabsContent: React.FC<TabsContentProps> = ({ value, className, children, ...props }) => (
  <TabPane 
    tab="" 
    key={value}
    className={`gba:tabs-content ${className || ''}`}
    data-testid="tabs-content-component"
    {...props}
  >
    {children}
  </TabPane>
);

interface TabsListProps {
  className?: string;
  children?: React.ReactNode;
}

export const TabsList: React.FC<TabsListProps> = ({ className, children, ...props }) => (
  <div 
    className={`gba:tabs-list ${className || ''}`}
    data-testid="tabs-list-component"
    {...props}
  >
    {children}
  </div>
);

interface TabsTriggerProps {
  value: string;
  className?: string;
  children?: React.ReactNode;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, className, children, ...props }) => (
  <div 
    className={`gba:tabs-trigger ${className || ''}`}
    data-value={value}
    data-testid="tabs-trigger-component"
    {...props}
  >
    {children}
  </div>
);
