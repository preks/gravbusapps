import React, { useCallback } from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Separator,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { EmployeeIcon } from '@newwork/icons'
import { ArrowSquareOutIcon, CaretRightIcon, SignOutIcon } from '@phosphor-icons/react'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import translations from '../_i18n'
import { useUserMenuAvatarUrl } from '../hooks'
import {
  hasUserMenuLanguageContract,
  type UserMenuAdditionalData,
  type UserMenuSupportedLocale,
  type UserMenuUserInfo
} from '../types'
import { UserMenuLanguageSelect } from './UserMenuLanguageSelect'

export interface UserMenuPanelProps {
  className?: string
  accessToken?: string
  userInfo?: UserMenuUserInfo
  additionalData: UserMenuAdditionalData
  'data-testid'?: string
}

const MENU_ROW_CLASS =
  'gba:flex gba:w-full gba:items-center gba:gap-2 gba:rounded-md gba:px-2 gba:py-1.5 gba:text-sm gba:transition-colors focus-visible:gba:outline-none focus-visible:gba:ring-2 focus-visible:gba:ring-ring'

function getInitials(givenName: string, familyName: string): string {
  const first = givenName.trim().charAt(0)
  const last = familyName.trim().charAt(0)
  return `${first}${last}`.toUpperCase() || '?'
}

function resolveDisplayName(userInfo: UserMenuUserInfo | undefined, givenName: string, familyName: string): string {
  const displayName = userInfo?.employeeDetails?.displayName?.trim()
  if (displayName) {
    return displayName
  }
  const combined = `${givenName} ${familyName}`.trim()
  return combined || userInfo?.userName || ''
}

interface UserMenuRowButtonProps {
  label: string
  icon: React.ReactNode
  onClick: () => void
  testId: string
  destructive?: boolean
  trailingIcon?: React.ReactNode
}

function UserMenuRowButton({
  label,
  icon,
  onClick,
  testId,
  destructive = false,
  trailingIcon
}: Readonly<UserMenuRowButtonProps>) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={[
        MENU_ROW_CLASS,
        'gba:justify-start gba:font-normal',
        destructive ? 'gba:text-destructive hover:gba:text-destructive' : 'gba:text-foreground'
      ].join(' ')}
      onClick={onClick}
      data-testid={testId}
      aria-label={label}
    >
      <span className="gba:flex gba:h-5 gba:w-5 gba:shrink-0 gba:items-center gba:justify-center" aria-hidden>
        {icon}
      </span>
      <span className="gba:min-w-0 gba:flex-1 gba:truncate gba:text-left">{label}</span>
      {trailingIcon ? (
        <span className="gba:flex gba:h-4 gba:w-4 gba:shrink-0 gba:items-center gba:justify-center" aria-hidden>
          {trailingIcon}
        </span>
      ) : null}
    </Button>
  )
}

interface UserMenuEmployeeMetaProps {
  dataTestId: string
  email: string
  jobTitle: string
  orgUnit: string
}

function UserMenuEmployeeMeta({ dataTestId, email, jobTitle, orgUnit }: Readonly<UserMenuEmployeeMetaProps>) {
  const showOrgUnitWithoutJobTitle = !jobTitle && Boolean(orgUnit)
  const showOrgUnitWithJobTitle = Boolean(jobTitle && orgUnit)

  return (
    <>
      {email ? (
        <p className="gba:truncate gba:text-xs gba:text-muted-foreground" data-testid={`${dataTestId}-email`}>
          {email}
        </p>
      ) : null}
      {jobTitle ? (
        <p className="gba:truncate gba:text-xs gba:text-muted-foreground" data-testid={`${dataTestId}-job-title`}>
          {jobTitle}
        </p>
      ) : null}
      {showOrgUnitWithoutJobTitle || showOrgUnitWithJobTitle ? (
        <p className="gba:truncate gba:text-xs gba:text-muted-foreground" data-testid={`${dataTestId}-org-unit`}>
          {orgUnit}
        </p>
      ) : null}
    </>
  )
}

interface UserMenuProfileHeaderProps {
  dataTestId: string
  isProfileLoaded: boolean
  avatarUrl: string | undefined
  displayName: string
  givenName: string
  familyName: string
  email: string
  jobTitle: string
  orgUnit: string
}

function UserMenuProfileHeader({
  dataTestId,
  isProfileLoaded,
  avatarUrl,
  displayName,
  givenName,
  familyName,
  email,
  jobTitle,
  orgUnit
}: Readonly<UserMenuProfileHeaderProps>) {
  if (!isProfileLoaded) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-6" data-testid={`${dataTestId}-loading`}>
        <Spinner size="sm" />
      </div>
    )
  }

  return (
    <div className="gba:flex gba:items-start gba:gap-3">
      <Avatar key={avatarUrl ?? 'fallback'} size="lg" data-testid={`${dataTestId}-avatar`}>
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
        <AvatarFallback>{getInitials(givenName, familyName)}</AvatarFallback>
      </Avatar>
      <div className="gba:min-w-0 gba:flex-1">
        <p
          className="gba:truncate gba:text-sm gba:font-semibold gba:text-foreground"
          data-testid={`${dataTestId}-name`}
        >
          {displayName}
        </p>
        <UserMenuEmployeeMeta dataTestId={dataTestId} email={email} jobTitle={jobTitle} orgUnit={orgUnit} />
      </div>
    </div>
  )
}

interface UserMenuLoadedActionsProps {
  dataTestId: string
  isProfileLoaded: boolean
  onProfileClick: () => void
  myProfileLabel: string
}

function UserMenuLoadedActions({
  dataTestId,
  isProfileLoaded,
  onProfileClick,
  myProfileLabel
}: Readonly<UserMenuLoadedActionsProps>) {
  if (!isProfileLoaded) {
    return null
  }

  return (
    <>
      <Separator className="gba:my-3" />
      <div className="gba:flex gba:flex-col gba:gap-0.5">
        <UserMenuRowButton
          label={myProfileLabel}
          icon={<EmployeeIcon className="gba:h-5 gba:w-5" />}
          onClick={onProfileClick}
          testId={`${dataTestId}-my-profile`}
          trailingIcon={<CaretRightIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />}
        />
      </div>
    </>
  )
}

interface UserMenuLanguageSectionProps {
  dataTestId: string
  isProfileLoaded: boolean
  selectedLanguage: UserMenuSupportedLocale
  languageOptions: UserMenuAdditionalData['languageOptions']
  onLanguageChange: (locale: UserMenuSupportedLocale) => void
}

function UserMenuLanguageSection({
  dataTestId,
  isProfileLoaded,
  selectedLanguage,
  languageOptions,
  onLanguageChange
}: Readonly<UserMenuLanguageSectionProps>) {
  if (!isProfileLoaded || !languageOptions || languageOptions.length === 0) {
    return null
  }

  return (
    <>
      <Separator className="gba:my-3" />
      <UserMenuLanguageSelect
        dataTestId={dataTestId}
        selectedLanguage={selectedLanguage}
        languageOptions={languageOptions}
        onLanguageChange={onLanguageChange}
      />
    </>
  )
}

export const UserMenuPanel: React.FC<UserMenuPanelProps> = ({
  className,
  accessToken,
  userInfo,
  additionalData,
  'data-testid': dataTestId = 'user-menu'
}) => {
  const { t } = useTranslation(translations)
  const {
    isProfileLoaded,
    onLogout,
    onProfileNavigate,
    dataPrivacyUrl,
    languageOptions,
    selectedLanguage,
    onLanguageChange
  } = additionalData
  const showLanguageSelect = isProfileLoaded && hasUserMenuLanguageContract(additionalData)

  const givenName = userInfo?.givenName ?? ''
  const familyName = userInfo?.familyName ?? ''
  const email = userInfo?.email ?? ''
  const jobTitle = userInfo?.employeeDetails?.jobTitle?.trim() ?? ''
  const orgUnit = userInfo?.employeeDetails?.organizationalUnit?.name?.trim() ?? ''
  const displayName = resolveDisplayName(userInfo, givenName, familyName)
  const avatarUrl = useUserMenuAvatarUrl({ accessToken, userInfo, isProfileLoaded })

  const handleProfileClick = useCallback(() => {
    onProfileNavigate?.()
    navigateTo(buildPlatformUrl('/platform/employee-record'))
  }, [onProfileNavigate])

  return (
    <div
      className={['gba:w-full gba:min-w-0 gba:p-4', className].filter(Boolean).join(' ')}
      data-testid={dataTestId}
      aria-busy={!isProfileLoaded}
    >
      <UserMenuProfileHeader
        dataTestId={dataTestId}
        isProfileLoaded={isProfileLoaded}
        avatarUrl={avatarUrl}
        displayName={displayName}
        givenName={givenName}
        familyName={familyName}
        email={email}
        jobTitle={jobTitle}
        orgUnit={orgUnit}
      />

      <UserMenuLoadedActions
        dataTestId={dataTestId}
        isProfileLoaded={isProfileLoaded}
        onProfileClick={handleProfileClick}
        myProfileLabel={t('user-menu-my-profile')}
      />

      {showLanguageSelect && selectedLanguage && languageOptions && onLanguageChange ? (
        <UserMenuLanguageSection
          dataTestId={dataTestId}
          isProfileLoaded={isProfileLoaded}
          selectedLanguage={selectedLanguage}
          languageOptions={languageOptions}
          onLanguageChange={onLanguageChange}
        />
      ) : null}

      <Separator className="gba:my-3" />

      <div className="gba:flex gba:flex-col gba:gap-0.5">
        <UserMenuRowButton
          label={t('user-menu-logout')}
          icon={<SignOutIcon className="gba:h-5 gba:w-5" />}
          onClick={onLogout}
          testId={`${dataTestId}-logout`}
          destructive
        />
      </div>

      <Separator className="gba:my-3" />

      <Button
        type="button"
        variant="link"
        size="sm"
        className="gba:h-auto gba:justify-start gba:px-2 gba:py-1 gba:text-xs gba:font-normal"
        asChild
        data-testid={`${dataTestId}-data-privacy`}
      >
        <a
          href={dataPrivacyUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('user-menu-data-privacy-external')}
        >
          <span>{t('user-menu-data-privacy')}</span>
          <ArrowSquareOutIcon className="gba:ms-1.5 gba:inline gba:h-3.5 gba:w-3.5" aria-hidden />
        </a>
      </Button>
    </div>
  )
}
