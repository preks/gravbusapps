// NO BUSINESS LOGIC HERE. Data + actions come from useManagerWorkboardVM.

import React from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import { Briefcase, CalendarBlank, CaretRight, ChatCircleDots, Target } from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { formatLastFeedback } from '../../utils/peopleMomentsHelpers'
import { avatarSrc } from '../../utils/heatmapHelpers'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import {
  getAbsenceStatusBadgeVariant,
  getAbsenceStatusLabel
} from '@/business-apps/hr/absences/utils/absenceStatusUtils'

interface AbsenceInfo {
  type: string
  parentEntryId?: string
  startDate: string
  endDate: string
  status: string
}

interface DirectReport {
  id: string
  userId?: string
  firstName: string
  lastName: string
  pictureThumbnail?: string
  status: string
  jobPositionName?: string
  currentAbsence?: AbsenceInfo
  nextAbsence?: {
    type: string
    startDate: string
    endDate: string
    status: string
  }
}

interface TeamPerformance {
  employeeId: string
  totalGoals: number
}

interface MemberQuickPanelProps {
  isOpen: boolean
  onClose: () => void
  member: DirectReport | null
  accessToken: string
  currentUserEmployeeId: string
  allocationPercent: number
  teamPerformance: TeamPerformance[]
  lastFeedbackDate: string | null
  onNavigateToEmployee: (employeeId: string) => void
  onAssignProject: (employeeId: string) => void
}

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
    <span className="gba:text-sm gba:text-muted-foreground">{label}</span>
    <span className="gba:text-sm gba:font-medium gba:text-foreground">{value}</span>
  </div>
)

export const MemberQuickPanel: React.FC<MemberQuickPanelProps> = ({
  isOpen,
  onClose,
  member,
  accessToken,
  currentUserEmployeeId,
  allocationPercent,
  teamPerformance,
  lastFeedbackDate,
  onNavigateToEmployee,
  onAssignProject
}) => {
  if (!member) return null

  const memberGoals = teamPerformance.find(p => p.employeeId === member.id)
  const hasGoals = memberGoals && memberGoals.totalGoals > 0
  const isAvailable = member.status === 'Available'
  const formattedLastFeedback = formatLastFeedback(lastFeedbackDate)
  const fullName = `${member.firstName} ${member.lastName}`.trim()

  const activeAbsence = member.currentAbsence || member.nextAbsence || null

  const handleViewProfile = () => {
    onNavigateToEmployee(member.id)
    onClose()
  }

  const handleAssignProject = () => {
    onAssignProject(member.id)
    onClose()
  }

  const handleScheduleOneOnOne = () => {
    const participantDrafts = member.userId
      ? JSON.stringify([{ userId: member.userId, displayName: `${member.firstName} ${member.lastName}` }])
      : undefined
    const meetingUrl = buildPlatformUrl(
      '/platform/chat',
      participantDrafts ? { action: 'createMeeting', participantDrafts } : { action: 'createMeeting' }
    )
    navigateTo(meetingUrl)
    onClose()
  }

  const handleSetGoals = () => {
    const goalsUrl = buildPlatformUrl('/platform/employee-record', {
      employeeId: member.id,
      tab: 'hrGrowth',
      subView: 'performance'
    })
    navigateTo(goalsUrl)
    onClose()
  }

  return (
    <Sheet
      open={isOpen}
      onOpenChange={open => {
        if (!open) onClose()
      }}
    >
      <SheetContent side="right" className="gba:flex gba:flex-col gba:p-0" data-testid="member-quick-panel">
        <SheetHeader className="gba:border-b gba:border-border gba:px-6 gba:py-4 gba:pr-14">
          <SheetTitle className="gba:text-left">Employee details</SheetTitle>
        </SheetHeader>

        <ScrollArea className="gba:flex-1 gba:min-h-0">
          <div className="gba:space-y-4 gba:px-6 gba:py-4">
            <div className="gba:border-b gba:border-border gba:pb-6">
              <div className="gba:flex gba:flex-col gba:items-center">
                <Avatar size="xl" className="gba:h-24 gba:w-24 gba:text-3xl">
                  <AvatarImage src={avatarSrc(member.pictureThumbnail)} alt={fullName} />
                  <AvatarFallback>
                    {`${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <button
                  type="button"
                  onClick={handleViewProfile}
                  className="gba:mt-2 gba:flex gba:items-center gba:justify-center gba:gap-1 gba:text-center"
                  data-testid={`member-quick-panel-open-profile-${member.id}`}
                >
                  <span className="gba:text-2xl gba:font-black gba:text-foreground gba:hover:underline">
                    {fullName}
                  </span>
                  <CaretRight size={20} className="gba:shrink-0 gba:text-foreground" />
                </button>

                <p className="gba:text-sm gba:text-muted-foreground">{member.jobPositionName || '-'}</p>
              </div>
            </div>

            <Card className="gba:p-4">
              <div className="gba:space-y-3">
                <InfoRow label="Availability" value={isAvailable ? 'Available' : member.status} />
                {activeAbsence && (
                  <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
                    <span className="gba:text-sm gba:text-muted-foreground gba:shrink-0">Vacation</span>
                    <div className="gba:flex gba:flex-col gba:items-end gba:gap-1">
                      <div className="gba:flex gba:items-center gba:gap-1.5">
                        <span className="gba:text-sm gba:font-medium">
                          {dayjs(activeAbsence.startDate).format('DD.MM')} –{' '}
                          {dayjs(activeAbsence.endDate).format('DD.MM')}
                        </span>
                        {member.currentAbsence && (
                          <span className="gba:text-[10px] gba:font-semibold gba:text-destructive gba:uppercase">
                            Now
                          </span>
                        )}
                      </div>
                      <div className="gba:flex gba:items-center gba:gap-1.5">
                        {activeAbsence.type && (
                          <span className="gba:text-xs gba:text-muted-foreground">{activeAbsence.type}</span>
                        )}
                        <Badge variant={getAbsenceStatusBadgeVariant(activeAbsence.status)} size="sm">
                          {getAbsenceStatusLabel(activeAbsence.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
                <InfoRow label="Project allocation" value={`${allocationPercent}%`} />
                <InfoRow label="Goals set" value={hasGoals ? 'Yes' : 'No'} />
                <InfoRow label="Last feedback" value={formattedLastFeedback} />
              </div>
            </Card>

            <Card className="gba:p-4">
              <h4 className="gba:mb-3 gba:text-sm gba:font-semibold gba:text-foreground">Manager actions</h4>
              <div className="gba:space-y-2">
                <Button onClick={handleAssignProject} variant="outline" className="gba:w-full gba:justify-start">
                  <Briefcase size={16} className="gba:mr-2" />
                  Assign project
                </Button>

                <Button onClick={handleSetGoals} variant="outline" className="gba:w-full gba:justify-start">
                  <Target size={16} className="gba:mr-2" />
                  Set goals
                </Button>

                <Button onClick={handleScheduleOneOnOne} variant="outline" className="gba:w-full gba:justify-start">
                  <CalendarBlank size={16} className="gba:mr-2" />
                  Schedule 1:1
                </Button>

                <AppAction
                  mode="button"
                  buttonVariant="outline"
                  buttonSize="default"
                  autoExecute
                  className="gba:w-full gba:justify-start"
                  contexts={[
                    {
                      context: FlowContextName.employeeGiveFeedback,
                      contextData: {
                        employeeId: currentUserEmployeeId,
                        receiverId: member.userId || member.id,
                        targetEmployeeId: member.id
                      }
                    }
                  ]}
                  accessToken={accessToken}
                  onClick={onClose}
                  prefixDataTestId={`member-quick-panel-give-feedback-${member.id}`}
                >
                  <>
                    <ChatCircleDots size={16} className="gba:mr-2" />
                    Give feedback
                  </>
                </AppAction>

                <Button onClick={handleViewProfile} variant="default" className="gba:mt-2 gba:w-full">
                  View full profile
                </Button>
              </div>
            </Card>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
