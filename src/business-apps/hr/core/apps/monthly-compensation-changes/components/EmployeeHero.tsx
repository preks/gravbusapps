import { Avatar, AvatarFallback, AvatarImage, Button } from '@newwork/nw-design-system'
import { CaretRightIcon, ChatIcon, PhoneIcon, VideoCameraIcon } from '@phosphor-icons/react'
import { Navigation, buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { postToPlatform } from '@/common/utils/postToPlatform'
import { getInitials } from '../utils/formatUtils'

type TranslationFn = (key: string) => string

interface EmployeeHeroProps {
  readonly name: string
  readonly picture?: string | null
  readonly subtitle: string
  readonly employeeId?: string
  readonly t: TranslationFn
}

export function EmployeeHero({ name, picture, subtitle, employeeId, t }: EmployeeHeroProps) {
  const openEmployeeRecord = () => {
    if (employeeId) {
      navigateTo(buildPlatformUrl(Navigation.HR_EMPLOYEE_RECORD, { id: employeeId }))
    }
  }

  const handleChat = () => {
    if (!employeeId) return
    postToPlatform({ type: 'OPEN_CHAT_WITH_USER', payload: { userId: employeeId, userName: name } })
  }

  const handleVideoCall = () => {
    if (!employeeId) return
    postToPlatform({
      type: 'START_CALL_WITH_USER',
      payload: { userId: employeeId, displayName: name, avatarUrl: picture, callType: 'video' }
    })
  }

  const handleCall = () => {
    if (!employeeId) return
    postToPlatform({
      type: 'START_CALL_WITH_USER',
      payload: { userId: employeeId, displayName: name, avatarUrl: picture, callType: 'audio' }
    })
  }

  return (
    <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-6">
      <div className="gba:flex gba:flex-col gba:items-center">
        <Avatar size="xl" className="gba:h-24 gba:w-24 gba:text-3xl">
          <AvatarImage src={picture ?? undefined} alt={name} />
          <AvatarFallback>{getInitials(name)}</AvatarFallback>
        </Avatar>

        <button
          type="button"
          onClick={openEmployeeRecord}
          className="gba:mt-2 gba:flex gba:max-w-full gba:items-center gba:justify-center gba:gap-1 gba:text-center"
        >
          <span className="gba:truncate gba:text-2xl gba:font-black gba:text-foreground gba:hover:underline">
            {name}
          </span>
          <CaretRightIcon size={20} className="gba:shrink-0 gba:text-foreground" />
        </button>

        <p className="gba:mb-3 gba:text-center gba:text-sm gba:text-muted-foreground">{subtitle}</p>

        <div className="gba:flex gba:gap-2">
          <Button
            variant="secondary"
            size="lg"
            onClick={handleChat}
            className="gba:aspect-square gba:rounded-3xl gba:p-2"
            aria-label={t('employee-contact-chat')}
            disabled={!employeeId}
          >
            <ChatIcon />
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={handleVideoCall}
            className="gba:aspect-square gba:rounded-3xl gba:p-2"
            aria-label={t('employee-contact-video')}
            disabled={!employeeId}
          >
            <VideoCameraIcon />
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={handleCall}
            className="gba:aspect-square gba:rounded-3xl gba:p-2"
            aria-label={t('employee-contact-call')}
            disabled={!employeeId}
          >
            <PhoneIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}
