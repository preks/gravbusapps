"use client";

import React, { useCallback } from 'react';
//import { useTranslation } from 'react-i18next';
import { Button } from '@newwork/gravity-ui-catalog';
import { useOpenChat } from '@/modules/chat-sidebar/utils/hooks/useOpenChat';

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
  };
  icons?: {
    ChatIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    CallIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    VideoCallIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    ProfileIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  };
}

/**
 * Shared Employee Details component for both EmployeeDirectory and EmployeeList
 * @returns {JSX.Element}
 */
export const EmployeeDetails: React.FC<EmployeeDetailsProps> = ({ employee, icons }) => {
  //const { t } = useTranslation();
  const { openChatWithUser, openAudioConferenceWithUser, openVideoConferenceWithUser } = useOpenChat();
  
  // Determine profile URL based on the context
  const profileUrl = `/platform/employee-profile/${employee.id}`;

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

  // Default icons if not provided
  const ChatIcon = icons?.ChatIcon || (() => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  ));
  
  const CallIcon = icons?.CallIcon || (() => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>
  ));
  
  const VideoCallIcon = icons?.VideoCallIcon || (() => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="23 7 16 12 23 17 23 7"></polygon>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
    </svg>
  ));
  
  const ProfileIcon = icons?.ProfileIcon || (() => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  ));

  return (
    <div className="gba:bg-white gba:h-full gba:overflow-auto">
      <div className="gba:p-6">
        <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
          <h2 className="gba:text-xl gba:font-semibold">Employee Details</h2>
        </div>

        <div className="gba:space-y-6">
          <div className="gba:flex gba:flex-col gba:items-center gba:mb-4 gba:animate-fade-in">
            {employee.profilePicture ? (
              <div className="gba:w-24 gba:h-24 gba:rounded-full gba:overflow-hidden">
                <img
                  src={`data:image/gif;base64,${employee.profilePicture}`}
                  alt={`${employee.firstName} ${employee.lastName}`}
                  className="gba:w-full gba:h-full gba:object-cover"
                />
              </div>
            ) : (
              <div className="gba:w-24 gba:h-24 gba:rounded-full gba:bg-gray-200 gba:flex gba:items-center gba:justify-center gba:border gba:border-gray-200">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="gba:text-gray-400">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M16 20v-2a4 4 0 0 0-8 0v2" />
                </svg>
              </div>
            )}
            <h3 className="gba:text-lg gba:font-bold gba:mt-3 gba:mb-1 gba:text-center">{employee.firstName} {employee.lastName}</h3>
            <p className="gba:text-gray-500 gba:text-sm gba:text-center">{employee.jobTitle}</p>
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
      
      {/* Action buttons */}
      <div className="gba:flex gba:justify-center gba:gap-2 gba:p-4 gba:border-t gba:border-gray-200">
        {employee.userId && (
          <>
            <Button 
              variant="ghost" 
              onClick={handleChat}
              icon={<ChatIcon />}
            >
              {'Chat'}
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleCall}
              icon={<CallIcon />}
            >
              {'Call'}
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleVideoCall}
              icon={<VideoCallIcon />}
            >
              {'Video'}
            </Button>
          </>
        )}
        <Button 
          variant="primary" 
          onClick={handleProfile}
          icon={<ProfileIcon />}
        >
          {'Profile'}
        </Button>
      </div>
    </div>
  );
};

export default EmployeeDetails;
