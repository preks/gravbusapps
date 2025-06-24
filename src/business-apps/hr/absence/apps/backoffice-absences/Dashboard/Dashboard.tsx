import React, { useState, useEffect } from 'react';
import { Tabs, ActionButton } from '@newwork/gravity-ui-catalog';
import { PiGauge, PiCalendar, PiListBullets, PiChartBar, PiCalendarBlank } from 'react-icons/pi';
import { PageLayout } from '@/components/layout/pageLayout/PageLayout';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

import { AbsenceOverview } from '../components/AbsenceOverview/AbsenceOverview';
import { AbsenceReports } from '../components/AbsenceReports/AbsenceReports';
import { AbsenceList } from '../components/AbsenceList/AbsenceList';
import CalendarList from '../components/CalendarList/CalendarList';
import AbsenceTrends from '../components/AbsenceTrends/AbsenceTrends';
import KPISection from '../components/KPISection/KPISection';

export interface DashboardProps extends BusinessAppContextProps {}

const Dashboard: React.FC<DashboardProps> = ({ accessToken, userInfo }) => {
  const [contentHeader, setContentHeader] = useState<React.ReactNode>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab');
    const validTabs = ['dashboard', 'absence-list', 'calendar', 'reports'];
    
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'dashboard');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', key);
    window.history.pushState({}, '', url.toString());
  };

  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tabFromUrl = urlParams.get('tab');
      const validTabs = ['dashboard', 'absence-list', 'calendar', 'reports'];
      const newTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'dashboard';
      setActiveTab(newTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const tabItems = [
    {
      key: 'dashboard',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PiGauge style={{ fontSize: '20px', display: 'inline-block', verticalAlign: 'middle' }} />
          <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>Dashboard</span>
        </div>
      ),
      children: (
        <div className="gba:space-y-8">
          <AbsenceOverview accessToken={accessToken} userInfo={userInfo} />
          <AbsenceTrends accessToken={accessToken} />
          <KPISection accessToken={accessToken} />
        </div>
      ),
    },
    {
      key: 'absence-list',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PiListBullets style={{ fontSize: '20px', display: 'inline-block', verticalAlign: 'middle' }} />
          <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>Absence List</span>
        </div>
      ),
      children: <AbsenceList accessToken={accessToken} />,
    },
    {
      key: 'calendar',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PiCalendar style={{ fontSize: '20px', display: 'inline-block', verticalAlign: 'middle' }} />
          <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>Team Calendar</span>
        </div>
      ),
      children: <CalendarList accessToken={accessToken} userInfo={userInfo} />,
    },
    {
      key: 'reports',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PiChartBar style={{ fontSize: '20px', display: 'inline-block', verticalAlign: 'middle' }} />
          <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>Absence Reports</span>
        </div>
      ),
      children: <AbsenceReports accessToken={accessToken} userInfo={userInfo} />,
    },
  ];

  const activeTabItem = tabItems.find(item => item.key === activeTab) || tabItems[0];

  return (
    <PageLayout
      headerIcon={<PiCalendarBlank color="#a3519a" />}
      headerLabel="Absence Management Hub (Backoffice)"
      headerLabelClassName="gba:whitespace-nowrap"
      pageController={
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems.map(item => ({ key: item.key, label: item.label }))}
          className="w-full"
        />
      }
      contentHeader={contentHeader}
      contentContainer={
        <div className="gba:p-6">
          {activeTabItem.children}
        </div>
      }
    />
  );
};

export default Dashboard;
