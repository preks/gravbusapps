import React, { useState } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Sheet,
  SheetContent,
  Separator,
  useTranslation
} from '@newwork/nw-design-system'
import { AlertCircle, CheckCircle2, Info, ChevronRight, Gift, UserX, Calendar, Loader2 } from 'lucide-react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { formatDate } from '@/common/utils/windowUtils'
import { type PriorityItem } from '../hooks/usePriorities'
import { useTeamAbsenceHistory } from '../hooks/useTeamAbsenceHistory'
import { statusVariant } from '@/business-apps/hr/absences/apps/personal-absences/utils/statusUtils'
import type { TeamMember } from '@/business-apps/hr/core/apps/manager-dashboard/hooks/useTeamAvailability'
import type { TeamBirthday } from '@/business-apps/hr/core/apps/manager-dashboard/hooks/useTeamBirthdays'
import dayjs from 'dayjs'
import translations from '../_i18n'

interface PrioritiesPanelProps {
  priorities: PriorityItem[]
  isLoading: boolean
  absentMembers?: TeamMember[]
  upcomingBirthdays?: TeamBirthday[]
  accessToken: string
  'data-testid'?: string
}

const severityConfig = {
  urgent: { icon: AlertCircle, variant: 'destructive' as const, className: 'gba:text-destructive' },
  normal: { icon: CheckCircle2, variant: 'warning' as const, className: 'gba:text-warning' },
  info: { icon: Info, variant: 'secondary' as const, className: 'gba:text-muted-foreground' }
}

type PanelType = 'absent' | 'birthdays' | null
const PRIORITY_SKELETON_IDS = ['first', 'second', 'third']

function getBirthdayBadgeLabel(person: TeamBirthday, t: (key: string, values?: Record<string, unknown>) => string) {
  if (person.daysUntilBirthday === 0) {
    return t('panel-birthday-today')
  }

  if (person.daysUntilBirthday < 0) {
    return t('panel-birthday-days-ago', { count: Math.abs(person.daysUntilBirthday) })
  }

  return t('panel-birthday-in-days', { count: person.daysUntilBirthday })
}

function getAbsenceDateRangeLabel(startDate: string, endDate: string) {
  if (startDate === endDate) {
    return formatDate(startDate, 'date.medium') ?? dayjs(startDate).format('MMM D, YYYY')
  }

  const formattedStartDate = formatDate(startDate, 'date.monthDay') ?? dayjs(startDate).format('MMM D')
  const formattedEndDate = formatDate(endDate, 'date.medium') ?? dayjs(endDate).format('MMM D, YYYY')

  return `${formattedStartDate} – ${formattedEndDate}`
}

export const PrioritiesPanel: React.FC<PrioritiesPanelProps> = ({
  priorities,
  isLoading,
  absentMembers = [],
  upcomingBirthdays = [],
  accessToken,
  'data-testid': testId = 'work-home-priorities'
}) => {
  const { t } = useTranslation(translations)
  const [openPanel, setOpenPanel] = useState<PanelType>(null)

  const {
    data: absenceHistoryData,
    isLoading: absenceHistoryLoading,
    error: absenceHistoryError
  } = useTeamAbsenceHistory(accessToken, absentMembers, openPanel === 'absent')

  const handleItemClick = (item: PriorityItem) => {
    if (item.id === 'team-absent') {
      setOpenPanel('absent')
    } else if (item.id === 'birthdays') {
      setOpenPanel('birthdays')
    } else {
      navigateTo(buildPlatformUrl(item.href, { from: 'work-home' }))
    }
  }

  const handleNavigateToEmployee = (employeeId: string) => {
    navigateTo(buildPlatformUrl('/platform/employee-record', { employeeId, tab: 'absences' }))
  }

  const handleNavigateToEmployeeProfile = (employeeId: string) => {
    navigateTo(buildPlatformUrl('/platform/employee-record', { employeeId, tab: 'summary' }))
  }

  const renderAbsencePanelContent = () => {
    if (absenceHistoryLoading) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
          <Loader2 className="gba:h-5 gba:w-5 gba:animate-spin gba:text-muted-foreground" />
        </div>
      )
    }

    if (absenceHistoryError) {
      return (
        <div className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-destructive/10">
          <AlertCircle className="gba:h-4 gba:w-4 gba:text-destructive" />
          <span className="gba:text-sm gba:text-destructive">{t('panel-absent-error')}</span>
        </div>
      )
    }

    if (absenceHistoryData.length === 0) {
      return <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4">{t('panel-absent-empty')}</p>
    }

    return (
      <div className="gba:space-y-5">
        {absenceHistoryData.map(({ member, absences }, index) => (
          <div key={member.id}>
            {/* Employee header */}
            <button
              type="button"
              className="gba:flex gba:items-center gba:gap-3 gba:mb-3 gba:hover:opacity-80 gba:transition-opacity gba:cursor-pointer"
              onClick={() => handleNavigateToEmployee(member.id)}
            >
              <Avatar className="gba:h-9 gba:w-9 gba:flex-shrink-0">
                <AvatarImage
                  src={
                    member.pictureThumbnail && !member.pictureThumbnail.startsWith('{')
                      ? `data:image/jpeg;base64,${member.pictureThumbnail}`
                      : undefined
                  }
                  alt={member.fullName}
                />
                <AvatarFallback className="gba:text-xs">
                  {member.firstName.charAt(0)}
                  {member.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="gba:text-sm gba:font-semibold gba:text-foreground">{member.fullName}</p>
                {member.jobPositionName && (
                  <p className="gba:text-xs gba:text-muted-foreground">{member.jobPositionName}</p>
                )}
              </div>
            </button>

            {/* Absence history rows — same data as employee-record absences tab */}
            <div className="gba:space-y-2 gba:mt-2">
              {absences.length === 0 ? (
                <p className="gba:text-xs gba:text-muted-foreground gba:ml-12">{t('panel-absent-no-records')}</p>
              ) : (
                absences.map(a => (
                  <div key={a.id} className="gba:rounded-lg gba:border gba:px-3 gba:py-2.5">
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-1.5">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <div
                          className="gba:w-2.5 gba:h-2.5 gba:rounded-full gba:shrink-0"
                          style={{ backgroundColor: `#${a.typeColor}` }}
                        />
                        <span className="gba:text-sm gba:font-medium gba:text-foreground">{a.type}</span>
                      </div>
                      <Badge variant={statusVariant(a.originalStatus)} className="gba:text-xs">
                        {a.status}
                      </Badge>
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-3 gba:text-xs gba:text-muted-foreground gba:ml-[18px]">
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <Calendar className="gba:h-3 gba:w-3" />
                        {getAbsenceDateRangeLabel(a.startDate, a.endDate)}
                      </span>
                      <span className="gba:font-medium">
                        {a.workingDays} {a.workingDays === 1 ? t('panel-absent-day') : t('panel-absent-days-label')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {index < absenceHistoryData.length - 1 && <Separator className="gba:mt-5" />}
          </div>
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <Card className="gba:rounded-xl gba:p-5" data-testid={testId}>
        <CardHeader>
          <CardTitle className="gba:text-lg">{t('priorities-title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:animate-pulse gba:space-y-2">
            {PRIORITY_SKELETON_IDS.map(id => (
              <div key={id} className="gba:h-12 gba:bg-muted gba:rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="gba:rounded-xl gba:p-5" data-testid={testId}>
        <CardHeader className="gba:pb-3">
          <CardTitle className="gba:text-lg">{t('priorities-title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {priorities.length === 0 ? (
            <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
              <CheckCircle2 className="gba:mx-auto gba:mb-2 gba:h-10 gba:w-10 gba:opacity-50" />
              <p className="gba:font-medium">{t('priorities-empty')}</p>
            </div>
          ) : (
            <div className="gba:space-y-2">
              {priorities.map(item => {
                const config = severityConfig[item.severity]
                const Icon = config.icon

                return (
                  <button
                    type="button"
                    key={item.id}
                    className="gba:w-full gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg gba:hover:bg-muted/50 gba:transition-colors gba:cursor-pointer gba:text-left"
                    onClick={() => handleItemClick(item)}
                    data-testid={`${testId}-item-${item.id}`}
                  >
                    <div className="gba:flex gba:items-center gba:gap-3">
                      <Icon className={`gba:h-4 gba:w-4 gba:flex-shrink-0 ${config.className}`} />
                      <span className="gba:text-sm gba:text-foreground">{t(item.label, { count: item.count })}</span>
                      <Badge variant={config.variant}>{item.count}</Badge>
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-1 gba:text-sm gba:text-primary gba:font-medium">
                      {item.action && t(item.action)}
                      <ChevronRight className="gba:h-3 gba:w-3" />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Absent Members Panel — uses same data as employee-record absences tab */}
      <Sheet open={openPanel === 'absent'} onOpenChange={open => !open && setOpenPanel(null)}>
        <SheetContent className="gba:w-full sm:gba:max-w-lg gba:p-6 gba:overflow-y-auto">
          <div className="gba:mb-6">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
              <UserX className="gba:h-5 gba:w-5 gba:text-warning" />
              <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('panel-absent-title')}</h3>
            </div>
            <p className="gba:text-sm gba:text-muted-foreground">{t('panel-absent-subtitle')}</p>
          </div>

          {renderAbsencePanelContent()}
        </SheetContent>
      </Sheet>

      {/* Birthdays Panel */}
      <Sheet open={openPanel === 'birthdays'} onOpenChange={open => !open && setOpenPanel(null)}>
        <SheetContent className="gba:w-full sm:gba:max-w-md gba:p-6 gba:overflow-y-auto">
          <div className="gba:mb-6">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
              <Gift className="gba:h-5 gba:w-5 gba:text-primary" />
              <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('panel-birthdays-title')}</h3>
            </div>
            <p className="gba:text-sm gba:text-muted-foreground">{t('panel-birthdays-subtitle')}</p>
          </div>
          <div className="gba:space-y-3">
            {upcomingBirthdays.map(person => (
              <button
                type="button"
                key={person.id}
                className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-3 gba:border gba:rounded-lg gba:hover:bg-muted/50 gba:transition-colors gba:cursor-pointer gba:text-left"
                onClick={() => handleNavigateToEmployeeProfile(person.id)}
              >
                <Avatar className="gba:h-10 gba:w-10 gba:flex-shrink-0">
                  <AvatarImage
                    src={
                      person.pictureThumbnail && !person.pictureThumbnail.startsWith('{')
                        ? `data:image/jpeg;base64,${person.pictureThumbnail}`
                        : undefined
                    }
                    alt={person.fullName}
                  />
                  <AvatarFallback className="gba:text-xs">
                    {person.firstName.charAt(0)}
                    {person.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="gba:flex-1 gba:min-w-0">
                  <p className="gba:text-sm gba:font-medium gba:text-foreground">{person.fullName}</p>
                  {person.jobPositionName && (
                    <p className="gba:text-xs gba:text-muted-foreground">{person.jobPositionName}</p>
                  )}
                  <p className="gba:text-xs gba:text-muted-foreground">{dayjs(person.birthDate).format('MMM D')}</p>
                </div>
                <Badge
                  variant={person.daysUntilBirthday === 0 ? 'destructive' : 'secondary'}
                  className="gba:flex-shrink-0"
                >
                  {getBirthdayBadgeLabel(person, t)}
                </Badge>
              </button>
            ))}
            {upcomingBirthdays.length === 0 && (
              <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4">
                {t('panel-birthdays-empty')}
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
