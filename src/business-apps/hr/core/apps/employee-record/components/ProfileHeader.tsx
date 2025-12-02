'use client'

import React, { useState, useCallback, useEffect } from 'react'
import dayjs from 'dayjs'
import {
  PiEnvelopeSimple,
  PiPhone,
  PiBuildings,
  PiUser,
  PiMapPin,
  PiCalendar,
  PiVideoCamera,
  PiChat,
  PiCurrencyDollar,
  PiGlobeHemisphereWest,
  PiBookmarks,
  PiCameraFill
} from 'react-icons/pi'
import { Avatar } from '@newwork/gravity-ui-catalog'
import { Employee } from '../hooks/useEmployeeData'
import { formatPhoneNumber, getEmployeeFullName } from '../utils/formatters'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useOpenChat } from '@/modules/chat-sidebar/utils/hooks/useOpenChat'
import { useEmployeeWorkCommunications } from '../hooks/useEmployeeWorkCommunications'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { notification } from 'antd'
import { StarIcon } from 'lucide-react'
import { TeamOutlined } from '@ant-design/icons'
import AppAction from '@/components/app-action/AppAction'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

// Team item type
interface MatrixUnitEmployee {
  matrixUnit: {
    id: string
    name: string
  }
}

// Capability item type
interface EmployeeCapability {
  capability: {
    id: string
    name: string
  }
}

// Skill item type
interface EmployeeSkill {
  skill: {
    id: string
    name: string
  }
  level: string | null
}

interface ProfileHeaderProps {
  employee: Employee
}

interface ProfileInfoItemProps {
  icon: React.ReactNode
  label: string
  value: string
  linkTo?: string
  onClick?: () => void
  openInNewTab?: boolean
  className?: string
}

interface TagItemProps {
  icon: React.ReactNode
  label: string
  bgColorClass: string
  textColorClass?: string
  borderColorClass?: string
  testId?: string
}

const TagItem: React.FC<TagItemProps> = ({
  icon,
  label,
  bgColorClass,
  textColorClass = 'gba:text-foreground',
  borderColorClass = '',
  testId
}) => {
  return (
    <span
      className={`gba:inline-flex gba:items-center gba:px-2.5 gba:py-0.5 gba:rounded-full gba:text-xs gba:font-medium ${bgColorClass} ${textColorClass} ${borderColorClass}`}
      data-testid={testId}
    >
      {icon && <span className="gba:mr-2">{icon}</span>}
      {label}
    </span>
  )
}

const ProfileInfoItem: React.FC<ProfileInfoItemProps> = ({
  icon,
  label,
  value,
  linkTo,
  onClick,
  className,
  openInNewTab = false
}) => {
  return (
    <div className={`gba:flex gba:items-center gba:gap-2 ${className}`}>
      <div className="gba:shrink-0 gba:text-muted-foreground">{icon}</div>
      <div className="gba:grow">
        <div className="gba:text-xs gba:text-muted-foreground">{label}</div>
        {linkTo ? (
          <a
            href={linkTo}
            className="gba:text-sm gba:text-info gba:inline-flex gba:items-baseline gba:flex-wrap gba:hover:underline"
            target={openInNewTab ? '_blank' : undefined}
            rel={openInNewTab ? 'noopener noreferrer' : undefined}
          >
            <span className="gba:whitespace-normal font-medium">{value}</span>
          </a>
        ) : onClick ? (
          <a
            href="#"
            onClick={e => {
              e.preventDefault()
              onClick()
            }}
            className="gba:text-sm gba:text-info gba:inline-flex gba:items-baseline gba:flex-wrap"
            data-testid={`profile-info-${label.toLowerCase()}-link`}
          >
            <span className="gba:whitespace-normal">{value}</span>
          </a>
        ) : (
          <div className="gba:text-sm gba:text-foreground">{value}</div>
        )}
      </div>
    </div>
  )
}

const ProfileHeader: React.FC<BusinessAppContextProps & ProfileHeaderProps> = ({ userInfo, employee, accessToken }) => {
  // Translation helper
  const t = (key: string) => getTranslationFromI18nKeyAndLabel(key, key)
  const { t: tDesign } = useTranslation(hrTranslations)
  const [employeeEmail, setEmployeeEmail] = useState<string | undefined>()

  // Use the openChat hook for direct Teams integration
  const { openChatWithUser, openAudioConferenceWithUser, openVideoConferenceWithUser } = useOpenChat()

  // Use the hook to fetch employee work communications
  const { employee: employeeWithComms, loading } = useEmployeeWorkCommunications({
    accessToken,
    employeeId: employee?.id || ''
  })

  // Communication handlers that directly use the hook methods
  const handleChat = useCallback(() => {
    // Use the email from GraphQL response if available, fallback to userInfo
    const userEmail = employeeEmail || (userInfo && (userInfo as any).email)
    const userId = employee.additionalProperties?.userId || employee.id || ''

    if (!userEmail) {
      notification.error({
        message: 'Cannot start chat',
        description: 'No email address associated with this employee',
        className: 'employee-chat-error-notification',
        placement: 'bottomRight'
      })
      return
    }

    // Call will succeed even if email is undefined (will use userId as fallback)
    openChatWithUser(userId, userEmail)
  }, [employee, userInfo, employeeEmail, openChatWithUser, t])

  const handleAudioCall = useCallback(() => {
    // Use the email from GraphQL response if available, fallback to userInfo
    const userEmail = employeeEmail || (userInfo && (userInfo as any).email)
    const userId = employee.additionalProperties?.userId || employee.id || ''

    if (!userEmail) {
      notification.error({
        message: 'Cannot start audio call',
        description: 'No email address associated with this employee',
        className: 'employee-audio-call-error-notification',
        placement: 'bottomRight'
      })
      return
    }

    // Call will succeed even if email is undefined (will use userId as fallback)
    openAudioConferenceWithUser(userId, userEmail)
  }, [employee, userInfo, employeeEmail, openAudioConferenceWithUser, t])

  const handleVideoCall = useCallback(() => {
    // Use the email from GraphQL response if available, fallback to userInfo
    const userEmail = employeeEmail || (userInfo && (userInfo as any).email)
    const userId = employee.additionalProperties?.userId || employee.id || ''

    if (!userEmail) {
      notification.error({
        message: 'Cannot start video call',
        description: 'No email address associated with this employee',
        className: 'employee-video-call-error-notification'
      })
      return
    }

    // Call will succeed even if email is undefined (will use userId as fallback)
    openVideoConferenceWithUser(userId, userEmail)
  }, [employee, userInfo, employeeEmail, openVideoConferenceWithUser, t])

  const calculateTimeSince = () => {
    if (!employee.workingCondition[0]?.hireDate) return ''

    const hireDate = dayjs(employee.workingCondition[0].hireDate)
    const now = dayjs()

    const years = now.diff(hireDate, 'year')
    const months = now.diff(hireDate, 'month') % 12

    let result = ''

    if (years > 0) {
      result += `${years} ${years === 1 ? 'year' : 'years'}`
    }

    if (months > 0 || years === 0) {
      if (years > 0) result += ' '
      result += `${months} ${months === 1 ? 'month' : 'months'}`
    }

    return result
  }

  // We don't need to manage the profile picture state anymore as EmployeeAvatar handles it

  // Update work communications when employee data is loaded
  useEffect(() => {
    if (employeeWithComms) {
      // Set the email directly from the enhanced employee data
      if (employeeWithComms.email) {
        setEmployeeEmail(employeeWithComms.email)
      }
    }
  }, [employeeWithComms])

  return (
    <div className="gba:w-full gba:relative">
      <div className="gba:relative gba:pb-4 gba:mt-4 gba:flex gba:flex-col gba:md:flex-row gba:md:items-end">
        <div className="gba:flex gba:flex-col gba:items-center">
          <div className="gba:flex gba:flex-col gba:items-center">
            <div className="gba:shrink-0 gba:mb-4 gba:z-10">
              <div className="gba:relative">
                <div className="gba:relative">
                  {/* Use the Avatar component */}
                  <div className="gba:relative gba:group" style={{ width: '144px', height: '144px' }}>
                    <Avatar
                      src={employee.pictureThumbnail ? `data:image/gif;base64,${employee.pictureThumbnail}` : undefined}
                      initials={`${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`}
                      alt={`${employee.firstName} ${employee.lastName}`}
                      // @ts-expect-error - Type issue in gravity-ui-catalog for contentType
                      contentType={employee.pictureThumbnail ? 'image' : 'initials'}
                      // @ts-expect-error - Type issue in gravity-ui-catalog for size
                      size="xl"
                      // @ts-expect-error - Type issue in gravity-ui-catalog for shape
                      shape="rounded"
                      // @ts-expect-error - Type issue in gravity-ui-catalog for appearance
                      appearance="gradient"
                      style={{
                        width: '144px',
                        height: '144px',
                        fontSize: '3rem'
                      }}
                    />

                    {/* Edit button overlay */}
                    <AppAction
                      mode="trigger"
                      data-testid="employee-profile-picture-edit-button"
                      contexts={[
                        { context: FlowContextName.employeeProfilePicture, contextData: { employeeId: employee?.id } }
                      ]}
                      prefixDataTestId="employee-profile-picture-edit"
                      autoExecute={true}
                      accessToken={accessToken}
                      emptyState="hide"
                      className="gba:absolute gba:inset-0 gba:rounded-xl gba:flex gba:items-center gba:justify-center gba:opacity-0 gba:bg-black/60 gba:text-white gba:group-hover:opacity-100 gba:transition-opacity gba:transition-duration-200 gba:transition-ease-in-out gba:cursor-pointer"
                    >
                      <div className="gba:p-4 gba:flex gba:flex-col gba:items-center gba:gap-2">
                        <PiCameraFill className="gba:h-6 gba:w-6" />
                        <span className="gba:text-xs gba:font-semibold gba:uppercase gba:text-center">
                          {tDesign('employee-edit-picture')}
                        </span>
                      </div>
                    </AppAction>
                  </div>
                </div>

                {/* Communication Actions - Always visible */}
                <div className="gba:mt-3 gba:flex gba:justify-center gba:gap-3" data-testid="communication-buttons">
                  {loading ? (
                    <div className="gba:text-xs gba:text-muted-foreground" data-testid="loading-communications">
                      Loading communications...
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={handleChat}
                        className="gba:bg-muted gba:hover:bg-info-secondary gba:rounded-full gba:p-2.5 gba:shadow-sm gba:transition-colors"
                        title="Chat"
                        aria-label="Chat"
                        data-testid="employee-chat-button"
                      >
                        <PiChat className="gba:h-5 gba:w-5" />
                      </button>
                      <button
                        onClick={handleAudioCall}
                        className="gba:bg-muted gba:hover:bg-info-secondary gba:rounded-full gba:p-2.5 gba:shadow-sm gba:transition-colors"
                        title="Audio Call"
                        aria-label="Audio Call"
                        data-testid="employee-audio-call-button"
                      >
                        <PiPhone className="gba:h-5 gba:w-5" />
                      </button>
                      <button
                        onClick={handleVideoCall}
                        className="gba:bg-muted gba:hover:bg-info-secondary gba:rounded-full gba:p-2.5 gba:shadow-sm gba:transition-colors"
                        title="Video Call"
                        aria-label="Video Call"
                        data-testid="employee-video-call-button"
                      >
                        <PiVideoCamera className="gba:h-5 gba:w-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="gba:grow gba:text-center">
              <div className="gba:text-xl gba:font-bold gba:mb-1 gba:text-foreground" data-testid="employee-name">
                {getEmployeeFullName(employee)}
              </div>
              <p className="gba:text-muted-foreground gba:mb-4 gba:text-sm">
                {employee.employeePosition?.jobPosition?.name ??
                  getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_profile.left_side_bar.not_assigned',
                    'Not assigned'
                  )}
              </p>

              {/* Profile Info Grid */}
              <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:w-full gba:mt-3 gba:text-left">
                {/* Organization */}
                <ProfileInfoItem
                  icon={<PiBuildings className="gba:h-4 gba:w-4" />}
                  className="gba:text-info"
                  label={'Organization'}
                  value={
                    employee.employeePosition?.organizationalUnit?.name ??
                    getTranslationFromI18nKeyAndLabel(
                      'lowcoder:employee_profile.left_side_bar.not_assigned',
                      'Not assigned'
                    )
                  }
                  linkTo={
                    employee.employeePosition?.organizationalUnitId
                      ? `/platform/orgchart/active/organization?organizationUnitId=${employee.employeePosition.organizationalUnitId}`
                      : undefined
                  }
                />

                {/* Location */}
                <ProfileInfoItem
                  data-testid="employee-location-info"
                  icon={<PiGlobeHemisphereWest className="gba:h-4 gba:w-4" />}
                  className="gba:text-info"
                  label={'Location'}
                  value={
                    employee.employeePosition?.siteLocation?.name ||
                    getTranslationFromI18nKeyAndLabel(
                      'lowcoder:employee_profile.left_side_bar.not_assigned',
                      'Not assigned'
                    )
                  }
                  linkTo={
                    employee.employeePosition?.siteLocation?.id
                      ? `/platform/orgchart/active/location?siteLocationId=${employee.employeePosition.siteLocation.id}`
                      : undefined
                  }
                />
                {/* Email */}
                <ProfileInfoItem
                  icon={<PiEnvelopeSimple className="gba:h-4 gba:w-4" />}
                  className="gba:text-info"
                  label={'Work Email'}
                  value={employeeWithComms?.email ? employeeWithComms.email : 'N/A'}
                  linkTo={employeeWithComms?.email ? `mailto:${employeeWithComms.email}` : undefined}
                  data-testid="employee-email-info"
                />

                <ProfileInfoItem
                  icon={<PiPhone className="gba:h-4 gba:w-4" />}
                  className="gba:text-info"
                  label={'Work Phone'}
                  value={employeeWithComms?.phone ? formatPhoneNumber(employeeWithComms.phone) : 'N/A'}
                  linkTo={employeeWithComms?.phone ? `tel:${employeeWithComms.phone}` : undefined}
                  data-testid="employee-phone-info"
                />

                {/* Manager */}
                <ProfileInfoItem
                  icon={<PiUser className="gba:h-4 gba:w-4" />}
                  className="gba:text-info"
                  label={'Manager'}
                  value={
                    employee.employeePosition?.supervisor?.id && employee.employeePosition.supervisor.id !== employee.id
                      ? employee.employeePosition.supervisor.displayName ||
                        `${employee.employeePosition.supervisor.firstName ?? ''} ${
                          employee.employeePosition.supervisor.lastName ?? ''
                        }`.trim() ||
                        getTranslationFromI18nKeyAndLabel(
                          'lowcoder:employee_profile.left_side_bar.not_assigned',
                          'Not assigned'
                        )
                      : 'No manager'
                  }
                  linkTo={
                    employee.employeePosition?.supervisor?.id && employee.employeePosition.supervisor.id !== employee.id
                      ? `${window.location.pathname}?employeeId=${employee.employeePosition?.supervisor?.id || ''}`
                      : undefined
                  }
                />
                {/* Job Position */}
                <ProfileInfoItem
                  icon={<PiMapPin className="gba:h-4 gba:w-4" />}
                  label={'Job Position'}
                  value={
                    employee.employeePosition?.jobPosition?.name ??
                    getTranslationFromI18nKeyAndLabel(
                      'lowcoder:employee_profile.left_side_bar.not_assigned',
                      'Not assigned'
                    )
                  }
                  //linkTo={employee.employeePosition?.siteLocation?.id ? `/orgchart/active/location?siteLocationId=${employee.employeePosition.siteLocation.id}` : undefined}
                />
                {/* Cost Center */}
                <ProfileInfoItem
                  icon={<PiCurrencyDollar className="gba:h-4 gba:w-4" />}
                  className="gba:text-info"
                  label={'Cost Center'}
                  value={
                    employee.employeePosition?.costCenter?.name ??
                    getTranslationFromI18nKeyAndLabel(
                      'lowcoder:employee_profile.left_side_bar.not_assigned',
                      'Not assigned'
                    )
                  }
                  linkTo={
                    employee.employeePosition?.costCenter?.id
                      ? `/platform/orgchart/active/finance?costCenterDataId=${employee.employeePosition.costCenter.id}`
                      : undefined
                  }
                />
                {/* Hire Date */}
                <ProfileInfoItem
                  icon={<PiCalendar className="gba:h-4 gba:w-4" />}
                  label={'Hire Date'}
                  value={
                    employee.workingCondition[0]?.hireDate
                      ? `${dayjs(employee.workingCondition[0].hireDate).format(
                          'MMM D, YYYY'
                        )} - ${calculateTimeSince()}`
                      : 'N/A'
                  }
                />
              </div>

              {/* Teams, Capabilities and Skills (scroll with the left column) */}
              <div className="gba:w-full" data-testid="skills-capabilities-container">
                {/* Teams Section - if available */}
                {employee.employeePosition?.matrixUnitEmployees &&
                  employee.employeePosition.matrixUnitEmployees.length > 0 && (
                    <div className="gba:mt-4">
                      <div className="gba:flex gba:items-start gba:p-1">
                        <div className="gba:flex-1">
                          <div className="gba:text-sm gba:font-semibold gba:text-foreground gba:text-left">Teams</div>
                          <div className="gba:text-sm gba:text-foreground">
                            <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mt-1">
                              {employee.employeePosition.matrixUnitEmployees.map(
                                (teamItem: MatrixUnitEmployee, index: number) => (
                                  <TagItem
                                    key={teamItem.matrixUnit?.id || `team-${index}`}
                                    icon={<TeamOutlined className="gba:h-4 gba:w-4 gba:text-muted-foreground" />}
                                    label={teamItem.matrixUnit.name}
                                    bgColorClass="gba:bg-info-secondary"
                                    textColorClass="gba:text-info"
                                    testId={`team-${teamItem.matrixUnit.id}`}
                                  />
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Capabilities Section - always displayed */}
                <div className="gba:mt-4" data-testid="capabilities-section">
                  <div className="gba:flex gba:items-start">
                    <div className="gba:flex-1">
                      <div className="gba:text-sm gba:font-semibold gba:text-foreground gba:text-left">
                        Capabilities
                      </div>
                      <div className="gba:text-sm gba:text-foreground">
                        <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mt-1">
                          {employee.employeePosition?.employeeCapabilities &&
                          employee.employeePosition.employeeCapabilities.filter(cap => cap.capability).length > 0 ? (
                            employee.employeePosition.employeeCapabilities
                              .filter(capItem => capItem.capability)
                              .map((capItem: EmployeeCapability, index: number) => (
                                <TagItem
                                  key={capItem.capability?.id || `capability-${index}`}
                                  icon={<PiBookmarks className="gba:h-4 gba:w-4 gba:text-muted-foreground" />}
                                  label={capItem.capability!.name}
                                  bgColorClass="gba:bg-success-secondary"
                                  textColorClass="gba:text-success"
                                  testId={`capability-${capItem.capability!.id}`}
                                />
                              ))
                          ) : (
                            <span
                              className="gba:text-muted-foreground gba:text-sm gba:text-left gba:block"
                              data-testid="no-capabilities-message"
                            >
                              No capabilities assigned
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Skills Section - always displayed */}
                <div className="gba:mt-4" data-testid="skills-section">
                  <div className="gba:flex gba:items-start">
                    <div className="gba:flex-1">
                      <div className="gba:text-sm gba:font-semibold gba:text-foreground gba:text-left">Skills</div>
                      <div className="gba:text-sm gba:text-foreground">
                        <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mt-1">
                          {employee.skills?.filter(skill => skill.skill).length > 0 ? (
                            employee.skills
                              .filter(skillItem => skillItem.skill)
                              .map((skillItem: EmployeeSkill, index: number) => (
                                <TagItem
                                  key={skillItem.skill?.id || `skill-${index}`}
                                  icon={<StarIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />}
                                  label={skillItem.skill.name}
                                  bgColorClass="gba:bg-info-secondary"
                                  textColorClass="gba:text-info"
                                  testId={`skill-${skillItem.skill.id}`}
                                />
                              ))
                          ) : (
                            <span
                              className="gba:text-muted-foreground gba:text-sm gba:text-left gba:block"
                              data-testid="no-skills-message"
                            >
                              No skills assigned
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileHeader
