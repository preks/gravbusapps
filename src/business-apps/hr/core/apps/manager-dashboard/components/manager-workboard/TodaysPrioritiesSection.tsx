// NO BUSINESS LOGIC HERE. Data + actions come from useManagerWorkboardVM.

import React, { useState } from 'react'
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
  Separator,
  toast,
  Spinner
} from '@newwork/nw-design-system'
import { AlertCircle, Users, Target, Clock, X, Send } from 'lucide-react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { env } from '@/common/env/EnvUtils'

/**
 * Helper function to create standard assignment targets structure
 */
const createAssignmentTargets = (userIds: string[]) => ({
  users: userIds,
  capabilities: [],
  organizationalUnits: [],
  companies: [],
  siteLocations: [],
  costCenters: [],
  matrixTeams: []
})

/**
 * Send a blink reminder about goals behind target
 */
const sendGoalReminderBlink = async (
  accessToken: string,
  payload: {
    employeeUserId: string
    employeeName: string
    initiatorId: string
    goalTitle: string
    goalId: string
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const baseUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'
    const timestamp = Date.now()

    const goalUrl = `/platform/employee-record?employeeId=${payload.employeeUserId}&tab=hrGrowth&subView=performance`

    const entityLink = {
      name: payload.goalTitle,
      url: `${globalThis.location.origin}${goalUrl}`,
      type: 'entity:performance-goal',
      metadata: {
        entityType: 'performance-goal',
        entityId: payload.goalId
      }
    }

    const tags: Record<string, string> = {
      app: 'quick-task',
      blinkGroupId: `goal_reminder_${timestamp}_${payload.initiatorId}`,
      assignedUserId: payload.employeeUserId,
      entityType: 'performance-goal',
      entityId: payload.goalId,
      entityName: payload.goalTitle,
      entityDisplayUrl: goalUrl
    }

    const requestPayload = {
      templateDefinition: {
        type: 'TEMPLATE',
        name: 'Goal Progress Check',
        description: `Reminder: Goal behind target`,
        version: 1,
        steps: [
          {
            type: 'TASK',
            title: 'Goal Progress Check',
            message: `Please check your goal "${payload.goalTitle}" which is currently behind target. Update your progress or identify any blockers.`,
            form: [],
            links: [entityLink],
            assignment: {
              assignmentMode: 'ASSIGN',
              targets: null,
              allowReassignment: false
            },
            dueInMinutes: 4320
          }
        ],
        tags
      },
      initiatorId: payload.initiatorId,
      stepAssignments: {
        step_0: {
          assignment: {
            assignmentMode: 'ASSIGN',
            targets: createAssignmentTargets([payload.employeeUserId]),
            allowReassignment: false
          }
        }
      }
    }

    const response = await fetch(`${baseUrl}/api/templates/execute-dynamic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(requestPayload)
    })

    if (!response.ok) {
      throw new Error(`Failed to send blink: ${response.statusText}`)
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send blink' }
  }
}

/**
 * Send a chat nudge to remind employee to clock in
 */
const sendClockInNudge = async (
  accessToken: string,
  payload: {
    employeeUserId: string
    employeeName: string
    currentUserId: string
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const baseUrl = env('NEXT_PUBLIC_CHAT_API') || `${env('NEXT_PUBLIC_BASE_URL')}/chat-service/api/v1`

    // Step 1: Create or get direct conversation with the employee
    const conversationResponse = await fetch(`${baseUrl}/conversations/direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ userId: payload.employeeUserId })
    })

    if (!conversationResponse.ok) {
      throw new Error(`Failed to create conversation: ${conversationResponse.statusText}`)
    }

    const conversation = await conversationResponse.json()

    // Step 2: Send the nudge message
    const messageResponse = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        conversationId: conversation.id,
        content: "Don't forget to clock in! ⏰",
        senderId: payload.currentUserId
      })
    })

    if (!messageResponse.ok) {
      throw new Error(`Failed to send message: ${messageResponse.statusText}`)
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send nudge' }
  }
}

/**
 * Check if current time is after 10:30 AM on a working day (Mon-Fri)
 */
const shouldShowNotClockedInAlert = (): boolean => {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday, 6 = Saturday

  // Only show on working days (Monday = 1 to Friday = 5)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false
  }

  const hours = now.getHours()
  const minutes = now.getMinutes()

  // Show only after 10:30 AM
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
  unallocatedDailyCost?: number
  unallocatedEmployees?: Array<{ id: string; name: string; allocationPercent: number }>
  employeesWithoutGoals?: Array<{ id: string; name: string }>
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
  unallocatedDailyCost = 0,
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
  const [sendingBlinkFor, setSendingBlinkFor] = useState<string | null>(null)
  const [sendingNudgeFor, setSendingNudgeFor] = useState<string | null>(null)

  const handleSendGoalReminder = async (
    employeeUserId: string,
    employeeName: string,
    goalTitle: string,
    goalId: string
  ) => {
    if (!accessToken || !currentUserId) {
      toast.error('Unable to send reminder')
      return
    }

    setSendingBlinkFor(goalId)

    try {
      const result = await sendGoalReminderBlink(accessToken, {
        employeeUserId,
        employeeName,
        initiatorId: currentUserId,
        goalTitle,
        goalId
      })

      if (result.success) {
        toast.success(`Reminder sent to ${employeeName}`)
      } else {
        toast.error(result.error || 'Failed to send reminder')
      }
    } catch (error) {
      console.error('Error sending goal reminder:', error)
      toast.error('Failed to send reminder')
    } finally {
      setSendingBlinkFor(null)
    }
  }

  const handleSendClockInNudge = async (employeeUserId: string, employeeName: string) => {
    if (!accessToken || !currentUserId) {
      toast.error('Unable to send nudge')
      return
    }

    setSendingNudgeFor(employeeUserId)

    try {
      const result = await sendClockInNudge(accessToken, {
        employeeUserId,
        employeeName,
        currentUserId
      })

      if (result.success) {
        toast.success(`Nudge sent to ${employeeName}`)
      } else {
        toast.error(result.error || 'Failed to send nudge')
      }
    } catch (error) {
      console.error('Error sending clock-in nudge:', error)
      toast.error('Failed to send nudge')
    } finally {
      setSendingNudgeFor(null)
    }
  }

  const showNotClockedInAlert = shouldShowNotClockedInAlert()

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
                  {unallocatedDailyCost > 0
                    ? `Estimated cost: €${unallocatedDailyCost.toLocaleString()} per day`
                    : 'Impact: delivery & engagement risk'}
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
        <SheetContent className="gba:w-full sm:gba:max-w-md">
          <SheetHeader>
            <div className="gba:flex gba:items-center gba:justify-between">
              <SheetTitle>Unallocated Team Members</SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsUnallocatedPanelOpen(false)}
                className="gba:h-6 gba:w-6 gba:p-0"
              >
                <X size={16} />
              </Button>
            </div>
            <p className="gba:text-sm gba:text-muted-foreground gba:pt-2">
              {unallocatedDailyCost > 0
                ? `Estimated cost: €${unallocatedDailyCost.toLocaleString()} per day`
                : `${counts.unallocated} members need project allocation`}
            </p>
          </SheetHeader>

          <Separator className="gba:my-4" />

          <div className="gba:space-y-2 gba:overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {unallocatedEmployees.map(employee => {
              const availablePercent = 100 - (employee.allocationPercent || 0)
              return (
                <div
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
                      variant="default"
                      onClick={() => {
                        onAssignProject(employee.id)
                        setIsUnallocatedPanelOpen(false)
                      }}
                    >
                      Allocate
                    </Button>
                  )}
                </div>
              )
            })}

            {unallocatedEmployees.length === 0 && (
              <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
                <p>No unallocated employees</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* No Goals Panel */}
      <Sheet open={isNoGoalsPanelOpen} onOpenChange={setIsNoGoalsPanelOpen}>
        <SheetContent className="gba:w-full sm:gba:max-w-md">
          <SheetHeader>
            <div className="gba:flex gba:items-center gba:justify-between">
              <SheetTitle>Team Members Without Goals</SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsNoGoalsPanelOpen(false)}
                className="gba:h-6 gba:w-6 gba:p-0"
              >
                <X size={16} />
              </Button>
            </div>
            <p className="gba:text-sm gba:text-muted-foreground gba:pt-2">
              {counts.withoutGoals} members need performance goals
            </p>
          </SheetHeader>

          <Separator className="gba:my-4" />

          <div className="gba:space-y-2 gba:overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {employeesWithoutGoals.map(employee => (
              <div
                key={employee.id}
                className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg hover:gba:bg-muted/50"
              >
                <span className="gba:text-sm gba:font-medium">{employee.name}</span>
                <AppAction
                  variant="update-primary"
                  size="sm"
                  contexts={[
                    {
                      context: FlowContextName.employeePerformanceGoal,
                      contextData: { employeeId: employee.id }
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
        <SheetContent className="gba:w-full sm:gba:max-w-lg">
          <SheetHeader>
            <div className="gba:flex gba:items-center gba:justify-between">
              <SheetTitle>Goals Behind Target</SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsGoalsBehindPanelOpen(false)}
                className="gba:h-6 gba:w-6 gba:p-0"
              >
                <X size={16} />
              </Button>
            </div>
            <p className="gba:text-sm gba:text-muted-foreground gba:pt-2">
              {counts.goalsBehind} goals require immediate attention
            </p>
          </SheetHeader>

          <Separator className="gba:my-4" />

          <div className="gba:space-y-3 gba:overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
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
                    disabled={sendingBlinkFor === goal.id}
                    className="gba:w-full gba:justify-center"
                  >
                    {sendingBlinkFor === goal.id ? (
                      <>
                        <Spinner className="gba:mr-2 gba:h-3 gba:w-3" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={14} className="gba:mr-2" />
                        BLINK: Check goal progress
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
        <SheetContent className="gba:w-full sm:gba:max-w-md">
          <SheetHeader>
            <div className="gba:flex gba:items-center gba:justify-between">
              <SheetTitle>Not Clocked In</SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsNotClockedInPanelOpen(false)}
                className="gba:h-6 gba:w-6 gba:p-0"
              >
                <X size={16} />
              </Button>
            </div>
            <p className="gba:text-sm gba:text-muted-foreground gba:pt-2">
              {counts.notClockedIn} team members haven't clocked in yet
            </p>
          </SheetHeader>

          <Separator className="gba:my-4" />

          <div className="gba:space-y-2 gba:overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
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
                  disabled={sendingNudgeFor === employee.userId}
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
