import React, { useCallback } from 'react';
import { useOpenChat } from '@/modules/chat-sidebar/utils/hooks/useOpenChat';
import { 
  PiChatBold, 
  PiPhoneBold,
  PiVideoCameraBold,
  PiUserBold,
  PiBuildingsBold,
  PiOfficeChairBold
} from 'react-icons/pi';
import EmployeeAvatar from '@/business-apps/hr/components/employeeAvatar/EmployeeAvatar';

/**
 * Employee type definition for the card.
 */
interface Employee {
    id: string;
    userId?: string; // Keycloak user ID for chat functionality
    firstName: string;
    lastName: string;
    jobTitle: string;
    organizationalUnit: string;
    siteLocation?: string;
    email: string;
    profilePicture: string;
    employmentType?: string;
    contractType?: string;
    hireDate?: string;
    manager?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };

// Function removed as we no longer need to calculate time spent

// EmployeeCard component
export function EmployeeCard({ employee }: Readonly<{ employee: Employee }>) {
  const profileUrl = `/platform/employee-profile/${employee.id}`;
  const { openChatWithUser, openAudioConferenceWithUser, openVideoConferenceWithUser } = useOpenChat();
  
  // No longer calculating time spent

  // Handler functions for chat actions
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
  return (
    <div className="relative group employee-card-wrapper bg-white rounded-lg shadow-md border border-gray-100 h-auto w-full transition overflow-hidden">
      {/* The card itself - fixed height for consistency */}
      <div
        className="flex flex-col p-4 transition-all duration-300 group-hover:blur-sm group-focus-within:blur-sm"
        style={{ color: 'inherit' }}
      >
        {/* Header with avatar and name */}
        <div className="flex mb-3">
          {/* Profile Picture */}
          <div className="mr-3">
            <EmployeeAvatar
              profilePicture={employee.profilePicture}
              firstName={employee.firstName}
              lastName={employee.lastName}
              employeeId={employee.id}
              size={56}
              randomizeStatus={true}
            />
          </div>

          {/* Name, job title, and org unit */}
          <div className="flex flex-col justify-center min-w-0">
            <div
              className="font-semibold truncate w-full"
              style={{
                fontSize: 'clamp(1rem, 2vw, 1.125rem)',
                lineHeight: 1.2,
                maxWidth: '100%',
                minWidth: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={`${employee.firstName} ${employee.lastName}`}
            >
              {employee.firstName} {employee.lastName}
            </div>
            
            {/* Job Position */}
            <div className="flex items-center mt-1 text-xs">
              <PiOfficeChairBold className="text-gray-500 mr-1.5" size={14} />
              <span className="truncate" title={employee.jobTitle}>{employee.jobTitle}</span>
            </div>
            
            {/* Organizational Unit */}
            <div className="flex items-center mt-1 text-xs">
              <PiBuildingsBold className="text-gray-500 mr-1.5" size={14} />
              <span className="truncate" title={employee.organizationalUnit}>{employee.organizationalUnit}</span>
            </div>
          </div>
        </div>
      </div>
      {/* Overlay actions appear on hover */}
      <EmployeeCardActionsOverlay
        onChat={handleChat}
        onCall={handleCall}
        onVideoCall={handleVideoCall}
        onProfile={handleProfile}
      />
    </div>
  );
}

interface ActionsOverlayProps {
  onChat?: () => void;
  onCall?: () => void;
  onVideoCall?: () => void;
  onProfile?: () => void;
}

/**
 * Overlay actions for EmployeeCard. Reveals on hover with blur and smooth transition.
 */
export const EmployeeCardActionsOverlay: React.FC<Readonly<ActionsOverlayProps>> = ({
  onChat,
  onCall,
  onVideoCall,
  onProfile,
}) => (
  <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-300 z-20">
    <div className="flex gap-4">
      <button
        aria-label="Chat"
        className="bg-white/80 hover:bg-blue-100 rounded-full p-2 shadow-md transition"
        onClick={onChat}
        tabIndex={0}
        type="button"
      >
        <PiChatBold size={24} />
      </button>
      <button
        aria-label="Call"
        className="bg-white/80 hover:bg-blue-100 rounded-full p-2 shadow-md transition"
        onClick={onCall}
        tabIndex={0}
        type="button"
      >
        <PiPhoneBold size={24} />
      </button>
      <button
        aria-label="Video Call"
        className="bg-white/80 hover:bg-blue-100 rounded-full p-2 shadow-md transition"
        onClick={onVideoCall}
        tabIndex={0}
        type="button"
      >
        <PiVideoCameraBold size={24} />
      </button>
      <button
        aria-label="Go to Profile"
        className="bg-white/80 hover:bg-blue-100 rounded-full p-2 shadow-md transition"
        onClick={onProfile}
        tabIndex={0}
        type="button"
      >
        <PiUserBold size={24} />
      </button>
    </div>
  </div>
);
