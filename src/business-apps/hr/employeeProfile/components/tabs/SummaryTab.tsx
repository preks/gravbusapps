'use client';

import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { Employee, EmployeeFeedback } from '../../hooks/useEmployeeData';
import { Card } from '@newwork/gravity-ui-catalog';
import { formatPhoneNumber, getEmployeeFullName } from '../../utils/formatters';
import { ProfileSection } from '../ProfileSection';
import Avatar from '@/business-apps/hr/components/employeeAvatar/EmployeeAvatar';
import { 
  PiBriefcase, 
  PiStack, 
  PiListNumbers, 
  PiFunction, 
  PiClock, 
  PiCalendarCheck, 
  PiCurrencyDollar,
  PiBuildings
} from 'react-icons/pi';

interface SummaryTabProps {
  employee: Employee;
  employeeFeedback: EmployeeFeedback[];
}

/**
 * Summary Tab Component
 * Displays an overview of the employee's information
 */
// Job information is retrieved from employee.employeePosition

// Employee availability & schedule information comes from employee data
// Specific schedule information should be retrieved from the API

const SummaryTab: React.FC<SummaryTabProps> = ({ employee, employeeFeedback }) => {

  // Get business communication channels
  const getBusinessCommunication = () => {
    if (!employee.communication || !Array.isArray(employee.communication)) return { email: '', phone: '', mobile: '' };
    
    const businessComms = employee.communication.filter(
      comm => comm?.purpose === 'INTERNAL'
    );

    const email = businessComms.find(comm => comm?.channel?.code === 'e-mail');
    const phone = businessComms.find(comm => comm?.channel?.code === 'Phone');
    const mobile = businessComms.find(comm => comm?.channel?.code === 'Mobile');

    return {
      email: email?.value ?? '',
      phone: phone?.value ? formatPhoneNumber(phone.value) : '',
      mobile: mobile?.value ? formatPhoneNumber(mobile.value) : ''
    };
  };

  const businessComms = getBusinessCommunication();

  // Prepare public profile data
  const publicProfileData = [
    {
      label: "Full Name",
      value: getEmployeeFullName(employee)
    },
    {
      label: "Preferred Name",
      value: employee.preferredName ?? ''
    },
    {
      label: "Job Position",
      value: employee.employeePosition?.jobPosition?.name ?? "Not assigned"
    },
    {
      label: "Organizational Unit",
      value: employee.employeePosition?.organizationalUnit?.name ?? "Not assigned"
    },
    {
      label: "Hire Date",
      value: employee.workingCondition[0]?.hireDate
        ? dayjs(employee.workingCondition[0].hireDate).format('DD.MM.YYYY')
        : ''
    },
    {
      label: "Languages",
      value: employee.language?.value ?? ''
    },
    {
      label: "Business Email",
      value: businessComms.email
    },
    {
      label: "Business Phone",
      value: businessComms.phone
    },
    {
      label: "Business Mobile",
      value: businessComms.mobile
    },
    {
      label: "Manager",
      value: employee.employeePosition?.supervisor?.id && employee.employeePosition.supervisor.id !== employee.id
        ? `${employee.employeePosition.supervisor.firstName ?? ''} ${employee.employeePosition.supervisor.lastName ?? ''}`.trim() ?? "Not assigned"
        : '-'
    },
    {
      label: "Location",
      value: employee.employeePosition?.siteLocation?.name ?? "Not assigned"
    },
    {
      label: "Workspace",
      value: employee.workspace ?? ''
    },
    {
      label: "Business Email",
      value: businessComms.email
    },
    {
      label: "Business Phone",
      value: businessComms.phone
    },
    {
      label: "Business Mobile",
      value: businessComms.mobile
    }
  ].filter(item => item.value);

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

  // Format feedback for display
  const formatFeedback = () => {
    if (!employeeFeedback || !Array.isArray(employeeFeedback)) return [];
    
    return employeeFeedback.map(feedback => {
      if (!feedback) return null;
      
      const firstName = feedback.senderEmployee?.firstName ?? '';
      const lastName = feedback.senderEmployee?.lastName ?? '';
      const pictureThumbnail = feedback.senderEmployee?.employeePosition?.employee?.pictureThumbnail;
      
      return {
        id: feedback.senderEmployeeId ?? '',
        content: feedback.feedback ?? '',
        date: feedback.feedbackDate ? dayjs(feedback.feedbackDate).format('MMM D, YYYY') : '',
        sender: `${firstName} ${lastName}`.trim() || 'Unknown Sender',
        avatar: pictureThumbnail
          ? `data:image/jpeg;base64,${pictureThumbnail}`
          : '/assets/default-avatar.png'
      };
    }).filter(Boolean);
  };
  
  const formattedFeedback = formatFeedback();

  // Map real team members from GraphQL data
  const subordinates = useMemo(() => {
    const tm = employee.employeePosition?.subordinates;
    if (!tm || !Array.isArray(tm)) return [];
    return tm.map((member: any) => ({
      id: member.employee?.id,
      firstName: member.employee?.firstName,
      lastName: member.employee?.lastName,
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
          <Card className="gba:p-4 gba:overflow-hidden gba:flex gba:flex-col gba:justify-center gba:items-center">
            <div className="gba:flex gba:flex-col gba:items-center gba:space-y-6" style={{ maxHeight: '580px', overflowY: 'auto', overflowX: 'hidden' }}>
            {/* Supervisor */}
            {employee.employeePosition?.supervisor && employee.employeePosition.supervisor.id !== employee.id && (
              <div className="gba:flex gba:flex-col gba:items-center">
                <a 
                  href={`/platform/employee-profile?id=${employee.employeePosition.supervisor.id}`}
                  className="gba:cursor-pointer gba:transition-transform gba:hover:scale-105 gba:flex gba:flex-col gba:items-center"
                  title={`View ${employee.employeePosition.supervisor.firstName} ${employee.employeePosition.supervisor.lastName}'s profile`}
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
                      {employee.employeePosition.supervisor.firstName} {employee.employeePosition.supervisor.lastName}
                    </div>
                    <div className="gba:text-xs gba:text-gray-500">
                      {employee.employeePosition?.supervisor?.employeePosition?.jobPosition?.name ?? ''}
                    </div>
                  </div>
                </a>
                <div className="gba:w-px gba:h-6 gba:bg-gray-200 gba:mx-auto"></div>
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
                  {employee.firstName} {employee.lastName}
                </div>
                <div className="gba:text-xs gba:text-gray-500">
                  {employee.employeePosition?.jobPosition?.name || ''}
                </div>
              </div>
              {subordinates.length > 0 && <div className="gba:w-px gba:h-6 gba:bg-gray-200 gba:mx-auto"></div>}
            </div>
            {/* Subordinates */}
            {subordinates.length > 0 && (
              <div className="gba:grid gba:grid-cols-2 gba:sm:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:gap-2 gba:w-full gba:mx-auto" style={{ maxWidth: '100%' }}>
                {subordinates.map((member) => (
                  <div key={member.id} className="gba:flex gba:justify-center gba:mb-2">
                    <a 
                      href={`/platform/employee-profile?id=${member.id}`}
                      className="gba:cursor-pointer gba:transition-transform gba:hover:scale-105 gba:flex gba:flex-col gba:items-center"
                      title={`View ${member.firstName} ${member.lastName}'s profile`}
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
                          {member.firstName} {member.lastName}
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
          <Card className="gba:p-4">
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
              
              <div className="gba:flex gba:items-center">
                <PiBuildings className="gba:h-5 gba:w-5 gba:text-gray-400 gba:mr-3" />
                <div>
                  <div className="gba:text-sm gba:font-medium gba:text-gray-900">Department</div>
                  <div className="gba:text-sm gba:text-gray-600">{employee.employeePosition?.organizationalUnit?.name || "Not assigned"}</div>
                </div>
              </div>
              
              <div className="gba:flex gba:items-center">
                <PiCurrencyDollar className="gba:h-5 gba:w-5 gba:text-gray-400 gba:mr-3" />
                <div>
                  <div className="gba:text-sm gba:font-medium gba:text-gray-900">Cost Center</div>
                  <div className="gba:text-sm gba:text-gray-600">{employee.employeePosition?.costCenter?.name || "Not assigned"}</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Availability & Schedule Section */}
        <div className="gba:lg:col-span-1 gba:xl:col-span-1">
          <h3 className="gba:text-lg gba:font-semibold gba:mb-4 gba:text-gray-800 gba:flex gba:items-center">
            <span className="gba:w-1 gba:h-6 gba:bg-blue-500 gba:rounded gba:mr-3"></span>
            Availability & Schedule
          </h3>
          <Card className="gba:p-4">
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
      {/* Feedback Section - Full width */}
      {formattedFeedback.length > 0 && (
        <div className="gba:mb-8 gba:mt-6">
          <h3 className="gba:text-lg gba:font-semibold gba:mb-4 gba:text-gray-800 gba:flex gba:items-center">
            <span className="gba:w-1 gba:h-6 gba:bg-blue-500 gba:rounded gba:mr-3"></span>
            Feedback
          </h3>
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6">
            {formattedFeedback.map((feedback) => {
              // TypeScript safety - this should never happen due to our filter(Boolean) above
              if (!feedback) return null;
              
              return (
                <Card key={feedback.id || `feedback-${feedback.sender}`} className="gba:p-6 gba:hover:shadow-md gba:transition-shadow">
                  <div className="gba:flex gba:items-start">
                    <div className="gba:shrink-0 gba:mr-5">
                      <div className="gba:w-12 gba:h-12 gba:rounded-full gba:overflow-hidden gba:bg-gray-200 gba:border gba:border-gray-100 gba:shadow-sm">
                        {feedback.avatar && (
                          <img 
                            src={feedback.avatar} 
                            alt={feedback.sender}
                            className="gba:w-full gba:h-full gba:object-cover"
                          />
                        )}
                      </div>
                    </div>
                    <div className="gba:grow">
                      <div className="gba:flex gba:justify-between gba:items-start gba:mb-2">
                        <h4 className="gba:font-semibold gba:text-gray-800">{feedback.sender}</h4>
                        <span className="gba:text-sm gba:text-gray-500 gba:bg-gray-100 gba:px-2 gba:py-1 gba:rounded-full">{feedback.date}</span>
                      </div>
                      <p className="gba:text-gray-700 gba:leading-relaxed">{feedback.content}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {formattedFeedback.length === 0 && (
        <div className="gba:mt-6 gba:text-center gba:text-gray-500">
          No feedback data available.
        </div>
      )}
    </div>
  );
};

export default SummaryTab;
