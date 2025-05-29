'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { BusinessAppContextProps } from '../../../common/BusinessAppContext';

/**
 * Employee Profile Module
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
export const EmployeeProfile: React.FC<BusinessAppContextProps> = ({ 
  userInfo,
  accessToken,
  activeStructureId
}) => {
  const { t } = useTranslation('lowcoder');
  
  // Define tab keys
  const TAB_KEYS = {
    summary: 'summary',
    details: 'details',
    employment: 'employment',
    documents: 'documents',
    performance: 'performance',
    absences: 'absences'
  };
  
  // Initialize active tab from URL hash or default to summary
  const [activeTab, setActiveTab] = useState(TAB_KEYS.summary);
  
  // Update the URL hash when the active tab changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Get the current hash without the # symbol
      const currentHash = window.location.hash.replace('#', '');
      
      // Only update if the hash doesn't match the active tab
      if (currentHash !== activeTab) {
        window.location.hash = activeTab;
      }
    }
  }, [activeTab]);
  
  // Set the active tab based on the URL hash when the component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      
      // Check if the hash corresponds to a valid tab
      if (hash && Object.values(TAB_KEYS).includes(hash)) {
        setActiveTab(hash);
      } else if (!hash) {
        // If no hash, set to default and update URL
        setActiveTab(TAB_KEYS.summary);
        window.location.hash = TAB_KEYS.summary;
      }
    }
  }, []);
  
  // Fetch employee data using our custom GraphQL hook - we don't need to skip based on structureId anymore
  const { loading, error, employee, feedback, absenceEntitlements, performanceGoals } = useEmployeeData(
    accessToken,
    activeStructureId ?? '',
    userInfo?.employeeDetails?.employeeId ?? ''
  );

  // We can add additional initialization logic here if needed in the future

  // Handle loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner size="large" />
      </div>
    );
  }

  // Handle error state
  if (error) {
    // Show error notification
    notification.error({
      message: t('common.error'),
      description: t('employee_profile.error_loading_data')
    });
    return (
      <div className="flex justify-center items-center h-full text-red-600">
        <p className="text-xl font-medium">{t('common.error')}</p>
        <p>{t('employee_profile.error_loading_data')}</p>
      </div>
    );
  }

  // Handle no data
  if (!employee) {
    return (
      <div className="flex justify-center items-center h-full text-gray-600">
        <p className="text-xl font-medium">{t('common.not_found')}</p>
        <p>{t('employee_profile.employee_not_found')}</p>
      </div>
    );
  }

  // Define tab items for the Tabs component
  const getTabItems = () => [
    {
      key: TAB_KEYS.summary,
      label: t('employee_profile.employee_tabs.summary'),
      children: (
        <SummaryTab 
          employee={employee} 
          employeeFeedback={feedback ?? []}
        />
      )
    },
    {
      key: TAB_KEYS.details,
      label: t('employee_profile.employee_tabs.details'),
      children: (
        <DetailsTab 
          employee={employee}
        />
      )
    },
    {
      key: TAB_KEYS.employment,
      label: t('employee_profile.employee_tabs.employment'),
      children: (
        <EmploymentTab 
          employee={employee}
        />
      )
    },
    {
      key: TAB_KEYS.documents,
      label: t('employee_profile.employee_tabs.documents'),
      children: (
        <DocumentsTab 
          employee={employee}
        />
      )
    },
    {
      key: TAB_KEYS.performance,
      label: t('employee_profile.employee_tabs.performance_feedback'),
      children: (
        <PerformanceTab 
          employee={employee}
          employeeFeedback={feedback ?? []}
          employeePerformanceGoal={performanceGoals ?? []}
        />
      )
    },
    {
      key: TAB_KEYS.absences,
      label: t('hr_absences.absences'),
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
      className="w-full"
      destroyInactiveTabPane
    />
  );
  
  // Get the tab content based on the active tab
  const getTabContent = () => {
    const activeTabItem = tabItems.find(tab => tab.key === activeTab);
    return activeTabItem ? activeTabItem.children : null;
  };

  return (
    <div className="employee-profile w-full h-full">
      <ScreenBody className="h-full w-full">
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
          className="w-full max-w-full mx-auto px-4"
        />
      </ScreenBody>
    </div>
  );
};

export default EmployeeProfile;