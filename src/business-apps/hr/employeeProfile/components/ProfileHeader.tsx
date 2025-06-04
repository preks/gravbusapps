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
import { usePermissionCheck } from '../../../../common/permission/usePermissionCheck';
import { BusinessAppContextProps } from '../../../../common/BusinessAppContext';
//import { useProcessExecutorModalContext } from 'sdks/process-executor-sdk';

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
    <div className="gba:flex gba:items-center gba:gap-2">
      <div className="gba:shrink-0 gba:text-gray-500">
        {icon}
      </div>
      <div className="gba:grow">
        <div className="gba:text-xs gba:text-gray-500">{label}</div>
        {linkTo ? (
          <a href={linkTo} className="gba:text-sm gba:text-blue-600 gba:hover:underline">
            {value}
          </a>
        ) : (
          <div className="gba:text-sm gba:text-gray-700">{value}</div>
        )}
      </div>
    </div>
  );
};

const ProfileHeader: React.FC<ProfileHeaderProps & BusinessAppContextProps> = ({ 
  accessToken,
  employee, 
  availabilityStatus = 'available' // Default to available if not provided
}) => {
  const { t } = useTranslation('lowcoder');
  const [isHovering, setIsHovering] = useState(false);
  //const { openModal } = useProcessExecutorModalContext();
  const { openModal } = { openModal: (args: any) => {} };

  const { hasPermission: hasPermissionToEditPicture } = usePermissionCheck(accessToken, [
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
    <div className="gba:w-full gba:relative gba:overflow-hidden">
      <div className="gba:relative gba:px-4 gba:pb-4 gba:mt-4 gba:flex gba:flex-col gba:md:flex-row gba:md:items-end">
        <div className="gba:md:mr-8 gba:flex gba:flex-col gba:items-center">
 
          <div className="gba:flex gba:flex-col gba:items-center">
            <div className="gba:shrink-0 gba:mb-4 gba:z-10">
              <div className="gba:relative">
                <div className="gba:relative">
                  {/* Use the EmployeeAvatar component */}
                  <div className="gba:relative">
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
                        className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:bg-transparent gba:hover:bg-black/50 gba:rounded-full gba:cursor-pointer gba:transition-colors gba:duration-200"
                        onClick={handleEditPicture}
                        onMouseEnter={() => setIsHovering(true)}
                        onMouseLeave={() => setIsHovering(false)}
                        aria-label={t('employee_profile.actions.edit_picture', 'Edit profile picture')}
                      >
                        {isHovering && (
                          <span className="gba:bg-white gba:text-black gba:rounded-full gba:p-2 gba:hover:bg-gray-200">
                            <PiPencilSimple className="gba:h-5 gba:w-5" />
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                

                
                {/* Communication Actions - Always visible */}
                <div className="gba:mt-3 gba:flex gba:justify-center gba:gap-3">
                  <button 
                    onClick={handleChat}
                    className="gba:bg-gray-100 gba:hover:bg-blue-100 gba:rounded-full gba:p-2.5 gba:shadow-sm gba:transition-colors"
                    title="Chat" /* TO-DO: ADD TRANSLATION */
                    aria-label="Chat"
                    disabled={!employee.additionalProperties?.userId}
                  >
                    <PiChat className="gba:h-5 gba:w-5" />
                  </button>
                  <button 
                    onClick={handleCall}
                    className="gba:bg-gray-100 gba:hover:bg-blue-100 gba:rounded-full gba:p-2.5 gba:shadow-sm gba:transition-colors"
                    title="Call" /* TO-DO: ADD TRANSLATION */
                    aria-label="Call"
                    disabled={!employee.additionalProperties?.userId}
                  >
                    <PiPhone className="gba:h-5 gba:w-5" />
                  </button>
                  <button 
                    onClick={handleVideoCall}
                    className="gba:bg-gray-100 gba:hover:bg-blue-100 gba:rounded-full gba:p-2.5 gba:shadow-sm gba:transition-colors"
                    title="Video Call" /* TO-DO: ADD TRANSLATION */
                    aria-label="Video Call"
                    disabled={!employee.additionalProperties?.userId}
                  >
                    <PiVideoCamera className="gba:h-5 gba:w-5" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Profile Info */}
            <div className="gba:grow gba:text-center">
              <h1 className="gba:text-xl gba:font-bold gba:mb-1 gba:text-gray-800">
                {getEmployeeFullName(employee)}
              </h1>
              <p className="gba:text-gray-600 gba:mb-4 gba:text-sm">
                {employee.employeePosition?.jobPosition?.name ?? t('employee_profile.left_side_bar.not_assigned')}
              </p>
              
              {/* Profile Info Grid */}
              <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:w-full gba:mt-3 gba:text-left">
                {/* Organization */}
                <ProfileInfoItem 
                  icon={<PiBuildings className="gba:h-4 gba:w-4" />}
                  label={t('employee_profile.profile_icon_list.org_title')}
                  value={employee.employeePosition?.organizationalUnit?.name ?? t('employee_profile.left_side_bar.not_assigned')}
                  linkTo={employee.employeePosition?.organizationalUnitId ? `/orgchart/active/organization?organizationUnitId=${employee.employeePosition.organizationalUnitId}` : undefined}
                />
                
                {/* Manager */}
                <ProfileInfoItem 
                  icon={<PiUser className="gba:h-4 gba:w-4" />}
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
                  icon={<PiMapPin className="gba:h-4 gba:w-4" />}
                  label={t('employee_profile.profile_icon_list.location_title')}
                  value={employee.employeePosition?.siteLocation?.name ?? t('employee_profile.left_side_bar.not_assigned')}
                  //linkTo={employee.employeePosition?.siteLocation?.id ? `/orgchart/active/location?siteLocationId=${employee.employeePosition.siteLocation.id}` : undefined}
                />
                
                {/* Cost Center */}
                <ProfileInfoItem 
                  icon={<PiCurrencyDollar className="gba:h-4 gba:w-4" />}
                  label={t('employee_profile.profile_icon_list.cost_center_title', 'Cost Center')}
                  value={employee.employeePosition?.costCenter?.name ?? t('employee_profile.left_side_bar.not_assigned')}
                  linkTo={employee.employeePosition?.costCenter?.id ? `/orgchart/active/finance?costCenterDataId=${employee.employeePosition.costCenter.id}` : undefined}
                />
                
                {/* Hire Date */}
                <ProfileInfoItem 
                  icon={<PiCalendar className="gba:h-4 gba:w-4" />}
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
                <div className="gba:mt-6">
                  <h3 className="gba:text-sm gba:font-semibold gba:mb-2 gba:text-gray-700">
                    {t('employee_profile.profile_icon_list.teams_title', 'Teams')}
                  </h3>
                  <div className="gba:flex gba:flex-wrap gba:gap-2">
                    {employee.employeePosition.matrixUnitEmployees.map((teamItem: MatrixUnitEmployee) => (
                      <span 
                        key={teamItem.matrixUnit.id} 
                        className="gba:inline-flex gba:items-center gba:px-2.5 gba:py-0.5 gba:rounded-full gba:text-xs gba:font-medium gba:bg-blue-100 gba:text-blue-800"
                      >
                        {teamItem.matrixUnit.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Capabilities Section - if available */}
              {employee.employeePosition?.employeeCapabilities && employee.employeePosition.employeeCapabilities.length > 0 && (
                <div className="gba:mt-4">
                  <h3 className="gba:text-sm gba:font-semibold gba:mb-2 gba:text-gray-700">
                    {t('employee_profile.profile_icon_list.capabilities_title', 'Capabilities')}
                  </h3>
                  <div className="gba:flex gba:flex-wrap gba:gap-2">
                    {employee.employeePosition.employeeCapabilities.map((capItem: EmployeeCapability) => (
                      <span 
                        key={capItem.capability.id} 
                        className="gba:inline-flex gba:items-center gba:px-2.5 gba:py-0.5 gba:rounded-full gba:text-xs gba:font-medium gba:bg-green-100 gba:text-green-800"
                      >
                        {capItem.capability.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Skills Section - if available */}
              {employee.skills?.length > 0 && (
                <div className="gba:mt-4">
                  <h3 className="gba:text-sm gba:font-semibold gba:mb-2 gba:text-gray-700">
                    {t('employee_profile.profile_icon_list.skills_title', 'Skills')}
                  </h3>
                  <div className="gba:flex gba:flex-wrap gba:gap-2">
                    {employee.skills.map((skillItem: EmployeeSkill) => (
                      <span 
                        key={skillItem.skill.id} 
                        className={`gba:inline-flex gba:items-center gba:px-2.5 gba:py-0.5 gba:rounded-full gba:text-xs gba:font-medium ${skillItem.level === 'Advanced'          ? 'gba:bg-purple-100 gba:text-purple-800' : 'gba:bg-gray-100 gba:text-gray-800'}`}
                      >
                        {skillItem.skill.name}
                        {skillItem.level === 'Advanced' && (
                          <span className="gba:ml-1 gba:text-xs gba:font-semibold">★</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Contact Info */}
              <div className="gba:mt-4 gba:flex gba:flex-col gba:gap-2">
                {getBusinessEmail() && (
                  <a 
                    href={`mailto:${getBusinessEmail()}`}
                    className="gba:inline-flex gba:items-center gba:text-blue-600 gba:hover:text-blue-800 gba:transition-colors gba:text-sm"
                  >
                    <PiEnvelopeSimple className="gba:mr-2 gba:h-4 gba:w-4" />
                    {getBusinessEmail()}
                  </a>
                )}
                
                {getBusinessPhone() && (
                  <a 
                    href={`tel:${getBusinessPhone()}`}
                    className="gba:inline-flex gba:items-center gba:text-blue-600 gba:hover:text-blue-800 gba:transition-colors gba:text-sm"
                  >
                    <PiPhone className="gba:mr-2 gba:h-4 gba:w-4" />
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
