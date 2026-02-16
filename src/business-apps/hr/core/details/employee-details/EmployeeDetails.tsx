'use client'

import React, { useCallback } from 'react'
import dayjs from 'dayjs'
import { Button, Avatar, Alert } from '@newwork/gravity-ui-catalog'
import { postToPlatform } from '@/common/utils/postToPlatform'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  PiCaretRight,
  PiChat,
  PiPhone,
  PiVideoCamera,
  PiUser,
  PiBuildings,
  PiMapPin,
  PiCalendar,
  PiCurrencyDollar,
  PiEnvelopeSimple
} from 'react-icons/pi'
import { useEmployeeDetailsData } from './hooks/useEmployeeDetailsData'
import { getCatalogValue, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useTranslation } from '@newwork/nw-design-system'
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

  const handleChat = useCallback(() => {
    if (!userId) return
    postToPlatform({
      type: 'OPEN_CHAT_WITH_USER',
      payload: { userId, userName: displayName || userId }
    })
  }, [userId, displayName])

  const handleCall = useCallback(() => {
    if (!userId) return
    postToPlatform({
      type: 'START_CALL_WITH_USER',
      payload: {
        userId,
        displayName: displayName || userId,
        avatarUrl: employeeData?.pictureThumbnail
          ? `data:image/gif;base64,${employeeData.pictureThumbnail}`
          : undefined,
        callType: 'audio'
      }
    })
  }, [userId, displayName, employeeData?.pictureThumbnail])

  const handleVideoCall = useCallback(() => {
    if (!userId) return
    postToPlatform({
      type: 'START_CALL_WITH_USER',
      payload: {
        userId,
        displayName: displayName || userId,
        avatarUrl: employeeData?.pictureThumbnail
          ? `data:image/gif;base64,${employeeData.pictureThumbnail}`
          : undefined,
        callType: 'video'
      }
    })
  }, [userId, displayName, employeeData?.pictureThumbnail])

  // Helper functions
  const getManagerName = () => {
    const supervisor = employeeData?.employeePosition?.supervisor
    if (!supervisor || supervisor.id === employeeData?.id) return t('employee-details-no-manager')
    return (
      supervisor.displayName ||
      `${supervisor.firstName} ${supervisor.lastName}`.trim() ||
      t('employee-details-not-assigned')
    )
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

  const getBusinessEmail = () => {
    // Use the same extraction logic as in EmployeeCard
    const email = extractWorkEmail(employeeData?.communication)
    return email || ''
  }

  const getBusinessPhone = () => {
    const phone = employeeData?.communication?.find(
      (c: any) => (c?.channel?.code === 'Mobile' || c?.channel?.code === 'Phone') && !c?.isDeleted && c?.value
    )?.value
    return phone || employeeData?.additionalProperties?.phone || ''
  }

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return ''
    // Simple phone number formatting
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')
  }

  const calculateTimeSince = () => {
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
      // Fallback to dayjs if Intl fails for any reason
      return dayjs(isoDate).format('MMM D, YYYY')
    }
  }

  // Error state (only when there's an actual error and not loading)
  if (!propEmployeeData && error && !isLoading) {
    return (
      <div className="gba:bg-white gba:h-full gba:p-6">
        <Alert
          message={t('employee-details-error-loading')}
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={refetch}>
              {t('employee-details-retry')}
            </Button>
          }
        />
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

  // Phosphor icons
  const ChatIcon = PiChat
  const CallIcon = PiPhone
  const VideoCallIcon = PiVideoCamera

  return (
    <div className="gba:bg-white gba:h-full gba:overflow-auto">
      <div className="gba:p-6 gba:relative">
        {/* Action button in top right corner with absolute positioning */}
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
            <Avatar
              src={employeeData.pictureThumbnail ? `data:image/gif;base64,${employeeData.pictureThumbnail}` : undefined}
              initials={
                employeeData.pictureThumbnail
                  ? undefined
                  : `${employeeData.firstName?.[0] || ''}${employeeData.lastName?.[0] || ''}`.toUpperCase()
              }
              // @ts-expect-error - Type issue in gravity-ui-catalog for contentType
              contentType={employeeData.pictureThumbnail ? 'image' : 'initials'}
              alt={`${employeeData.firstName} ${employeeData.lastName}`}
              // @ts-expect-error - There is a type definition issue in gravity-ui-catalog@7.8.5 where AvatarSize is not correctly exported.
              size="xl"
              // @ts-expect-error - There is a type definition issue in gravity-ui-catalog@7.8.5 where AvatarSize is not correctly exported.
              shape="circle"
              // @ts-expect-error - There is a type definition issue in gravity-ui-catalog@7.8.5 where AvatarSize is not correctly exported.
              appearance="gradient"
              style={{ width: '100px', height: '100px', fontSize: '3rem' }}
            />
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
                <PiCaretRight className="gba:mt-1" width={20} height={20} fill="var(--nw-foreground)" />
              </div>
            </a>
            <p className="gba:text-muted-foreground gba:text-sm gba:text-center gba:mb-3">
              {employeeData.employeePosition?.jobPosition?.name || t('employee-details-not-assigned')}
            </p>

            {/* Chat and call actions directly under the name */}
            <div className="gba:flex gba:gap-2">
              <Button
                variant="secondary"
                size="lg"
                onClick={handleChat}
                icon={<ChatIcon />}
                className="gba:rounded-3xl gba:aspect-square gba:p-2"
                data-testid="employee-details-chat-button"
                disabled={!userId}
              />
              <Button
                variant="secondary"
                size="lg"
                onClick={handleVideoCall}
                icon={<VideoCallIcon />}
                className="gba:rounded-3xl gba:aspect-square gba:p-2"
                data-testid="employee-details-video-button"
                disabled={!userId}
              />
              <Button
                variant="secondary"
                size="lg"
                onClick={handleCall}
                icon={<CallIcon />}
                className="gba:rounded-3xl gba:aspect-square gba:p-2"
                data-testid="employee-details-audio-button"
                disabled={!userId}
              />
            </div>
          </div>

          <div className="gba:border-t gba:border-border gba:pt-4">
            {/* Contact Information */}
            <div className="gba:mb-6">
              <h4 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-4">
                {t('employee-details-contact-information')}
              </h4>
              <div className="gba:space-y-2">
                {getBusinessEmail() ? (
                  <a
                    href={`mailto:${getBusinessEmail()}`}
                    className="gba:inline-flex gba:items-center gba:text-info gba:hover:text-info-secondary-foreground gba:transition-colors gba:text-sm"
                  >
                    <PiEnvelopeSimple className="gba:mr-2 gba:h-4 gba:w-4" />
                    {getBusinessEmail()}
                  </a>
                ) : (
                  <div className="gba:inline-flex gba:items-center gba:text-muted-foreground gba:text-sm">
                    <PiEnvelopeSimple className="gba:mr-2 gba:h-4 gba:w-4" />
                    {t('employee-details-no-email')}
                  </div>
                )}

                {getBusinessPhone() ? (
                  <a
                    href={`tel:${getBusinessPhone()}`}
                    className="gba:inline-flex gba:items-center gba:text-info gba:hover:text-info-secondary-foreground gba:transition-colors gba:text-sm"
                  >
                    <PiPhone className="gba:mr-2 gba:h-4 gba:w-4" />
                    {formatPhoneNumber(getBusinessPhone())}
                  </a>
                ) : (
                  <div className="gba:inline-flex gba:items-center gba:text-muted-foreground gba:text-sm">
                    <PiPhone className="gba:mr-2 gba:h-4 gba:w-4" />
                    {t('employee-details-no-phone')}
                  </div>
                )}
              </div>
            </div>

            <h4 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-4">
              {t('employee-details-profile-information')}
            </h4>

            <div className="gba:space-y-1">
              {/* Organization */}
              <ProfileInfoItem
                icon={<PiBuildings className="gba:h-4 gba:w-4" />}
                label={t('employee-details-organization')}
                value={employeeData.employeePosition?.organizationalUnit?.name || t('employee-details-not-assigned')}
                linkTo={
                  employeeData.employeePosition?.organizationalUnitId
                    ? `/orgchart/active/organization?organizationUnitId=${employeeData.employeePosition.organizationalUnitId}`
                    : undefined
                }
              />

              {/* Manager */}
              <ProfileInfoItem
                icon={<PiUser className="gba:h-4 gba:w-4" />}
                label={t('employee-details-manager')}
                value={getManagerName()}
                onClick={
                  employeeData.employeePosition?.supervisor?.id &&
                  employeeData.employeePosition.supervisor.id !== employeeData.id
                    ? () => {
                        const url = new URL(window.location.href)
                        url.searchParams.set('employeeId', employeeData.employeePosition?.supervisor?.id || '')
                        window.history.pushState({}, '', url.toString())
                      }
                    : undefined
                }
              />

              {/* Job Position */}
              <ProfileInfoItem
                icon={<PiMapPin className="gba:h-4 gba:w-4" />}
                label={t('employee-details-job-position')}
                value={employeeData.employeePosition?.jobPosition?.name || t('employee-details-not-assigned')}
              />

              {/* Cost Center */}
              <ProfileInfoItem
                icon={<PiCurrencyDollar className="gba:h-4 gba:w-4" />}
                label={t('employee-details-cost-center')}
                value={employeeData.employeePosition?.costCenter?.name || t('employee-details-not-assigned')}
                linkTo={
                  employeeData.employeePosition?.costCenter?.id
                    ? `/orgchart/active/finance?costCenterDataId=${employeeData.employeePosition.costCenter.id}`
                    : undefined
                }
              />

              {/* Hire Date */}
              <ProfileInfoItem
                icon={<PiCalendar className="gba:h-4 gba:w-4" />}
                label={t('employee-details-hire-date')}
                value={
                  employeeData.workingCondition?.[0]?.hireDate
                    ? `${formatDateLocalized(employeeData.workingCondition[0].hireDate)} - ${calculateTimeSince()}`
                    : t('employee-details-not-available')
                }
              />

              {/* Employment Type */}
              <ProfileInfoItem
                icon={<PiUser className="gba:h-4 gba:w-4" />}
                label={t('employee-details-employment-type')}
                value={
                  getCatalogValue(employeeData.workingCondition?.[0]?.employmentType) ||
                  t('employee-details-not-specified')
                }
              />

              {/* Contract Type */}
              <ProfileInfoItem
                icon={<PiUser className="gba:h-4 gba:w-4" />}
                label={t('employee-details-contract-type')}
                value={
                  getCatalogValue(employeeData.workingCondition?.[0]?.contractType) ||
                  t('employee-details-not-specified')
                }
              />
            </div>

            {/* Teams Section */}
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

            {/* Capabilities Section */}
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

            {/* Skills Section */}
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

export default EmployeeDetails
