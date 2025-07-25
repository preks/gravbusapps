import React, { useState, useEffect } from 'react';
// Using PageLayout headerSubViews pattern like team expenses implementation
import { PiGauge, PiCalendar, PiListBullets, PiChartBar, PiCalendarBlank } from 'react-icons/pi';
import { PageLayout } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { AbsenceOverview } from './components/AbsenceOverview/AbsenceOverview';
import AbsenceTrends from './components/AbsenceTrends/AbsenceTrends';
import KPISection from './components/KPISection/KPISection';
import { AbsenceReports } from './components/AbsenceReports/AbsenceReports';
import { AbsenceList } from './components/AbsenceList/AbsenceList';
import CalendarList from './components/CalendarList/CalendarList';

export interface BackofficeAbsencesProps extends BusinessAppContextProps {}

const BackofficeAbsences: React.FC<BackofficeAbsencesProps> = ({ accessToken, userInfo }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [contentHeader, setContentHeader] = useState<React.ReactNode | null>(null);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Tab view options like in manager expenses
  const viewOptions = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: <PiGauge className="w-5 h-5" />,
    },
    {
      key: 'absence-list',
      label: 'Absence List',
      icon: <PiListBullets className="w-5 h-5" />,
    },
    {
      key: 'calendar',
      label: 'Team Calendar',
      icon: <PiCalendar className="w-5 h-5" />,
    },
    {
      key: 'reports',
      label: 'Absence Reports',
      icon: <PiChartBar className="w-5 h-5" />,
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="gba:space-y-8" data-testid="dashboard-content">
            <AbsenceOverview accessToken={accessToken} userInfo={userInfo} />
            <AbsenceTrends accessToken={accessToken} />
            <KPISection accessToken={accessToken} />
          </div>
        );
      case 'absence-list':
        return (
          <div data-testid="absence-list-content">
            <AbsenceList accessToken={accessToken} userInfo={userInfo} />
          </div>
        );
      case 'calendar':
        return (
          <div data-testid="calendar-content">
            <CalendarList accessToken={accessToken} userInfo={userInfo} />
          </div>
        );
      case 'reports':
        return (
          <div data-testid="reports-content">
            <AbsenceReports accessToken={accessToken} userInfo={userInfo} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div data-testid="backoffice-absences-container">
      <PageLayout
        headerIcon={<PiCalendarBlank className="w-6 h-6 text-purple-600" />}
        headerTitle="Absence Management Hub (Backoffice)"
        headerDescription="Manage team absences, track absence trends, and generate absence reports"
        headerSubViews={{
          value: activeTab,
          onValueChange: handleTabChange,
          items: viewOptions.map((option) => ({
            value: option.key,
            label: option.label,
            icon: option.icon
          }))
        }}
        className="gba:min-h-screen"
      >
        <div className="gba:h-full gba:overflow-auto gba:p-6">
          {renderTabContent()}
        </div>
      </PageLayout>
    </div>
  );
};

export default BackofficeAbsences;
