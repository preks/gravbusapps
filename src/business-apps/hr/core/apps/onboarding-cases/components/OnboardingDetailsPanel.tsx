/**
 * Onboarding Details Panel
 *
 * Custom details panel for onboarding cases showing employee-specific information.
 * Displays onboarding stage progress, equipment checklist, and key contacts.
 */

import React, { useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Progress,
  Badge,
  Avatar,
  AvatarFallback,
  cn
} from '@newwork/nw-design-system'
import {
  Activity,
  Building2,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Monitor,
  Phone,
  User,
  UserCircle,
  Users
} from 'lucide-react'
import { CaseActivityFeed } from '@/business-apps/common/apps/case-management/components/CaseActivityFeed'
import {
  OnboardingStage,
  OnboardingDetailsPanelProps,
  onboardingStageLabels,
  getStageProgress,
  equipmentOptions
} from '../types'
import type { LinkedFlow } from '@/business-apps/common/apps/case-management/types'

// Info field component for displaying labeled values
const InfoField: React.FC<{
  label: string
  value: string | undefined
  icon?: React.ElementType
}> = ({ label, value, icon: Icon }) => (
  <div className="gba:space-y-1">
    <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1.5">
      {Icon && <Icon className="gba:h-3.5 gba:w-3.5" />}
      {label}
    </p>
    <p className="gba:text-sm gba:font-medium">{value || '-'}</p>
  </div>
)

// Stage tracker component
const OnboardingStageTracker: React.FC<{
  currentStage: OnboardingStage
  startDate: string
}> = ({ currentStage, startDate }) => {
  const stages: OnboardingStage[] = ['pre_arrival', 'first_day', 'first_week', 'first_month', 'completed']
  const currentIndex = stages.indexOf(currentStage)
  const progress = getStageProgress(currentStage)

  return (
    <div className="gba:space-y-4">
      <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
        <span className="gba:text-muted-foreground">Progress</span>
        <span className="gba:font-medium">{progress}%</span>
      </div>
      <Progress value={progress} className="gba:h-2" />

      <div className="gba:flex gba:justify-between gba:mt-4">
        {stages.map((stage, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex
          const isPending = index > currentIndex

          return (
            <div
              key={stage}
              className={cn('gba:flex gba:flex-col gba:items-center gba:gap-1', isPending && 'gba:opacity-50')}
            >
              <div
                className={cn(
                  'gba:w-8 gba:h-8 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:border-2',
                  isCompleted && 'gba:bg-green-100 gba:border-green-500 gba:text-green-600',
                  isCurrent && 'gba:bg-primary/10 gba:border-primary gba:text-primary',
                  isPending && 'gba:bg-muted gba:border-muted-foreground/30 gba:text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="gba:h-4 gba:w-4" />
                ) : (
                  <Circle className={cn('gba:h-4 gba:w-4', isCurrent && 'gba:fill-current')} />
                )}
              </div>
              <span
                className={cn(
                  'gba:text-[10px] gba:text-center gba:max-w-[60px]',
                  isCurrent ? 'gba:font-medium' : 'gba:text-muted-foreground'
                )}
              >
                {onboardingStageLabels[stage]}
              </span>
            </div>
          )
        })}
      </div>

      <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:mt-2">
        Start Date: {new Date(startDate).toLocaleDateString()}
      </p>
    </div>
  )
}

// Equipment checklist component
const EquipmentChecklist: React.FC<{
  requested?: string[]
  completed?: string[]
}> = ({ requested = [], completed = [] }) => {
  if (requested.length === 0) {
    return <p className="gba:text-sm gba:text-muted-foreground">No equipment requested</p>
  }

  return (
    <div className="gba:space-y-2">
      {requested.map(itemValue => {
        const item = equipmentOptions.find(e => e.value === itemValue)
        const isCompleted = completed.includes(itemValue)

        return (
          <div key={itemValue} className="gba:flex gba:items-center gba:gap-2 gba:p-2 gba:rounded-md gba:bg-muted/50">
            <div
              className={cn(
                'gba:w-5 gba:h-5 gba:rounded-full gba:flex gba:items-center gba:justify-center',
                isCompleted ? 'gba:bg-green-100 gba:text-green-600' : 'gba:bg-muted gba:text-muted-foreground'
              )}
            >
              {isCompleted ? <CheckCircle2 className="gba:h-3 gba:w-3" /> : <Monitor className="gba:h-3 gba:w-3" />}
            </div>
            <span className={cn('gba:text-sm', isCompleted && 'gba:line-through gba:text-muted-foreground')}>
              {item?.label || itemValue}
            </span>
            {isCompleted && (
              <Badge variant="outline" className="gba:ml-auto gba:text-xs gba:text-green-600">
                Delivered
              </Badge>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Contact card component
const ContactCard: React.FC<{
  role: string
  employeeId?: string
  context: OnboardingDetailsPanelProps['context']
}> = ({ role, employeeId }) => {
  // In production, this would fetch employee details
  // For now, display placeholder

  if (!employeeId) {
    return (
      <div className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-lg gba:bg-muted/50">
        <Avatar className="gba:h-10 gba:w-10">
          <AvatarFallback>
            <UserCircle className="gba:h-6 gba:w-6 gba:text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="gba:text-xs gba:text-muted-foreground">{role}</p>
          <p className="gba:text-sm gba:text-muted-foreground/80">Not assigned</p>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-lg gba:bg-muted/50 hover:gba:bg-muted gba:transition-colors gba:cursor-pointer">
      <Avatar className="gba:h-10 gba:w-10">
        <AvatarFallback className="gba:bg-primary/10 gba:text-primary">
          {employeeId.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="gba:flex-1">
        <p className="gba:text-xs gba:text-muted-foreground">{role}</p>
        <p className="gba:text-sm gba:font-medium">{employeeId}</p>
      </div>
      <div className="gba:flex gba:gap-1">
        <button className="gba:p-1.5 gba:rounded-md hover:gba:bg-background gba:transition-colors">
          <Mail className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
        </button>
        <button className="gba:p-1.5 gba:rounded-md hover:gba:bg-background gba:transition-colors">
          <Phone className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}

// Work location badge
const WorkLocationBadge: React.FC<{ location: string }> = ({ location }) => {
  const labels: Record<string, string> = {
    office: 'Office',
    remote: 'Remote',
    hybrid: 'Hybrid'
  }

  const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
    office: 'default',
    remote: 'secondary',
    hybrid: 'outline'
  }

  return <Badge variant={variants[location] || 'outline'}>{labels[location] || location}</Badge>
}

export const OnboardingDetailsPanel: React.FC<OnboardingDetailsPanelProps> = ({
  caseData,
  metadata,
  linkedFlows,
  context
}) => {
  const formattedStartDate = useMemo(() => {
    if (!metadata.startDate) return '-'
    return new Date(metadata.startDate).toLocaleDateString()
  }, [metadata.startDate])

  const activeFlows = linkedFlows.filter(flow => !flow.removedAt)
  const notes = metadata.notes || []
  const isCompletedFlow = (flow: LinkedFlow) => {
    const status = String(flow.status || flow.flowStatus || '').toUpperCase()
    return status === 'COMPLETED' || status === 'DONE' || status === 'FINISHED'
  }
  const getFlowProgress = (flow: LinkedFlow) => {
    if (isCompletedFlow(flow)) return 100
    if (typeof flow.progressPercentage === 'number') return flow.progressPercentage
    if (!flow.totalSteps) return 0
    return Math.round(((flow.completedSteps || 0) / flow.totalSteps) * 100)
  }

  const progressData = useMemo(() => {
    if (activeFlows.length === 0) {
      return {
        percentage: getStageProgress(metadata.onboardingStage),
        completed: 0,
        total: 0
      }
    }

    const totalSteps = activeFlows.reduce((sum, flow) => sum + (flow.totalSteps || 0), 0)
    const completedSteps = activeFlows.reduce((sum, flow) => sum + (flow.completedSteps || 0), 0)

    return {
      percentage:
        totalSteps > 0
          ? Math.round((completedSteps / totalSteps) * 100)
          : Math.round(activeFlows.reduce((sum, flow) => sum + getFlowProgress(flow), 0) / activeFlows.length),
      completed: totalSteps > 0 ? completedSteps : activeFlows.filter(isCompletedFlow).length,
      total: totalSteps > 0 ? totalSteps : activeFlows.length
    }
  }, [activeFlows, metadata.onboardingStage])

  return (
    <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:lg:grid-cols-12 gba:auto-rows-auto">
      <div className="gba:lg:col-span-8 gba:space-y-6">
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
          <Card>
            <CardHeader className="gba:pb-4">
              <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base">
                <FileText className="gba:h-4 gba:w-4" />
                Employee Information
              </CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-6">
              <div className="gba:grid gba:grid-cols-2 gba:gap-x-6 gba:gap-y-4">
                <InfoField label="Employee Name" value={metadata.employeeName} icon={User} />
                <InfoField label="Position" value={metadata.position} icon={Building2} />
                <InfoField label="Department" value={metadata.department} icon={Building2} />
                <InfoField label="Start Date" value={formattedStartDate} icon={Calendar} />
              </div>

              <div className="gba:grid gba:grid-cols-2 gba:gap-x-6">
                <div className="gba:space-y-1">
                  <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1.5">
                    <MapPin className="gba:h-3.5 gba:w-3.5" />
                    Work Location
                  </p>
                  <WorkLocationBadge location={metadata.workLocation} />
                </div>
                <div className="gba:space-y-1">
                  <p className="gba:text-xs gba:text-muted-foreground">Onboarding Stage</p>
                  <Badge variant="outline" className="gba:capitalize">
                    {onboardingStageLabels[metadata.onboardingStage] || metadata.onboardingStage}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gba:pb-4">
              <CardTitle className="gba:flex gba:items-center gba:justify-between gba:text-base">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Activity className="gba:h-4 gba:w-4" />
                  Onboarding Tasks
                </div>
                <Badge variant="outline">{activeFlows.length} flows</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeFlows.length === 0 ? (
                <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
                  <Activity className="gba:h-10 gba:w-10 gba:mx-auto gba:mb-3 gba:opacity-30" />
                  <p className="gba:text-sm gba:font-medium">No flows yet</p>
                  <p className="gba:text-xs gba:mt-1">Flows will appear here once added</p>
                </div>
              ) : (
                <div className="gba:space-y-4">
                  <div className="gba:space-y-2">
                    <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                      <span className="gba:text-muted-foreground">
                        {progressData.completed}/{progressData.total} tasks
                      </span>
                      <span className="gba:font-medium">{progressData.percentage}%</span>
                    </div>
                    <Progress value={progressData.percentage} className="gba:h-2" />
                  </div>

                  <div className="gba:space-y-3">
                    {activeFlows.slice(0, 3).map(flow => {
                      const totalSteps = flow.totalSteps || 0
                      const completedSteps = flow.completedSteps || 0
                      const flowProgress = getFlowProgress(flow)

                      return (
                        <div key={flow.workflowId} className="gba:space-y-1.5">
                          <div className="gba:flex gba:items-center gba:justify-between">
                            <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
                              <Activity className="gba:h-4 gba:w-4 gba:text-primary gba:shrink-0" />
                              <span className="gba:text-sm gba:truncate">
                                {flow.workflowName || flow.templateId || 'Unnamed Flow'}
                              </span>
                            </div>
                            <span className="gba:text-xs gba:text-muted-foreground gba:shrink-0 gba:ml-2">
                              {totalSteps > 0 ? `${completedSteps}/${totalSteps}` : `${flowProgress}%`}
                            </span>
                          </div>
                          <Progress value={flowProgress} className="gba:h-1.5" />
                        </div>
                      )
                    })}
                    {activeFlows.length > 3 && (
                      <p className="gba:text-xs gba:text-primary gba:text-center gba:pt-1">
                        +{activeFlows.length - 3} more flows
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="gba:pb-4">
            <CardTitle className="gba:text-base">Onboarding Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <OnboardingStageTracker currentStage={metadata.onboardingStage} startDate={metadata.startDate} />
          </CardContent>
        </Card>

        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
          <Card>
            <CardHeader className="gba:pb-4">
              <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base">
                <Monitor className="gba:h-4 gba:w-4" />
                Equipment & Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EquipmentChecklist requested={metadata.equipmentRequested} completed={metadata.equipmentCompleted} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gba:pb-4">
              <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base">
                <Users className="gba:h-4 gba:w-4" />
                Key Contacts
              </CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-3">
              <ContactCard role="Manager" employeeId={metadata.managerId} context={context} />
              <ContactCard role="Onboarding Buddy" employeeId={metadata.mentorId} context={context} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="gba:pb-4">
            <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base">
              <MessageSquare className="gba:h-4 gba:w-4" />
              Recent Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notes.length === 0 ? (
              <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
                <MessageSquare className="gba:h-10 gba:w-10 gba:mx-auto gba:mb-3 gba:opacity-30" />
                <p className="gba:text-sm gba:font-medium">No notes yet</p>
                <p className="gba:text-xs gba:mt-1">Notes will appear here once added</p>
              </div>
            ) : (
              <div className="gba:space-y-3">
                {notes.slice(0, 3).map(note => (
                  <div
                    key={note.id}
                    className="gba:flex gba:gap-3 gba:p-3 gba:rounded-lg gba:bg-muted/40 gba:border gba:border-border/50"
                  >
                    <Avatar className="gba:h-8 gba:w-8 gba:shrink-0">
                      <AvatarFallback className="gba:text-xs">
                        {note.createdBy.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="gba:flex-1 gba:min-w-0">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                        <span className="gba:text-sm gba:font-medium gba:truncate">{note.createdBy}</span>
                        <Badge variant="outline" className="gba:text-xs gba:capitalize">
                          {note.visibility}
                        </Badge>
                        <span className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1 gba:ml-auto">
                          <Clock className="gba:h-3 gba:w-3" />
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="gba:text-sm gba:text-muted-foreground gba:line-clamp-2">{note.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="gba:lg:col-span-4">
        <CaseActivityFeed caseId={caseData.caseId} context={context} maxItems={20} />
      </div>
    </div>
  )
}

export default OnboardingDetailsPanel
