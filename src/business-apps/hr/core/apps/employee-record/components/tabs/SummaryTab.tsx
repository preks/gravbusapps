'use client';

import React, { useMemo } from 'react';
import { Employee } from '../../hooks/useEmployeeData';
import { Card } from '@newwork/gravity-ui-catalog';
import Avatar from '@/business-apps/hr/components/employeeAvatar/EmployeeAvatar';
import { ProfileSection } from '../ProfileSection';
import { 
  PiBriefcase, 
  PiStack, 
  PiListNumbers, 
  PiFunction, 
  PiClock, 
  PiCalendarCheck
} from 'react-icons/pi';

interface SummaryTabProps {
  employee: Employee;
}

/**
 * Summary Tab Component
 * Displays an overview of the employee's information
 */
// Job information is retrieved from employee.employeePosition

// Employee availability & schedule information comes from employee data
// Specific schedule information should be retrieved from the API

const SummaryTab: React.FC<SummaryTabProps> = ({ employee }) => {
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
    <div className="gba:summary-tab">
      {/* Main grid layout for content blocks */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6">
        {/* Organization Chart Section */}
        <div className="gba:lg:col-span-1 gba:xl:col-span-1">
          <h3 className="gba:text-lg gba:font-semibold gba:mb-4 gba:text-gray-800 gba:flex gba:items-center">
            <span className="gba:w-1 gba:h-6 gba:bg-blue-500 gba:rounded gba:mr-3"></span>
            Organization Chart
          </h3>
          <Card className="gba:p-4 gba:overflow-hidden gba:flex gba:flex-col gba:justify-center gba:items-center" style={{ minHeight: '420px' }}>
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
                      profilePicture={employee.employeePosition.supervisor.pictureThumbnail}
                      firstName={employee.employeePosition.supervisor.firstName}
                      lastName={employee.employeePosition.supervisor.lastName}
                      employeeId={employee.employeePosition.supervisor.id}
                      size={64}
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
                    profilePicture={employee.pictureThumbnail}
                    firstName={employee.firstName}
                    lastName={employee.lastName}
                    employeeId={employee.id}
                    size={64}
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
                            profilePicture={member.profilePicture}
                            firstName={member.firstName}
                            lastName={member.lastName}
                            employeeId={member.id}
                            size={56}
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
          <h3 className="gba:text-lg gba:font-semibold gba:mb-4 gba:text-gray-800 gba:flex gba:items-center">
            <span className="gba:w-1 gba:h-6 gba:bg-blue-500 gba:rounded gba:mr-3"></span>
            Job Information
          </h3>
          <Card className="gba:p-4" style={{ minHeight: '420px' }}>
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
                  <div>
                    <div className="gba:text-sm gba:font-medium gba:text-gray-900">Job Family</div>
                    <div className="gba:text-sm gba:text-gray-600">{employee.employeePosition?.organizationalUnit?.name || "Not assigned"}</div>
                  </div>
                </div>
              )}
              
              {/* Optional Job Function section - only show if data is available */}
              {employee.employeePosition?.jobPosition?.name && (
                <div className="gba:flex gba:items-center">
                  <PiFunction className="gba:h-5 gba:w-5 gba:text-gray-400 gba:mr-3" />
                  <div>
                    <div className="gba:text-sm gba:font-medium gba:text-gray-900">Job Function</div>
                    <div className="gba:text-sm gba:text-gray-600">{employee.employeePosition?.jobPosition?.name || "Not assigned"}</div>
                  </div>
                </div>
              )}
              
              {/* Optional Job Level section - only show if data is available */}
              {employee.employeePosition?.jobPosition?.name && (
                <div className="gba:flex gba:items-center">
                  <PiListNumbers className="gba:h-5 gba:w-5 gba:text-gray-400 gba:mr-3" />
                  <div>
                    <div className="gba:text-sm gba:font-medium gba:text-gray-900">Job Level</div>
                    <div className="gba:text-sm gba:text-gray-600">{"Not assigned"}</div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
        
        {/* Availability & Schedule Section */}
        <div className="gba:lg:col-span-1 gba:xl:col-span-1">
          <h3 className="gba:text-lg gba:font-semibold gba:mb-4 gba:text-gray-800 gba:flex gba:items-center">
            <span className="gba:w-1 gba:h-6 gba:bg-blue-500 gba:rounded gba:mr-3"></span>
            Availability & Schedule
          </h3>
          <Card className="gba:p-4" style={{ minHeight: '420px' }}>
            <div className="gba:space-y-4">
              {/* Status display */}
              <div className="gba:flex gba:items-center">
                <div className="gba:relative gba:mr-3">
                  <div className="gba:h-5 gba:w-5 gba:rounded-full gba:bg-green-500"></div>
                </div>
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
    </div>
  );
};

export default SummaryTab;
