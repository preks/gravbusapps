'use client'

import React, { useCallback } from 'react'
import dayjs from 'dayjs'
import { postToPlatform } from '@/common/utils/postToPlatform'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  CaretRightIcon,
  ChatIcon,
  PhoneIcon,
  VideoCameraIcon,
  UserIcon,
  BuildingsIcon,
  MapPinIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  EnvelopeSimpleIcon
} from '@phosphor-icons/react'
import { useEmployeeDetailsData } from './hooks/useEmployeeDetailsData'
import { getCatalogValue, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import {
  useTranslation,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import employeeDetailsTranslations from './_i18n'
import { MatrixUnitEmployee, EmployeeCapability, EmployeeSkill } from './types'

export interface EmployeeDetailsProps extends BusinessAppContextProps {
  employeeId: string
  employeeData?: any
}

interface ProfileInfoItemProps {
  icon: React.ReactNode
  label: string
  value: string
  linkTo?: string
  onClick?: () => void
}

const extractWorkEmail = (communications: any[] | null | undefined): string | undefined => {
  if (!communications || !Array.isArray(communications)) {
    return undefined
  }

  const emailComm = communications.find((c: any) => {
    if (!c.value || c.value.trim() === '') return false
    const channelValue = c.channel?.value?.toLowerCase() || ''
    return channelValue.includes('email')
  })

  return emailComm?.value?.trim() || undefined
}

const getBusinessEmail = (employeeData: any) => extractWorkEmail(employeeData?.communication) || ''

const getBusinessPhone = (employeeData: any) => {
  const phone = employeeData?.communication?.find(
    (c: any) => (c?.channel?.code === 'Mobile' || c?.channel?.code === 'Phone') && !c?.isDeleted && c?.value
  )?.value
  return phone || employeeData?.additionalProperties?.phone || ''
}

const formatPhoneNumber = (phone: string) => {
  if (!phone) return ''
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')
}

const calculateTimeSince = (employeeData: any, t: (key: string) => string) => {
  const hireDate = employeeData?.workingCondition?.[0]?.hireDate
  if (!hireDate) return ''

  const hire = dayjs(hireDate)
  const now = dayjs()

  const years = now.diff(hire, 'year')
  const months = now.diff(hire, 'month') % 12
  let result = ''

  if (years > 0) {
    result += `${years} ${years === 1 ? t('employee-details-year') : t('employee-details-years')}`
  }

  if (months > 0 || years === 0) {
    if (years > 0) result += ' '
    result += `${months} ${months === 1 ? t('employee-details-month') : t('employee-details-months')}`
  }

  return result
}

const formatDateLocalized = (isoDate: string) => {
  const locale = getCurrentActiveUserLocale?.() || 'en-US'
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(
      new Date(isoDate)
    )
  } catch {
    return dayjs(isoDate).format('MMM D, YYYY')
  }
}

const getManagerName = (employeeData: any, t: (key: string) => string) => {
  const supervisor = employeeData?.employeePosition?.supervisor
  if (!supervisor || supervisor.id === employeeData?.id) return t('employee-details-no-manager')

  return (
    supervisor.displayName ||
    `${supervisor.firstName} ${supervisor.lastName}`.trim() ||
    t('employee-details-not-assigned')
  )
}

const getManagerClickHandler = (employeeData: any): (() => void) | undefined => {
  const supervisorId = employeeData?.employeePosition?.supervisor?.id
  if (!supervisorId || supervisorId === employeeData?.id) {
    return undefined
  }

  return () => {
    const url = new URL(globalThis.location.href)
    url.searchParams.set('employeeId', supervisorId)
    globalThis.history.pushState({}, '', url.toString())
  }
}

const openChatWithUser = (userId: string | undefined, displayName: string) => {
  if (!userId) {
    return
  }

  postToPlatform({
    type: 'OPEN_CHAT_WITH_USER',
    payload: { userId, userName: displayName || userId }
  })
}

const startUserCall = (
  userId: string | undefined,
  displayName: string,
  pictureThumbnail: string | undefined,
  callType: 'audio' | 'video'
) => {
  if (!userId) {
    return
  }

  postToPlatform({
    type: 'START_CALL_WITH_USER',
    payload: {
      userId,
      displayName: displayName || userId,
      avatarUrl: pictureThumbnail ? `data:image/gif;base64,${pictureThumbnail}` : undefined,
      callType
    }
  })
}

const ProfileInfoItem: React.FC<ProfileInfoItemProps> = ({ icon, label, value, linkTo, onClick }) => {
  return (
    <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
      <div className="gba:shrink-0 gba:text-muted-foreground">{icon}</div>
      <div className="gba:grow">
        <div className="gba:text-xs gba:text-muted-foreground">{label}</div>
        {linkTo ? (
          <a href={linkTo} className="gba:text-sm gba:text-info gba:inline-flex gba:items-baseline gba:flex-wrap">
            <span className="gba:whitespace-normal">{value}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="gba:h-3 gba:w-3 gba:shrink-0 gba:ml-0.5 gba:align-baseline gba:inline"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        ) : onClick ? (
          <button
            onClick={onClick}
            className="gba:text-sm gba:text-info gba:inline-flex gba:items-baseline gba:flex-wrap gba:bg-transparent gba:border-0 gba:cursor-pointer gba:p-0"
            data-testid={`profile-info-${label.toLowerCase()}-link`}
          >
            <span className="gba:whitespace-normal">{value}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="gba:h-3 gba:w-3 gba:shrink-0 gba:ml-0.5 gba:align-baseline gba:inline"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </button>
        ) : (
          <div className="gba:text-sm gba:text-foreground">{value}</div>
        )}
      </div>
    </div>
  )
}

interface EmployeeDetailsContentProps {
  employeeData: any
  accessToken?: string
  userId?: string
  businessEmail: string
  businessPhone: string
  managerName: string
  managerClickHandler?: () => void
  t: (key: string) => string
  onChat: () => void
  onCall: () => void
  onVideoCall: () => void
}

const EmployeeDetailsContent: React.FC<EmployeeDetailsContentProps> = ({
  employeeData,
  accessToken,
  userId,
  businessEmail,
  businessPhone,
  managerName,
  managerClickHandler,
  t,
  onChat,
  onCall,
  onVideoCall
}) => {
  const teamChatEnabled = useFeature<boolean>(Feature.Core.TeamChat.Key)
  const CallIcon = PhoneIcon
  const VideoCallIcon = VideoCameraIcon

  return (
    <div className="gba:bg-white gba:h-full gba:overflow-auto">
      <div className="gba:p-6 gba:relative">
        {accessToken && (
          <div className="gba:absolute gba:top-4 gba:right-2" onClick={e => e.stopPropagation()}>
            <AppAction
              variant="header"
              data-testid="employee-details-action-button"
              contextsArray={[FlowContextName.employeeEntity]}
              externalContextData={{
                employeeId: employeeData.id,
                keycloakUserId: employeeData.additionalProperties?.userId,
                managerId: employeeData.employeePosition?.supervisor?.id,
                organizationalUnitId: employeeData.employeePosition?.organizationalUnitId
              }}
              prefixDataTestId="employee-details-action"
              accessToken={accessToken}
            />
          </div>
        )}

        <div className="gba:space-y-6">
          <div className="gba:flex gba:flex-col gba:items-center gba:mb-4 gba:animate-fade-in">
            <Avatar size="xl" className="gba:h-24 gba:w-24 gba:text-3xl">
              <AvatarImage
                src={
                  employeeData.pictureThumbnail ? `data:image/gif;base64,${employeeData.pictureThumbnail}` : undefined
                }
                alt={`${employeeData.firstName} ${employeeData.lastName}`}
              />
              <AvatarFallback>
                {`${employeeData.firstName?.[0] || ''}${employeeData.lastName?.[0] || ''}`.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <a
              href={`/platform/employee-record?employeeId=${employeeData.id}`}
              className="gba:flex gba:items-center gba:justify-center gba:w-full"
            >
              <div className="gba:my-2 gba:pl-2 gba:text-center gba:flex gba:flex-col gba:items-center gba:w-auto gba:max-w-full gba:border-box">
                <div className="gba:text-2xl gba:text-foreground gba:font-black gba:w-full gba:truncate">
                  {employeeData.displayName || `${employeeData.firstName} ${employeeData.lastName}`}
                </div>
              </div>
              <div>
                <CaretRightIcon className="gba:mt-1" width={20} height={20} fill="var(--nw-foreground)" />
              </div>
            </a>
            <p className="gba:text-muted-foreground gba:text-sm gba:text-center gba:mb-3">
              {employeeData.employeePosition?.jobPosition?.name || t('employee-details-not-assigned')}
            </p>

            <div className="gba:flex gba:gap-2">
              {teamChatEnabled && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={onChat}
                  className="gba:rounded-3xl gba:aspect-square gba:p-2"
                  data-testid="employee-details-chat-button"
                  disabled={!userId}
                >
                  <ChatIcon />
                </Button>
              )}
              <Button
                variant="secondary"
                size="lg"
                onClick={onVideoCall}
                className="gba:rounded-3xl gba:aspect-square gba:p-2"
                data-testid="employee-details-video-button"
                disabled={!userId}
              >
                <VideoCallIcon />
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={onCall}
                className="gba:rounded-3xl gba:aspect-square gba:p-2"
                data-testid="employee-details-audio-button"
                disabled={!userId}
              >
                <CallIcon />
              </Button>
            </div>
          </div>

          <div className="gba:border-t gba:border-border gba:pt-4">
            <div className="gba:mb-6">
              <h4 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-4">
                {t('employee-details-contact-information')}
              </h4>
              <div className="gba:space-y-2">
                {businessEmail ? (
                  <a
                    href={`mailto:${businessEmail}`}
                    className="gba:inline-flex gba:items-center gba:text-info gba:hover:text-info-secondary-foreground gba:transition-colors gba:text-sm"
                  >
                    <EnvelopeSimpleIcon className="gba:mr-2 gba:h-4 gba:w-4" />
                    {businessEmail}
                  </a>
                ) : (
                  <div className="gba:inline-flex gba:items-center gba:text-muted-foreground gba:text-sm">
                    <EnvelopeSimpleIcon className="gba:mr-2 gba:h-4 gba:w-4" />
                    {t('employee-details-no-email')}
                  </div>
                )}

                {businessPhone ? (
                  <a
                    href={`tel:${businessPhone}`}
                    className="gba:inline-flex gba:items-center gba:text-info gba:hover:text-info-secondary-foreground gba:transition-colors gba:text-sm"
                  >
                    <PhoneIcon className="gba:mr-2 gba:h-4 gba:w-4" />
                    {formatPhoneNumber(businessPhone)}
                  </a>
                ) : (
                  <div className="gba:inline-flex gba:items-center gba:text-muted-foreground gba:text-sm">
                    <PhoneIcon className="gba:mr-2 gba:h-4 gba:w-4" />
                    {t('employee-details-no-phone')}
                  </div>
                )}
              </div>
            </div>

            <h4 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-4">
              {t('employee-details-profile-information')}
            </h4>

            <div className="gba:space-y-1">
              <ProfileInfoItem
                icon={<BuildingsIcon className="gba:h-4 gba:w-4" />}
                label={t('employee-details-organization')}
                value={employeeData.employeePosition?.organizationalUnit?.name || t('employee-details-not-assigned')}
                linkTo={
                  employeeData.employeePosition?.organizationalUnitId
                    ? `/orgchart/active/organization?organizationUnitId=${employeeData.employeePosition.organizationalUnitId}`
                    : undefined
                }
              />

              <ProfileInfoItem
                icon={<UserIcon className="gba:h-4 gba:w-4" />}
                label={t('employee-details-manager')}
                value={managerName}
                onClick={managerClickHandler}
              />

              <ProfileInfoItem
                icon={<MapPinIcon className="gba:h-4 gba:w-4" />}
                label={t('employee-details-job-position')}
                value={employeeData.employeePosition?.jobPosition?.name || t('employee-details-not-assigned')}
              />

              <ProfileInfoItem
                icon={<CurrencyDollarIcon className="gba:h-4 gba:w-4" />}
                label={t('employee-details-cost-center')}
                value={employeeData.employeePosition?.costCenter?.name || t('employee-details-not-assigned')}
                linkTo={
                  employeeData.employeePosition?.costCenter?.id
                    ? `/orgchart/active/finance?costCenterDataId=${employeeData.employeePosition.costCenter.id}`
                    : undefined
                }
              />

              <ProfileInfoItem
                icon={<CalendarIcon className="gba:h-4 gba:w-4" />}
                label={t('employee-details-hire-date')}
                value={
                  employeeData.workingCondition?.[0]?.hireDate
                    ? `${formatDateLocalized(employeeData.workingCondition[0].hireDate)} - ${calculateTimeSince(employeeData, t)}`
                    : t('employee-details-not-available')
                }
              />

              <ProfileInfoItem
                icon={<UserIcon className="gba:h-4 gba:w-4" />}
                label={t('employee-details-employment-type')}
                value={
                  getCatalogValue(employeeData.workingCondition?.[0]?.employmentType) ||
                  t('employee-details-not-specified')
                }
              />

              <ProfileInfoItem
                icon={<UserIcon className="gba:h-4 gba:w-4" />}
                label={t('employee-details-contract-type')}
                value={
                  getCatalogValue(employeeData.workingCondition?.[0]?.contractType) ||
                  t('employee-details-not-specified')
                }
              />
            </div>

            <div className="gba:mt-6">
              <h4 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-2">
                {t('employee-details-teams')}
              </h4>
              <div className="gba:flex gba:flex-wrap gba:gap-2">
                {employeeData.employeePosition?.matrixUnitEmployees &&
                Array.isArray(employeeData.employeePosition.matrixUnitEmployees) &&
                employeeData.employeePosition.matrixUnitEmployees.length > 0 ? (
                  employeeData.employeePosition.matrixUnitEmployees
                    .filter(
                      (teamItem: any): teamItem is MatrixUnitEmployee & { matrixUnit: { id: string; name: string } } =>
                        !!(teamItem?.matrixUnit?.id && teamItem?.matrixUnit?.name)
                    )
                    .map((teamItem: any) => (
                      <span
                        key={teamItem.matrixUnit.id}
                        className="gba:inline-flex gba:items-center gba:px-2.5 gba:py-0.5 gba:rounded-full gba:text-xs gba:font-medium gba:bg-info-secondary gba:text-info-secondary-foreground"
                      >
                        {teamItem.matrixUnit.name}
                      </span>
                    ))
                ) : (
                  <span className="gba:text-muted-foreground gba:text-sm">{t('employee-details-no-teams')}</span>
                )}
              </div>
            </div>

            <div className="gba:mt-6">
              <h4 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-2">
                {t('employee-details-capabilities')}
              </h4>
              <div className="gba:flex gba:flex-wrap gba:gap-2">
                {employeeData.employeePosition?.employeeCapabilities &&
                Array.isArray(employeeData.employeePosition.employeeCapabilities) &&
                employeeData.employeePosition.employeeCapabilities.length > 0 ? (
                  employeeData.employeePosition.employeeCapabilities
                    .filter(
                      (capItem: any): capItem is EmployeeCapability & { capability: { id: string; name: string } } =>
                        !!(capItem?.capability?.id && capItem?.capability?.name)
                    )
                    .map((capItem: any) => (
                      <span
                        key={capItem.capability.id}
                        className="gba:inline-flex gba:items-center gba:px-2.5 gba:py-0.5 gba:rounded-full gba:text-xs gba:font-medium gba:bg-success-secondary gba:text-success-secondary-foreground"
                      >
                        {capItem.capability.name}
                      </span>
                    ))
                ) : (
                  <span className="gba:text-muted-foreground gba:text-sm">{t('employee-details-no-capabilities')}</span>
                )}
              </div>
            </div>

            <div className="gba:mt-6">
              <h4 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-2">
                {t('employee-details-skills')}
              </h4>
              <div className="gba:flex gba:flex-wrap gba:gap-2">
                {employeeData.skills && Array.isArray(employeeData.skills) && employeeData.skills.length > 0 ? (
                  employeeData.skills
                    .filter(
                      (skillItem: any): skillItem is EmployeeSkill & { skill: { id: string; name: string } } =>
                        !!(skillItem?.skill?.id && skillItem?.skill?.name)
                    )
                    .map((skillItem: any) => (
                      <span
                        key={skillItem.skill.id}
                        className={`gba:inline-flex gba:items-center gba:px-2.5 gba:py-0.5 gba:rounded-full gba:text-xs gba:font-medium ${
                          skillItem.level === 'Advanced'
                            ? 'gba:bg-info-secondary gba:text-info-secondary-foreground'
                            : 'gba:bg-muted gba:text-muted-foreground'
                        }`}
                      >
                        {skillItem.skill.name}
                        {skillItem.level === 'Advanced' && (
                          <span className="gba:ml-1 gba:text-xs gba:font-semibold">★</span>
                        )}
                      </span>
                    ))
                ) : (
                  <span className="gba:text-muted-foreground gba:text-sm">{t('employee-details-no-skills')}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Self-contained Employee Details component that fetches its own data
 * @returns {JSX.Element}
 */
export const EmployeeDetails: React.FC<EmployeeDetailsProps> = context => {
  const { employeeId, accessToken, employeeData: propEmployeeData } = context
  const { t } = useTranslation(employeeDetailsTranslations)

  // Only fetch data if not provided as prop
  const {
    employeeData: fetchedData,
    isLoading,
    error,
    refetch
  } = useEmployeeDetailsData({
    employeeId,
    context,
    skipFetch: !!propEmployeeData // Skip fetching if data provided as prop
  })

  // Use prop data if available, otherwise use fetched data
  const employeeData = propEmployeeData || fetchedData

  const displayName =
    employeeData?.displayName || `${employeeData?.firstName ?? ''} ${employeeData?.lastName ?? ''}`.trim() || ''
  const userId = employeeData?.additionalProperties?.userId
  const businessEmail = getBusinessEmail(employeeData)
  const businessPhone = getBusinessPhone(employeeData)
  const managerName = getManagerName(employeeData, t)
  const managerClickHandler = getManagerClickHandler(employeeData)

  const handleChat = useCallback(() => {
    openChatWithUser(userId, displayName)
  }, [userId, displayName])

  const handleCall = useCallback(() => {
    startUserCall(userId, displayName, employeeData?.pictureThumbnail, 'audio')
  }, [userId, displayName, employeeData?.pictureThumbnail])

  const handleVideoCall = useCallback(() => {
    startUserCall(userId, displayName, employeeData?.pictureThumbnail, 'video')
  }, [userId, displayName, employeeData?.pictureThumbnail])

  // Error state (only when there's an actual error and not loading)
  if (!propEmployeeData && error && !isLoading) {
    return (
      <div className="gba:bg-white gba:h-full gba:p-6">
        <Alert variant="destructive">
          <AlertDescription className="gba:flex gba:items-center gba:justify-between gba:gap-3">
            <span>{`${t('employee-details-error-loading')}: ${String(error)}`}</span>
            <Button size="sm" variant="outline" onClick={refetch}>
              {t('employee-details-retry')}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Don't render anything if we're still loading or don't have data yet
  if (!propEmployeeData && (isLoading || !employeeData)) {
    return null
  }

  // If using prop data but it's missing, show minimal error
  if (propEmployeeData && !employeeData) {
    return (
      <div className="gba:bg-white gba:h-full gba:p-6">
        <div className="gba:text-center gba:text-muted-foreground">{t('employee-details-not-available')}</div>
      </div>
    )
  }

  return (
    <EmployeeDetailsContent
      employeeData={employeeData}
      accessToken={accessToken}
      userId={userId}
      businessEmail={businessEmail}
      businessPhone={businessPhone}
      managerName={managerName}
      managerClickHandler={managerClickHandler}
      t={t}
      onChat={handleChat}
      onCall={handleCall}
      onVideoCall={handleVideoCall}
    />
  )
}

export default EmployeeDetails
