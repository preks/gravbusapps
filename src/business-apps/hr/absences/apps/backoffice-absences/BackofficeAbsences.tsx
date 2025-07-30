import React, { useState, useEffect } from 'react';
// Using PageLayout headerSubViews pattern like team expenses implementation
import { PiGauge, PiCalendar, PiListBullets, PiChartBar, PiCalendarBlank } from 'react-icons/pi';
import { PageLayout } from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { AbsenceOverview } from './components/AbsenceOverview/AbsenceOverview';

// 🚀 OPTIMIZED: Using only optimized components with centralized dashboard data
import { OptimizedKPISection } from './components/KPISection/OptimizedKPISection';
import OptimizedAbsenceTrends from './components/AbsenceTrends/OptimizedAbsenceTrends';
import { AbsenceReports } from './components/AbsenceReports/AbsenceReports';
import { AbsenceList } from './components/AbsenceList/AbsenceList';
import CalendarList from './components/CalendarList/CalendarList';
import { AbsenceDetails } from './components/AbsenceDetails';
import { useDashboardData } from './hooks/useDashboardData';

export interface BackofficeAbsencesProps extends BusinessAppContextProps {}

const BackofficeAbsences: React.FC<BackofficeAbsencesProps> = ({ accessToken, userInfo }) => {
  // State for current view/page - following manager-absences pattern
  const [currentView, setCurrentView] = useState<'tabs' | 'absence-details'>('tabs');
  // State for active tab within the tabs view
  const [activeTab, setActiveTab] = useState('dashboard');
  // State for absence details page filters
  const [absenceDetailsFilter, setAbsenceDetailsFilter] = useState<{
    month?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  // 🚀 OPTIMIZED: Single comprehensive dashboard query with server-side aggregations
  // Replaces multiple individual API calls with one efficient request
  const dashboardData = useDashboardData({ accessToken, userInfo });

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
          <div className="gba:space-y-8" data-testid="dashboard-content">

            
            {/* Dashboard Components - All optimized */}
                        <OptimizedKPISection
              accessToken={accessToken}
              userInfo={userInfo}
              dashboardData={dashboardData}
            />
            
            <OptimizedAbsenceTrends
              accessToken={accessToken}
              userInfo={userInfo}
              dashboardData={dashboardData}
              onMonthClick={handleNavigateToAbsenceDetails}
            />
            
            {/* Performance Summary */}
            <div className="gba:bg-gray-50 gba:rounded-lg gba:p-4 gba:border">
              <div className="gba:text-sm gba:text-gray-600 gba:text-center">
                <span className="gba:font-medium">Performance Metrics:</span>
                {dashboardData.isLoading ? (
                  <span> Loading dashboard data...</span>
                ) : (
                  <span>
                    {' '}Loaded {dashboardData.totalAbsences} absences, {dashboardData.departmentStats.length} departments, 
                    {dashboardData.monthlyTrends.filter(m => m.total > 0).length} active months in a single optimized query
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      case 'absence-list':
        return (
          <div data-testid="absence-list-content">
            <AbsenceList 
              accessToken={accessToken} 
              userInfo={userInfo}
            />
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

  // Render based on current view - following manager-absences pattern
  if (currentView === 'absence-details') {
    return (
      <div data-testid="backoffice-absences-container">
        <AbsenceDetails
          accessToken={accessToken}
          userInfo={userInfo}
          month={absenceDetailsFilter.month}
          startDate={absenceDetailsFilter.startDate}
          endDate={absenceDetailsFilter.endDate}
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
