'use client';

import React, { useState, useCallback } from 'react';
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
import { Avatar } from '@newwork/gravity-ui-catalog';
import { Employee } from '../hooks/useEmployeeData';
import { formatPhoneNumber, getEmployeeFullName } from '../utils/formatters';
import { BusinessAppContextProps } from '../../../../../../common/BusinessAppContext';

// TO-DO: ADD TRANSLATION for new availability status labels

// ProfileHeader props interface

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
}

interface ProfileInfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  linkTo?: string;
  onClick?: () => void;
}

const ProfileInfoItem: React.FC<ProfileInfoItemProps> = ({ 
  icon, 
  label, 
  value, 
  linkTo,
  onClick
}) => {
  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      <div className="gba:shrink-0 gba:text-gray-500">
        {icon}
      </div>
      <div className="gba:grow">
        <div className="gba:text-xs gba:text-gray-500">{label}</div>
        {linkTo ? (
          <a href={linkTo} className="gba:text-sm gba:text-blue-600 gba:inline-flex gba:items-baseline gba:flex-wrap">
            <span className="gba:whitespace-normal">{value}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="gba:h-3 gba:w-3 gba:shrink-0 gba:ml-0.5 gba:align-baseline gba:inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        ) : onClick ? (
          <a href="#" onClick={(e) => { e.preventDefault(); onClick(); }} className="gba:text-sm gba:text-blue-600 gba:inline-flex gba:items-baseline gba:flex-wrap" data-testid={`profile-info-${label.toLowerCase()}-link`}>
            <span className="gba:whitespace-normal">{value}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="gba:h-3 gba:w-3 gba:shrink-0 gba:ml-0.5 gba:align-baseline gba:inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        ) : (
          <div className="gba:text-sm gba:text-gray-700">{value}</div>
        )}
      </div>
    </div>
  );
};

const ProfileHeader: React.FC<ProfileHeaderProps & BusinessAppContextProps> = ({ 
  userInfo,
  employee
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const { hasPermission: hasPermissionToEditPicture } = { hasPermission: false };
  
  // Communication handlers
  const handleCommunication = (eventType: string) => {
    if (!employee.additionalProperties?.userId) return;
    
    const customEvent = new CustomEvent(eventType, {
      detail: {
        userId: employee.additionalProperties.userId,
        displayName: getEmployeeFullName(employee)
      }
    });
    
    window.dispatchEvent(customEvent);
  };
  
  const handleChat = () => {
    handleCommunication('custom:event:openChatWithUser');
  };
  
  const handleAudioCall = () => {
    handleCommunication('custom:event:openAudioConferenceWithUser');
  };
  
  const handleVideoCall = () => {
    handleCommunication('custom:event:openVideoConferenceWithUser');
  };
  
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
    }
  }, [employee.id, hasPermissionToEditPicture]);

  return (
    <div className="gba:w-full gba:relative gba:overflow-hidden">
      <div className="gba:relative gba:px-4 gba:pb-4 gba:mt-4 gba:flex gba:flex-col gba:md:flex-row gba:md:items-end">
        <div className="gba:md:mr-8 gba:flex gba:flex-col gba:items-center">
 
          <div className="gba:flex gba:flex-col gba:items-center">
            <div className="gba:shrink-0 gba:mb-4 gba:z-10">
              <div className="gba:relative">
                <div className="gba:relative">
                  {/* Use the Avatar component */}
                  <div className="gba:relative">
                    <Avatar
                      src={employee.pictureThumbnail ? `data:image/gif;base64,${employee.pictureThumbnail}` : undefined}
                      initials={`${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`}
                      alt={`${employee.firstName} ${employee.lastName}`}
                      // @ts-ignore - Type issue in gravity-ui-catalog for contentType
                      contentType={employee.pictureThumbnail ? 'image' : 'initials'}
                      // @ts-ignore - Type issue in gravity-ui-catalog for size
                      size="xl"
                      // @ts-ignore - Type issue in gravity-ui-catalog for shape
                      shape="rounded"
                      // @ts-ignore - Type issue in gravity-ui-catalog for appearance
                      appearance="gradient"
                      style={{ width: '144px', height: '144px', fontSize: '3rem' }}
                    />
                    
                    {/* Edit button overlay */}
                    {hasPermissionToEditPicture && (
                      <button 
                        type="button"
                        className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:bg-transparent gba:hover:bg-black/50 gba:rounded-full gba:cursor-pointer gba:transition-colors gba:duration-200"
                        onClick={handleEditPicture}
                        onMouseEnter={() => setIsHovering(true)}
                        onMouseLeave={() => setIsHovering(false)}
                        aria-label={"Edit profile picture"}
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
                    title="Chat"
                    aria-label="Chat"
                    disabled={!userInfo?.id}
                  >
                    <PiChat className="gba:h-5 gba:w-5" />
                  </button>
                  <button 
                    onClick={handleAudioCall}
                    className="gba:bg-gray-100 gba:hover:bg-blue-100 gba:rounded-full gba:p-2.5 gba:shadow-sm gba:transition-colors"
                    title="Audio Call"
                    aria-label="Audio Call"
                    disabled={!userInfo?.id}
                  >
                    <PiPhone className="gba:h-5 gba:w-5" />
                  </button>
                  <button 
                    onClick={handleVideoCall}
                    className="gba:bg-gray-100 gba:hover:bg-blue-100 gba:rounded-full gba:p-2.5 gba:shadow-sm gba:transition-colors"
                    title="Video Call"
                    aria-label="Video Call"
                    disabled={!userInfo?.id}
                  >
                    <PiVideoCamera className="gba:h-5 gba:w-5" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Profile Info */}
            <div className="gba:grow gba:text-center">
              <div className="gba:text-xl gba:font-bold gba:mb-1 gba:text-gray-800" data-testid="employee-name">
                {getEmployeeFullName(employee)}
              </div>
              <p className="gba:text-gray-600 gba:mb-4 gba:text-sm">
                {employee.employeePosition?.jobPosition?.name ?? "Not assigned"}
              </p>
              
              {/* Profile Info Grid */}
              <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:w-full gba:mt-3 gba:text-left">
                {/* Organization */}
                <ProfileInfoItem 
                  icon={<PiBuildings className="gba:h-4 gba:w-4" />}
                  label={"Organization"}
                  value={employee.employeePosition?.organizationalUnit?.name ?? "Not assigned"}
                  linkTo={employee.employeePosition?.organizationalUnitId ? `/orgchart/active/organization?organizationUnitId=${employee.employeePosition.organizationalUnitId}` : undefined}
                />
                
                {/* Manager */}
                <ProfileInfoItem 
                  icon={<PiUser className="gba:h-4 gba:w-4" />}
                  label={"Manager"}
                  value={
                    employee.employeePosition?.supervisor?.id && employee.employeePosition.supervisor.id !== employee.id
                      ? employee.employeePosition.supervisor.displayName || `${employee.employeePosition.supervisor.firstName ?? ''} ${employee.employeePosition.supervisor.lastName ?? ''}`.trim() || "Not assigned"
                      : "No manager"
                  }
                  linkTo={undefined}
                  onClick={
                    employee.employeePosition?.supervisor?.id && employee.employeePosition.supervisor.id !== employee.id
                      ? () => {
                          const url = new URL(window.location.href);
                          url.searchParams.set('employeeId', employee.employeePosition?.supervisor?.id || '');
                          window.history.pushState({}, '', url.toString());
                        }
                      : undefined
                  }
                />
                
                {/* Job Position */}
                <ProfileInfoItem 
                  icon={<PiMapPin className="gba:h-4 gba:w-4" />}
                  label={"Job Position"}
                  value={employee.employeePosition?.jobPosition?.name ?? "Not assigned"}
                  //linkTo={employee.employeePosition?.siteLocation?.id ? `/orgchart/active/location?siteLocationId=${employee.employeePosition.siteLocation.id}` : undefined}
                />
                {/* Cost Center */}
                <ProfileInfoItem 
                  icon={<PiCurrencyDollar className="gba:h-4 gba:w-4" />}
                  label={"Cost Center"}
                  value={employee.employeePosition?.costCenter?.name ?? "Not assigned"}
                  linkTo={employee.employeePosition?.costCenter?.id ? `/orgchart/active/finance?costCenterDataId=${employee.employeePosition.costCenter.id}` : undefined}
                />
                {/* Hire Date */}
                <ProfileInfoItem 
                  icon={<PiCalendar className="gba:h-4 gba:w-4" />}
                  label={"Hire Date"}
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
                    {"Teams"}
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
                    {"Capabilities"}
                  </h3>
                  <div className="gba:flex gba:flex-wrap gba:gap-2">
                    {employee.employeePosition.employeeCapabilities.map((capItem: EmployeeCapability) => (
                      <span 
                        key={capItem.capability?.id} 
                        className="gba:inline-flex gba:items-center gba:px-2.5 gba:py-0.5 gba:rounded-full gba:text-xs gba:font-medium gba:bg-green-100 gba:text-green-800"
                      >
                        {capItem.capability?.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Skills Section - if available */}
              {employee.skills?.length > 0 && (
                <div className="gba:mt-4">
                  <h3 className="gba:text-sm gba:font-semibold gba:mb-2 gba:text-gray-700">
                    {"Skills"}
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
