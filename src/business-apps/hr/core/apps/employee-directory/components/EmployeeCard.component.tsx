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
import { Avatar, Button } from '@newwork/gravity-ui-catalog';

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
export function EmployeeCard({ employee, isSelected = false }: Readonly<{ employee: Employee; isSelected?: boolean }>) {
  const initialsValue = employee.profilePicture
    ? undefined
    : `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase();

  const avatarSrcValue = employee.profilePicture
    ? `data:image/gif;base64,${employee.profilePicture}`
    : undefined;

  const avatarContentTypeValue = employee.profilePicture ? 'image' : 'initials';
  const profileUrl = `/platform/employee-record?employeeId=${employee.id}`;
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
    <div className={`gba:relative gba:group employee-card-wrapper gba:bg-white gba:rounded-lg gba:shadow-md gba:!border gba:h-auto gba:w-full gba:transition gba:overflow-hidden ${isSelected ? 'gba:!border-blue-500 gba:!border-2 gba:!shadow-lg' : 'gba:!border-gray-100'}`}>
      {/* The card itself - fixed height for consistency */}
      <div
        className="gba:flex gba:flex-col gba:p-4 gba:transition-all gba:duration-300 gba:group-hover:!blur-sm gba:group-focus-within:!blur-sm"
        style={{ color: 'inherit' }}
      >
        {/* Header with avatar and name */}
        <div className="gba:flex gba:mb-3">
          {/* Profile Picture */}
          <div className="gba:mr-3">
            <Avatar
              src={avatarSrcValue}
              initials={initialsValue}
              // @ts-ignore - Type issue in gravity-ui-catalog for contentType
              contentType={avatarContentTypeValue}
              alt={`${employee.firstName} ${employee.lastName}`}
              // @ts-ignore - There is a type definition issue in gravity-ui-catalog@7.8.5 where AvatarSize is not correctly exported.
              size="lg"
              // @ts-ignore - There is a type definition issue in gravity-ui-catalog@7.8.5 where AvatarSize is not correctly exported.
              shape="rounded"
              // @ts-ignore - There is a type definition issue in gravity-ui-catalog@7.8.5 where AvatarSize is not correctly exported.
              appearance="gradient"
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
  <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:bg-black/30 gba:backdrop-blur-sm gba:opacity-0 gba:group-hover:opacity-100 gba:group-hover:pointer-events-auto gba:transition-all gba:duration-300 gba:z-0">
    <div className="gba:flex gba:gap-2">
      <Button
        variant="ghost"
        size="lg"
        icon={<PiChatBold size={24} />}
        onClick={onChat}
        aria-label="Chat"
        className="gba:rounded-full gba:bg-white/80 gba:shadow-md"
      />
      <Button
        variant="ghost"
        size="lg"
        icon={<PiPhoneBold size={24} />}
        onClick={onCall}
        aria-label="Call"
        className="gba:rounded-full gba:bg-white/80 gba:shadow-md"
      />
      <Button
        variant="ghost"
        size="lg"
        icon={<PiVideoCameraBold size={24} />}
        onClick={onVideoCall}
        aria-label="Video Call"
        className="gba:rounded-full gba:bg-white/80 gba:shadow-md"
      />
      <Button
        variant="ghost"
        size="lg"
        icon={<PiUserBold size={24} />}
        onClick={onProfile}
        aria-label="Go to Profile"
        className="gba:rounded-full gba:bg-white/80 gba:shadow-md"
      />
    </div>
  </div>
);
