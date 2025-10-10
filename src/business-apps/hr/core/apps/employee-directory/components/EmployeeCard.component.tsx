import React, { useCallback } from 'react'
import { useOpenChat } from '@/modules/chat-sidebar/utils/hooks/useOpenChat'
import {
  PiChatBold,
  PiPhoneBold,
  PiVideoCameraBold,
  PiUserBold,
  PiBuildingsBold,
  PiOfficeChairBold
} from 'react-icons/pi'
import { Avatar, AvatarImage, AvatarFallback, Button } from '@newwork/nw-design-system'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

/**
 * Employee type definition for the card.
 */
interface Employee {
  id: string
  userId?: string // Keycloak user ID for chat functionality
  firstName: string
  lastName: string
  jobTitle: string
  organizationalUnit: string
  siteLocation?: string
  email: string
  profilePicture: string
  employmentType?: string
  contractType?: string
  hireDate?: string
  manager?: {
    id: string
    firstName: string
    lastName: string
  }
}

// Function removed as we no longer need to calculate time spent

// EmployeeCard component
export function EmployeeCard({ employee, isSelected = false }: Readonly<{ employee: Employee; isSelected?: boolean }>) {
  const initialsValue = employee.profilePicture
    ? undefined
    : `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase()

  const avatarSrcValue = employee.profilePicture ? `data:image/gif;base64,${employee.profilePicture}` : undefined
  const profileUrl = buildPlatformUrl('/platform/employee-record', { employeeId: employee.id })
  const { openChatWithUser, openAudioConferenceWithUser, openVideoConferenceWithUser } = useOpenChat()

  // No longer calculating time spent

  // Handler functions for chat actions
  const handleChat = useCallback(() => {
    if (employee.userId) {
      openChatWithUser(employee.userId)
    }
  }, [employee.userId, openChatWithUser])

  const handleCall = useCallback(() => {
    if (employee.userId) {
      openAudioConferenceWithUser(employee.userId)
    }
  }, [employee.userId, openAudioConferenceWithUser])

  const handleVideoCall = useCallback(() => {
    if (employee.userId) {
      openVideoConferenceWithUser(employee.userId)
    }
  }, [employee.userId, openVideoConferenceWithUser])

  const handleProfile = useCallback(() => {
    navigateTo(profileUrl)
  }, [profileUrl])
  return (
    <div
      className={`gba:relative gba:group employee-card-wrapper gba:bg-white gba:rounded-lg gba:shadow-lg gba:!border gba:h-auto gba:w-full gba:transition gba:overflow-hidden ${isSelected ? 'gba:!border-blue-500 gba:!border-2 gba:!shadow-xl' : 'gba:!border-gray-100'}`}
    >
      {/* The card itself - fixed height for consistency */}
      <div
        className="gba:flex gba:flex-col gba:p-4 gba:transition-all gba:duration-300 gba:group-hover:!blur-sm gba:group-focus-within:!blur-sm"
        style={{ color: 'inherit' }}
      >
        {/* Header with avatar and name */}
        <div className="gba:flex gba:mb-3">
          {/* Profile Picture */}
          <div className="gba:mr-3">
            <Avatar className="gba:w-12 gba:h-12">
              {avatarSrcValue && (
                <AvatarImage src={avatarSrcValue} alt={`${employee.firstName} ${employee.lastName}`} />
              )}
              <AvatarFallback className="gba:text-sm gba:font-medium">{initialsValue}</AvatarFallback>
            </Avatar>
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
                textOverflow: 'ellipsis'
              }}
              title={`${employee.firstName} ${employee.lastName}`}
            >
              {employee.firstName} {employee.lastName}
            </div>

            {/* Job Position */}
            <div className="gba:flex gba:items-center gba:mt-1 gba:text-xs">
              <PiOfficeChairBold className="gba:text-gray-500 gba:mr-1.5" size={14} />
              <span className="gba:truncate" title={employee.jobTitle}>
                {employee.jobTitle}
              </span>
            </div>

            {/* Organizational Unit */}
            <div className="gba:flex gba:items-center gba:mt-1 gba:text-xs">
              <PiBuildingsBold className="gba:text-gray-500 gba:mr-1.5" size={14} />
              <span className="gba:truncate" title={employee.organizationalUnit}>
                {employee.organizationalUnit}
              </span>
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
  )
}

interface ActionsOverlayProps {
  onChat?: () => void
  onCall?: () => void
  onVideoCall?: () => void
  onProfile?: () => void
}

/**
 * Overlay actions for EmployeeCard. Reveals on hover with blur and smooth transition.
 */
export const EmployeeCardActionsOverlay: React.FC<Readonly<ActionsOverlayProps>> = ({
  onChat,
  onCall,
  onVideoCall,
  onProfile
}) => (
  <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:bg-black/30 gba:backdrop-blur-sm gba:opacity-0 gba:group-hover:opacity-100 gba:group-hover:pointer-events-auto gba:transition-all gba:duration-300 gba:z-0">
    <div className="gba:flex gba:gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={onChat}
        aria-label="Chat"
        className="gba:rounded-full gba:bg-white/80 gba:shadow-md gba:h-12 gba:w-12"
      >
        <PiChatBold size={24} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onCall}
        aria-label="Call"
        className="gba:rounded-full gba:bg-white/80 gba:shadow-md gba:h-12 gba:w-12"
      >
        <PiPhoneBold size={24} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onVideoCall}
        aria-label="Video Call"
        className="gba:rounded-full gba:bg-white/80 gba:shadow-md gba:h-12 gba:w-12"
      >
        <PiVideoCameraBold size={24} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onProfile}
        aria-label="Go to Profile"
        className="gba:rounded-full gba:bg-white/80 gba:shadow-md gba:h-12 gba:w-12"
      >
        <PiUserBold size={24} />
      </Button>
    </div>
  </div>
)
