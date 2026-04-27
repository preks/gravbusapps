// NO BUSINESS LOGIC HERE. Data + actions come from useManagerWorkboardVM.

import React from 'react'
import { Sheet, SheetContent, Button, Separator } from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import { Briefcase, CalendarBlank, ChatCircleDots, Target } from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { EmployeePanelHeader } from '../shared/EmployeePanelHeader'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'

interface DirectReport {
  id: string
  userId?: string
  firstName: string
  lastName: string
  pictureThumbnail?: string
  status: string
  jobPositionName?: string
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

const formatLastFeedback = (isoDate: string | null): string => {
  if (!isoDate) return 'No feedback yet'

  const feedbackDate = dayjs(isoDate)
  if (!feedbackDate.isValid()) return 'No feedback yet'

  const days = dayjs().diff(feedbackDate, 'day')
  if (days <= 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`

  const months = Math.floor(days / 30)
  if (months === 1) return '1 month ago'
  if (months < 12) return `${months} months ago`

  return feedbackDate.format('MMM D, YYYY')
}

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
      <SheetContent className="gba:w-full sm:gba:max-w-md gba:p-5" data-testid="member-quick-panel">
        <EmployeePanelHeader
          title="Employee details"
          description="Quick profile and common manager actions"
          onClose={onClose}
          employee={{
            firstName: member.firstName,
            lastName: member.lastName,
            pictureThumbnail: member.pictureThumbnail,
            roleLabel: member.jobPositionName
          }}
        />

        <div className="gba:space-y-6 gba:py-4">
          <Separator />

          {/* Key Stats */}
          <div className="gba:space-y-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <span className="gba:text-sm gba:text-muted-foreground">Availability</span>
              <span className="gba:text-sm gba:font-medium">{isAvailable ? 'Available' : member.status}</span>
            </div>

            <div className="gba:flex gba:items-center gba:justify-between">
              <span className="gba:text-sm gba:text-muted-foreground">Project allocation</span>
              <span className="gba:text-sm gba:font-medium">{allocationPercent}%</span>
            </div>

            <div className="gba:flex gba:items-center gba:justify-between">
              <span className="gba:text-sm gba:text-muted-foreground">Goals set</span>
              <span className="gba:text-sm gba:font-medium">{hasGoals ? 'Yes' : 'No'}</span>
            </div>

            <div className="gba:flex gba:items-center gba:justify-between">
              <span className="gba:text-sm gba:text-muted-foreground">Last feedback</span>
              <span className="gba:text-sm gba:font-medium">{formattedLastFeedback}</span>
            </div>
          </div>

          <Separator />

          {/* Actions */}
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
          </div>

          <Separator />

          {/* View Full Profile */}
          <Button onClick={handleViewProfile} variant="default" className="gba:w-full">
            View full profile
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
