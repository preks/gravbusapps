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
    <div className="bg-white h-full overflow-auto">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Employee Details</h2>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col items-center mb-4 animate-fade-in">
            {employee.profilePicture ? (
              <div className="w-24 h-24 rounded-full overflow-hidden">
                <img
                  src={`data:image/gif;base64,${employee.profilePicture}`}
                  alt={`${employee.firstName} ${employee.lastName}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border border-gray-200">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M16 20v-2a4 4 0 0 0-8 0v2" />
                </svg>
              </div>
            )}
            <h3 className="text-lg font-bold mt-3 mb-1 text-center">{employee.firstName} {employee.lastName}</h3>
            <p className="text-gray-500 text-sm text-center">{employee.jobTitle}</p>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h4>

            <div className="space-y-4">
              {employee.email && (
                <div>
                  <div className="text-sm text-gray-500">Email</div>
                  <div className="font-medium">{employee.email}</div>
                </div>
              )}

              {employee.organizationalUnit && (
                <div>
                  <div className="text-sm text-gray-500">Organizational Unit</div>
                  <div className="font-medium">{employee.organizationalUnit}</div>
                </div>
              )}

              {employee.employmentType && (
                <div>
                  <div className="text-sm text-gray-500">Employment Type</div>
                  <div className="font-medium">{employee.employmentType}</div>
                </div>
              )}

              {employee.contractType && (
                <div>
                  <div className="text-sm text-gray-500">Contract Type</div>
                  <div className="font-medium">{employee.contractType}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex justify-center gap-2 p-4 border-t border-gray-200">
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
