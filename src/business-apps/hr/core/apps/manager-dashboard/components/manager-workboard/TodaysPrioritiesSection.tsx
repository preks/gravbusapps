// NO BUSINESS LOGIC HERE. Data + actions come from useManagerWorkboardVM.

import React, { useState, useCallback, useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Sheet,
  SheetContent,
  toast,
  Spinner
} from '@newwork/nw-design-system'
import { AlertCircle, Users, Target, Clock, Send } from 'lucide-react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useChatClient } from '@/common/network/chat/useChatClient'
import { EmployeePanelHeader } from '../shared/EmployeePanelHeader'
import { PrefilledMessageDialog } from '../shared/PrefilledMessageDialog'

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

const pluralize = (count: number, singular: string, plural: string): string =>
  `${count} ${count === 1 ? singular : plural}`

const avatarSrc = (pictureThumbnail?: string): string | undefined =>
  pictureThumbnail && !pictureThumbnail.startsWith('{') ? `data:image/jpeg;base64,${pictureThumbnail}` : undefined

const initialsFromName = (firstName?: string, lastName?: string): string =>
  `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '??'
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
  unallocatedEmployees?: Array<{
    id: string
    name: string
    firstName: string
    lastName: string
    pictureThumbnail?: string
    allocationPercent: number
  }>
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
    firstName: string
    lastName: string
    pictureThumbnail?: string
    goals: Array<{ id: string; title: string; progressPercent: number }>
  }>
  notClockedInEmployees?: Array<{
    id: string
    name: string
    userId: string
    firstName: string
    lastName: string
    pictureThumbnail?: string
  }>
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
  const [goalReminderDraft, setGoalReminderDraft] = useState<{
    goalId: string
    employeeUserId: string
    employeeName: string
    goalTitle: string
    message: string
  } | null>(null)
  const [clockInNudgeDraft, setClockInNudgeDraft] = useState<{
    employeeUserId: string
    employeeName: string
    message: string
  } | null>(null)
  const [isUnallocatedPanelOpen, setIsUnallocatedPanelOpen] = useState(false)
  const [isNoGoalsPanelOpen, setIsNoGoalsPanelOpen] = useState(false)
  const [isGoalsBehindPanelOpen, setIsGoalsBehindPanelOpen] = useState(false)
  const [isNotClockedInPanelOpen, setIsNotClockedInPanelOpen] = useState(false)
  const chatClient = useChatClient(accessToken)
  const [sendingBlinkFor, setSendingBlinkFor] = useState<string | null>(null)
  const [sendingNudgeFor, setSendingNudgeFor] = useState<string | null>(null)
  const unallocatedDailyCost = Math.round(unallocatedMonthlyCost / 30)

  const handleSendGoalReminder = useCallback(
    async (employeeUserId: string, employeeName: string, goalId: string, message: string) => {
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

        await chatClient.sendMessage(conversationId, message, currentUserId)
        toast.success(`Reminder sent to ${employeeName}`)
        setGoalReminderDraft(null)
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
    async (employeeUserId: string, employeeName: string, message: string) => {
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

        await chatClient.sendMessage(conversationId, message, currentUserId)
        toast.success(`Nudge sent to ${employeeName}`)
        setClockInNudgeDraft(null)
      } catch (error) {
        console.error('[TodaysPriorities] Error sending clock-in nudge:', error)
        toast.error('Failed to send nudge - please try again')
      } finally {
        setSendingNudgeFor(null)
      }
    },
    [accessToken, currentUserId, chatClient]
  )

  const openGoalReminderDialog = useCallback(
    (goalId: string, employeeUserId: string, employeeName: string, goalTitle: string) => {
      setGoalReminderDraft({
        goalId,
        employeeUserId,
        employeeName,
        goalTitle,
        message: `Hi ${employeeName}, your goal "${goalTitle}" is currently behind target. Could you review it and share your next steps?`
      })
    },
    []
  )

  const openClockInNudgeDialog = useCallback((employeeUserId: string, employeeName: string) => {
    setClockInNudgeDraft({
      employeeUserId,
      employeeName,
      message: `Hi ${employeeName}, friendly reminder to clock in when you start your workday.`
    })
  }, [])

  const showNotClockedInAlert = useMemo(() => shouldShowNotClockedInAlert(), [])

  if (loading) {
    return (
      <Card style={{ minHeight: '300px', borderRadius: '12px' }} className="gba:p-5">
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
        minHeight: '300px',
        maxHeight: '460px',
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
                <p className="gba:font-medium">
                  {pluralize(counts.unallocated, 'team member', 'team members')} unallocated
                </p>
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
                <p className="gba:font-medium">
                  {pluralize(counts.withoutGoals, 'team member', 'team members')} without goals
                </p>
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
                <p className="gba:font-medium">{pluralize(counts.goalsBehind, 'goal', 'goals')} behind target</p>
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
                <p className="gba:font-medium">{pluralize(counts.notClockedIn, 'person', 'people')} not clocked in</p>
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
              <p className="gba:text-sm">
                No urgent priorities right now. Use this time to schedule feedback check-ins.
              </p>
            </div>
          )}
      </CardContent>

      {/* Unallocated Members Panel */}
      <Sheet open={isUnallocatedPanelOpen} onOpenChange={setIsUnallocatedPanelOpen}>
        <SheetContent
          className="gba:w-full sm:gba:max-w-md gba:p-6 gba:overflow-y-auto"
          aria-label="Unallocated team members details"
        >
          <EmployeePanelHeader
            title="Unallocated Team Members"
            description={`Estimated cost: €${unallocatedDailyCost.toLocaleString()} per day`}
            onClose={() => setIsUnallocatedPanelOpen(false)}
          />

          <ul className="gba:space-y-2" aria-label="Unallocated employees">
            {unallocatedEmployees.map(employee => {
              const availablePercent = 100 - (employee.allocationPercent || 0)
              return (
                <li
                  key={employee.id}
                  className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg hover:gba:bg-muted/50"
                >
                  <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                    <Avatar className="gba:h-9 gba:w-9">
                      <AvatarImage src={avatarSrc(employee.pictureThumbnail)} alt={employee.name} />
                      <AvatarFallback>{initialsFromName(employee.firstName, employee.lastName)}</AvatarFallback>
                    </Avatar>
                    <div className="gba:flex gba:flex-col gba:gap-1 gba:flex-1">
                      <span className="gba:text-sm gba:font-medium">{employee.name}</span>
                      <Badge variant="outline" className="gba:text-xs gba:w-fit">
                        {availablePercent}% available
                      </Badge>
                    </div>
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
                <p>No unallocated employees. Team capacity is fully assigned.</p>
              </li>
            )}
          </ul>
        </SheetContent>
      </Sheet>

      {/* No Goals Panel */}
      <Sheet open={isNoGoalsPanelOpen} onOpenChange={setIsNoGoalsPanelOpen}>
        <SheetContent className="gba:w-full sm:gba:max-w-md gba:p-6 gba:overflow-y-auto">
          <EmployeePanelHeader
            title="Team Members Without Goals"
            description={`${pluralize(counts.withoutGoals, 'member', 'members')} need performance goals`}
            onClose={() => setIsNoGoalsPanelOpen(false)}
          />

          <div className="gba:space-y-2">
            {employeesWithoutGoals.map(employee => (
              <div
                key={employee.id}
                className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg hover:gba:bg-muted/50"
              >
                <div className="gba:flex gba:items-center gba:gap-3">
                  <Avatar className="gba:h-9 gba:w-9">
                    <AvatarImage src={avatarSrc(employee.pictureThumbnail)} alt={employee.name} />
                    <AvatarFallback>{initialsFromName(employee.firstName, employee.lastName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="gba:text-sm gba:font-medium">{employee.name}</span>
                    {employee.jobPositionName && (
                      <p className="gba:text-xs gba:text-muted-foreground">{employee.jobPositionName}</p>
                    )}
                  </div>
                </div>
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
                <p>All team members have goals. Next step: review progress in Team Performance.</p>
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
          <EmployeePanelHeader
            title="Goals Behind Target"
            description={`${pluralize(counts.goalsBehind, 'goal', 'goals')} require immediate attention`}
            onClose={() => setIsGoalsBehindPanelOpen(false)}
          />

          <div className="gba:space-y-3">
            {goalsBehindData.map(employee =>
              employee.goals.map(goal => (
                <div
                  key={`${employee.employeeId}-${goal.id}`}
                  className="gba:border gba:rounded-lg gba:p-3 gba:space-y-3"
                >
                  {/* Employee and Goal Info */}
                  <div>
                    <div className="gba:mb-2 gba:flex gba:items-center gba:gap-2">
                      <Avatar className="gba:h-8 gba:w-8">
                        <AvatarImage src={avatarSrc(employee.pictureThumbnail)} alt={employee.employeeName} />
                        <AvatarFallback>{initialsFromName(employee.firstName, employee.lastName)}</AvatarFallback>
                      </Avatar>
                      <p className="gba:text-sm gba:font-medium">{employee.employeeName}</p>
                    </div>
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
                      openGoalReminderDialog(goal.id, employee.employeeUserId, employee.employeeName, goal.title)
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
                <p>No goals behind target. Keep momentum with regular coaching touchpoints.</p>
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
          <EmployeePanelHeader
            title="Not Clocked In"
            description={`${pluralize(counts.notClockedIn, 'team member', 'team members')} haven't clocked in yet`}
            onClose={() => setIsNotClockedInPanelOpen(false)}
          />

          <div className="gba:space-y-2">
            {notClockedInEmployees.map(employee => (
              <div
                key={employee.id}
                className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg hover:gba:bg-muted/50"
              >
                <div className="gba:flex gba:items-center gba:gap-3">
                  <Avatar className="gba:h-9 gba:w-9">
                    <AvatarImage src={avatarSrc(employee.pictureThumbnail)} alt={employee.name} />
                    <AvatarFallback>{initialsFromName(employee.firstName, employee.lastName)}</AvatarFallback>
                  </Avatar>
                  <span className="gba:text-sm gba:font-medium">{employee.name}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openClockInNudgeDialog(employee.userId, employee.name)}
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
                <p>Everyone is clocked in. You can focus on performance priorities.</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <PrefilledMessageDialog
        open={Boolean(goalReminderDraft)}
        onOpenChange={open => {
          if (!open) {
            setGoalReminderDraft(null)
          }
        }}
        title="Send goal reminder"
        description="Message will be sent as a direct chat and can be edited before sending."
        recipientName={goalReminderDraft?.employeeName || ''}
        defaultMessage={goalReminderDraft?.message || ''}
        sending={sendingBlinkFor === goalReminderDraft?.goalId}
        confirmLabel="Send reminder"
        onConfirm={async message => {
          if (!goalReminderDraft) return
          await handleSendGoalReminder(
            goalReminderDraft.employeeUserId,
            goalReminderDraft.employeeName,
            goalReminderDraft.goalId,
            message
          )
        }}
      />

      <PrefilledMessageDialog
        open={Boolean(clockInNudgeDraft)}
        onOpenChange={open => {
          if (!open) {
            setClockInNudgeDraft(null)
          }
        }}
        title="Send clock-in nudge"
        description="Message will be sent as a direct chat and can be edited before sending."
        recipientName={clockInNudgeDraft?.employeeName || ''}
        defaultMessage={clockInNudgeDraft?.message || ''}
        sending={sendingNudgeFor === clockInNudgeDraft?.employeeUserId}
        confirmLabel="Send nudge"
        onConfirm={async message => {
          if (!clockInNudgeDraft) return
          await handleSendClockInNudge(clockInNudgeDraft.employeeUserId, clockInNudgeDraft.employeeName, message)
        }}
      />
    </Card>
  )
}
