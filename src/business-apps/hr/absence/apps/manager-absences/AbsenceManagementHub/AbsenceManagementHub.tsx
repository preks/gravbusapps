import React, { useState, useEffect, useMemo } from 'react';
import { Tabs } from '@newwork/gravity-ui-catalog';
import { PiGauge, PiCalendarBlank, PiListBullets, PiChartBar } from 'react-icons/pi';
import { PageLayout } from '@/components/layout/pageLayout/PageLayout';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

import { AbsenceOverview } from '../components/AbsenceOverview/AbsenceOverview';
import { AbsenceList } from '../components/AbsenceList/AbsenceList';
import KPISection from '../components/KPISection/KPISection';
import { AbsenceReports } from '../components/AbsenceReports/AbsenceReports';
import CalendarList from '../components/CalendarList/CalendarList';

interface AbsenceManagementHubProps extends BusinessAppContextProps {}

export const AbsenceManagementHub: React.FC<AbsenceManagementHubProps> = (props) => {
  const { accessToken, userInfo } = props;


  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab');
    const validTabs = ['dashboard', 'absence-list', 'team-calendar', 'reports'];
    
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      return tabFromUrl;
    } else {

      const defaultTab = 'dashboard';
      const url = new URL(window.location.href);
      url.searchParams.set('tab', defaultTab);
      window.history.replaceState({}, '', url.toString());
      return defaultTab;
    }
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());


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
      const validTabs = ['dashboard', 'absence-list', 'team-calendar', 'reports'];
      const newTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'dashboard';
      setActiveTab(newTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const getTabItems = (accessToken: string, userInfo: any) => [
    {
      key: 'dashboard',
      label: (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiGauge className="gba:text-xl gba:inline-block gba:align-middle" />
          <span className="gba:inline-block gba:align-middle">Dashboard</span>
        </div>
      ),
      children: (
        <>
          <AbsenceOverview accessToken={accessToken} userInfo={userInfo} />
          <div className="gba:mt-8">
            <KPISection accessToken={accessToken} userInfo={userInfo} />
          </div>
        </>
      ),
      renderContentHeader: () => null,
    },
    {
      key: 'absence-list',
      label: (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiListBullets className="gba:text-xl gba:inline-block gba:align-middle" />
          <span className="gba:inline-block gba:align-middle">Absence List</span>
        </div>
      ),
      children: <AbsenceList accessToken={accessToken} userInfo={userInfo} />,
      renderContentHeader: () => null,
    },
    {
      key: 'team-calendar',
      label: (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiCalendarBlank className="gba:text-xl gba:inline-block gba:align-middle" />
          <span className="gba:inline-block gba:align-middle">Team Calendar</span>
        </div>
      ),
      children: <CalendarList accessToken={accessToken} userInfo={userInfo} />,
      renderContentHeader: () => null,
    },
    {
      key: 'reports',
      label: (
        <div className="gba:flex gba:items-center gba:gap-2">
          <PiChartBar className="gba:text-xl gba:inline-block gba:align-middle" />
          <span className="gba:inline-block gba:align-middle">Reports</span>
        </div>
      ),
      children: <AbsenceReports accessToken={accessToken} userInfo={userInfo} />,
      renderContentHeader: () => null,
    },
  ];

  const tabItems = useMemo(
    () => getTabItems(accessToken, userInfo),
    [accessToken, userInfo]
  );

  const activeTabItem = useMemo(() => tabItems.find((item: { key: string }) => item.key === activeTab) || tabItems[0], [tabItems, activeTab]);
  const activeTabContent = activeTabItem?.children;
  const activeTabContentHeader = activeTabItem?.renderContentHeader?.();

  return (
    <PageLayout
      headerIcon={<PiCalendarBlank color="#a3519aff"/>}
      headerLabel="Absence Management Hub (Manager)"
      headerLabelClassName="gba:font-medium gba:self-center gba:text-2xl gba:mb-1"
      pageController={
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems.map((item: { key: string; label: React.ReactNode }) => ({ key: item.key, label: item.label }))}
          className="w-full"
        />
      }
      contentHeader={activeTabContentHeader}
      contentContainer={activeTabContent}
    />
  );
};

export default AbsenceManagementHub;
