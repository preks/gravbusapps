"use client";

import React, { useCallback } from 'react';
//import { useTranslation } from 'react-i18next';
import { Button, Avatar } from '@newwork/gravity-ui-catalog';
import { useOpenChat } from '@/modules/chat-sidebar/utils/hooks/useOpenChat';
import { AppActionButton } from '@/components/app-action-button/AppActionButton';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { PiCaretRight, PiChat, PiPhone, PiVideoCamera, PiUser } from 'react-icons/pi';

// Define a common Employee interface that works for both components
export interface EmployeeDetailsProps {
  employee: {
    id: string;
    userId?: string;
    firstName: string;
    lastName: string;
    jobTitle?: string;
    email?: string;
    profilePicture?: string;
    organizationalUnit?: string;
    employmentType?: string;
    contractType?: string;
    manager?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
  accessToken?: string;
}

/**
 * Shared Employee Details component for both EmployeeDirectory and EmployeeList
 * @returns {JSX.Element}
 */
export const EmployeeDetails: React.FC<EmployeeDetailsProps> = ({ employee, accessToken }) => {
  //const { t } = useTranslation();
  const { openChatWithUser, openAudioConferenceWithUser, openVideoConferenceWithUser } = useOpenChat();
  
  // Determine profile URL based on the context
  const profileUrl = `/platform/employee-record/${employee.id}`;

  // Handler functions for actions
  const handleChat = useCallback(() => {
    if (employee.userId) {
      openChatWithUser(employee.userId);
    }
  }, [employee.userId, openChatWithUser]);

  const handleCall = useCallback(() => {
    if (employee.userId) {
      openAudioConferenceWithUser(employee.userId);
    }
  }, [employee.userId, openAudioConferenceWithUser]);

  const handleVideoCall = useCallback(() => {
    if (employee.userId) {
      openVideoConferenceWithUser(employee.userId);
    }
  }, [employee.userId, openVideoConferenceWithUser]);

  const handleProfile = useCallback(() => {
    window.location.href = profileUrl;
  }, [profileUrl]);

  // Phosphor icons
  const ChatIcon = PiChat;
  const CallIcon = PiPhone;
  const VideoCallIcon = PiVideoCamera;
  const ProfileIcon = PiUser;

  return (
    <div className="gba:bg-white gba:h-full gba:overflow-auto">
      <div className="gba:p-6 gba:relative">
        {/* Action button in top right corner with absolute positioning */}
        {accessToken && (
          <div className="gba:absolute gba:top-4 gba:right-2">
            <AppActionButton
              data-testid="employee-details-action-button"
              variant="primary"
              size="md"
              contextsArray={[FlowContextName.employeeEntity]}
              externalContextData={{
                employeeId: employee.id,
                keycloakUserId: employee.userId,
                managerId: employee.manager?.id
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
              src={employee.profilePicture ? `data:image/gif;base64,${employee.profilePicture}` : undefined}
              initials={employee.profilePicture ? undefined : `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase()}
              // @ts-ignore - Type issue in gravity-ui-catalog for contentType
              contentType={employee.profilePicture ? 'image' : 'initials'}
              alt={`${employee.firstName} ${employee.lastName}`}
              // @ts-ignore - There is a type definition issue in gravity-ui-catalog@7.8.5 where AvatarSize is not correctly exported.
              size="xl"
              // @ts-ignore - There is a type definition issue in gravity-ui-catalog@7.8.5 where AvatarSize is not correctly exported.
              shape="circle"
              // @ts-ignore - There is a type definition issue in gravity-ui-catalog@7.8.5 where AvatarSize is not correctly exported.
              appearance="gradient"
              style={{ width: '100px', height: '100px' }}
            />
            <a 
              href={`/platform/employee-record?employeeId=${employee.id}`}
              className="gba:flex gba:items-center gba:justify-center gba:w-full"
            >
              <div className="gba:my-2 gba:pl-2 gba:text-center gba:flex gba:flex-col gba:items-center gba:w-auto gba:max-w-full gba:border-box">
                <div className="gba:text-2xl gba:text-black gba:font-black gba:w-full gba:truncate">
                  {employee.firstName} {employee.lastName}
                </div>
              </div>
              <div>
                <PiCaretRight className="gba:mt-1" width={20} height={20} fill="black" />
              </div>
            </a>
            <p className="gba:text-gray-500 gba:text-sm gba:text-center gba:mb-3">{employee.jobTitle}</p>
            
            {/* Chat actions directly under the name */}
            {employee.userId && (
              <div className="gba:flex gba:gap-2">
                <Button 
                  variant="secondary"
                  size="lg"
                  onClick={handleChat}
                  icon={<ChatIcon />}
                  className="gba:rounded-3xl gba:aspect-square gba:p-2"
                  data-testid="employee-details-chat-button"
                />
                <Button 
                  variant="secondary"
                  size="lg"
                  onClick={handleVideoCall}
                  icon={<VideoCallIcon />}
                  className="gba:rounded-3xl gba:aspect-square gba:p-2"
                  data-testid="employee-details-video-button"
                />
                <Button 
                  variant="secondary"
                  size="lg"
                  onClick={handleCall}
                  icon={<CallIcon />}
                  className="gba:rounded-3xl gba:aspect-square gba:p-2"
                  data-testid="employee-details-audio-button"
                />
              </div>
            )}
          </div>

          <div className="gba:border-t gba:border-gray-200 gba:pt-4">
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-500 gba:mb-2">Contact Information</h4>

            <div className="gba:space-y-4">
              {employee.email && (
                <div>
                  <div className="gba:text-sm gba:text-gray-500">Email</div>
                  <div className="gba:font-medium">{employee.email}</div>
                </div>
              )}

              {employee.organizationalUnit && (
                <div>
                  <div className="gba:text-sm gba:text-gray-500">Organizational Unit</div>
                  <div className="gba:font-medium">{employee.organizationalUnit}</div>
                </div>
              )}

              {employee.employmentType && (
                <div>
                  <div className="gba:text-sm gba:text-gray-500">Employment Type</div>
                  <div className="gba:font-medium">{employee.employmentType}</div>
                </div>
              )}

              {employee.contractType && (
                <div>
                  <div className="gba:text-sm gba:text-gray-500">Contract Type</div>
                  <div className="gba:font-medium">{employee.contractType}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetails;
