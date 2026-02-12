'use client'

import React, { useMemo } from 'react'
import dayjs from 'dayjs'
import {
  EnvelopeSimpleIcon,
  PhoneIcon,
  BuildingsIcon,
  UserIcon,
  MapPinIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  GlobeHemisphereWestIcon,
  BookmarksIcon,
  ChatCircleIcon,
  VideoCameraIcon
} from '@phosphor-icons/react'
import { Employee } from '../hooks/useEmployeeData'
import { formatPhoneNumber } from '../utils/formatters'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  HeaderSlot,
  type HeaderSlotItemGroup,
  useTranslation,
  Button,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Badge
} from '@newwork/nw-design-system'
import translations from '../_i18n'
import { StarIcon } from 'lucide-react'
import { UsersThreeIcon } from '@phosphor-icons/react'

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
  employeeEmail?: string
  employeePhone?: string
}

interface TagItemProps {
  icon: React.ReactNode
  label: string
  bgColorClass: string
  textColorClass?: string
  borderColorClass?: string
  testId?: string
}

export interface ProfileHeaderActionsProps {
  commsLoading: boolean
  isSelfView: boolean
  onChat: () => void
  onAudioCall: () => void
  onVideoCall: () => void
}

export const ProfileHeaderActions: React.FC<ProfileHeaderActionsProps> = ({
  commsLoading,
  isSelfView,
  onChat,
  onAudioCall,
  onVideoCall
}) => {
  const { t } = useTranslation(translations)
  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="gba:inline-flex">
            <Button
              size="iconSm"
              variant="outline"
              onClick={onChat}
              disabled={commsLoading || isSelfView}
              aria-label={t('employee-record-chat-button')}
              data-testid="employee-chat-button"
            >
              <ChatCircleIcon size={16} />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {isSelfView ? t('employee-record-chat-cannot-self') : t('employee-record-chat-tooltip')}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="gba:inline-flex">
            <Button
              size="iconSm"
              variant="outline"
              onClick={onAudioCall}
              disabled={commsLoading || isSelfView}
              aria-label={t('employee-record-audio-call-button')}
              data-testid="employee-audio-call-button"
            >
              <PhoneIcon size={16} />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {isSelfView ? t('employee-record-audio-cannot-self') : t('employee-record-audio-tooltip')}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="gba:inline-flex">
            <Button
              size="iconSm"
              variant="outline"
              onClick={onVideoCall}
              disabled={commsLoading || isSelfView}
              aria-label={t('employee-record-video-call-button')}
              data-testid="employee-video-call-button"
            >
              <VideoCameraIcon size={16} />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {isSelfView ? t('employee-record-video-cannot-self') : t('employee-record-video-tooltip')}
        </TooltipContent>
      </Tooltip>
    </div>
  )
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

const ProfileHeader: React.FC<BusinessAppContextProps & ProfileHeaderProps> = ({
  employee,
  employeeEmail,
  employeePhone
}) => {
  const { t } = useTranslation(translations)

  const calculateTimeSince = () => {
    if (!employee.workingCondition[0]?.hireDate) return ''

    const hireDate = dayjs(employee.workingCondition[0].hireDate)
    const now = dayjs()

    const years = now.diff(hireDate, 'year')
    const months = now.diff(hireDate, 'month') % 12

    let result = ''

    if (years > 0) {
      result += `${years} ${years === 1 ? t('profile-header-year') : t('profile-header-years')}`
    }

    if (months > 0 || years === 0) {
      if (years > 0) result += ' '
      result += `${months} ${months === 1 ? t('profile-header-month') : t('profile-header-months')}`
    }

    return result
  }

  const notAssigned = t('employee-record-not-assigned')
  const na = t('profile-header-na')

  // Build detail groups for HeaderSlot
  const detailGroups: HeaderSlotItemGroup[] = useMemo(() => {
    return [
      {
        id: 'contact',
        items: [
          {
            id: 'email',
            label: t('profile-header-work-email'),
            value: employeeEmail || na,
            icon: EnvelopeSimpleIcon,
            href: employeeEmail ? `mailto:${employeeEmail}` : undefined
          },
          {
            id: 'phone',
            label: t('profile-header-work-phone'),
            value: employeePhone ? formatPhoneNumber(employeePhone) : na,
            icon: PhoneIcon,
            href: employeePhone ? `tel:${employeePhone}` : undefined
          }
        ]
      },
      {
        id: 'organizational',
        items: [
          {
            id: 'organization',
            label: t('profile-header-organization'),
            value: employee.employeePosition?.organizationalUnit?.name ?? notAssigned,
            icon: BuildingsIcon,
            href: employee.employeePosition?.organizationalUnitId
              ? `/platform/orgchart/active/organization?organizationUnitId=${employee.employeePosition.organizationalUnitId}`
              : undefined
          },
          {
            id: 'location',
            label: t('profile-header-location'),
            value: employee.employeePosition?.siteLocation?.name || notAssigned,
            icon: GlobeHemisphereWestIcon,
            href: employee.employeePosition?.siteLocation?.id
              ? `/platform/orgchart/active/location?siteLocationId=${employee.employeePosition.siteLocation.id}`
              : undefined
          }
        ]
      },
      {
        id: 'employment',
        items: [
          {
            id: 'manager',
            label: t('profile-header-manager'),
            value:
              employee.employeePosition?.supervisor?.id && employee.employeePosition.supervisor.id !== employee.id
                ? employee.employeePosition.supervisor.displayName ||
                  `${employee.employeePosition.supervisor.firstName ?? ''} ${
                    employee.employeePosition.supervisor.lastName ?? ''
                  }`.trim() ||
                  notAssigned
                : t('profile-header-no-manager'),
            icon: UserIcon,
            href:
              employee.employeePosition?.supervisor?.id && employee.employeePosition.supervisor.id !== employee.id
                ? `${window.location.pathname}?employeeId=${employee.employeePosition?.supervisor?.id || ''}`
                : undefined
          },
          {
            id: 'jobPosition',
            label: t('profile-header-job-position'),
            value: employee.employeePosition?.jobPosition?.name ?? notAssigned,
            icon: MapPinIcon
          },
          {
            id: 'costCenter',
            label: t('profile-header-cost-center'),
            value: employee.employeePosition?.costCenter?.name ?? notAssigned,
            icon: CurrencyDollarIcon,
            href: employee.employeePosition?.costCenter?.id
              ? `/platform/orgchart/active/finance?costCenterDataId=${employee.employeePosition.costCenter.id}`
              : undefined
          },
          {
            id: 'hireDate',
            label: t('profile-header-hire-date'),
            value: employee.workingCondition[0]?.hireDate
              ? `${dayjs(employee.workingCondition[0].hireDate).format('MMM D, YYYY')} - ${calculateTimeSince()}`
              : na,
            icon: CalendarIcon
          }
        ]
      }
    ]
  }, [employee, employeeEmail, employeePhone, t, notAssigned, na])

  return (
    <div className="gba:w-full gba:relative">
      {/* Detail Groups using HeaderSlot */}
      <HeaderSlot headerSlotItemGroups={detailGroups} orientation="vertical" />

      {/* Teams, Capabilities and Skills */}
      <div className="gba:w-full gba:mt-6" data-testid="skills-capabilities-container">
        {/* Teams Section - if available */}
        {employee.employeePosition?.matrixUnitEmployees && employee.employeePosition.matrixUnitEmployees.length > 0 && (
          <div className="gba:mb-4">
            <div className="gba:text-sm gba:font-semibold gba:text-foreground gba:mb-2">
              {t('profile-header-teams')}
            </div>
            <div className="gba:flex gba:flex-wrap gba:gap-2">
              {employee.employeePosition.matrixUnitEmployees.map((teamItem: MatrixUnitEmployee, index: number) => (
                <TagItem
                  key={teamItem.matrixUnit?.id || `team-${index}`}
                  icon={<UsersThreeIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />}
                  label={teamItem.matrixUnit.name}
                  bgColorClass="gba:bg-info-secondary"
                  textColorClass="gba:text-info"
                  testId={`team-${teamItem.matrixUnit.id}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Capabilities Section - always displayed */}
        <div className="gba:mb-4" data-testid="capabilities-section">
          <div className="gba:text-sm gba:font-semibold gba:text-foreground gba:mb-2">
            {t('profile-header-capabilities')}
          </div>
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            {employee.employeePosition?.employeeCapabilities &&
            employee.employeePosition.employeeCapabilities.filter(cap => cap.capability).length > 0 ? (
              employee.employeePosition.employeeCapabilities
                .filter(capItem => capItem.capability)
                .map((capItem: EmployeeCapability, index: number) => {
                  const capabilityId = capItem.capability?.id || `capability-${index}`
                  return (
                    <Badge key={capabilityId} variant="secondary" data-testid={`capability-${capabilityId}`}>
                      <BookmarksIcon className="gba:h-4 gba:w-4 gba:mr-1" size={16} />
                      {capItem.capability?.name}
                    </Badge>
                  )
                })
            ) : (
              <span className="gba:text-muted-foreground gba:text-sm" data-testid="no-capabilities-message">
                {t('profile-header-no-capabilities')}
              </span>
            )}
          </div>
        </div>

        {/* Skills Section - always displayed */}
        <div className="gba:mb-4" data-testid="skills-section">
          <div className="gba:text-sm gba:font-semibold gba:text-foreground gba:mb-2">{t('profile-header-skills')}</div>
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            {employee.skills?.filter(skill => skill.skill).length > 0 ? (
              employee.skills
                .filter(skillItem => skillItem.skill)
                .map((skillItem: EmployeeSkill, index: number) => (
                  <Badge
                    key={skillItem.skill?.id || `skill-${index}`}
                    variant="decorative"
                    data-testid={`skill-${skillItem.skill.id}`}
                  >
                    <StarIcon className="gba:h-4 gba:w-4 gba:mr-1" />
                    {skillItem.skill.name}
                  </Badge>
                ))
            ) : (
              <span className="gba:text-muted-foreground gba:text-sm" data-testid="no-skills-message">
                {t('profile-header-no-skills')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileHeader
