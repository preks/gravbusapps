// NO BUSINESS LOGIC HERE. Data + actions come from useManagerWorkboardVM.

import React from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button,
  Separator
} from '@newwork/nw-design-system'
import { Calendar, Target, MessageSquare, Briefcase, X } from 'lucide-react'

interface DirectReport {
  id: string
  firstName: string
  lastName: string
  pictureThumbnail?: string
  status: string
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
  onAssignProject: () => void
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
    onAssignProject()
    onClose()
  }

  const handleScheduleOneOnOne = () => {
    // Navigate to calendar/scheduling - using platform URL
    const calendarUrl = `/platform/calendar?employeeId=${member.id}`
    globalThis.location.href = calendarUrl
    onClose()
  }

  const handleGiveFeedback = () => {
    // Navigate to feedback form - using platform URL
    const feedbackUrl = `/platform/employee-record?employeeId=${member.id}&tab=feedback`
    globalThis.location.href = feedbackUrl
    onClose()
  }

  const handleSetGoals = () => {
    // Navigate to goals page - using platform URL
    const goalsUrl = `/platform/employee-record?employeeId=${member.id}&tab=goals`
    globalThis.location.href = goalsUrl
    onClose()
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        className="gba:w-full sm:gba:max-w-md gba:p-5"
        data-testid="member-quick-panel"
        style={{ borderRadius: '12px 0 0 12px' }}
      >
        <SheetHeader>
          <button
            onClick={onClose}
            className="gba:absolute gba:right-4 gba:top-4 gba:rounded-sm gba:opacity-70 gba:ring-offset-background gba:transition-opacity hover:gba:opacity-100 focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-ring focus:gba:ring-offset-2"
            aria-label="Close"
          >
            <X className="gba:h-4 gba:w-4" />
          </button>
          <SheetTitle className="gba:sr-only">Team Member Details</SheetTitle>
        </SheetHeader>

        <div className="gba:space-y-6 gba:py-6">
          {/* Member Header */}
          <div className="gba:flex gba:flex-col gba:items-center gba:text-center">
            <Avatar size="lg" className="gba:h-20 gba:w-20 gba:mb-4">
              <AvatarImage
                src={
                  member.pictureThumbnail && !member.pictureThumbnail.startsWith('{')
                    ? `data:image/jpeg;base64,${member.pictureThumbnail}`
                    : undefined
                }
                alt={`${member.firstName} ${member.lastName}`}
              />
              <AvatarFallback className="gba:text-2xl">
                {member.firstName.charAt(0)}
                {member.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <h2 className="gba:text-xl gba:font-semibold">
              {member.firstName} {member.lastName}
            </h2>
            <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{member.status}</p>
          </div>

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
