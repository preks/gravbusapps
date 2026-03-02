import React, { useCallback } from 'react'
import {
  ChatIcon,
  PhoneIcon,
  VideoCameraIcon,
  UserIcon,
  BuildingsIcon,
  OfficeChairIcon
} from '@phosphor-icons/react'
import { Avatar, AvatarImage, AvatarFallback, Button } from '@newwork/nw-design-system'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { postToPlatform } from '@/common/utils/postToPlatform'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'

/**
 * Employee type definition for the card.
 */
interface Employee {
  id: string
  userId?: string
  firstName: string
  lastName: string
  jobTitle: string
  organizationalUnit: string
  siteLocation?: string
  workEmail?: string
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

export function EmployeeCard({ employee, isSelected = false }: Readonly<{ employee: Employee; isSelected?: boolean }>) {
  const initialsValue = employee.profilePicture
    ? undefined
    : `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase()

  const avatarSrcValue = employee.profilePicture ? `data:image/gif;base64,${employee.profilePicture}` : undefined
  const profileUrl = buildPlatformUrl('/platform/employee-record', { employeeId: employee.id })
  const displayName = `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim()
  const avatarUrl = employee.profilePicture ? `data:image/gif;base64,${employee.profilePicture}` : undefined

  const handleChat = useCallback(() => {
    if (!employee.userId) return
    postToPlatform({
      type: 'OPEN_CHAT_WITH_USER',
      payload: { userId: employee.userId, userName: displayName || employee.userId }
    })
  }, [employee.userId, displayName])

  const handleCall = useCallback(() => {
    if (!employee.userId) return
    postToPlatform({
      type: 'START_CALL_WITH_USER',
      payload: {
        userId: employee.userId,
        displayName: displayName || employee.userId,
        avatarUrl,
        callType: 'audio'
      }
    })
  }, [employee.userId, displayName, avatarUrl])

  const handleVideoCall = useCallback(() => {
    if (!employee.userId) return
    postToPlatform({
      type: 'START_CALL_WITH_USER',
      payload: {
        userId: employee.userId,
        displayName: displayName || employee.userId,
        avatarUrl,
        callType: 'video'
      }
    })
  }, [employee.userId, displayName, avatarUrl])

  const handleProfile = useCallback(() => {
    navigateTo(profileUrl)
  }, [profileUrl])
  return (
    <div
      className={`gba:relative gba:group employee-card-wrapper gba:bg-card gba:rounded-lg gba:shadow-lg gba:!border gba:h-auto gba:w-full gba:transition gba:overflow-hidden ${isSelected ? 'gba:!border-info gba:!border-2 gba:!shadow-xl' : 'gba:!border-border'}`}
    >
      <div
        className="gba:flex gba:flex-col gba:p-4 gba:transition-all gba:duration-300 gba:group-hover:!blur-sm gba:group-focus-within:!blur-sm"
        style={{ color: 'inherit' }}
      >
        <div className="gba:flex gba:mb-3">
          <div className="gba:mr-3">
            <Avatar className="gba:w-12 gba:h-12">
              {avatarSrcValue && (
                <AvatarImage src={avatarSrcValue} alt={`${employee.firstName} ${employee.lastName}`} />
              )}
              <AvatarFallback className="gba:text-sm gba:font-medium">{initialsValue}</AvatarFallback>
            </Avatar>
          </div>
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

            <div className="gba:flex gba:items-center gba:mt-1 gba:text-xs">
              <OfficeChairIcon weight="bold" className="gba:text-muted-foreground gba:mr-1.5" size={14} />
              <span className="gba:truncate" title={employee.jobTitle}>
                {employee.jobTitle}
              </span>
            </div>

            <div className="gba:flex gba:items-center gba:mt-1 gba:text-xs">
              <BuildingsIcon weight="bold" className="gba:text-muted-foreground gba:mr-1.5" size={14} />
              <span className="gba:truncate" title={employee.organizationalUnit}>
                {employee.organizationalUnit}
              </span>
            </div>
          </div>
        </div>
      </div>
      <EmployeeCardActionsOverlay
        onChat={handleChat}
        onCall={handleCall}
        onVideoCall={handleVideoCall}
        onProfile={handleProfile}
        hasUserId={!!employee.userId}
      />
    </div>
  )
}

interface ActionsOverlayProps {
  onChat?: () => void
  onCall?: () => void
  onVideoCall?: () => void
  onProfile?: () => void
  hasUserId?: boolean
}

export const EmployeeCardActionsOverlay: React.FC<Readonly<ActionsOverlayProps>> = ({
  onChat,
  onCall,
  onVideoCall,
  onProfile,
  hasUserId = false
}) => {
  const teamChatEnabled = useFeature<boolean>(Feature.Core.TeamChat.Key)

  return (
    <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:bg-foreground/30 gba:backdrop-blur-sm gba:opacity-0 gba:group-hover:opacity-100 gba:group-hover:pointer-events-auto gba:transition-all gba:duration-300 gba:z-0">
      <div className="gba:flex gba:gap-2">
        {teamChatEnabled && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onChat}
            disabled={!hasUserId}
            aria-label="Chat"
            className="gba:rounded-full gba:bg-card/80 gba:shadow-md gba:h-12 gba:w-12"
            data-testid="employee-directory-card-chat"
          >
            <ChatIcon weight="bold" size={24} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onCall}
          disabled={!hasUserId}
          aria-label="Call"
          className="gba:rounded-full gba:bg-card/80 gba:shadow-md gba:h-12 gba:w-12"
          data-testid="employee-directory-card-audio-call"
        >
          <PhoneIcon weight="bold" size={24} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onVideoCall}
          disabled={!hasUserId}
          aria-label="Video Call"
          className="gba:rounded-full gba:bg-card/80 gba:shadow-md gba:h-12 gba:w-12"
          data-testid="employee-directory-card-video-call"
        >
          <VideoCameraIcon weight="bold" size={24} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onProfile}
          aria-label="Go to Profile"
          className="gba:rounded-full gba:bg-card/80 gba:shadow-md gba:h-12 gba:w-12"
        >
          <UserIcon weight="bold" size={24} />
        </Button>
      </div>
    </div>
  )
}
