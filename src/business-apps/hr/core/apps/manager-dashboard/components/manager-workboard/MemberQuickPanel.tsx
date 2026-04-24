// NO BUSINESS LOGIC HERE. Data + actions come from useManagerWorkboardVM.

import React from 'react'
import { Sheet, SheetContent, Button, Separator } from '@newwork/nw-design-system'
import { Calendar, Target, MessageSquare, Briefcase } from 'lucide-react'
import { EmployeePanelHeader } from '../shared/EmployeePanelHeader'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'

interface DirectReport {
  id: string
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
  allocationPercent: number
  teamPerformance: TeamPerformance[]
  lastFeedbackDate: string | null
  onNavigateToEmployee: (employeeId: string) => void
  onAssignProject: (employeeId: string) => void
}

export const MemberQuickPanel: React.FC<MemberQuickPanelProps> = ({
  isOpen,
  onClose,
  member,
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

  const handleViewProfile = () => {
    onNavigateToEmployee(member.id)
    onClose()
  }

  const handleAssignProject = () => {
    onAssignProject(member.id)
    onClose()
  }

  const handleScheduleOneOnOne = () => {
    const calendarUrl = buildPlatformUrl('/platform/calendar', { employeeId: member.id })
    navigateTo(calendarUrl)
    onClose()
  }

  const handleGiveFeedback = () => {
    const feedbackUrl = buildPlatformUrl('/platform/employee-record', { employeeId: member.id, tab: 'feedback' })
    navigateTo(feedbackUrl)
    onClose()
  }

  const handleSetGoals = () => {
    const goalsUrl = buildPlatformUrl('/platform/employee-record', { employeeId: member.id, tab: 'goals' })
    navigateTo(goalsUrl)
    onClose()
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="gba:w-full sm:gba:max-w-md gba:p-5" data-testid="member-quick-panel">
        <EmployeePanelHeader
          title="Team Member Details"
          description="Quick overview and actions"
          onClose={onClose}
          employee={{
            firstName: member.firstName,
            lastName: member.lastName,
            pictureThumbnail: member.pictureThumbnail,
            roleLabel: member.jobPositionName || member.status
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
              <span className="gba:text-sm gba:text-muted-foreground">Allocation</span>
              <span className="gba:text-sm gba:font-medium">{allocationPercent}%</span>
            </div>

            <div className="gba:flex gba:items-center gba:justify-between">
              <span className="gba:text-sm gba:text-muted-foreground">Goals set</span>
              <span className="gba:text-sm gba:font-medium">{hasGoals ? 'Yes' : 'No'}</span>
            </div>

            {lastFeedbackDate && (
              <div className="gba:flex gba:items-center gba:justify-between">
                <span className="gba:text-sm gba:text-muted-foreground">Last feedback</span>
                <span className="gba:text-sm gba:font-medium">{lastFeedbackDate}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="gba:space-y-2">
            <Button onClick={handleAssignProject} variant="default" className="gba:w-full gba:justify-start">
              <Briefcase size={16} className="gba:mr-2" />
              Assign project
            </Button>

            <Button onClick={handleSetGoals} variant="outline" className="gba:w-full gba:justify-start">
              <Target size={16} className="gba:mr-2" />
              Set goals
            </Button>

            <Button onClick={handleScheduleOneOnOne} variant="outline" className="gba:w-full gba:justify-start">
              <Calendar size={16} className="gba:mr-2" />
              Schedule 1:1
            </Button>

            <Button onClick={handleGiveFeedback} variant="outline" className="gba:w-full gba:justify-start">
              <MessageSquare size={16} className="gba:mr-2" />
              Give feedback
            </Button>
          </div>

          <Separator />

          {/* View Full Profile */}
          <Button onClick={handleViewProfile} variant="secondary" className="gba:w-full">
            View full profile
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
