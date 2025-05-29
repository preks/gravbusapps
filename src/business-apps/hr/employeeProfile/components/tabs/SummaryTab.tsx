'use client';

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { Employee, EmployeeFeedback } from '../../hooks/useEmployeeData';
import { Card, Badge } from '@newwork/gravity-ui-catalog';
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
// Mock data for job information
const mockJobData = {
  jobProfile: {
    id: 'JP001',
    title: 'Software Engineer',
    level: 'Mid',
    family: 'Engineering',
    function: 'Software Development',
    description: 'Develops and maintains software applications'
  },
  jobFamily: {
    id: 'JF001',
    name: 'Engineering',
    description: 'Technical roles focused on software development and infrastructure'
  },
  jobFunction: {
    id: 'JFN001',
    name: 'Software Development',
    description: 'Development of software applications and systems'
  },
  jobLevel: {
    id: 'JL002',
    name: 'Mid',
    order: 2,
    description: 'Mid-level positions requiring moderate experience'
  }
};

// Mock data for availability & schedule
const mockAvailabilityData = {
  status: 'available', // 'available', 'busy', 'away', 'offline', 'doNotDisturb'
  schedule: {
    monday: { start: '09:00', end: '17:30' },
    tuesday: { start: '09:00', end: '17:30' },
    wednesday: { start: '09:00', end: '17:30' },
    thursday: { start: '09:00', end: '17:30' },
    friday: { start: '09:00', end: '16:00' },
    saturday: { start: '', end: '' },
    sunday: { start: '', end: '' }
  },
  workingHours: 38.5,
  timezone: 'Europe/Berlin',
  outOfOffice: null
};

const SummaryTab: React.FC<SummaryTabProps> = ({ employee, employeeFeedback }) => {
  const { t } = useTranslation('lowcoder');

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
      label: t('employee_profile.details_layout.personal_information_container.first_name'),
      value: getEmployeeFullName(employee)
    },
    {
      label: t('employee_profile.details_layout.personal_information_container.preferred_name'),
      value: employee.preferredName ?? ''
    },
    {
      label: t('employee_profile.employement_layout.employment_profile_container.job_position_input'),
      value: employee.employeePosition?.jobPosition?.name ?? t('employee_profile.left_side_bar.not_assigned')
    },
    {
      label: t('employee_profile.employement_layout.employment_profile_container.organizational_unit_input'),
      value: employee.employeePosition?.organizationalUnit?.name ?? t('employee_profile.left_side_bar.not_assigned')
    },
    {
      label: t('employee_profile.employement_layout.working_conditions_container.hire_date_input'),
      value: employee.workingCondition[0]?.hireDate
        ? dayjs(employee.workingCondition[0].hireDate).format('DD.MM.YYYY')
        : ''
    },
    {
      label: t('employee_profile.details_layout.personal_information_container.languages'),
      value: employee.language?.value ?? ''
    },
    {
      label: t('employee_profile.summary_layout.public_profile_container.business_mail_text'),
      value: businessComms.email
    },
    {
      label: t('employee_profile.summary_layout.public_profile_container.business_phone'),
      value: businessComms.phone
    },
    {
      label: t('employee_profile.summary_layout.public_profile_container.business_mobile'),
      value: businessComms.mobile
    },
    {
      label: t('employee_profile.summary_layout.public_profile_container.manager'),
      value: employee.employeePosition?.supervisor?.id && employee.employeePosition.supervisor.id !== employee.id
        ? `${employee.employeePosition.supervisor.firstName ?? ''} ${employee.employeePosition.supervisor.lastName ?? ''}`.trim() ?? t('employee_profile.left_side_bar.not_assigned')
        : '-'
    },
    {
      label: t('employee_profile.employement_layout.employment_profile_container.location_input'),
      value: employee.employeePosition?.siteLocation?.name ?? t('employee_profile.left_side_bar.not_assigned')
    },
    {
      label: t('employee_profile.employement_layout.employment_profile_container.workspace_input'),
      value: employee.workspace ?? ''
    },
    {
      label: t('employee_profile.summary_layout.public_profile_container.business_email'),
      value: businessComms.email
    },
    {
      label: t('employee_profile.summary_layout.public_profile_container.business_phone'),
      value: businessComms.phone
    },
    {
      label: t('employee_profile.summary_layout.public_profile_container.business_mobile'),
      value: businessComms.mobile
    }
  ].filter(item => item.value);

  // Get additional attributes from additionalProperties
  const getAdditionalAttributes = () => {
    if (!employee.additionalProperties) return [];
    
    const attributes = [];
    for (const [key, value] of Object.entries(employee.additionalProperties)) {
      if (key !== 'imported') {
        // Try to get a translated label for the key, or use the key itself if no translation exists
        const translatedKey = t(`employee_profile.additional_attributes.${key.toLowerCase()}`, key);
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
        sender: `${firstName} ${lastName}`.trim() || t('employee_profile:unknown_sender'),
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
    <div className="summary-tab">
      {/* Main grid layout for content blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Organization Chart Section */}
        <div className="lg:col-span-1 xl:col-span-1">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
            <span className="w-1 h-6 bg-blue-500 rounded mr-3"></span>
            {t('employee_profile.summary_layout.organization_chart')}
          </h3>
          <Card className="p-4 overflow-hidden">
            <div className="flex flex-col items-center space-y-6" style={{ height: '580px', maxHeight: '580px', overflowY: 'auto', overflowX: 'hidden' }}>
            {/* Supervisor */}
            {employee.employeePosition?.supervisor && employee.employeePosition.supervisor.id !== employee.id && (
              <div className="flex flex-col items-center">
                <a 
                  href={`/platform/employee-profile/${employee.employeePosition.supervisor.id}`}
                  className="cursor-pointer transition-transform hover:scale-105 flex flex-col items-center"
                  title={`View ${employee.employeePosition.supervisor.firstName} ${employee.employeePosition.supervisor.lastName}'s profile`}
                >
                  <Avatar
                    profilePicture={employee.employeePosition.supervisor.pictureThumbnail}
                    firstName={employee.employeePosition.supervisor.firstName}
                    lastName={employee.employeePosition.supervisor.lastName}
                    employeeId={employee.employeePosition.supervisor.id}
                    size={64}
                  />
                  <div className="mt-2 text-center">
                    <div className="font-medium text-sm text-blue-600 hover:underline">
                      {employee.employeePosition.supervisor.firstName} {employee.employeePosition.supervisor.lastName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {employee.employeePosition?.supervisor?.employeePosition?.jobPosition?.name ?? ''}
                    </div>
                  </div>
                </a>
                <div className="w-px h-6 bg-gray-200 mx-auto"></div>
              </div>
            )}
            {/* Current Employee */}
            <div className="flex flex-col items-center">
              <div className="ring-2 ring-blue-400 rounded-full p-1">
                <Avatar
                  profilePicture={employee.pictureThumbnail}
                  firstName={employee.firstName}
                  lastName={employee.lastName}
                  employeeId={employee.id}
                  size={64}
                />
              </div>
              <div className="mt-2 text-center">
                <div className="font-medium text-sm">
                  {employee.firstName} {employee.lastName}
                </div>
                <div className="text-xs text-gray-500">
                  {employee.employeePosition?.jobPosition?.name || ''}
                </div>
              </div>
              {subordinates.length > 0 && <div className="w-px h-6 bg-gray-200 mx-auto"></div>}
            </div>
            {/* Subordinates */}
            {subordinates.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 w-full mx-auto" style={{ maxWidth: '100%' }}>
                {subordinates.map((member) => (
                  <div key={member.id} className="flex justify-center mb-2">
                    <a 
                      href={`/platform/employee-profile/${member.id}`}
                      className="cursor-pointer transition-transform hover:scale-105 flex flex-col items-center"
                      title={`View ${member.firstName} ${member.lastName}'s profile`}
                    >
                      <Avatar
                        profilePicture={member.profilePicture}
                        firstName={member.firstName}
                        lastName={member.lastName}
                        employeeId={member.id}
                        size={56}
                      />
                      <div className="mt-2 text-center w-full">
                        <div className="font-medium text-sm text-blue-600 hover:underline">
                          {member.firstName} {member.lastName}
                        </div>
                        <div className="text-xs text-gray-500 truncate w-full text-center px-1">
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
        <div className="lg:col-span-1 xl:col-span-1">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
            <span className="w-1 h-6 bg-blue-500 rounded mr-3"></span>
            {t('employee_profile.summary_layout.job_information_title', 'Job Information')}
          </h3>
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center">
                <PiBriefcase className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Job Profile</div>
                  <div className="text-sm text-gray-600">{employee.employeePosition?.jobPosition?.name ?? mockJobData.jobProfile.title}</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <PiStack className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Job Family</div>
                  <div className="text-sm text-gray-600">{mockJobData.jobFamily.name}</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <PiFunction className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Job Function</div>
                  <div className="text-sm text-gray-600">{mockJobData.jobFunction.name}</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <PiListNumbers className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Job Level</div>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-2">{mockJobData.jobLevel.name}</span>
                    <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">{mockJobData.jobLevel.name}</Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center">
                <PiBuildings className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Department</div>
                  <div className="text-sm text-gray-600">{employee.employeePosition?.organizationalUnit?.name ?? 'Engineering'}</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <PiCurrencyDollar className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Cost Center</div>
                  <div className="text-sm text-gray-600">{employee.employeePosition?.costCenter?.name ?? 'CC-1001 Engineering'}</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Availability & Schedule Section */}
        <div className="lg:col-span-1 xl:col-span-1">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
            <span className="w-1 h-6 bg-blue-500 rounded mr-3"></span>
            {t('employee_profile.summary_layout.availability_schedule_title', 'Availability & Schedule')}
          </h3>
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Current Status</div>
                <Badge className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full flex items-center">
                  <PiClock className="h-3 w-3 mr-1" />
                  {mockAvailabilityData.status === 'available' ? 'Available' : 'Busy'}
                </Badge>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">Working Hours</h4>
                <div className="space-y-2">
                  {Object.entries(mockAvailabilityData.schedule).map(([day, hours]) => (
                    hours.start && (
                      <div key={day} className="flex justify-between text-sm">
                        <span className="capitalize">{day}</span>
                        <span className="text-gray-600">
                          {hours.start} - {hours.end}
                        </span>
                      </div>
                    )
                  ))}
                </div>
              </div>
              
              <div className="flex items-center">
                <PiClock className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Timezone</div>
                  <div className="text-sm text-gray-600">{mockAvailabilityData.timezone}</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <PiCalendarCheck className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Weekly Hours</div>
                  <div className="text-sm text-gray-600">{mockAvailabilityData.workingHours} hours/week</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Additional Attributes Section */}
        {additionalAttributes.length > 0 && (
          <div className="lg:col-span-1 xl:col-span-1">
            <ProfileSection 
              title={t('employee_profile.additional_container.additional_title')}
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
        <div className="mb-8 mt-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
            <span className="w-1 h-6 bg-blue-500 rounded mr-3"></span>
            {t('employee_profile.summary_layout.skills_section.feedback_generic_module_title')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {formattedFeedback.map((feedback) => {
              // TypeScript safety - this should never happen due to our filter(Boolean) above
              if (!feedback) return null;
              
              return (
                <Card key={feedback.id || `feedback-${feedback.sender}`} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-5">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 border border-gray-100 shadow-sm">
                        {feedback.avatar && (
                          <img 
                            src={feedback.avatar} 
                            alt={feedback.sender}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-800">{feedback.sender}</h4>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{feedback.date}</span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{feedback.content}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {formattedFeedback.length === 0 && (
        <div className="mt-6 text-center text-gray-500">
          {t('employee_profile.summary_layout.skills_section.feedback_generic_module_no_data')}
        </div>
      )}
    </div>
  );
};

export default SummaryTab;
