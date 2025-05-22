'use client';

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { 
  PiEnvelopeSimple, 
  PiPhone, 
  PiBuildings, 
  PiUser, 
  PiMapPin, 
  PiCalendar, 
  PiPencilSimple,
  PiVideoCamera,
  PiChat,
  PiCurrencyDollar
} from 'react-icons/pi';
import EmployeeAvatar from '../../components/employeeAvatar/EmployeeAvatar';
import { OnlineStatus } from '../../components/employeeAvatar/types';
import { Employee } from '../hooks/useEmployeeData';
import { formatPhoneNumber, getEmployeeFullName } from '../utils/formatters';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { useProcessExecutorModalContext } from 'sdks/process-executor-sdk';

// TO-DO: ADD TRANSLATION for new availability status labels

// Availability status types
type AvailabilityStatus = 'available' | 'busy' | 'away' | 'offline' | 'doNotDisturb';

// Map from AvailabilityStatus to OnlineStatus
const availabilityStatusToOnlineStatus: Record<AvailabilityStatus, OnlineStatus> = {
  'available': OnlineStatus.ONLINE,
  'busy': OnlineStatus.BUSY,
  'doNotDisturb': OnlineStatus.DO_NOT_DISTURB,
  'away': OnlineStatus.AWAY,
  'offline': OnlineStatus.OFFLINE
};

// Team item type
interface MatrixUnitEmployee {
  matrixUnit: {
    id: string;
    name: string;
  };
}

// Capability item type
interface EmployeeCapability {
  capability: {
    id: string;
    name: string;
  };
}

// Skill item type
interface EmployeeSkill {
  skill: {
    id: string;
    name: string;
  };
  level: string | null;
}

interface ProfileHeaderProps {
  employee: Employee;
  availabilityStatus?: AvailabilityStatus; // TO-DO: ADD REAL DATA
}

interface ProfileInfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  linkTo?: string;
}

const ProfileInfoItem: React.FC<ProfileInfoItemProps> = ({ 
  icon, 
  label, 
  value, 
  linkTo 
}) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-shrink-0 text-gray-500">
        {icon}
      </div>
      <div className="flex-grow">
        <div className="text-xs text-gray-500">{label}</div>
        {linkTo ? (
          <a href={linkTo} className="text-sm text-blue-600 hover:underline">
            {value}
          </a>
        ) : (
          <div className="text-sm text-gray-700">{value}</div>
        )}
      </div>
    </div>
  );
};

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ 
  employee, 
  availabilityStatus = 'available' // Default to available if not provided
}) => {
  const { t } = useTranslation('lowcoder');
  const [isHovering, setIsHovering] = useState(false);
  const { openModal } = useProcessExecutorModalContext();

  const { hasPermission: hasPermissionToEditPicture } = usePermissionCheck([
    {
      domain: 'employee',
      resource: 'employee',
      resourceId: employee.id,
      permissions: ['update']
    }
  ]);

  // We don't need the status info anymore as EmployeeAvatar handles it
  
  const calculateTimeSince = () => {
    if (!employee.workingCondition[0]?.hireDate) return '';
    
    const hireDate = dayjs(employee.workingCondition[0].hireDate);
    const now = dayjs();
    
    const years = now.diff(hireDate, 'year');
    const months = now.diff(hireDate, 'month') % 12;
    
    let result = '';
    
    if (years > 0) {
      result += `${years} ${years === 1 ? 'year' : 'years'}`;
    }
    
    if (months > 0 || years === 0) {
      if (years > 0) result += ' ';
      result += `${months} ${months === 1 ? 'month' : 'months'}`;
    }
    
    return result;
  };
  
  // We don't need to manage the profile picture state anymore as EmployeeAvatar handles it
  
  const getBusinessEmail = () => {
    const email = employee.communication?.find(c => c.channel?.code === 'EMAIL')?.value;
    return email ?? '';
  };
  
  const getBusinessPhone = () => {
    const phone = employee.communication?.find(c => c.channel?.code === 'PHONE')?.value;
    return phone ? formatPhoneNumber(phone) : '';
  };
  
  const handleEditPicture = useCallback(() => {
    if (hasPermissionToEditPicture) {
      openModal({
        processName: 'profile-picture-upload',
        startProcessBody: {
          employeeId: employee.id
        }
      });
    }
  }, [employee.id, openModal, hasPermissionToEditPicture]);
  
  const handleChat = useCallback(() => {
    console.log('Chat with', employee.id);
  }, [employee.id]);
  
  const handleCall = useCallback(() => {
    console.log('Call', employee.id);
  }, [employee.id]);
  
  const handleVideoCall = useCallback(() => {
    console.log('Video call', employee.id);
  }, [employee.id]);

  return (
    <div className="w-full relative overflow-hidden">
      <div className="relative px-4 pb-4 mt-4 flex flex-col md:flex-row md:items-end">
        <div className="md:mr-8 flex flex-col items-center">
 
          <div className="flex flex-col items-center">
            <div className="flex-shrink-0 mb-4 z-10">
              <div className="relative">
                <div className="relative">
                  {/* Use the EmployeeAvatar component */}
                  <div className="relative">
                    <EmployeeAvatar
                      profilePicture={employee.pictureThumbnail}
                      firstName={employee.firstName}
                      lastName={employee.lastName}
                      employeeId={employee.id}
                      size={144} // 36 * 4 = 144px (w-36 h-36)
                      onlineStatus={availabilityStatusToOnlineStatus[availabilityStatus]}
                    />
                    
                    {/* Edit button overlay */}
                    {hasPermissionToEditPicture && (
                      <button 
                        type="button"
                        className="absolute inset-0 flex items-center justify-center bg-transparent hover:bg-black hover:bg-opacity-50 rounded-full cursor-pointer transition-colors duration-200"
                        onClick={handleEditPicture}
                        onMouseEnter={() => setIsHovering(true)}
                        onMouseLeave={() => setIsHovering(false)}
                        aria-label={t('employee_profile.actions.edit_picture', 'Edit profile picture')}
                      >
                        {isHovering && (
                          <span className="bg-white text-black rounded-full p-2 hover:bg-gray-200">
                            <PiPencilSimple className="h-5 w-5" />
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                

                
                {/* Communication Actions - Always visible */}
                <div className="mt-3 flex justify-center gap-3">
                  <button 
                    onClick={handleChat}
                    className="bg-gray-100 hover:bg-blue-100 rounded-full p-2.5 shadow-sm transition-colors"
                    title="Chat" /* TO-DO: ADD TRANSLATION */
                    aria-label="Chat"
                    disabled={!employee.additionalProperties?.userId}
                  >
                    <PiChat className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={handleCall}
                    className="bg-gray-100 hover:bg-blue-100 rounded-full p-2.5 shadow-sm transition-colors"
                    title="Call" /* TO-DO: ADD TRANSLATION */
                    aria-label="Call"
                    disabled={!employee.additionalProperties?.userId}
                  >
                    <PiPhone className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={handleVideoCall}
                    className="bg-gray-100 hover:bg-blue-100 rounded-full p-2.5 shadow-sm transition-colors"
                    title="Video Call" /* TO-DO: ADD TRANSLATION */
                    aria-label="Video Call"
                    disabled={!employee.additionalProperties?.userId}
                  >
                    <PiVideoCamera className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Profile Info */}
            <div className="flex-grow text-center">
              <h1 className="text-xl font-bold mb-1 text-gray-800">
                {getEmployeeFullName(employee)}
              </h1>
              <p className="text-gray-600 mb-4 text-sm">
                {employee.employeePosition?.jobPosition?.name ?? t('employee_profile.left_side_bar.not_assigned')}
              </p>
              
              {/* Profile Info Grid */}
              <div className="grid grid-cols-1 gap-4 w-full mt-3 text-left">
                {/* Organization */}
                <ProfileInfoItem 
                  icon={<PiBuildings className="h-4 w-4" />}
                  label={t('employee_profile.profile_icon_list.org_title')}
                  value={employee.employeePosition?.organizationalUnit?.name ?? t('employee_profile.left_side_bar.not_assigned')}
                  linkTo={employee.employeePosition?.organizationalUnitId ? `/orgchart/active/organization?organizationUnitId=${employee.employeePosition.organizationalUnitId}` : undefined}
                />
                
                {/* Manager */}
                <ProfileInfoItem 
                  icon={<PiUser className="h-4 w-4" />}
                  label={t('employee_profile.profile_icon_list.manager_title')}
                  value={
                    employee.employeePosition?.supervisor?.id && employee.employeePosition.supervisor.id !== employee.id
                      ? `${employee.employeePosition.supervisor.firstName ?? ''} ${employee.employeePosition.supervisor.lastName ?? ''}`.trim() ?? t('employee_profile.left_side_bar.not_assigned')
                      : t('employee_profile.left_side_bar.no_manager')
                  }
                  linkTo={
                    employee.employeePosition?.supervisor?.id && employee.employeePosition.supervisor.id !== employee.id
                      ? `/platform/employee-profile/${employee.employeePosition.supervisor.id}`
                      : undefined
                  }
                />
                
                {/* Location */}
                <ProfileInfoItem 
                  icon={<PiMapPin className="h-4 w-4" />}
                  label={t('employee_profile.profile_icon_list.location_title')}
                  value={employee.employeePosition?.siteLocation?.name ?? t('employee_profile.left_side_bar.not_assigned')}
                  //linkTo={employee.employeePosition?.siteLocation?.id ? `/orgchart/active/location?siteLocationId=${employee.employeePosition.siteLocation.id}` : undefined}
                />
                
                {/* Cost Center */}
                <ProfileInfoItem 
                  icon={<PiCurrencyDollar className="h-4 w-4" />}
                  label={t('employee_profile.profile_icon_list.cost_center_title', 'Cost Center')}
                  value={employee.employeePosition?.costCenter?.name ?? t('employee_profile.left_side_bar.not_assigned')}
                  linkTo={employee.employeePosition?.costCenter?.id ? `/orgchart/active/finance?costCenterDataId=${employee.employeePosition.costCenter.id}` : undefined}
                />
                
                {/* Hire Date */}
                <ProfileInfoItem 
                  icon={<PiCalendar className="h-4 w-4" />}
                  label={t('employee_profile.profile_icon_list.since_title')}
                  value={
                    employee.workingCondition[0]?.hireDate
                      ? `${dayjs(employee.workingCondition[0].hireDate).format('MMM D, YYYY')} - ${calculateTimeSince()}`
                      : 'N/A'
                  }
                />
              </div>

              {/* Teams Section - if available */}
              {employee.employeePosition?.matrixUnitEmployees && employee.employeePosition.matrixUnitEmployees.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold mb-2 text-gray-700">
                    {t('employee_profile.profile_icon_list.teams_title', 'Teams')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {employee.employeePosition.matrixUnitEmployees.map((teamItem: MatrixUnitEmployee) => (
                      <span 
                        key={teamItem.matrixUnit.id} 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {teamItem.matrixUnit.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Capabilities Section - if available */}
              {employee.employeePosition?.employeeCapabilities && employee.employeePosition.employeeCapabilities.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold mb-2 text-gray-700">
                    {t('employee_profile.profile_icon_list.capabilities_title', 'Capabilities')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {employee.employeePosition.employeeCapabilities.map((capItem: EmployeeCapability) => (
                      <span 
                        key={capItem.capability.id} 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      >
                        {capItem.capability.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Skills Section - if available */}
              {employee.skills?.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold mb-2 text-gray-700">
                    {t('employee_profile.profile_icon_list.skills_title', 'Skills')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {employee.skills.map((skillItem: EmployeeSkill) => (
                      <span 
                        key={skillItem.skill.id} 
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${skillItem.level === 'Advanced' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}
                      >
                        {skillItem.skill.name}
                        {skillItem.level === 'Advanced' && (
                          <span className="ml-1 text-xs font-semibold">★</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Contact Info */}
              <div className="mt-4 flex flex-col gap-2">
                {getBusinessEmail() && (
                  <a 
                    href={`mailto:${getBusinessEmail()}`}
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors text-sm"
                  >
                    <PiEnvelopeSimple className="mr-2 h-4 w-4" />
                    {getBusinessEmail()}
                  </a>
                )}
                
                {getBusinessPhone() && (
                  <a 
                    href={`tel:${getBusinessPhone()}`}
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors text-sm"
                  >
                    <PiPhone className="mr-2 h-4 w-4" />
                    {getBusinessPhone()}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
