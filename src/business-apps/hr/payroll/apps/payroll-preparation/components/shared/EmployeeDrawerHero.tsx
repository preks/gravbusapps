import React, { useCallback } from 'react'
import { postToPlatform } from '@/common/utils/postToPlatform'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import { Avatar, AvatarFallback, AvatarImage, Button } from '@newwork/nw-design-system'
import { CaretRightIcon, ChatIcon, PhoneIcon, VideoCameraIcon } from '@phosphor-icons/react'
import type { PayrollEmployee } from '../../types/payrollTypes'

interface EmployeeDrawerHeroProps {
  employee: PayrollEmployee
  onOpenProfile: () => void
  t: (key: string) => string
  testIdPrefix: string
}

function getEmployeeUserId(employee: PayrollEmployee): string | undefined {
  const userId = employee.additionalProperties?.userId

  return typeof userId === 'string' && userId.trim() !== '' ? userId : undefined
}

function getEmployeeSubtitle(employee: PayrollEmployee): string {
  return employee.department || employee.legalEntityName || employee.employmentStatus || '-'
}

export function EmployeeDrawerHero({ employee, onOpenProfile, t, testIdPrefix }: EmployeeDrawerHeroProps) {
  const chatTeamEnabled = useFeature<boolean>(Feature.Core.ChatTeam.Key)
  const userId = getEmployeeUserId(employee)
  const displayName = employee.displayName || employee.fullName
  const subtitle = getEmployeeSubtitle(employee)

  const handleChat = useCallback(() => {
    if (!userId) {
      return
    }

    postToPlatform({ type: 'OPEN_CHAT_WITH_USER', payload: { userId, userName: displayName } })
  }, [displayName, userId])

  const handleCall = useCallback(() => {
    if (!userId) {
      return
    }

    postToPlatform({
      type: 'START_CALL_WITH_USER',
      payload: {
        userId,
        displayName,
        avatarUrl: employee.pictureThumbnail,
        callType: 'audio'
      }
    })
  }, [displayName, employee.pictureThumbnail, userId])

  const handleVideoCall = useCallback(() => {
    if (!userId) {
      return
    }

    postToPlatform({
      type: 'START_CALL_WITH_USER',
      payload: {
        userId,
        displayName,
        avatarUrl: employee.pictureThumbnail,
        callType: 'video'
      }
    })
  }, [displayName, employee.pictureThumbnail, userId])

  return (
    <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-6">
      <div className="gba:flex gba:flex-col gba:items-center">
        <Avatar size="xl" className="gba:h-24 gba:w-24 gba:text-3xl">
          <AvatarImage
            src={employee.pictureThumbnail ? `data:image/jpeg;base64,${employee.pictureThumbnail}` : undefined}
            alt={displayName}
          />
          <AvatarFallback>
            {`${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <button
          type="button"
          onClick={onOpenProfile}
          className="gba:mt-2 gba:flex gba:max-w-full gba:items-center gba:justify-center gba:gap-1 gba:text-center"
          data-testid={`${testIdPrefix}-open-record-button`}
        >
          <span className="gba:truncate gba:text-2xl gba:font-black gba:text-foreground gba:hover:underline">
            {displayName}
          </span>
          <CaretRightIcon size={20} className="gba:shrink-0 gba:text-foreground" />
        </button>

        <p className="gba:mb-3 gba:text-center gba:text-sm gba:text-muted-foreground">{subtitle}</p>

        <div className="gba:flex gba:gap-2">
          {chatTeamEnabled && (
            <Button
              variant="secondary"
              size="lg"
              onClick={handleChat}
              className="gba:aspect-square gba:rounded-3xl gba:p-2"
              data-testid={`${testIdPrefix}-chat-button`}
              aria-label={t('employee-contact-chat')}
              disabled={!userId}
            >
              <ChatIcon />
            </Button>
          )}
          <Button
            variant="secondary"
            size="lg"
            onClick={handleVideoCall}
            className="gba:aspect-square gba:rounded-3xl gba:p-2"
            data-testid={`${testIdPrefix}-video-button`}
            aria-label={t('employee-contact-video')}
            disabled={!userId}
          >
            <VideoCameraIcon />
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={handleCall}
            className="gba:aspect-square gba:rounded-3xl gba:p-2"
            data-testid={`${testIdPrefix}-audio-button`}
            aria-label={t('employee-contact-call')}
            disabled={!userId}
          >
            <PhoneIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}
