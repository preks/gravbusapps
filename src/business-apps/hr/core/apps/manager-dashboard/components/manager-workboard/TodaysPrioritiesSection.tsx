// NO BUSINESS LOGIC HERE. Data + actions come from useManagerWorkboardVM.

import React, { useState, useCallback, useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  toast,
  Spinner
} from '@newwork/nw-design-system'
import { AlertCircle, Users, Target, Clock, X, Send } from 'lucide-react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useChatClient } from '@/common/network/chat/useChatClient'

/**
 * Check if current time is after 10:30 AM on a working day (Mon-Fri)
 */
const shouldShowNotClockedInAlert = (): boolean => {
  const now = new Date()
  const dayOfWeek = now.getDay()

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false
  }

  const hours = now.getHours()
  const minutes = now.getMinutes()

  return hours > 10 || (hours === 10 && minutes >= 30)
}

interface PriorityItem {
  id: number
  text: string
  type: 'warning' | 'success' | 'info'
}

interface TodaysPrioritiesSectionProps {
  items: PriorityItem[]
  loading: boolean
  counts: {
    onLeave: number
    sickLeaves: number
    unallocated: number
    withoutGoals: number
    goalsBehind: number
    notClockedIn: number
    remote: number
    upcomingAnniversaries: number
  }
  unallocatedMonthlyCost?: number
  unallocatedEmployees?: Array<{ id: string; name: string; allocationPercent: number }>
  employeesWithoutGoals?: Array<{
    id: string
    name: string
    firstName: string
    lastName: string
    pictureThumbnail?: string
    jobPositionName?: string
  }>
  goalsBehindData?: Array<{
    employeeId: string
    employeeName: string
    employeeUserId: string
    goals: Array<{ id: string; title: string; progressPercent: number }>
  }>
  notClockedInEmployees?: Array<{ id: string; name: string; userId: string }>
  accessToken?: string
  currentUserId?: string
  onAssignProject?: (employeeId: string) => void
}

export const TodaysPrioritiesSection: React.FC<TodaysPrioritiesSectionProps> = ({
  items,
  loading,
  counts,
  unallocatedMonthlyCost = 0,
  unallocatedEmployees = [],
  employeesWithoutGoals = [],
  goalsBehindData = [],
  notClockedInEmployees = [],
  accessToken,
  currentUserId,
  onAssignProject
}) => {
  const [isUnallocatedPanelOpen, setIsUnallocatedPanelOpen] = useState(false)
  const [isNoGoalsPanelOpen, setIsNoGoalsPanelOpen] = useState(false)
  const [isGoalsBehindPanelOpen, setIsGoalsBehindPanelOpen] = useState(false)
  const [isNotClockedInPanelOpen, setIsNotClockedInPanelOpen] = useState(false)
  const chatClient = useChatClient(accessToken)
  const [sendingBlinkFor, setSendingBlinkFor] = useState<string | null>(null)
  const [sendingNudgeFor, setSendingNudgeFor] = useState<string | null>(null)
  const unallocatedDailyCost = Math.round(unallocatedMonthlyCost / 30)

  const handleSendGoalReminder = useCallback(
    async (employeeUserId: string, employeeName: string, goalTitle: string, goalId: string) => {
      if (!accessToken || !currentUserId) {
        toast.error('Unable to send reminder - please refresh and try again')
        return
      }

      if (!employeeUserId) {
        toast.error('Unable to send reminder - employee data unavailable')
        return
      }

      setSendingBlinkFor(goalId)

      try {
        const conversation = await chatClient.getOrCreateDirectConversation<{ id?: string; conversationId?: string }>(
          employeeUserId
        )
        const conversationId = conversation.id || conversation.conversationId
        if (!conversationId) {
          throw new Error('No conversation ID returned from API')
        }

        await chatClient.sendMessage(
          conversationId,
          `Please check your goal "${goalTitle}" and take appropriate actions.`,
          currentUserId
        )
        toast.success(`Reminder sent to ${employeeName}`)
      } catch (error) {
        console.error('[TodaysPriorities] Error sending goal reminder:', error)
        toast.error('Failed to send reminder - please try again')
      } finally {
        setSendingBlinkFor(null)
      }
    },
    [accessToken, currentUserId, chatClient]
  )

  const handleSendClockInNudge = useCallback(
    async (employeeUserId: string, employeeName: string) => {
      if (!accessToken || !currentUserId) {
        toast.error('Unable to send nudge - please refresh and try again')
        return
      }

      if (!employeeUserId) {
        toast.error('Unable to send nudge - employee data unavailable')
        return
      }

      setSendingNudgeFor(employeeUserId)

      try {
        const conversation = await chatClient.getOrCreateDirectConversation<{ id?: string; conversationId?: string }>(
          employeeUserId
        )
        const conversationId = conversation.id || conversation.conversationId
        if (!conversationId) {
          throw new Error('No conversation ID returned from API')
        }

        await chatClient.sendMessage(conversationId, "Don't forget to clock in!", currentUserId)
        toast.success(`Nudge sent to ${employeeName}`)
      } catch (error) {
        console.error('[TodaysPriorities] Error sending clock-in nudge:', error)
        toast.error('Failed to send nudge - please try again')
      } finally {
        setSendingNudgeFor(null)
      }
    },
    [accessToken, currentUserId, chatClient]
  )

  const showNotClockedInAlert = useMemo(() => shouldShowNotClockedInAlert(), [])

  if (loading) {
    return (
      <Card style={{ minHeight: '280px', borderRadius: '12px' }} className="gba:p-5">
        <CardHeader>
          <CardTitle>Today's Priorities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:animate-pulse gba:space-y-3">
            <div className="gba:h-12 gba:bg-muted gba:rounded" />
            <div className="gba:h-12 gba:bg-muted gba:rounded" />
            <div className="gba:h-12 gba:bg-muted gba:rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      data-testid="todays-priorities-section"
      style={{
        minHeight: '280px',
        maxHeight: '420px',
        borderRadius: '12px',
        overflow: 'hidden'
      }}
      className="gba:p-5 gba:flex gba:flex-col"
    >
      <CardHeader className="gba:flex-none">
        <CardTitle className="gba:text-lg gba:font-semibold">Today's Priorities</CardTitle>
        <p className="gba:text-sm gba:text-muted-foreground">AI-driven insights ranked by urgency</p>
      </CardHeader>
      <CardContent className="gba:space-y-3 gba:overflow-y-auto gba:flex-1">
        {/* Priority 1: Unallocated team members */}
        {counts.unallocated > 0 && (
          <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg">
            <div className="gba:flex gba:items-start gba:gap-3">
              <AlertCircle className="gba:text-muted-foreground gba:mt-1" size={20} />
              <div>
                <p className="gba:font-medium">{counts.unallocated} team members unallocated</p>
                <p className="gba:text-sm gba:text-muted-foreground">
                  {`Estimated cost: €${unallocatedDailyCost.toLocaleString()} per day`}
                </p>
              </div>
            </div>
            <div className="gba:flex gba:gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsUnallocatedPanelOpen(true)}>
                View all
              </Button>
            </div>
          </div>
        )}

        {/* Priority 2: Missing goals */}
        {counts.withoutGoals > 0 && (
          <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg">
            <div className="gba:flex gba:items-start gba:gap-3">
              <Target className="gba:text-muted-foreground gba:mt-1" size={20} />
              <div>
                <p className="gba:font-medium">{counts.withoutGoals} team members have no goals</p>
                <p className="gba:text-sm gba:text-muted-foreground">Deadline: end of week</p>
              </div>
            </div>
            <div className="gba:flex gba:gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsNoGoalsPanelOpen(true)}>
                View all
              </Button>
            </div>
          </div>
        )}

        {/* Priority 3: Goals behind */}
        {counts.goalsBehind > 0 && (
          <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg">
            <div className="gba:flex gba:items-start gba:gap-3">
              <AlertCircle className="gba:text-muted-foreground gba:mt-1" size={20} />
              <div>
                <p className="gba:font-medium">{counts.goalsBehind} goals behind target</p>
                <p className="gba:text-sm gba:text-muted-foreground">Requires immediate attention</p>
              </div>
            </div>
            <div className="gba:flex gba:gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsGoalsBehindPanelOpen(true)}>
                View all
              </Button>
            </div>
          </div>
        )}

        {/* Priority 4: Not clocked in */}
        {counts.notClockedIn > 0 && showNotClockedInAlert && (
          <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg">
            <div className="gba:flex gba:items-start gba:gap-3">
              <Clock className="gba:text-muted-foreground gba:mt-1" size={20} />
              <div>
                <p className="gba:font-medium">{counts.notClockedIn} people not clocked in</p>
                <p className="gba:text-sm gba:text-muted-foreground">Send a friendly reminder</p>
              </div>
            </div>
            <div className="gba:flex gba:gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsNotClockedInPanelOpen(true)}>
                Nudge
              </Button>
            </div>
          </div>
        )}

        {/* AI Insights if available */}
        {items.length > 0 && (
          <div className="gba:mt-4 gba:pt-4 gba:border-t">
            <p className="gba:text-xs gba:text-muted-foreground gba:mb-2">AI Insights:</p>
            {items.slice(0, 3).map(item => (
              <p key={item.id} className="gba:text-sm gba:mb-1">
                • {item.text}
              </p>
            ))}
          </div>
        )}

        {/* Empty state */}
        {counts.unallocated === 0 &&
          counts.withoutGoals === 0 &&
          counts.goalsBehind === 0 &&
          (counts.notClockedIn === 0 || !showNotClockedInAlert) && (
            <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
              <Users size={48} className="gba:mx-auto gba:mb-2 gba:opacity-50" />
              <p className="gba:font-medium">All clear!</p>
              <p className="gba:text-sm">No urgent priorities at the moment</p>
            </div>
          )}
      </CardContent>

      {/* Unallocated Members Panel */}
      <Sheet open={isUnallocatedPanelOpen} onOpenChange={setIsUnallocatedPanelOpen}>
        <SheetContent
          className="gba:w-full sm:gba:max-w-md gba:p-6 gba:overflow-y-auto"
          aria-label="Unallocated team members details"
        >
          <SheetHeader className="gba:mb-6">
            <button
              onClick={() => setIsUnallocatedPanelOpen(false)}
              className="gba:absolute gba:right-4 gba:top-4 gba:rounded-sm gba:opacity-70 gba:ring-offset-background gba:transition-opacity hover:gba:opacity-100 focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-ring focus:gba:ring-offset-2"
              aria-label="Close"
            >
              <X className="gba:h-4 gba:w-4" />
            </button>
            <SheetTitle className="gba:text-xl gba:font-semibold">Unallocated Team Members</SheetTitle>
            <p className="gba:text-sm gba:text-muted-foreground gba:pt-2">
              {`Estimated cost: €${unallocatedDailyCost.toLocaleString()} per day`}
            </p>
          </SheetHeader>

          <ul className="gba:space-y-2" aria-label="Unallocated employees">
            {unallocatedEmployees.map(employee => {
              const availablePercent = 100 - (employee.allocationPercent || 0)
              return (
                <li
                  key={employee.id}
                  className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg hover:gba:bg-muted/50"
                >
                  <div className="gba:flex gba:flex-col gba:gap-1 gba:flex-1">
                    <span className="gba:text-sm gba:font-medium">{employee.name}</span>
                    <Badge variant="outline" className="gba:text-xs gba:w-fit">
                      {availablePercent}% available
                    </Badge>
                  </div>
                  {onAssignProject && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onAssignProject(employee.id)
                        setIsUnallocatedPanelOpen(false)
                      }}
                      aria-label={`Allocate project for ${employee.name}`}
                    >
                      Allocate
                    </Button>
                  )}
                </li>
              )
            })}

            {unallocatedEmployees.length === 0 && (
              <li className="gba:text-center gba:py-8 gba:text-muted-foreground">
                <p>No unallocated employees</p>
              </li>
            )}
          </ul>
        </SheetContent>
      </Sheet>

      {/* No Goals Panel */}
      <Sheet open={isNoGoalsPanelOpen} onOpenChange={setIsNoGoalsPanelOpen}>
        <SheetContent className="gba:w-full sm:gba:max-w-md gba:p-6 gba:overflow-y-auto">
          <SheetHeader className="gba:mb-6">
            <button
              onClick={() => setIsNoGoalsPanelOpen(false)}
              className="gba:absolute gba:right-4 gba:top-4 gba:rounded-sm gba:opacity-70 gba:ring-offset-background gba:transition-opacity hover:gba:opacity-100 focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-ring focus:gba:ring-offset-2"
              aria-label="Close"
            >
              <X className="gba:h-4 gba:w-4" />
            </button>
            <SheetTitle className="gba:text-xl gba:font-semibold">Team Members Without Goals</SheetTitle>
            <p className="gba:text-sm gba:text-muted-foreground gba:pt-2">
              {counts.withoutGoals} members need performance goals
            </p>
          </SheetHeader>

          <div className="gba:space-y-2">
            {employeesWithoutGoals.map(employee => (
              <div
                key={employee.id}
                className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg hover:gba:bg-muted/50"
              >
                <span className="gba:text-sm gba:font-medium">{employee.name}</span>
                <AppAction
                  variant="custom"
                  mode="button"
                  buttonSize="sm"
                  buttonVariant="outline"
                  contexts={[
                    {
                      context: FlowContextName.employeePerformanceGoal,
                      contextData: {
                        employeeId: employee.id,
                        employee: {
                          id: employee.id,
                          firstName: employee.firstName,
                          lastName: employee.lastName,
                          pictureThumbnail: employee.pictureThumbnail,
                          employeePosition: employee.jobPositionName
                            ? [{ jobPosition: { name: employee.jobPositionName } }]
                            : []
                        }
                      }
                    }
                  ]}
                  accessToken={accessToken || ''}
                  autoExecute={true}
                  onSuccess={() => setIsNoGoalsPanelOpen(false)}
                >
                  Set goal
                </AppAction>
              </div>
            ))}

            {employeesWithoutGoals.length === 0 && (
              <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
                <p>All team members have goals</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Goals Behind Target Panel */}
      <Sheet open={isGoalsBehindPanelOpen} onOpenChange={setIsGoalsBehindPanelOpen}>
        <SheetContent
          className="gba:w-full sm:gba:max-w-lg gba:p-6 gba:overflow-y-auto"
          data-testid="goals-behind-panel"
        >
          <SheetHeader className="gba:mb-6">
            <button
              onClick={() => setIsGoalsBehindPanelOpen(false)}
              className="gba:absolute gba:right-4 gba:top-4 gba:rounded-sm gba:opacity-70 gba:ring-offset-background gba:transition-opacity hover:gba:opacity-100 focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-ring focus:gba:ring-offset-2"
              aria-label="Close"
            >
              <X className="gba:h-4 gba:w-4" />
            </button>
            <SheetTitle className="gba:text-xl gba:font-semibold">Goals Behind Target</SheetTitle>
            <p className="gba:text-sm gba:text-muted-foreground gba:pt-2">
              {counts.goalsBehind} goals require immediate attention
            </p>
          </SheetHeader>

          <div className="gba:space-y-3">
            {goalsBehindData.map(employee =>
              employee.goals.map(goal => (
                <div
                  key={`${employee.employeeId}-${goal.id}`}
                  className="gba:border gba:rounded-lg gba:p-3 gba:space-y-3"
                >
                  {/* Employee and Goal Info */}
                  <div>
                    <p className="gba:text-sm gba:font-medium gba:mb-1">{employee.employeeName}</p>
                    <p className="gba:text-sm gba:text-foreground">{goal.title}</p>
                    <div className="gba:mt-2">
                      <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
                        <span className="gba:text-xs gba:text-muted-foreground">Progress</span>
                        <span className="gba:text-xs gba:font-medium">{goal.progressPercent}%</span>
                      </div>
                      <div className="gba:h-1.5 gba:bg-muted gba:rounded-full gba:overflow-hidden">
                        <div
                          className="gba:h-full gba:bg-destructive gba:rounded-full"
                          style={{ width: `${goal.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* BLINK Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleSendGoalReminder(employee.employeeUserId, employee.employeeName, goal.title, goal.id)
                    }
                    disabled={sendingBlinkFor === goal.id || !employee.employeeUserId}
                    className="gba:w-full gba:justify-center"
                    aria-label={`Send reminder to ${employee.employeeName} about ${goal.title}`}
                  >
                    {sendingBlinkFor === goal.id ? (
                      <>
                        <Spinner className="gba:mr-2 gba:h-3 gba:w-3" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={14} className="gba:mr-2" />
                        Send reminder
                      </>
                    )}
                  </Button>
                </div>
              ))
            )}

            {goalsBehindData.length === 0 && (
              <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
                <p>No goals behind target</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Not Clocked In Panel */}
      <Sheet open={isNotClockedInPanelOpen} onOpenChange={setIsNotClockedInPanelOpen}>
        <SheetContent
          className="gba:w-full sm:gba:max-w-md gba:p-6 gba:overflow-y-auto"
          data-testid="not-clocked-in-panel"
        >
          <SheetHeader className="gba:mb-6">
            <button
              onClick={() => setIsNotClockedInPanelOpen(false)}
              className="gba:absolute gba:right-4 gba:top-4 gba:rounded-sm gba:opacity-70 gba:ring-offset-background gba:transition-opacity hover:gba:opacity-100 focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-ring focus:gba:ring-offset-2"
              aria-label="Close"
            >
              <X className="gba:h-4 gba:w-4" />
            </button>
            <SheetTitle className="gba:text-xl gba:font-semibold">Not Clocked In</SheetTitle>
            <p className="gba:text-sm gba:text-muted-foreground gba:pt-2">
              {counts.notClockedIn} team members haven't clocked in yet
            </p>
          </SheetHeader>

          <div className="gba:space-y-2">
            {notClockedInEmployees.map(employee => (
              <div
                key={employee.id}
                className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg hover:gba:bg-muted/50"
              >
                <span className="gba:text-sm gba:font-medium">{employee.name}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    handleSendClockInNudge(employee.userId, employee.name)
                  }}
                  disabled={sendingNudgeFor === employee.userId || !employee.userId}
                  aria-label={`Send clock-in reminder to ${employee.name}`}
                >
                  {sendingNudgeFor === employee.userId ? (
                    <>
                      <Spinner className="gba:mr-2 gba:h-3 gba:w-3" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={14} className="gba:mr-2" />
                      Nudge
                    </>
                  )}
                </Button>
              </div>
            ))}

            {notClockedInEmployees.length === 0 && (
              <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
                <p>Everyone is clocked in</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  )
}
