"use client";

import React, { useCallback } from 'react';
import dayjs from 'dayjs';
import { Button, Avatar, Spinner, Alert } from '@newwork/gravity-ui-catalog';
import { useOpenChat } from '@/modules/chat-sidebar/utils/hooks/useOpenChat';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  PiCaretRight, 
  PiChat, 
  PiPhone, 
  PiVideoCamera, 
  PiUser, 
  PiBuildings, 
  PiMapPin, 
  PiCalendar, 
  PiCurrencyDollar,
  PiEnvelopeSimple
} from 'react-icons/pi';
import { useEmployeeDetailsData } from './hooks/useEmployeeDetailsData';
import { MatrixUnitEmployee, EmployeeCapability, EmployeeSkill } from './types';

export interface EmployeeDetailsProps extends BusinessAppContextProps {
  employeeId: string;
  employeeData?: any; // Optional - if provided, skip data fetching
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
    <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
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
          <button onClick={onClick} className="gba:text-sm gba:text-blue-600 gba:inline-flex gba:items-baseline gba:flex-wrap gba:bg-transparent gba:border-0 gba:cursor-pointer gba:p-0" data-testid={`profile-info-${label.toLowerCase()}-link`}>
            <span className="gba:whitespace-normal">{value}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="gba:h-3 gba:w-3 gba:shrink-0 gba:ml-0.5 gba:align-baseline gba:inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        ) : (
          <div className="gba:text-sm gba:text-gray-700">{value}</div>
        )}
      </div>
    </div>
  );
};

/**
 * Self-contained Employee Details component that fetches its own data
 * @returns {JSX.Element}
 */
export const EmployeeDetails: React.FC<EmployeeDetailsProps> = (context) => {
  const { employeeId, accessToken, employeeData: propEmployeeData } = context;
  
  // Only fetch data if not provided as prop
  const { employeeData: fetchedData, isLoading, error, refetch } = useEmployeeDetailsData({ 
    employeeId, 
    context,
    skipFetch: !!propEmployeeData // Skip fetching if data provided as prop
  });
  
  // Use prop data if available, otherwise use fetched data
  const employeeData = propEmployeeData || fetchedData;
  
  const { openChatWithUser, openAudioConferenceWithUser, openVideoConferenceWithUser } = useOpenChat();

  // Handler functions for actions
  const handleChat = useCallback(() => {
    if (employeeData?.additionalProperties?.userId) {
      openChatWithUser(employeeData.additionalProperties.userId);
    }
  }, [employeeData?.additionalProperties?.userId, openChatWithUser]);

  const handleCall = useCallback(() => {
    if (employeeData?.additionalProperties?.userId) {
      openAudioConferenceWithUser(employeeData.additionalProperties.userId);
    }
  }, [employeeData?.additionalProperties?.userId, openAudioConferenceWithUser]);

  const handleVideoCall = useCallback(() => {
    if (employeeData?.additionalProperties?.userId) {
      openVideoConferenceWithUser(employeeData.additionalProperties.userId);
    }
  }, [employeeData?.additionalProperties?.userId, openVideoConferenceWithUser]);

  // Helper functions
  const getManagerName = () => {
    const supervisor = employeeData?.employeePosition?.supervisor;
    if (!supervisor || supervisor.id === employeeData?.id) return "No manager";
    return supervisor.displayName || `${supervisor.firstName} ${supervisor.lastName}`.trim() || "Not assigned";
  };

  const getBusinessEmail = () => {
    const email = employeeData?.communication?.find((c: any) => 
      c?.channel?.code === 'e-mail' && !c?.isDeleted && c?.value
    )?.value;
    return email || employeeData?.additionalProperties?.email || '';
  };

  const getBusinessPhone = () => {
    const phone = employeeData?.communication?.find((c: any) => 
      (c?.channel?.code === 'Mobile' || c?.channel?.code === 'Phone') && !c?.isDeleted && c?.value
    )?.value;
    return phone || employeeData?.additionalProperties?.phone || '';
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    // Simple phone number formatting
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  };

  const calculateTimeSince = () => {
    const hireDate = employeeData?.workingCondition?.[0]?.hireDate;
    if (!hireDate) return '';
    
    const hire = dayjs(hireDate);
    const now = dayjs();
    
    const years = now.diff(hire, 'year');
    const months = now.diff(hire, 'month') % 12;
    
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

  // Loading state (only when fetching data, not when using prop data)
  if (!propEmployeeData && isLoading) {
    return (
      <div className="gba:bg-white gba:h-full gba:p-6 gba:flex gba:items-center gba:justify-center">
        <Spinner size="large" />
      </div>
    );
  }

  // Error state (only when not loading and not using prop data)
  if (!propEmployeeData && (error || !employeeData)) {
    return (
      <div className="gba:bg-white gba:h-full gba:p-6">
        <Alert
          message="Error Loading Employee Details"
          description={error || "Employee data could not be loaded"}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={refetch}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  // If using prop data but it's missing, show minimal error
  if (propEmployeeData && !employeeData) {
    return (
      <div className="gba:bg-white gba:h-full gba:p-6">
        <div className="gba:text-center gba:text-gray-500">
          Employee data not available
        </div>
      </div>
    );
  }

  // Phosphor icons
  const ChatIcon = PiChat;
  const CallIcon = PiPhone;
  const VideoCallIcon = PiVideoCamera;

  return (
    <div className="gba:bg-white gba:h-full gba:overflow-auto">
      <div className="gba:p-6 gba:relative">
        {/* Action button in top right corner with absolute positioning */}
        {accessToken && (
          <div className="gba:absolute gba:top-4 gba:right-2" onClick={(e) => e.stopPropagation()}>
            <AppActionButton
              data-testid="employee-details-action-button"
              contextsArray={[FlowContextName.employeeEntity]}
              externalContextData={{
                employeeId: employeeData.id,
                keycloakUserId: employeeData.additionalProperties?.userId,
                managerId: employeeData.employeePosition?.supervisor?.id
              }}
              prefixDataTestId="employee-details-action"
              accessToken={accessToken}
            >
              Actions
            </AppActionButton>
          </div>
        )}
        
        <div className="gba:space-y-6">
          <div className="gba:flex gba:flex-col gba:items-center gba:mb-4 gba:animate-fade-in">
            <Avatar
              src={employeeData.pictureThumbnail ? `data:image/gif;base64,${employeeData.pictureThumbnail}` : undefined}
              initials={employeeData.pictureThumbnail ? undefined : `${employeeData.firstName?.[0] || ''}${employeeData.lastName?.[0] || ''}`.toUpperCase()}
              // @ts-ignore - Type issue in gravity-ui-catalog for contentType
              contentType={employeeData.pictureThumbnail ? 'image' : 'initials'}
              alt={`${employeeData.firstName} ${employeeData.lastName}`}
              // @ts-ignore - There is a type definition issue in gravity-ui-catalog@7.8.5 where AvatarSize is not correctly exported.
              size="xl"
              // @ts-ignore - There is a type definition issue in gravity-ui-catalog@7.8.5 where AvatarSize is not correctly exported.
              shape="circle"
              // @ts-ignore - There is a type definition issue in gravity-ui-catalog@7.8.5 where AvatarSize is not correctly exported.
              appearance="gradient"
              style={{ width: '100px', height: '100px', fontSize: '3rem' }}
            />
            <a 
              href={`/platform/employee-record?employeeId=${employeeData.id}`}
              className="gba:flex gba:items-center gba:justify-center gba:w-full"
            >
              <div className="gba:my-2 gba:pl-2 gba:text-center gba:flex gba:flex-col gba:items-center gba:w-auto gba:max-w-full gba:border-box">
                <div className="gba:text-2xl gba:text-black gba:font-black gba:w-full gba:truncate">
                  {employeeData.displayName || `${employeeData.firstName} ${employeeData.lastName}`}
                </div>
              </div>
              <div>
                <PiCaretRight className="gba:mt-1" width={20} height={20} fill="black" />
              </div>
            </a>
            <p className="gba:text-gray-500 gba:text-sm gba:text-center gba:mb-3">
              {employeeData.employeePosition?.jobPosition?.name || "Not assigned"}
            </p>
            
            {/* Chat actions directly under the name */}
              <div className="gba:flex gba:gap-2">
                <Button 
                  variant="secondary"
                  size="lg"
                  onClick={handleChat}
                  icon={<ChatIcon />}
                  className="gba:rounded-3xl gba:aspect-square gba:p-2"
                  data-testid="employee-details-chat-button"
                disabled={!employeeData.additionalProperties?.userId}
                />
                <Button 
                  variant="secondary"
                  size="lg"
                  onClick={handleVideoCall}
                  icon={<VideoCallIcon />}
                  className="gba:rounded-3xl gba:aspect-square gba:p-2"
                  data-testid="employee-details-video-button"
                disabled={!employeeData.additionalProperties?.userId}
                />
                <Button 
                  variant="secondary"
                  size="lg"
                  onClick={handleCall}
                  icon={<CallIcon />}
                  className="gba:rounded-3xl gba:aspect-square gba:p-2"
                  data-testid="employee-details-audio-button"
                disabled={!employeeData.additionalProperties?.userId}
                />
              </div>
          </div>

          <div className="gba:border-t gba:border-gray-200 gba:pt-4">
            {/* Contact Information */}
            <div className="gba:mb-6">
              <h4 className="gba:text-sm gba:font-medium gba:text-gray-500 gba:mb-4">Contact Information</h4>
              <div className="gba:space-y-2">
                {getBusinessEmail() ? (
                  <a 
                    href={`mailto:${getBusinessEmail()}`}
                    className="gba:inline-flex gba:items-center gba:text-blue-600 gba:hover:text-blue-800 gba:transition-colors gba:text-sm"
                  >
                    <PiEnvelopeSimple className="gba:mr-2 gba:h-4 gba:w-4" />
                    {getBusinessEmail()}
                  </a>
                ) : (
                  <div className="gba:inline-flex gba:items-center gba:text-gray-500 gba:text-sm">
                    <PiEnvelopeSimple className="gba:mr-2 gba:h-4 gba:w-4" />
                    No email available
                </div>
              )}

                {getBusinessPhone() ? (
                  <a 
                    href={`tel:${getBusinessPhone()}`}
                    className="gba:inline-flex gba:items-center gba:text-blue-600 gba:hover:text-blue-800 gba:transition-colors gba:text-sm gba:block"
                  >
                    <PiPhone className="gba:mr-2 gba:h-4 gba:w-4" />
                    {formatPhoneNumber(getBusinessPhone())}
                  </a>
                ) : (
                  <div className="gba:inline-flex gba:items-center gba:text-gray-500 gba:text-sm">
                    <PiPhone className="gba:mr-2 gba:h-4 gba:w-4" />
                    No phone available
                </div>
              )}
              </div>
            </div>

            <h4 className="gba:text-sm gba:font-medium gba:text-gray-500 gba:mb-4">Profile Information</h4>

            <div className="gba:space-y-1">
              {/* Organization */}
              <ProfileInfoItem 
                icon={<PiBuildings className="gba:h-4 gba:w-4" />}
                label="Organization"
                value={employeeData.employeePosition?.organizationalUnit?.name || "Not assigned"}
                linkTo={employeeData.employeePosition?.organizationalUnitId ? `/orgchart/active/organization?organizationUnitId=${employeeData.employeePosition.organizationalUnitId}` : undefined}
              />
              
              {/* Manager */}
              <ProfileInfoItem 
                icon={<PiUser className="gba:h-4 gba:w-4" />}
                label="Manager"
                value={getManagerName()}
                onClick={
                  employeeData.employeePosition?.supervisor?.id && employeeData.employeePosition.supervisor.id !== employeeData.id
                    ? () => {
                        const url = new URL(window.location.href);
                        url.searchParams.set('employeeId', employeeData.employeePosition?.supervisor?.id || '');
                        window.history.pushState({}, '', url.toString());
                      }
                    : undefined
                }
              />
              
              {/* Job Position */}
              <ProfileInfoItem 
                icon={<PiMapPin className="gba:h-4 gba:w-4" />}
                label="Job Position"
                value={employeeData.employeePosition?.jobPosition?.name || "Not assigned"}
              />

              {/* Cost Center */}
              <ProfileInfoItem 
                icon={<PiCurrencyDollar className="gba:h-4 gba:w-4" />}
                label="Cost Center"
                value={employeeData.employeePosition?.costCenter?.name || "Not assigned"}
                linkTo={employeeData.employeePosition?.costCenter?.id ? `/orgchart/active/finance?costCenterDataId=${employeeData.employeePosition.costCenter.id}` : undefined}
              />

              {/* Hire Date */}
              <ProfileInfoItem 
                icon={<PiCalendar className="gba:h-4 gba:w-4" />}
                label="Hire Date"
                value={
                  employeeData.workingCondition?.[0]?.hireDate
                    ? `${dayjs(employeeData.workingCondition[0].hireDate).format('MMM D, YYYY')} - ${calculateTimeSince()}`
                    : "Not available"
                }
              />

              {/* Employment Type */}
              <ProfileInfoItem 
                icon={<PiUser className="gba:h-4 gba:w-4" />}
                label="Employment Type"
                value={employeeData.workingCondition?.[0]?.employmentType?.value || "Not specified"}
              />

              {/* Contract Type */}
              <ProfileInfoItem 
                icon={<PiUser className="gba:h-4 gba:w-4" />}
                label="Contract Type"
                value={employeeData.workingCondition?.[0]?.contractType?.value || "Not specified"}
              />
                </div>

            {/* Teams Section */}
            <div className="gba:mt-6">
              <h4 className="gba:text-sm gba:font-medium gba:text-gray-500 gba:mb-2">Teams</h4>
              <div className="gba:flex gba:flex-wrap gba:gap-2">
                {employeeData.employeePosition?.matrixUnitEmployees && Array.isArray(employeeData.employeePosition.matrixUnitEmployees) && employeeData.employeePosition.matrixUnitEmployees.length > 0 ? (
                  employeeData.employeePosition.matrixUnitEmployees
                    .filter((teamItem: any): teamItem is MatrixUnitEmployee & { matrixUnit: { id: string; name: string } } => 
                      !!(teamItem?.matrixUnit?.id && teamItem?.matrixUnit?.name))
                    .map((teamItem: any) => (
                      <span 
                        key={teamItem.matrixUnit.id} 
                        className="gba:inline-flex gba:items-center gba:px-2.5 gba:py-0.5 gba:rounded-full gba:text-xs gba:font-medium gba:bg-blue-100 gba:text-blue-800"
                      >
                        {teamItem.matrixUnit.name}
                      </span>
                    ))
                ) : (
                  <span className="gba:text-gray-500 gba:text-sm">No teams assigned</span>
                )}
              </div>
            </div>

            {/* Capabilities Section */}
            <div className="gba:mt-6">
              <h4 className="gba:text-sm gba:font-medium gba:text-gray-500 gba:mb-2">Capabilities</h4>
              <div className="gba:flex gba:flex-wrap gba:gap-2">
                {employeeData.employeePosition?.employeeCapabilities && Array.isArray(employeeData.employeePosition.employeeCapabilities) && employeeData.employeePosition.employeeCapabilities.length > 0 ? (
                  employeeData.employeePosition.employeeCapabilities
                    .filter((capItem: any): capItem is EmployeeCapability & { capability: { id: string; name: string } } => 
                      !!(capItem?.capability?.id && capItem?.capability?.name))
                    .map((capItem: any) => (
                      <span 
                        key={capItem.capability.id} 
                        className="gba:inline-flex gba:items-center gba:px-2.5 gba:py-0.5 gba:rounded-full gba:text-xs gba:font-medium gba:bg-green-100 gba:text-green-800"
                      >
                        {capItem.capability.name}
                      </span>
                    ))
                ) : (
                  <span className="gba:text-gray-500 gba:text-sm">No capabilities assigned</span>
                )}
              </div>
                </div>
            
            {/* Skills Section */}
            <div className="gba:mt-6">
              <h4 className="gba:text-sm gba:font-medium gba:text-gray-500 gba:mb-2">Skills</h4>
              <div className="gba:flex gba:flex-wrap gba:gap-2">
                {employeeData.skills && Array.isArray(employeeData.skills) && employeeData.skills.length > 0 ? (
                  employeeData.skills
                    .filter((skillItem: any): skillItem is EmployeeSkill & { skill: { id: string; name: string } } => 
                      !!(skillItem?.skill?.id && skillItem?.skill?.name))
                    .map((skillItem: any) => (
                      <span 
                        key={skillItem.skill.id} 
                        className={`gba:inline-flex gba:items-center gba:px-2.5 gba:py-0.5 gba:rounded-full gba:text-xs gba:font-medium ${
                          skillItem.level === 'Advanced' 
                            ? 'gba:bg-purple-100 gba:text-purple-800' 
                            : 'gba:bg-gray-100 gba:text-gray-800'
                        }`}
                      >
                        {skillItem.skill.name}
                        {skillItem.level === 'Advanced' && (
                          <span className="gba:ml-1 gba:text-xs gba:font-semibold">★</span>
                        )}
                      </span>
                    ))
                ) : (
                  <span className="gba:text-gray-500 gba:text-sm">No skills recorded</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetails;
