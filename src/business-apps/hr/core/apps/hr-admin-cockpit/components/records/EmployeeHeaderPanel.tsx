import { Avatar, AvatarFallback, AvatarImage, Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { CaretRightIcon, ChatIcon, PhoneIcon, VideoCameraIcon } from '@phosphor-icons/react'
import { useEmployeeDetailsData } from '@/business-apps/hr/core/details/employee-details/hooks/useEmployeeDetailsData'
import { postToPlatform } from '@/common/utils/postToPlatform'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import translations from '../../_i18n'

interface EmployeeHeaderPanelProps {
  readonly employeeId: string
  readonly accessToken: string
}

export function EmployeeHeaderPanel({ employeeId, accessToken }: Readonly<EmployeeHeaderPanelProps>) {
  const { t } = useTranslation(translations)
  const chatTeamEnabled = useFeature<boolean>(Feature.Core.ChatTeam.Key)
  const { employeeData, isLoading } = useEmployeeDetailsData({
    employeeId,
    context: { accessToken }
  })

  if (isLoading || !employeeData) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:p-6">
        <Spinner size="sm" />
      </div>
    )
  }

  const displayName =
    employeeData.displayName || `${employeeData.firstName ?? ''} ${employeeData.lastName ?? ''}`.trim()
  const initials = `${employeeData.firstName?.[0] ?? ''}${employeeData.lastName?.[0] ?? ''}`.toUpperCase()
  const userId = employeeData.additionalProperties?.userId
  const jobTitle = employeeData.employeePosition?.jobPosition?.name ?? t('employee-not-assigned')

  const handleChat = () => {
    if (!userId) return
    postToPlatform({ type: 'OPEN_CHAT_WITH_USER', payload: { userId, userName: displayName || userId } })
  }

  const handleVideoCall = () => {
    if (!userId) return
    postToPlatform({
      type: 'START_CALL_WITH_USER',
      payload: {
        userId,
        displayName: displayName || userId,
        avatarUrl: employeeData.pictureThumbnail ? `data:image/gif;base64,${employeeData.pictureThumbnail}` : undefined,
        callType: 'video'
      }
    })
  }

  const handleCall = () => {
    if (!userId) return
    postToPlatform({
      type: 'START_CALL_WITH_USER',
      payload: {
        userId,
        displayName: displayName || userId,
        avatarUrl: employeeData.pictureThumbnail ? `data:image/gif;base64,${employeeData.pictureThumbnail}` : undefined,
        callType: 'audio'
      }
    })
  }

  return (
    <div className="gba:p-6">
      <div className="gba:flex gba:flex-col gba:items-center">
        <Avatar size="xl" className="gba:h-24 gba:w-24 gba:text-3xl">
          <AvatarImage
            src={employeeData.pictureThumbnail ? `data:image/gif;base64,${employeeData.pictureThumbnail}` : undefined}
            alt={displayName}
          />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <a
          href={`/platform/employee-record?employeeId=${employeeData.id}`}
          className="gba:flex gba:items-center gba:justify-center gba:w-full gba:mt-2"
        >
          <span className="gba:text-2xl gba:text-foreground gba:font-black gba:truncate">{displayName}</span>
          <CaretRightIcon className="gba:mt-1 gba:ml-1 gba:shrink-0" width={20} height={20} />
        </a>
        <p className="gba:text-muted-foreground gba:text-sm gba:text-center gba:mb-3">{jobTitle}</p>
        <div className="gba:flex gba:gap-2">
          {chatTeamEnabled && (
            <Button
              variant="secondary"
              size="lg"
              onClick={handleChat}
              className="gba:rounded-3xl gba:aspect-square gba:p-2"
              disabled={!userId}
            >
              <ChatIcon />
            </Button>
          )}
          <Button
            variant="secondary"
            size="lg"
            onClick={handleVideoCall}
            className="gba:rounded-3xl gba:aspect-square gba:p-2"
            disabled={!userId}
          >
            <VideoCameraIcon />
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={handleCall}
            className="gba:rounded-3xl gba:aspect-square gba:p-2"
            disabled={!userId}
          >
            <PhoneIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}
