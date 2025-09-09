import React, { useState, useCallback } from 'react';
import { PageLayout } from '@newwork/nw-design-system';
import { GaugeIcon, CalendarBlankIcon, ListBulletsIcon, ChartBarIcon } from '@phosphor-icons/react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

import { AbsenceStatisticsSimple } from './components/tabs/dashboard-tab';
import { AbsenceListModern } from './components/tabs/absence-list-tab';
import { CalendarList } from './components/tabs/team-calendar-tab';
import { KPISectionModern } from './components/KPISection/KPISectionModern';
import { AbsenceReports } from './components/tabs/reports-tab';
import { StatisticsTab } from './components/tabs/statistics-tab';
import { WorkLifeBalanceAnalysisPage } from './components/pages/WorkLifeBalanceAnalysisPage';
import { TeamCoverageOptimizerPage } from './components/pages/TeamCoverageOptimizerPage';
import { AbsenceListPage } from './components/pages/AbsenceListPage';
import { MODULE_COLORS } from '@/common/constants/ui';

const moduleColor = MODULE_COLORS.HR;

export interface ManagerAbsencesProps extends BusinessAppContextProps {}

const ManagerAbsences: React.FC<ManagerAbsencesProps> = (props) => {
  const viewOptions = [
    {
      key: 'dashboard',
      icon: <GaugeIcon className="w-5 h-5" />,
      label: 'Dashboard'
    },
    {
      key: 'absence-list',
      icon: <ListBulletsIcon className="w-5 h-5" />,
      label: 'Absence List'
    },
    {
      key: 'team-calendar',
      icon: <CalendarBlankIcon className="w-5 h-5" />,
      label: 'Team Calendar'
    },
    {
      key: 'statistics',
      icon: <ChartBarIcon className="w-5 h-5" />,
      label: 'Statistics'
    },
    {
      key: 'reports',
      icon: <ChartBarIcon className="w-5 h-5" />,
      label: 'Reports'
    }
  ];

  // State for current view/page
  const [currentView, setCurrentView] = useState<'tabs' | 'work-life-balance' | 'team-coverage' | 'absence-list-page'>('tabs');
  // State for active tab within the tabs view
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  // State for absence list page pre-filter
  const [absenceListPreFilter, setAbsenceListPreFilter] = useState<any>(null);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  // Navigation handlers
  const handleNavigateToWorkLifeBalance = useCallback(() => {
    setCurrentView('work-life-balance');
  }, []);

  const handleNavigateToTeamCoverage = useCallback(() => {
    setCurrentView('team-coverage');
  }, []);

  const handleNavigateBackToDashboard = useCallback(() => {
    setCurrentView('tabs');
    setActiveTab('dashboard');
  }, []);

  const handleNavigateBackToStatistics = useCallback(() => {
    setCurrentView('tabs');
    setActiveTab('statistics');
  }, []);

  const handleNavigateToAbsenceListPage = useCallback((preFilter?: any) => {
    setAbsenceListPreFilter(preFilter);
    setCurrentView('absence-list-page');
  }, []);

  // Create tab props for passing to tab components
  const tabProps = {
    ...props,
    onNavigateToWorkLifeBalance: handleNavigateToWorkLifeBalance,
    onNavigateToTeamCoverage: handleNavigateToTeamCoverage,
    onNavigateToAbsenceListPage: handleNavigateToAbsenceListPage
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="gba:space-y-6">
            <AbsenceStatisticsSimple {...props} onNavigateToAbsenceListPage={handleNavigateToAbsenceListPage} />
            <KPISectionModern {...props} onNavigateToAbsenceListPage={handleNavigateToAbsenceListPage} />
          </div>
        );
      case 'absence-list':
        return (
          <div className="gba:space-y-6">
            <AbsenceStatisticsSimple {...props} />
            <AbsenceListModern {...props} />
          </div>
        );
      case 'team-calendar':
        return <CalendarList {...props} />;
      case 'statistics':
        return <StatisticsTab {...tabProps} />;
      case 'reports':
        return <AbsenceReports {...props} />;
      default:
        return null;
    }
  };

  // Render based on current view
  if (currentView === 'work-life-balance') {
    return (
      <WorkLifeBalanceAnalysisPage 
        {...props}
        onNavigateBack={handleNavigateBackToStatistics}
      />
    );
  }

  if (currentView === 'team-coverage') {
    return (
      <TeamCoverageOptimizerPage 
        {...props}
        onNavigateBack={handleNavigateBackToStatistics}
      />
    );
  }

  if (currentView === 'absence-list-page') {
    return (
      <AbsenceListPage 
        {...props}
        onNavigateBack={handleNavigateBackToDashboard}
        preFilter={absenceListPreFilter}
      />
    );
  }

  // Default tabs view
  return (
    <div data-testid="manager-absences-container">
      <PageLayout
        headerIcon={CalendarBlankIcon}
        headerTitle="Absence Management Hub (Manager)"
        headerDescription="Manage team absences, track absence requests, and view team calendar"
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
        <div className="gba:h-full gba:overflow-auto">
          {renderTabContent()}
        </div>
      </PageLayout>
    </div>
  );
};

export default ManagerAbsences; 