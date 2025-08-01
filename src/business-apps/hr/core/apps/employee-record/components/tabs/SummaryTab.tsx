'use client';

import React, { useMemo, useState } from 'react';
import { navigateTo } from '@/common/utils/navigationUtils';
import { useEmployeeUpcomingAbsence } from '../../hooks/useEmployeeUpcomingAbsence';
import dayjs from 'dayjs';
import { Employee } from '../../hooks/useEmployeeData';
import { Card, Avatar } from '@newwork/gravity-ui-catalog';
import { ProfileSection } from '../ProfileSection';
import { 
  PiBriefcase, 
  PiStack, 
  PiListNumbers, 
  PiFunction, 
  PiClock, 
  PiCalendarCheck,
  PiLightning,
  PiCalendarX,
  PiCheckCircle
} from 'react-icons/pi';
import { getTranslationFromI18nKeyAndLabel } from '../../../../../../../common/utils/windowUtils';
import { UserInfoProps } from '../../../../../../../common/BusinessAppContext';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { Button } from 'antd';
import JobDetailsDrawer from './JobDetailsDrawer';
import JobFamilyDrawerContent, { getJobFamilyIcon, getJobFamilyTitle } from './drawer-content/JobFamilyDrawerContent';
import JobFunctionDrawerContent, { getJobFunctionIcon, getJobFunctionTitle } from './drawer-content/JobFunctionDrawerContent';
import JobLevelDrawerContent, { getJobLevelIcon, getJobLevelTitle } from './drawer-content/JobLevelDrawerContent';

interface SummaryTabProps {
  employee: Employee;
  accessToken: string;
  currentUserEmployeeId?: string;
  userInfo?: UserInfoProps; // Current user info
  isSelfView: boolean; // Whether user is viewing their own profile
}

/**
 * Summary Tab Component
 * Displays summary information about the employee
 */
// Job information is retrieved from employee.employeePosition

// Employee availability & schedule information comes from employee data
// Specific schedule information should be retrieved from the API

const SummaryTab: React.FC<SummaryTabProps> = ({ employee, accessToken, currentUserEmployeeId, isSelfView }) => {
  // Fetch upcoming absence for this employee
  const { loading: absenceLoading, upcomingAbsence } = useEmployeeUpcomingAbsence(accessToken, employee.id);
  
  // State for managing drawer visibility and content using a single state object
  const [drawerState, setDrawerState] = useState({
    visible: false,
    title: '',
    content: <></> as React.ReactElement, // Empty fragment as initial content
    icon: null as React.ReactNode
  });
  
  // Function to open the drawer with specific content
  const openDrawer = (title: string, content: React.ReactElement, icon: React.ReactNode) => {
    setDrawerState({
      visible: true,
      title,
      content,
      icon
    });
  };
  
  // Function to close the drawer
  const closeDrawer = () => {
    setDrawerState(prevState => ({
      ...prevState,
      visible: false
    }));
  };
  // Get additional attributes from additionalProperties
  const getAdditionalAttributes = () => {
    if (!employee.additionalProperties) return [];
    
    const attributes = [];
    for (const [key, value] of Object.entries(employee.additionalProperties)) {
      if (key !== 'imported') {
        // Try to get a hardcoded label for the key, or use the key itself if no label exists
        const translatedKey = key.charAt(0).toUpperCase() + key.slice(1);
        attributes.push({ 
          key: translatedKey, 
          value: value === null || value === undefined ? '' : String(value)
        });
      }
    }
    
    return attributes;
  };

  const additionalAttributes = getAdditionalAttributes();

  // Map real team members from GraphQL data

  // Map real team members from GraphQL data
  const subordinates = useMemo(() => {
    const tm = employee.employeePosition?.subordinates;
    if (!tm || !Array.isArray(tm)) return [];
    return tm.map((member: any) => ({
      id: member.employee?.id,
      firstName: member.employee?.firstName,
      lastName: member.employee?.lastName,
      displayName: member.employee?.displayName || `${member.employee?.firstName || ''} ${member.employee?.lastName || ''}`.trim(),
      profilePicture: member.employee?.pictureThumbnail,
      position: member.jobPosition?.name ?? '',
    }));
  }, [employee.employeePosition]);

  return (
      <div className="gba:summary-tab gba:space-y-8" data-testid="summary-tab-container">
        {/* Summary Overview Headline with Action Button */}
      <div className="gba:flex gba:justify-between gba:items-start" data-testid="summary-header">
        <div className="gba:summary-header">
          <div
            className="gba:font-bold gba:text-2xl"
            data-testid="summary-title"
          >
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:hr_employee.summary_overview",
              "Employee Overview"
            )}
          </div>
          <div
            className="gba:text-gray-500 gba:text-lg"
            data-testid="summary-description"
          >
            {getTranslationFromI18nKeyAndLabel(
              "lowcoder:hr_employee.summary_description",
              "View and edit employee profile"
            )}
          </div>
        </div>
        
        {/* Action Button - Only visible when viewing own profile */}
        {isSelfView && useMemo(() => (
          <div>
            <AppActionButton 
              data-testid="employee-action-button"
              variant="primary"
              contextsArray={[FlowContextName.employeeEntity]}
              externalContextData={{
                employeeId: employee?.id
              }}
              prefixDataTestId="employee-action"
              accessToken={accessToken}
              autoExecuteSingleAction={true}
              deferMainContextRequestsUntilClick={true}
            >
              {getTranslationFromI18nKeyAndLabel(
                "lowcoder:hr_employee.action",
                "Actions"
              )}
            </AppActionButton>
          </div>
        ), [employee?.id, accessToken])}
      </div>
      
      {/* Main grid layout for content blocks */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6">
        {/* Organization Chart Section */}
        <div className="gba:lg:col-span-1 gba:xl:col-span-1">
          <Card 
            variant="outlined"
            className="gba:shadow-md gba:hover:shadow-lg gba:border gba:border-gray-200 gba:transition-all" 
            style={{ minHeight: '420px', backgroundColor: 'white' }}
            data-testid="summary-section-organization-chart"
          >
            <div className="gba:mb-6 gba:border-b gba:border-gray-200 gba:pb-2">
              <h3 className="gba:text-xl gba:font-semibold gba:text-blue-700">Organization Chart</h3>
            </div>
            <div className="gba:p-4 gba:overflow-hidden gba:flex gba:flex-col gba:justify-center gba:items-center">
              <div className="gba:flex gba:flex-col gba:items-center" style={{ maxHeight: '650px', overflowY: 'auto', overflowX: 'hidden', padding: '0.5rem' }}>
                {/* Supervisor */}
                {employee.employeePosition?.supervisor && employee.employeePosition?.supervisor.id !== employee.id && (
                  <div className="gba:flex gba:flex-col gba:items-center">
                    <a 
                      className="gba:cursor-pointer gba:transition-transform gba:hover:scale-105 gba:flex gba:flex-col gba:items-center"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        const url = new URL(window.location.href);
                        url.searchParams.set('employeeId', employee.employeePosition?.supervisor?.id || '');
                        window.history.pushState({}, '', url.toString());
                      }}
                      data-testid="supervisor-link"
                    >
                      <Avatar
                        src={employee.employeePosition.supervisor.pictureThumbnail ? `data:image/gif;base64,${employee.employeePosition.supervisor.pictureThumbnail}` : undefined}
                        initials={`${employee.employeePosition.supervisor.firstName?.[0] || ''}${employee.employeePosition.supervisor.lastName?.[0] || ''}`}
                        alt={`${employee.employeePosition.supervisor.firstName} ${employee.employeePosition.supervisor.lastName}`}
                        // @ts-ignore - Type issue in gravity-ui-catalog for contentType
                        contentType={employee.employeePosition.supervisor.pictureThumbnail ? 'image' : 'initials'}
                        // @ts-ignore - Type issue in gravity-ui-catalog for size
                        size="xl"
                        // @ts-ignore - Type issue in gravity-ui-catalog for shape
                        shape="circle"
                        // @ts-ignore - Type issue in gravity-ui-catalog for appearance
                        appearance="gradient"
                      />
                      <div className="gba:mt-2 gba:text-center">
                        <div className="gba:font-medium gba:text-sm gba:text-blue-600 gba:hover:underline">
                          {employee.employeePosition.supervisor.displayName}
                        </div>
                        <div className="gba:text-xs gba:text-gray-500">
                          {employee.employeePosition?.supervisor?.employeePosition?.jobPosition?.name ?? ''}
                        </div>
                      </div>
                    </a>
                    <div className="gba:w-px gba:h-6 gba:bg-gray-200 gba:mx-auto gba:my-1"></div>
                  </div>
              )}
              
                {/* Current Employee */}
                <div className="gba:flex gba:flex-col gba:items-center">
                  <div className="gba:ring-2 gba:ring-blue-400 gba:rounded-full gba:p-1">
                    <Avatar
                      src={employee.pictureThumbnail ? `data:image/gif;base64,${employee.pictureThumbnail}` : undefined}
                      initials={`${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`}
                      alt={`${employee.firstName} ${employee.lastName}`}
                      // @ts-ignore - Type issue in gravity-ui-catalog for contentType
                      contentType={employee.pictureThumbnail ? 'image' : 'initials'}
                      // @ts-ignore - Type issue in gravity-ui-catalog for size
                      size="xl"
                      // @ts-ignore - Type issue in gravity-ui-catalog for shape
                      shape="circle"
                      // @ts-ignore - Type issue in gravity-ui-catalog for appearance
                      appearance="gradient"
                    />
                  </div>
                  <div className="gba:mt-2 gba:text-center">
                    <div className="gba:font-medium gba:text-sm">
                      {employee.displayName}
                    </div>
                    <div className="gba:text-xs gba:text-gray-500">
                      {employee.employeePosition?.jobPosition?.name || ''}
                    </div>
                  </div>
                  {subordinates.length > 0 && <div className="gba:w-px gba:h-6 gba:bg-gray-200 gba:mx-auto gba:my-1"></div>}
                </div>
              </div>
              
              {/* Subordinates */}
              {subordinates.length > 0 && (
                <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4 gba:w-full">
                  {subordinates.map((member) => (
                    <div key={member.id} className="gba:flex gba:justify-center gba:mb-2">
                      <a href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          const url = new URL(window.location.href);
                          url.searchParams.set('employeeId', member.id);
                          window.history.pushState({}, '', url.toString());
                        }}
                        className="gba:cursor-pointer gba:hover:opacity-90 gba:flex gba:flex-col gba:items-center"
                        title={`View ${member.displayName}'s profile`}
                        data-testid={`team-member-link-${member.id}`}
                      >
                        <Avatar
                          src={member.profilePicture ? `data:image/gif;base64,${member.profilePicture}` : undefined}
                          initials={`${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`}
                          alt={`${member.firstName} ${member.lastName}`}
                          // @ts-ignore - Type issue in gravity-ui-catalog for contentType
                          contentType={member.profilePicture ? 'image' : 'initials'}
                          // @ts-ignore - Type issue in gravity-ui-catalog for size
                          size="xl"
                          // @ts-ignore - Type issue in gravity-ui-catalog for shape
                          shape="circle"
                          // @ts-ignore - Type issue in gravity-ui-catalog for appearance
                          appearance="gradient"
                        />
                        <div className="gba:mt-2 gba:text-center gba:w-full">
                          <div className="gba:font-medium gba:text-sm gba:text-blue-600 gba:hover:underline">
                            {member.displayName}
                          </div>
                          <div className="gba:text-xs gba:text-gray-500 gba:truncate gba:w-full gba:text-center gba:px-1">
                            {member.position}
                          </div>
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
              )}              
            </div>
          </Card>
        </div>

        
        {/* Job Information Section */}
        <div className="gba:lg:col-span-1 gba:xl:col-span-1">
          <Card 
            variant="outlined"
            className="gba:shadow-md gba:hover:shadow-lg gba:border gba:border-gray-200 gba:transition-all" 
            style={{ minHeight: '420px', backgroundColor: 'white' }}
            data-testid="summary-section-job-information"
          >
            <div className="gba:mb-6 gba:border-b gba:border-gray-200 gba:pb-2">
              <h3 className="gba:text-xl gba:font-semibold gba:text-blue-700">Job Information</h3>
            </div>
            <div className="gba:p-4">
              <div className="gba:space-y-4">
                <div className="gba:flex gba:items-center">
                  <PiBriefcase className="gba:h-5 gba:w-5 gba:text-gray-400 gba:mr-3" />
                  <div>
                    <div className="gba:text-sm gba:font-medium gba:text-gray-900">Job Profile</div>
                    <div className="gba:text-sm gba:text-gray-600">{employee.employeePosition?.jobPosition?.name ?? "Not assigned"}</div>
                  </div>
                </div>
                
                {/* Optional Job Family section - only show if data is available */}
                {employee.employeePosition?.jobPosition?.name && (
                  <div className="gba:flex gba:items-center">
                    <PiStack className="gba:h-5 gba:w-5 gba:text-gray-400 gba:mr-3" />
                    <div className="gba:w-full">
                      <div className="gba:text-sm gba:font-medium gba:text-gray-900">Job Family</div>
                      <button 
                        onClick={() => openDrawer(
                          getJobFamilyTitle(employee),
                          <JobFamilyDrawerContent 
                            employee={employee} 
                            accessToken={accessToken} 
                          />,
                          getJobFamilyIcon()
                        )}                        
                        className="gba:text-sm gba:text-blue-600 gba:hover:underline gba:text-left gba:w-full"
                        data-testid="job-family-button"
                      >
                        {/* Display job family from updated data structure, fallback to organizationalUnit name */}
                        {employee.employeePosition?.jobPosition?.jobFunction?.jobFamily?.value || "Not assigned"}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Optional Job Function section - only show if data is available */}
                {employee.employeePosition?.jobPosition?.name && (
                  <div className="gba:flex gba:items-center">
                    <PiFunction className="gba:h-5 gba:w-5 gba:text-gray-400 gba:mr-3" />
                    <div className="gba:w-full">
                      <div className="gba:flex gba:justify-between gba:w-full">
                        <div className="gba:text-sm gba:font-medium gba:text-gray-900">Job Function</div>
                      </div>
                      <button 
                        onClick={() => openDrawer(
                          getJobFunctionTitle(employee),
                          <JobFunctionDrawerContent 
                            employee={employee} 
                            accessToken={accessToken} 
                            isVisible={true}
                          />,
                          getJobFunctionIcon()
                        )}                        
                        className="gba:text-sm gba:text-blue-600 gba:hover:underline gba:text-left gba:w-full"
                        data-testid="job-function-button"
                      >
                        {employee.employeePosition?.jobPosition?.jobFunction?.name || "Not assigned"}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Optional Job Level section - only show if data is available */}
                {employee.employeePosition?.jobPosition?.name && (
                  <div className="gba:flex gba:items-center">
                    <PiListNumbers className="gba:h-5 gba:w-5 gba:text-gray-400 gba:mr-3" />
                    <div className="gba:w-full">
                      <div className="gba:text-sm gba:font-medium gba:text-gray-900">Job Level</div>
                      <button 
                        onClick={() => openDrawer(
                          getJobLevelTitle(employee),
                          <JobLevelDrawerContent 
                            employee={employee}
                            accessToken={accessToken} 
                          />,
                          getJobLevelIcon()
                        )}
                        className="gba:text-sm gba:text-blue-600 gba:hover:underline gba:text-left gba:w-full"
                        data-testid="job-level-button"
                      >
                        {employee.employeePosition?.jobPosition?.jobLevel?.name || "Not assigned"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
        
        {/* Availability & Schedule Section */}
        <div className="gba:lg:col-span-1 gba:xl:col-span-1">
          <Card 
            variant="outlined"
            className="gba:shadow-md gba:hover:shadow-lg gba:border gba:border-gray-200 gba:transition-all" 
            style={{ minHeight: '420px', backgroundColor: 'white' }}
            data-testid="summary-section-availability"
          >
            <div className="gba:mb-6 gba:border-b gba:border-gray-200 gba:pb-2">
              <h3 className="gba:text-xl gba:font-semibold gba:text-blue-700">Availability & Schedule</h3>
            </div>
            <div className="gba:p-4">
              <div className="gba:space-y-4">
                {/* Status display */}
                <div className="gba:flex gba:items-center">
                  <PiCheckCircle className="gba:h-5 gba:w-5 gba:text-green-500 gba:mr-3" data-testid="current-status-icon" />
                  <div>
                    <div className="gba:text-sm gba:font-medium gba:text-gray-900">Current Status</div>
                    <div className="gba:text-sm gba:text-gray-600">Available</div>
                  </div>
                </div>
                
                {/* Weekly schedule */}
                <div className="gba:grid gba:grid-cols-7 gba:gap-1 gba:items-center">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                    // Use actual working hours from employee data
                    const hoursKey = `${day}Hours` as keyof typeof employee.workingHours[0];
                    const dayHours = employee.workingHours?.[0]?.[hoursKey] as number;
                    const isWorkDay = dayHours > 0;
                    return (
                      <div key={day} className="gba:text-center">
                        <div className="gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase">{day.slice(0, 3)}</div>
                        <div className={`gba:h-2 gba:rounded-full gba:mt-1 ${isWorkDay ? 'gba:bg-blue-500' : 'gba:bg-gray-200'}`}></div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Timezone */}
                <div className="gba:flex gba:items-center">
                  <PiClock className="gba:h-5 gba:w-5 gba:text-gray-400 gba:mr-3" />
                  <div>
                    <div className="gba:text-sm gba:font-medium gba:text-gray-900">Timezone</div>
                    <div className="gba:text-sm gba:text-gray-600">Europe/Berlin</div>
                  </div>
                </div>
                
                {/* Working hours */}
                <div className="gba:flex gba:items-center">
                  <PiCalendarCheck className="gba:h-5 gba:w-5 gba:text-gray-400 gba:mr-3" />
                  <div>
                    <div className="gba:text-sm gba:font-medium gba:text-gray-900">Weekly Hours</div>
                    <div className="gba:text-sm gba:text-gray-600">{employee.workingHours?.[0]?.fullTimeEquivalent ? `${employee.workingHours[0].fullTimeEquivalent} hours/week` : 'Not specified'}</div>
                  </div>
                </div>
                
                {/* Quick Actions - Only visible when user is viewing their own profile */}
                {currentUserEmployeeId && currentUserEmployeeId === employee.id && (
                  <div className="gba:mt-4 gba:border-t gba:border-gray-200 gba:pt-4">
                    <div className="gba:flex gba:items-center gba:mb-3">
                      <PiLightning className="gba:h-5 gba:w-5 gba:text-gray-400 gba:mr-3" />
                      <div className="gba:text-sm gba:font-medium gba:text-gray-900" data-testid="quick-actions-heading">Quick Actions</div>
                    </div>
                    <div className="gba:grid gba:grid-cols-2 gba:gap-2 gba:w-full">
                      <Button 
                          type="default" 
                        className="gba:hover:bg-gray-100 gba:w-full"
                        data-testid="clock-in-button"
                        onClick={() => {
                          // Clock in action logic would go here
                          console.log('Clock in clicked');
                        }}
                      >
                        <span data-testid="clock-in-button-text">Clock In</span>
                      </Button>
                      <Button  
                        type="default" 
                        className="gba:hover:bg-gray-100 gba:w-full"
                        data-testid="clock-out-button"
                        onClick={() => {
                          // Clock out action logic would go here
                          console.log('Clock out clicked');
                        }}
                      >
                        <span data-testid="clock-out-button-text">Clock Out</span>
                      </Button>
                    </div>
                    <div className="gba:mt-2">
                      <Button 
                        type="default" 
                        className="gba:hover:bg-gray-100 gba:w-full"
                        data-testid="request-absence-button"
                        onClick={() => {
                          navigateTo('/platform/employee-record?tab=absences');
                        }}
                      >
                        <span data-testid="request-absence-button-text">Request Absence</span>
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Upcoming Absence Section */}
                {upcomingAbsence && (
                  <div className="gba:mt-4 gba:border-t gba:border-gray-200 gba:pt-4" data-testid="upcoming-absence-section">
                    <div className="gba:flex gba:items-center gba:mb-3">
                      <PiCalendarX className="gba:h-5 gba:w-5 gba:text-gray-400 gba:mr-3" />
                      <div className="gba:text-sm gba:font-medium gba:text-gray-900" data-testid="upcoming-absence-heading">Next Planned Absence</div>
                    </div>
                    <div className="gba:bg-gray-50 gba:p-3 gba:rounded gba:border gba:border-gray-200">
                      <div className="gba:flex gba:justify-between gba:items-center">
                        <div>
                          <p className="gba:text-sm gba:font-medium" data-testid="absence-type">{upcomingAbsence.type.value} - {upcomingAbsence.calendarDays} days</p>
                          <div className="gba:flex gba:items-center gba:mt-1">
                            <span className="gba:text-xs gba:text-gray-500" data-testid="absence-dates">
                              {dayjs(upcomingAbsence.startDate).format('MMM DD')} - {dayjs(upcomingAbsence.endDate).format('MMM DD, YYYY')}
                            </span>
                          
                          </div>
                        </div>
                        <div className="gba:bg-green-100 gba:text-green-800 gba:text-xs gba:px-2 gba:py-1 gba:rounded" data-testid="absence-status">
                          {upcomingAbsence.status}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {absenceLoading && !upcomingAbsence && (
                  <div className="gba:mt-4 gba:border-t gba:border-gray-200 gba:pt-4 gba:text-center gba:text-sm gba:text-gray-500" data-testid="loading-absence">
                    Loading upcoming absence...
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
        
        {/* Additional Attributes Section */}
        {additionalAttributes.length > 0 && (
          <div className="gba:lg:col-span-1 gba:xl:col-span-1">
            <ProfileSection 
              title="Additional Attributes"
              data={additionalAttributes.map(attr => ({
                label: attr.key,
                value: attr.value
              }))}
              columns={1}
            />
          </div>
        )}
      </div>
      
      {/* Job Details Drawer */}
      <JobDetailsDrawer
        title={drawerState.title}
        open={drawerState.visible}
        onClose={closeDrawer}
        content={drawerState.content}
        icon={drawerState.icon}
      />
   </div>
  );
};

export default SummaryTab;
