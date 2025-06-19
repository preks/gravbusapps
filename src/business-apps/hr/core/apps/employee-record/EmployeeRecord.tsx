'use client';

import React, { useState, useEffect } from 'react';
import { useEmployeeData } from './hooks/useEmployeeData';
import ProfileHeader from './components/ProfileHeader';
import { ScreenBody, Spinner, notification, Tabs } from '@newwork/gravity-ui-catalog';
import { ProfileLayout } from '@/components/layout/profileLayout';

// Tab components
import SummaryTab from './components/tabs/SummaryTab';
import DetailsTab from './components/tabs/DetailsTab';
import EmploymentTab from './components/tabs/EmploymentTab';
import DocumentsTab from './components/tabs/DocumentsTab';
import PerformanceTab from './components/tabs/PerformanceTab';
import AbsencesTab from './components/tabs/AbsencesTab';
import { BusinessAppContextProps } from '../../../../../common/BusinessAppContext';

/**
 * Employee Record Module
 * Displays detailed information about an employee
 */
/**
 * Displays detailed information about an employee.
 *
 * The component fetches the employee data using the `useEmployeeData` hook and displays the data in a tabbed interface.
 * The tabs are:
 * - Summary: displays the employee's basic information and a summary of their performance and absences.
 * - Details: displays the employee's detailed information.
 * - Employment: displays the employee's employment history.
 * - Documents: displays the employee's documents.
 * - Performance: displays the employee's performance feedback and goals.
 * - Absences: displays the employee's absences and entitlements.
 *
 * The component also handles loading and error states by displaying a spinner or an error message.
 *
 * @param {string} employeeId - the ID of the employee to display.
 */
export const EmployeeRecord: React.FC<BusinessAppContextProps> = ({ 
  userInfo,
  accessToken,
  activeStructureId
}) => {
  
  // Define tab keys
  const TAB_KEYS = {
    summary: 'summary',
    details: 'details',
    employment: 'employment',
    documents: 'documents',
    performance: 'performance',
    absences: 'absences'
  };
  
  // Initialize active tab from URL query parameter if available, otherwise default to summary
  const [activeTab, setActiveTab] = useState(() => {
    // Try to get the tab from URL if we're in a browser environment
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab');
      if (tabParam && Object.values(TAB_KEYS).includes(tabParam)) {
        return tabParam;
      }
    }
    return TAB_KEYS.summary;
  });
  // Use employee ID from URL query parameter or default to user info
  const [employeeId, setEmployeeId] = useState(userInfo?.employeeDetails?.employeeId ?? '');
  
  // Update the URL query parameter when the active tab changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const currentTab = searchParams.get('tab');
      
      // Only update if the query param doesn't match the active tab
      if (currentTab !== activeTab) {
        searchParams.set('tab', activeTab);
        
        // Preserve other query parameters like employeeId
        const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
        window.history.pushState({}, '', newUrl);
      }
    }
  }, [activeTab]);
  
  // Set up initial URL parameters and employee ID when the component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      
      // Ensure the default tab is set in URL if not already present
      if (!searchParams.has('tab')) {
        searchParams.set('tab', activeTab);
        const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
        window.history.pushState({}, '', newUrl);
      }

      // Set employee ID from URL query parameter
      const employeeIdParam = searchParams.get('employeeId') ?? searchParams.get('id');
      if (employeeIdParam) {
        setEmployeeId(employeeIdParam);
      }
    }
  }, []);
  
  const { loading, error, employee, feedback, absenceEntitlements, performanceGoals } = useEmployeeData(
    accessToken,
    activeStructureId ?? '',
    employeeId
  );

  // We can add additional initialization logic here if needed in the future

  // Handle loading state
  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-full">
        <Spinner size="large" />
        <p>Loading...</p>
      </div>
    );
  }

  // Handle error state
  if (error) {
    // Show error notification
    notification.error({
      message: "Error",
      description: "Error loading employee data."
    });
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-full gba:text-red-600">
        <p className="gba:text-xl gba:font-medium">Error</p>
        <p>Error loading employee data.</p>
      </div>
    );
  }

  // Handle no data
  if (!employee) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-full gba:text-gray-600">
        <p className="gba:text-xl gba:font-medium">Not Found</p>
        <p>Employee not found.</p>
      </div>
    );
  }

  // Define tab items for the Tabs component
  const getTabItems = () => [
    {
      key: TAB_KEYS.summary,
      label: "Summary",
      children: (
        <SummaryTab 
          employee={employee} 
          employeeFeedback={feedback ?? []}
        />
      )
    },
    {
      key: TAB_KEYS.details,
      label: "Details",
      children: (
        <DetailsTab 
          employee={employee}
          accessToken={accessToken}
        />
      )
    },
    {
      key: TAB_KEYS.employment,
      label: "Employment",
      children: (
        <EmploymentTab 
          employee={employee}
        />
      )
    },
    {
      key: TAB_KEYS.documents,
      label: "Documents",
      children: (
        <DocumentsTab 
          employee={employee}
          accessToken={accessToken}
        />
      )
    },
    {
      key: TAB_KEYS.performance,
      label: "Performance & Feedback",
      children: (
        <PerformanceTab 
          employee={employee}
          accessToken={accessToken}
          employeeFeedback={feedback ?? []}
          employeePerformanceGoal={performanceGoals ?? []}
        />
      )
    },
    {
      key: TAB_KEYS.absences,
      label: "Absences",
      children: (
        <AbsencesTab 
          employee={employee}
          employeeAbsenceEntitlement={absenceEntitlements ?? []}
        />
      )
    }
  ];
  
  // Tab items for the Tabs component
  const tabItems = getTabItems();
  
  // Create tab navigation for the content header
  const tabNavigation = (
    <Tabs
      activeKey={activeTab}
      onChange={setActiveTab}
      items={tabItems.map(item => ({ key: item.key, label: item.label }))}
      className="gba:w-full"
      destroyInactiveTabPane
    />
  );
  
  // Get the tab content based on the active tab
  const getTabContent = () => {
    const activeTabItem = tabItems.find(tab => tab.key === activeTab);
    return activeTabItem ? activeTabItem.children : null;
  };

  return (
    <div className="gba:employee-profile gba:w-full gba:h-full">
      <ScreenBody className="gba:h-full gba:w-full">
        <ProfileLayout
          headerContent={
            <ProfileHeader
              accessToken={accessToken}
              employee={employee}
            />
          }
          contentHeader={tabNavigation}
          contentContainer={getTabContent()}
          headerPlacement="left"
          className="gba:w-full gba:max-w-full gba:mx-auto gba:px-4"
        />
      </ScreenBody>
    </div>
  );
};

export default EmployeeRecord;