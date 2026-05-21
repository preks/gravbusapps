/**
 * Onboarding Details Panel
 *
 * Custom details panel for onboarding cases showing employee-specific information.
 * Displays employee information, flow progress, and next onboarding steps.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Progress,
  Badge,
  Avatar,
  AvatarFallback,
  AvatarImage,
  useTranslation
} from '@newwork/nw-design-system'
import { Activity, Building2, Calendar, CheckCircle2, Clock, FileText, MapPin, User, Users } from 'lucide-react'
import { CaseActivityFeed } from '@/business-apps/common/apps/case-management/components/CaseActivityFeed'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { OnboardingDetailsPanelProps } from '../types'
import type { LinkedFlow } from '@/business-apps/common/apps/case-management/types'
import translations from '../_i18n'
import { formatOnboardingFlowStatusLabel } from '../utils/onboardingStatusLabels'

interface ParticipantEmployee {
  id: string
  userId: string
  firstName?: string
  lastName?: string
  fullName?: string
  displayName?: string
  preferredName?: string
  pictureThumbnail?: string
}

const GET_EMPLOYEES_BY_USER_IDS = `
  query GetEmployeesByUserIds($userIds: [String!]!) {
    Employee(where: { userId: { _in: $userIds } }) {
      id
      userId
      firstName
      lastName
      fullName
      displayName
      preferredName
      pictureThumbnail
    }
  }
`

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

const getProfileDisplayName = (employeeProfile: OnboardingDetailsPanelProps['employeeProfile'], fallbackName: string) =>
  employeeProfile?.displayName ||
  employeeProfile?.fullName ||
  employeeProfile?.preferredName ||
  [employeeProfile?.firstName, employeeProfile?.lastName].filter(Boolean).join(' ') ||
  fallbackName

const getParticipantDisplayName = (employee: ParticipantEmployee | undefined, fallbackUserId: string) =>
  employee?.displayName ||
  employee?.fullName ||
  employee?.preferredName ||
  [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') ||
  fallbackUserId

const getInitials = (name: string) =>
  name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

const getAvatarUrl = (pictureThumbnail: string | undefined) => {
  if (!pictureThumbnail) return undefined
  if (pictureThumbnail.startsWith('data:') || pictureThumbnail.startsWith('http')) return pictureThumbnail
  return `data:image/png;base64,${pictureThumbnail}`
}

// Work location badge
const WorkLocationBadge: React.FC<{ location: string }> = ({ location }) => {
  const { t } = useTranslation(translations)
  const labels: Record<string, string> = {
    office: t('hr-onboarding-create-location-office'),
    remote: t('hr-onboarding-create-location-remote'),
    hybrid: t('hr-onboarding-create-location-hybrid')
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
  context,
  employeeProfile,
  isLoadingEmployeeProfile
}) => {
  const { t } = useTranslation(translations)
  const graphqlClient = useGraphQLClient(context.accessToken)
  const [participantsByUserId, setParticipantsByUserId] = useState<Record<string, ParticipantEmployee>>({})
  const requestedParticipantUserIdsRef = useRef<Set<string>>(new Set())
  const formattedStartDate = useMemo(() => {
    if (!metadata.startDate) return '-'
    return new Date(metadata.startDate).toLocaleDateString()
  }, [metadata.startDate])
  const formatFlowStatusLabel = (status: string | undefined) => formatOnboardingFlowStatusLabel(status, t)
  const profileName = getProfileDisplayName(employeeProfile, metadata.employeeName)
  const profilePosition =
    employeeProfile?.employeePosition?.jobPosition?.name || metadata.jobPositionName || metadata.position
  const profileOrganization =
    employeeProfile?.employeePosition?.organizationalUnit?.name || metadata.organizationName || metadata.department
  const profileAvatarUrl = getAvatarUrl(employeeProfile?.pictureThumbnail)
  const profileSourceLabel = isLoadingEmployeeProfile
    ? t('hr-onboarding-details-loading-profile')
    : employeeProfile
      ? t('hr-onboarding-details-live-profile')
      : t('hr-onboarding-details-stored-snapshot')

  const activeFlows = linkedFlows.filter(flow => !flow.removedAt)
  const participantUserIds = useMemo(
    () => [...new Set(activeFlows.flatMap(flow => flow.participants || []).filter(Boolean))],
    [activeFlows]
  )
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
        percentage: 0,
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
  }, [activeFlows])

  const flowSummary = useMemo(() => {
    const completedFlows = activeFlows.filter(isCompletedFlow)
    const latestFlow = [...activeFlows].sort((left, right) => {
      const leftDate = new Date(left.startTime || left.addedAt || left.createdAt || 0).getTime()
      const rightDate = new Date(right.startTime || right.addedAt || right.createdAt || 0).getTime()
      return rightDate - leftDate
    })[0]

    return {
      completedFlows: completedFlows.length,
      activeFlowCount: activeFlows.length - completedFlows.length,
      participantCount: participantUserIds.length,
      latestFlow
    }
  }, [activeFlows, participantUserIds.length])

  useEffect(() => {
    const userIdsToLoad = participantUserIds.filter(
      userId => !participantsByUserId[userId] && !requestedParticipantUserIdsRef.current.has(userId)
    )

    if (userIdsToLoad.length === 0) return
    userIdsToLoad.forEach(userId => requestedParticipantUserIdsRef.current.add(userId))

    void graphqlClient
      .request<{ Employee: ParticipantEmployee[] }>(GET_EMPLOYEES_BY_USER_IDS, { userIds: userIdsToLoad })
      .then(response => {
        setParticipantsByUserId(previous => {
          const next = { ...previous }
          response.Employee.forEach(employee => {
            next[employee.userId] = employee
          })
          return next
        })
      })
      .catch(err => {
        console.error('Failed to load onboarding participants:', err)
      })
  }, [graphqlClient, participantUserIds, participantsByUserId])

  const nextSteps = useMemo(
    () =>
      activeFlows
        .flatMap(flow => {
          if (isCompletedFlow(flow)) return []

          const flowName = flow.workflowName || flow.templateId || t('hr-onboarding-common-unnamed-flow')
          const historyStep =
            flow.stepHistory?.find(step => step.status === 'current') ||
            flow.stepHistory?.find(step => step.status === 'pending')

          if (historyStep) {
            return [
              {
                id: `${flow.workflowId}-${historyStep.index}`,
                title: historyStep.name,
                flowName,
                status: historyStep.status,
                assignee: historyStep.assignee
              }
            ]
          }

          if (flow.currentStepName) {
            return [
              {
                id: `${flow.workflowId}-current`,
                title: flow.currentStepName,
                flowName,
                status: flow.currentStepStatus || 'current',
                assignee: flow.currentAssignee
              }
            ]
          }

          return [
            {
              id: `${flow.workflowId}-progress`,
              title: t('hr-onboarding-details-continue-flow'),
              flowName,
              status: getFlowProgress(flow) > 0 ? 'in progress' : 'not started',
              assignee: undefined
            }
          ]
        })
        .slice(0, 5),
    [activeFlows]
  )

  return (
    <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:lg:grid-cols-12 gba:auto-rows-auto">
      <div className="gba:lg:col-span-8 gba:space-y-6">
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
          <Card>
            <CardHeader className="gba:pb-4">
              <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base">
                <FileText className="gba:h-4 gba:w-4" />
                {t('hr-onboarding-details-employee-info')}
              </CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-6">
              <div className="gba:flex gba:items-center gba:gap-4 gba:rounded-lg gba:border gba:bg-muted/20 gba:p-4">
                <Avatar className="gba:h-14 gba:w-14 gba:shrink-0">
                  {profileAvatarUrl ? <AvatarImage src={profileAvatarUrl} alt={profileName} /> : null}
                  <AvatarFallback className="gba:text-base">{getInitials(profileName)}</AvatarFallback>
                </Avatar>
                <div className="gba:min-w-0 gba:flex-1">
                  <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                    <p className="gba:truncate gba:text-base gba:font-semibold">{profileName}</p>
                    <Badge variant="outline" className="gba:text-xs">
                      {profileSourceLabel}
                    </Badge>
                  </div>
                  <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">
                    {[profilePosition, profileOrganization].filter(value => value && value !== '-').join(' - ') ||
                      t('hr-onboarding-details-no-position')}
                  </p>
                </div>
              </div>

              <div className="gba:grid gba:grid-cols-2 gba:gap-x-6 gba:gap-y-4">
                <InfoField label={t('hr-onboarding-create-employee-name')} value={metadata.employeeName} icon={User} />
                <InfoField label={t('hr-onboarding-common-position')} value={metadata.position} icon={Building2} />
                <InfoField label={t('hr-onboarding-common-department')} value={metadata.department} icon={Building2} />
                <InfoField label={t('hr-onboarding-common-start-date')} value={formattedStartDate} icon={Calendar} />
              </div>

              <div className="gba:grid gba:grid-cols-2 gba:gap-x-6">
                <div className="gba:space-y-1">
                  <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1.5">
                    <MapPin className="gba:h-3.5 gba:w-3.5" />
                    {t('hr-onboarding-common-work-location')}
                  </p>
                  <WorkLocationBadge location={metadata.workLocation} />
                </div>
                <div className="gba:space-y-1">
                  <p className="gba:text-xs gba:text-muted-foreground">{t('hr-onboarding-common-case-status')}</p>
                  <Badge variant="outline" className="gba:capitalize">
                    {metadata.status || 'open'}
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
                  {t('hr-onboarding-details-onboarding-steps')}
                </div>
                <Badge variant="outline">{activeFlows.length} flows</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeFlows.length === 0 ? (
                <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
                  <Activity className="gba:h-10 gba:w-10 gba:mx-auto gba:mb-3 gba:opacity-30" />
                  <p className="gba:text-sm gba:font-medium">{t('hr-onboarding-details-no-flows')}</p>
                  <p className="gba:text-xs gba:mt-1">{t('hr-onboarding-details-no-flows-description')}</p>
                </div>
              ) : (
                <div className="gba:space-y-4">
                  <div className="gba:space-y-2">
                    <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                      <span className="gba:text-muted-foreground">
                        {t('hr-onboarding-details-step-count', {
                          completed: progressData.completed,
                          total: progressData.total
                        })}
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
                                {flow.workflowName || flow.templateId || t('hr-onboarding-common-unnamed-flow')}
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
            <CardTitle className="gba:text-base">{t('hr-onboarding-details-progress')}</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-4">
            <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
              <span className="gba:text-muted-foreground">{t('hr-onboarding-details-flow-progress')}</span>
              <span className="gba:font-medium">{progressData.percentage}%</span>
            </div>
            <Progress value={progressData.percentage} className="gba:h-2" />
            <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2 gba:text-xs gba:text-muted-foreground">
              <span>
                {t('hr-onboarding-details-steps-completed', {
                  completed: progressData.completed,
                  total: progressData.total
                })}
              </span>
              <span>
                {t('hr-onboarding-common-first-working-day')}: {formattedStartDate}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
          <Card>
            <CardHeader className="gba:pb-4">
              <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base">
                <Activity className="gba:h-4 gba:w-4" />
                {t('hr-onboarding-details-flow-summary')}
              </CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-4">
              <div className="gba:grid gba:grid-cols-3 gba:gap-3">
                <div className="gba:rounded-lg gba:bg-muted/40 gba:p-3">
                  <p className="gba:text-xs gba:text-muted-foreground">{t('hr-onboarding-details-active')}</p>
                  <p className="gba:mt-1 gba:text-lg gba:font-semibold">{flowSummary.activeFlowCount}</p>
                </div>
                <div className="gba:rounded-lg gba:bg-muted/40 gba:p-3">
                  <p className="gba:text-xs gba:text-muted-foreground">{t('hr-onboarding-common-completed')}</p>
                  <p className="gba:mt-1 gba:text-lg gba:font-semibold">{flowSummary.completedFlows}</p>
                </div>
                <div className="gba:rounded-lg gba:bg-muted/40 gba:p-3">
                  <p className="gba:text-xs gba:text-muted-foreground">{t('hr-onboarding-details-people')}</p>
                  <p className="gba:mt-1 gba:text-lg gba:font-semibold">{flowSummary.participantCount}</p>
                </div>
              </div>

              <div className="gba:rounded-lg gba:border gba:bg-muted/20 gba:p-3">
                <p className="gba:text-xs gba:text-muted-foreground">
                  {t('hr-onboarding-details-latest-started-flow')}
                </p>
                <p className="gba:mt-1 gba:truncate gba:text-sm gba:font-medium">
                  {flowSummary.latestFlow?.workflowName ||
                    flowSummary.latestFlow?.templateId ||
                    t('hr-onboarding-details-no-flows-started')}
                </p>
                {flowSummary.latestFlow?.addedAt ? (
                  <p className="gba:mt-1 gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
                    <Clock className="gba:h-3 gba:w-3" />
                    {new Date(flowSummary.latestFlow.addedAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gba:pb-4">
              <CardTitle className="gba:flex gba:items-center gba:justify-between gba:text-base">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <CheckCircle2 className="gba:h-4 gba:w-4" />
                  {t('hr-onboarding-details-next-steps')}
                </div>
                <Badge variant="outline">{nextSteps.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextSteps.length === 0 ? (
                <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
                  <CheckCircle2 className="gba:h-10 gba:w-10 gba:mx-auto gba:mb-3 gba:opacity-30" />
                  <p className="gba:text-sm gba:font-medium">{t('hr-onboarding-details-no-open-steps')}</p>
                  <p className="gba:text-xs gba:mt-1">{t('hr-onboarding-details-no-open-steps-description')}</p>
                </div>
              ) : (
                <div className="gba:space-y-3">
                  {nextSteps.map(step => (
                    <div key={step.id} className="gba:rounded-lg gba:border gba:bg-muted/20 gba:p-3">
                      <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
                        <div className="gba:min-w-0">
                          <p className="gba:truncate gba:text-sm gba:font-medium">{step.title}</p>
                          <p className="gba:mt-1 gba:truncate gba:text-xs gba:text-muted-foreground">{step.flowName}</p>
                        </div>
                        <Badge variant="outline" className="gba:shrink-0 gba:capitalize">
                          {formatFlowStatusLabel(step.status)}
                        </Badge>
                      </div>
                      {step.assignee ? (
                        <p className="gba:mt-2 gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
                          <Users className="gba:h-3 gba:w-3" />
                          {t('hr-onboarding-details-assigned-to', { assignee: step.assignee })}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="gba:pb-4">
            <CardTitle className="gba:flex gba:items-center gba:justify-between gba:text-base">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Users className="gba:h-4 gba:w-4" />
                {t('hr-onboarding-details-onboarding-participants')}
              </div>
              <Badge variant="outline">{flowSummary.participantCount}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {flowSummary.participantCount === 0 ? (
              <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
                <Users className="gba:h-10 gba:w-10 gba:mx-auto gba:mb-3 gba:opacity-30" />
                <p className="gba:text-sm gba:font-medium">{t('hr-onboarding-details-no-participants')}</p>
                <p className="gba:text-xs gba:mt-1">{t('hr-onboarding-details-no-participants-description')}</p>
              </div>
            ) : (
              <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:md:grid-cols-2">
                {participantUserIds.map(userId => {
                  const participant = participantsByUserId[userId]
                  const participantName = getParticipantDisplayName(participant, userId)
                  const participantAvatarUrl = getAvatarUrl(participant?.pictureThumbnail)

                  return (
                    <div
                      key={userId}
                      className="gba:flex gba:items-center gba:gap-3 gba:rounded-lg gba:bg-muted/40 gba:p-3"
                    >
                      <Avatar className="gba:h-9 gba:w-9 gba:shrink-0">
                        {participantAvatarUrl ? <AvatarImage src={participantAvatarUrl} alt={participantName} /> : null}
                        <AvatarFallback className="gba:text-xs">{getInitials(participantName)}</AvatarFallback>
                      </Avatar>
                      <div className="gba:min-w-0">
                        <p className="gba:truncate gba:text-sm gba:font-medium">{participantName}</p>
                        <p className="gba:truncate gba:text-xs gba:text-muted-foreground">
                          {participant ? t('hr-onboarding-details-flow-participant') : userId}
                        </p>
                      </div>
                    </div>
                  )
                })}
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
