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
    <div className="gba:relative gba:group employee-card-wrapper gba:bg-white gba:rounded-lg gba:shadow-md gba:border gba:border-gray-100 gba:h-auto gba:w-full gba:transition gba:overflow-hidden">
      {/* The card itself - fixed height for consistency */}
      <div
        className="gba:flex gba:flex-col gba:p-4 gba:transition-all gba:duration-300 gba:group-hover:blur-sm gba:group-focus-within:blur-sm"
        style={{ color: 'inherit' }}
      >
        {/* Header with avatar and name */}
        <div className="gba:flex gba:mb-3">
          {/* Profile Picture */}
          <div className="gba:mr-3">
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
          <div className="gba:flex gba:flex-col gba:justify-center gba:min-w-0">
            <div
              className="gba:font-semibold gba:truncate gba:w-full"
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
            <div className="gba:flex gba:items-center gba:mt-1 gba:text-xs">
              <PiOfficeChairBold className="gba:text-gray-500 gba:mr-1.5" size={14} />
              <span className="gba:truncate" title={employee.jobTitle}>{employee.jobTitle}</span>
            </div>
            
            {/* Organizational Unit */}
            <div className="gba:flex gba:items-center gba:mt-1 gba:text-xs">
              <PiBuildingsBold className="gba:text-gray-500 gba:mr-1.5" size={14} />
              <span className="gba:truncate" title={employee.organizationalUnit}>{employee.organizationalUnit}</span>
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
  <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:bg-black/30 gba:backdrop-blur-sm gba:opacity-0 gba:group-hover:opacity-100 gba:group-hover:pointer-events-auto gba:transition-all gba:duration-300 gba:z-20">
    <div className="gba:flex gba:gap-4">
      <button
        aria-label="Chat"
        className="gba:bg-white/80 gba:hover:bg-blue-100 gba:rounded-full gba:p-2 gba:shadow-md gba:transition"
        onClick={onChat}
        tabIndex={0}
        type="button"
      >
        <PiChatBold size={24} />
      </button>
      <button
        aria-label="Call"
        className="gba:bg-white/80 gba:hover:bg-blue-100 gba:rounded-full gba:p-2 gba:shadow-md gba:transition"
        onClick={onCall}
        tabIndex={0}
        type="button"
      >
        <PiPhoneBold size={24} />
      </button>
      <button
        aria-label="Video Call"
        className="gba:bg-white/80 gba:hover:bg-blue-100 gba:rounded-full gba:p-2 gba:shadow-md gba:transition"
        onClick={onVideoCall}
        tabIndex={0}
        type="button"
      >
        <PiVideoCameraBold size={24} />
      </button>
      <button
        aria-label="Go to Profile"
        className="gba:bg-white/80 gba:hover:bg-blue-100 gba:rounded-full gba:p-2 gba:shadow-md gba:transition"
        onClick={onProfile}
        tabIndex={0}
        type="button"
      >
        <PiUserBold size={24} />
      </button>
    </div>
  </div>
);
