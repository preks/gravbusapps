import React, { useState } from 'react';
// Using PageLayout headerSubViews pattern like team expenses implementation
import { PiGauge, PiListBullets, PiChartBar, PiCalendarBlank } from 'react-icons/pi';
import { PageLayout } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '../../../../../common/BusinessAppContext';

// 🚀 OPTIMIZED: Using new organized tab structure following manager-absences pattern
import { DashboardTab, AbsenceListTab, CalendarTab, ReportsTab } from './components/tabs';
import { AbsenceDetails } from './components/pages/AbsenceDetails';
import { useDashboardData } from './hooks/useDashboardData';
import { AbsenceDetailsFilter } from './types';

export interface BackofficeAbsencesProps extends BusinessAppContextProps {}

const BackofficeAbsences: React.FC<BackofficeAbsencesProps> = ({ accessToken, userInfo }) => {
  // State for current view/page - following manager-absences pattern
  const [currentView, setCurrentView] = useState<'tabs' | 'absence-details'>('tabs');
  // State for active tab within the tabs view
  const [activeTab, setActiveTab] = useState('dashboard');
  // State for absence details page filters
  const [absenceDetailsFilter, setAbsenceDetailsFilter] = useState<AbsenceDetailsFilter>({});

  // State for time filter
  const [timeFilter, setTimeFilter] = useState<'current-year' | 'quarter' | 'month' | 'everything'>('current-year');

  // 🚀 OPTIMIZED: Single comprehensive dashboard query with server-side aggregations
  // Replaces multiple individual API calls with one efficient request
  const dashboardData = useDashboardData({ accessToken, userInfo, timeFilter });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Navigation handlers - following manager-absences pattern
  const handleNavigateToAbsenceDetails = (month: string, year: number = new Date().getFullYear()) => {
    // Calculate start and end dates for the selected month
    const monthIndex = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ].findIndex(m => m.startsWith(month.substring(0, 3)));
    
    if (monthIndex === -1) return;
    
    const startDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
    
    // Create a date for the last day of the month (avoiding timezone issues)
    const lastDayOfMonth = new Date(year, monthIndex + 1, 0);
    const endDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDayOfMonth.getDate()).padStart(2, '0')}`;
    const shortMonth = month.substring(0, 3);
    
    // Set filters and navigate to details page
    setAbsenceDetailsFilter({
      month: shortMonth,
      startDate,
      endDate
    });
    setCurrentView('absence-details');
  };

  const handleNavigateBackToDashboard = () => {
    setCurrentView('tabs');
    setActiveTab('dashboard');
    // Clear any filters when returning to dashboard
    setAbsenceDetailsFilter({});
  };

  // Handle navigation to absence details with filters (status, date range, etc.)
  const handleNavigateToAbsenceDetailsWithFilters = (filters: AbsenceDetailsFilter) => {
    setAbsenceDetailsFilter(filters);
    setCurrentView('absence-details');
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
      label: 'Calendar View',
      icon: <PiCalendarBlank className="w-5 h-5" />,
    },
    {
      key: 'reports',
      label: 'Reports',
      icon: <PiChartBar className="w-5 h-5" />,
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardTab
            accessToken={accessToken}
            userInfo={userInfo}
            dashboardData={dashboardData}
            onMonthClick={handleNavigateToAbsenceDetails}
            timeFilter={timeFilter}
            onTimeFilterChange={setTimeFilter}
            onNavigateToDetails={handleNavigateToAbsenceDetailsWithFilters}
          />
        );
      case 'absence-list':
        return (
          <AbsenceListTab 
            accessToken={accessToken} 
            userInfo={userInfo}
            dashboardData={dashboardData}
          />
        );

      case 'calendar':
        return (
          <CalendarTab 
            accessToken={accessToken} 
            userInfo={userInfo}
            dashboardData={dashboardData}
          />
        );
      case 'reports':
        return (
          <ReportsTab 
            accessToken={accessToken} 
            userInfo={userInfo}
            dashboardData={dashboardData}
          />
        );
      default:
        return null;
    }
  };

  // Render based on current view - following manager-absences pattern
  if (currentView === 'absence-details') {
    // Convert special "NO_DEPARTMENT_SPECIAL" identifier back to display name
    const displayDepartment = absenceDetailsFilter.department === 'NO_DEPARTMENT_SPECIAL' 
      ? 'No Department' 
      : absenceDetailsFilter.department;

    return (
      <div data-testid="backoffice-absences-container">
        <AbsenceDetails
          accessToken={accessToken}
          userInfo={userInfo}
          month={absenceDetailsFilter.month}
          startDate={absenceDetailsFilter.startDate}
          endDate={absenceDetailsFilter.endDate}
          status={absenceDetailsFilter.status}
          department={displayDepartment}
          departmentId={absenceDetailsFilter.departmentId}
          timeFilter={timeFilter}
          onNavigateBack={handleNavigateBackToDashboard}
        />
      </div>
    );
  }

  // Default tabs view
  return (
    <div data-testid="backoffice-absences-container">
      <PageLayout
        headerIcon={<PiCalendarBlank className="w-6 h-6 text-blue-600" />}
        headerTitle="Absence Management Hub (Backoffice)"
        headerDescription="Manage and monitor all absence requests across the organization"
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
        {renderTabContent()}
      </PageLayout>
    </div>
  );
};

export default BackofficeAbsences;
