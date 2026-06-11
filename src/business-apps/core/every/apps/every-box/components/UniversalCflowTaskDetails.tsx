import React, { useState, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Label,
  Switch,
  Textarea,
  Alert,
  AlertDescription,
  AlertTitle,
  Avatar,
  AvatarImage,
  AvatarFallback,
  useTranslation,
  useLocale,
  toast
} from '@newwork/nw-design-system'
import {
  ChevronDown,
  ChevronUp,
  Clock,
  MessageSquare,
  Info,
  ExternalLink,
  Link as LinkIcon,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Sparkles,
  Eye
} from 'lucide-react'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import isToday from 'dayjs/plugin/isToday'
import isYesterday from 'dayjs/plugin/isYesterday'
import 'dayjs/locale/de'
import 'dayjs/locale/en'
import 'dayjs/locale/ro'
import 'dayjs/locale/fr'
import 'dayjs/locale/es'
import 'dayjs/locale/it'
import type { UserInfoProps } from '@/common/BusinessAppContext'
import { UnifiedTask } from '../types'
import { getCflowEndpoint } from '../../every-api/utils/config'
import { handleDocumentClick } from '@/common/utils/documentClickHandler'
import { TaskDetailHeader } from './TaskDetailHeader'
import { TaskDetailFooter } from './TaskDetailFooter'
import { useEmployeeAvatar } from '../hooks/useEmployeeAvatar'
import { useEmployeeAvatarsBatch } from '../hooks/useEmployeeAvatarsBatch'
import { useMeetingParticipants } from '../hooks/useMeetingParticipants'
import { InputRenderer } from '@/common/components/flow/flow-execution/InputRenderer'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { MarkdownRenderer } from '@/business-apps/ai/forms/scheduled-task-result/components/MarkdownRenderer'
import { calculateDueDateCriticality, getCriticalityBadgeVariant } from '../utils/dueDateUtils'
import { getInitials } from '../utils/avatarUtils'
import { uploadFilesForTaskCompletion } from '../utils/taskFileUpload'
import { officeClient } from '@/common/network/office/OfficeClient'
import { DocumentApprovalReviewDialog } from '@/business-apps/core/office/apps/documents/components'
import { TaskAiSection } from './TaskAiSection'
import { AiToolbar } from './AiToolbar'
import { useAiAssistant, useAiCapabilities } from '../hooks/useAi'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import {
  filterFormFieldsForDocumentApproval,
  isAnyDocumentApprovalTask,
  isDocumentApprovalOutcomeTask,
  isDocumentApprovalTask as isDocumentApprovalTaskRecord,
  resolveDocumentApprovalDecision,
  resolveDocumentApprovalRequestId
} from './documentApprovalCflowUi'
import translations from '../_i18n'

dayjs.extend(localizedFormat)
dayjs.extend(isToday)
dayjs.extend(isYesterday)
import GlossaryEntryTaskForm from '@/business-apps/core/content/forms/glossary-entry-task-form'
import LearningQuizTaskForm from '@/business-apps/hr/core/apps/learning/forms/learning-quiz-task-form'

/** Number of participants to show before collapsing the list (expand to see more). */
const MEETING_PARTICIPANTS_COLLAPSE_THRESHOLD = 10

/**
 * Parses a document link URL and returns the download path, original file name, and MIME type
 */
interface ResolvedDocFile {
  key: string
  displayName: string
  downloadPath: string
  mimeType?: string
  fallbackHref: string | undefined
}

/**
 * Parse a document link URL into one or more resolved file entries.
 *
 * Supports three formats:
 * 1. Plain HTTP URL — returned as-is, browser handles navigation.
 * 2. JSON array  — [{downloadPath, fileName, mimeType, fileId, ...}] produced by uploadFilesForTaskCompletion.
 * 3. JSON object — {path, fileMetadata: {originalFileName, mimeType}} produced by the flow-launcher file service.
 */
const parseDocumentLinkFiles = (url: string, linkName: string): ResolvedDocFile[] => {
  if (!url) return []

  if (url.startsWith('http') || url.startsWith('/')) {
    return [{ key: url, displayName: linkName, downloadPath: url, mimeType: undefined, fallbackHref: url }]
  }

  try {
    const parsed: unknown = JSON.parse(url)

    if (Array.isArray(parsed)) {
      return parsed
        .filter(
          (item): item is { downloadPath: string; fileName?: string; mimeType?: string; fileId?: string } =>
            typeof (item as Record<string, unknown>)?.downloadPath === 'string'
        )
        .map((item, i) => {
          const displayName = item.fileName || linkName
          const fallbackHref = `/files${item.downloadPath.startsWith('/') ? item.downloadPath : `/${item.downloadPath}`}`
          return {
            key: item.fileId ?? `${url}-${i}`,
            displayName,
            downloadPath: item.downloadPath,
            mimeType: item.mimeType,
            fallbackHref
          }
        })
    }

    const obj = parsed as { path?: string; fileMetadata?: { originalFileName?: string; mimeType?: string } }
    if (typeof obj.path === 'string') {
      const displayName = obj.fileMetadata?.originalFileName || linkName
      const fallbackHref = `/files${obj.path.startsWith('/') ? obj.path : `/${obj.path}`}`
      return [{ key: url, displayName, downloadPath: obj.path, mimeType: obj.fileMetadata?.mimeType, fallbackHref }]
    }

    return []
  } catch {
    return []
  }
}

/** Match both legacy `document:*` prefix and the newer uppercase `DOCUMENT` type from cFlow. */
const isDocumentTypeLink = (link: { type?: string }): boolean =>
  !!link.type && (link.type.startsWith('document:') || link.type.toUpperCase() === 'DOCUMENT')

/**
 * Converts a picture thumbnail to a data URL format
 */
const formatAvatarUrl = (pictureThumbnail: string | undefined): string | undefined => {
  if (!pictureThumbnail) return undefined
  if (pictureThumbnail.startsWith('data:')) return pictureThumbnail
  return `data:image/jpeg;base64,${pictureThumbnail}`
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

/**
 * Gets the display value for a form field during loading or with data
 */
const getFieldDisplayValue = (isLoadingData: boolean, fieldValue: any, inputValue: any, defaultValue: any): any => {
  if (isLoadingData) return ''
  if (fieldValue !== undefined) return fieldValue
  if (inputValue !== undefined) return inputValue
  return defaultValue || ''
}

function getMeetingStatusBadgeVariant(status: string | undefined): 'success' | 'destructive' | 'warning' | 'secondary' {
  if (status === 'accepted') return 'success'
  if (status === 'declined') return 'destructive'
  if (status === 'tentative') return 'warning'
  return 'secondary'
}

/**
 * Returns true if content is only a redundant "Complete Meeting Invitation:" title line
 * (no real body). Uses string operations only to avoid ReDoS.
 */
function isRedundantMeetingTitleContent(content: string): boolean {
  const s = content.trim()
  if (!s) return false
  let rest = s
  rest = rest.replace(/^\s+/, '')
  if (rest.startsWith('**')) rest = rest.slice(2).trimStart()
  if (!rest.startsWith('Complete Meeting Invitation:')) return false
  rest = rest.slice('Complete Meeting Invitation:'.length).trim()
  if (rest.startsWith('**')) rest = rest.slice(2).trim()
  return rest === ''
}

interface MeetingParticipantDisplay {
  userId: string
  displayName: string
  status?: string
  isOrganizer: boolean
}

type TranslationFn = (key: string, opts?: Record<string, unknown>) => string
type TaskDisplayLink = { name: string; url: string; type?: string; metadata?: any }

interface MeetingParticipantRowProps {
  participant: MeetingParticipantDisplay
  idx: number
  employeeMap: Map<
    string,
    { id?: string; avatarUrl?: string; pictureThumbnail?: string; firstName?: string; lastName?: string }
  >
  formatAvatarUrl: (pictureThumbnail: string | undefined) => string | undefined
  getInitials: (firstName: string, lastName: string) => string
  t: (key: string, opts?: { defaultValue?: string; count?: number }) => string
  navigateTo: (url: string) => void
  buildPlatformUrl: (path: string, params: { employeeId: string }) => string
  hasStatus: boolean
}

function MeetingParticipantRow({
  participant: p,
  idx,
  employeeMap,
  formatAvatarUrl,
  getInitials,
  t,
  navigateTo,
  buildPlatformUrl,
  hasStatus
}: MeetingParticipantRowProps): React.ReactElement {
  const isLegacy = p.userId.startsWith('legacy-')
  const emp = isLegacy ? null : employeeMap.get(p.userId)
  const employeeId = emp?.id
  const avatarUrl = emp?.avatarUrl ?? formatAvatarUrl(emp?.pictureThumbnail)
  const parts = p.displayName.trim().split(/\s+/)
  let initials: string
  if (emp && (emp.firstName || emp.lastName)) {
    initials = getInitials(emp.firstName ?? '', emp.lastName ?? '')
  } else if (parts.length >= 2) {
    initials = getInitials(parts[0], parts.slice(1).join(' '))
  } else {
    initials = parts[0]?.slice(0, 2).toUpperCase() || '?'
  }
  const statusKey = p.status ? `task-details-meeting-status-${p.status}` : null
  const statusLabel = statusKey ? t(statusKey, { defaultValue: p.status }) : null
  return (
    <li key={p.userId || idx} className="gba:flex gba:items-center gba:gap-2 gba:flex-shrink-0">
      {employeeId ? (
        <button
          type="button"
          onClick={() => navigateTo(buildPlatformUrl('/platform/employee-record', { employeeId }))}
          className="gba:flex gba:items-center gba:justify-center gba:rounded-full gba:ring-2 gba:ring-transparent hover:gba:ring-primary focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-primary"
          aria-label={t('task-details-meeting-participant-view-profile', { defaultValue: 'View profile' })}
          data-testid={`task-details-meeting-participant-avatar-${idx}`}
        >
          <Avatar className="gba:h-8 gba:w-8">
            <AvatarImage src={avatarUrl} alt={p.displayName} />
            <AvatarFallback className="gba:text-xs">{initials}</AvatarFallback>
          </Avatar>
        </button>
      ) : (
        <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0">
          <AvatarImage src={avatarUrl} alt={p.displayName} />
          <AvatarFallback className="gba:text-xs">{initials}</AvatarFallback>
        </Avatar>
      )}
      <span className="gba:flex gba:items-center gba:gap-2">
        {p.displayName}
        {p.isOrganizer && (
          <span className="gba:text-muted-foreground gba:font-normal">
            ({t('task-details-meeting-organiser', { defaultValue: 'Organiser' })})
          </span>
        )}
        {hasStatus && statusLabel && (
          <Badge variant={getMeetingStatusBadgeVariant(p.status)} className="gba:text-xs">
            {statusLabel}
          </Badge>
        )}
      </span>
    </li>
  )
}

interface TaskDueDateInfoProps {
  dueDate?: string | Date
  t: TranslationFn
  formatDateTime: (date: string | Date) => string
}

function TaskDueDateInfo({ dueDate, t, formatDateTime }: Readonly<TaskDueDateInfoProps>): React.ReactElement | null {
  if (!dueDate) return null
  const criticality = calculateDueDateCriticality(dueDate, t)
  if (!criticality) return null

  let Icon = CheckCircle
  if (criticality.status === 'overdue') Icon = AlertCircle
  else if (criticality.status === 'warning') Icon = Clock

  let criticalityClass = 'gba:text-success'
  if (criticality.status === 'overdue') criticalityClass = 'gba:text-destructive'
  else if (criticality.status === 'warning') criticalityClass = 'gba:text-warning'

  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      <Icon className={`gba:w-4 gba:h-4 ${criticalityClass}`} />
      <span className="gba:text-sm gba:font-medium gba:text-foreground">{t('task-due-date-label')}:</span>
      <span className="gba:text-sm gba:text-muted-foreground">{formatDateTime(dueDate)}</span>
      <Badge variant={getCriticalityBadgeVariant(criticality.status)}>{criticality.label}</Badge>
    </div>
  )
}

interface MeetingInviteBodyProps {
  tags?: Record<string, any>
  t: TranslationFn
}

function MeetingInviteBody({ tags, t }: Readonly<MeetingInviteBodyProps>): React.ReactElement | null {
  if (tags?.app !== 'meeting-invite' || (!tags.meetingDateStr && !tags.meetingTimeStr)) return null

  return (
    <div
      className="gba:space-y-4 gba:pb-4 gba:border-b gba:border-border"
      data-testid="task-details-meeting-invite-body"
    >
      <div className="gba:flex gba:flex-col gba:gap-2 gba:text-sm">
        {tags.meetingDateStr && (
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-foreground">
            <Calendar className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:flex-shrink-0" />
            <span>{tags.meetingDateStr}</span>
          </div>
        )}
        {tags.meetingTimeStr && (
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-foreground">
            <Clock className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:flex-shrink-0" />
            <span>{tags.meetingTimeStr}</span>
          </div>
        )}
      </div>
      <p className="gba:text-sm gba:text-muted-foreground">
        {t('task-details-meeting-please-respond', { defaultValue: 'Please respond to this invitation.' })}
      </p>
      {tags.transcriptionEnabled === 'true' && (
        <div
          className="gba:flex gba:items-center gba:gap-2 gba:mt-4 gba:pt-4 gba:border-t gba:border-border"
          data-testid="task-details-meeting-recording-notice"
        >
          <span
            className="gba:inline-block gba:w-2 gba:h-2 gba:rounded-full gba:bg-destructive gba:animate-pulse gba:flex-shrink-0"
            aria-hidden
          />
          <p className="gba:text-xs gba:text-muted-foreground gba:italic">
            {t('task-details-meeting-recording-notice', {
              defaultValue: 'Recording and transcription. By joining, you consent to being included.'
            })}
          </p>
        </div>
      )}
    </div>
  )
}

interface RelatedLinksSectionProps {
  links: TaskDisplayLink[]
  title: string
}

function RelatedLinksSection({ links, title }: Readonly<RelatedLinksSectionProps>): React.ReactElement | null {
  if (links.length === 0) return null

  return (
    <div className="gba:border gba:rounded-lg gba:p-4 gba:bg-muted/30">
      <div className="gba:text-xs gba:text-muted-foreground gba:mb-3 gba:font-medium">{title}</div>
      <div className="gba:space-y-2">
        {links.map(link => {
          const isInternalLink = link.type?.startsWith('internal:')
          return (
            <a
              key={link.url || link.name}
              href={link.url}
              onClick={e => {
                if (isInternalLink) {
                  e.preventDefault()
                  navigateTo(link.url)
                }
              }}
              target={isInternalLink ? undefined : '_blank'}
              rel={isInternalLink ? undefined : 'noopener noreferrer'}
              className="gba:flex gba:items-center gba:gap-3 gba:p-2 gba:-mx-2 gba:rounded-md hover:gba:bg-accent gba:transition-colors gba:no-underline gba:group"
              data-testid={`task-other-link-${link.name}`}
            >
              <LinkIcon className="gba:h-4 gba:w-4 gba:text-primary gba:shrink-0" />
              <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate gba:flex-1 group-hover:gba:underline">
                {link.name}
              </span>
              <ExternalLink className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:shrink-0" />
            </a>
          )
        })}
      </div>
    </div>
  )
}

interface MeetingParticipantsSectionProps {
  isMeetingInvite: boolean
  loading: boolean
  meetingId?: string
  participants?: MeetingParticipantDisplay[]
  participantsExpanded: boolean
  setParticipantsExpanded: React.Dispatch<React.SetStateAction<boolean>>
  employeeMap: MeetingParticipantRowProps['employeeMap']
  t: TranslationFn
}

function MeetingParticipantsSection({
  isMeetingInvite,
  loading,
  meetingId,
  participants,
  participantsExpanded,
  setParticipantsExpanded,
  employeeMap,
  t
}: Readonly<MeetingParticipantsSectionProps>): React.ReactElement | null {
  if (!isMeetingInvite) return null

  if (loading && meetingId) {
    return (
      <div
        className="gba:border gba:rounded-lg gba:p-4 gba:bg-muted/30"
        data-testid="task-details-meeting-participants"
      >
        <div className="gba:text-xs gba:text-muted-foreground gba:mb-2 gba:font-medium">
          {t('task-details-meeting-participants', { defaultValue: 'Participants' })}
        </div>
        <p className="gba:text-sm gba:text-muted-foreground">
          {t('task-details-form-loading', { defaultValue: 'Loading...' })}
        </p>
      </div>
    )
  }

  if (!participants || participants.length === 0) return null

  const hasStatus = participants.some(participant => participant.status != null)
  const showCollapse = participants.length > MEETING_PARTICIPANTS_COLLAPSE_THRESHOLD
  const visibleList =
    showCollapse && !participantsExpanded
      ? participants.slice(0, MEETING_PARTICIPANTS_COLLAPSE_THRESHOLD)
      : participants
  const hiddenCount = participants.length - MEETING_PARTICIPANTS_COLLAPSE_THRESHOLD

  return (
    <div className="gba:border gba:rounded-lg gba:p-4 gba:bg-muted/30" data-testid="task-details-meeting-participants">
      <div className="gba:text-xs gba:text-muted-foreground gba:mb-2 gba:font-medium">
        {t('task-details-meeting-participants-with-count', {
          count: participants.length,
          defaultValue: `Participants (${participants.length})`
        })}
      </div>
      <ul className="gba:flex gba:flex-wrap gba:items-center gba:gap-x-4 gba:gap-y-2 gba:text-sm gba:text-foreground">
        {visibleList.map((participant, idx) => (
          <MeetingParticipantRow
            key={participant.userId || idx}
            participant={participant}
            idx={idx}
            employeeMap={employeeMap}
            formatAvatarUrl={formatAvatarUrl}
            getInitials={getInitials}
            t={t}
            navigateTo={navigateTo}
            buildPlatformUrl={buildPlatformUrl}
            hasStatus={hasStatus}
          />
        ))}
      </ul>
      {showCollapse && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setParticipantsExpanded(prev => !prev)}
          className="gba:mt-2 gba:text-muted-foreground hover:gba:text-foreground"
          data-testid="task-details-meeting-participants-toggle"
        >
          {participantsExpanded ? (
            <>
              <ChevronUp className="gba:h-4 gba:w-4 gba:mr-1" />
              {t('task-details-meeting-participants-show-less', { defaultValue: 'Show less' })}
            </>
          ) : (
            <>
              <ChevronDown className="gba:h-4 gba:w-4 gba:mr-1" />
              {t('task-details-meeting-participants-show-more', {
                defaultValue: 'Show {{count}} more',
                count: hiddenCount
              })}
            </>
          )}
        </Button>
      )}
    </div>
  )
}

interface TaskFormCardProps {
  visibleTaskForm: any[]
  fieldErrors: Record<string, string>
  setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  formValues: Record<string, any>
  setFormValues: React.Dispatch<React.SetStateAction<Record<string, any>>>
  formInitialized: boolean
  isCompleted: boolean
  t: TranslationFn
}

function TaskFormCard({
  visibleTaskForm,
  fieldErrors,
  setFieldErrors,
  formValues,
  setFormValues,
  formInitialized,
  isCompleted,
  t
}: Readonly<TaskFormCardProps>): React.ReactElement | null {
  if (visibleTaskForm.length === 0) return null

  return (
    <Card>
      <CardContent>
        {Object.keys(fieldErrors).length > 0 && (
          <Alert variant="destructive" className="gba:mb-4">
            <AlertTitle>{t('task-details-validation-error-title', { defaultValue: 'Validation Error' })}</AlertTitle>
            <AlertDescription>
              <ul className="gba:list-disc gba:list-inside gba:space-y-1">
                {Object.entries(fieldErrors).map(([fieldName, error]) => (
                  <li key={fieldName}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="gba:space-y-4">
          {visibleTaskForm.map((input: any, index: number) => {
            const fieldName = input.name || input.id || `field_${index}`
            const fieldValue = formValues[fieldName]
            const fieldError = fieldErrors[fieldName]
            const isLoadingData = !formInitialized
            const displayValue = getFieldDisplayValue(isLoadingData, fieldValue, input.value, input.defaultValue)
            const isFieldReadOnly = isLoadingData || isCompleted || input.readOnly === true

            return (
              <div key={fieldName}>
                <InputRenderer
                  input={input}
                  index={index}
                  readOnly={isFieldReadOnly}
                  value={displayValue}
                  onChange={value => {
                    if (isFieldReadOnly) return
                    if (fieldError) {
                      setFieldErrors(prev => {
                        const next = { ...prev }
                        delete next[fieldName]
                        return next
                      })
                    }
                    setFormValues(prev => ({ ...prev, [fieldName]: value }))
                  }}
                />
                {fieldError && <p className="gba:text-sm gba:text-destructive gba:mt-1">{fieldError}</p>}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Convert single newlines to markdown hard breaks (two trailing spaces + newline)
 * so they render as visible line breaks. Double newlines (paragraph breaks) and
 * newlines inside fenced code blocks are left untouched.
 */
function preserveNewlines(text: string): string {
  const codeBlocks: string[] = []
  let processed = text.replace(/```[\s\S]*?```/g, match => {
    codeBlocks.push(match)
    return `\u0000CB${codeBlocks.length - 1}\u0000`
  })
  // Turn single \n (not already preceded by two spaces) into a hard break.
  // Skip double newlines — those are paragraph separators and already work.
  processed = processed.replace(/(?<! {2})\n(?!\n)/g, '  \n')
  return processed.replace(/\u0000CB(\d+)\u0000/g, (_, i) => codeBlocks[Number(i)] ?? '')
}

/**
 * Renders task message/description as Markdown so authored formatting
 * (newlines, lists, bold, links, etc.) is preserved across every task type.
 * Returns null when meeting-invite content is only the redundant "Complete Meeting Invitation:" title.
 */
function renderTaskMessageContent(task: UnifiedTask, accessToken: string): React.ReactNode {
  const content = (task.message || task.description || '').trim()
  if (!content) return null
  const isRedundantMeetingTitle = task.tags?.app === 'meeting-invite' && isRedundantMeetingTitleContent(content)
  if (isRedundantMeetingTitle) return null
  return (
    <div className="gba:text-base gba:leading-relaxed gba:text-muted-foreground">
      <MarkdownRenderer content={preserveNewlines(content)} accessToken={accessToken} />
    </div>
  )
}

interface UniversalCflowTaskDetailsProps {
  task: UnifiedTask
  accessToken: string
  userId?: string
  onClose: () => void
  onTaskCompleted?: (taskId: string) => void
  onTaskUpdated: () => void
  flowStepData?: any // Additional data from flow-engine API /flows/{flowId}/steps/{stepNo}/data
  isLoadingFlowData?: boolean
}

export const UniversalCflowTaskDetails: React.FC<UniversalCflowTaskDetailsProps> = ({
  task,
  accessToken,
  userId,
  onClose,
  onTaskCompleted,
  onTaskUpdated,
  flowStepData,
  isLoadingFlowData = false
}) => {
  const { t } = useTranslation(translations)
  const { locale } = useLocale()
  const [formValues, setFormValues] = useState<Record<string, any>>({})
  const [isCompleting, setIsCompleting] = useState(false)
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [formInitialized, setFormInitialized] = useState(false)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [aiUsedForComment, setAiUsedForComment] = useState(false)
  const [participantsExpanded, setParticipantsExpanded] = useState(false)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const allLinks = (task.links as Array<{ name: string; url: string; type?: string; metadata?: any }>) || []
  const sourceMetadataRecord = asRecord(task.sourceMetadata)
  const entityLink = allLinks.find(link => link.type?.startsWith('entity:'))
  const documentApprovalRequestId = resolveDocumentApprovalRequestId(task, entityLink)
  const isCurrentDocumentApprovalTask = isDocumentApprovalTaskRecord(task, entityLink)
  const isCurrentDocumentApprovalOutcomeTask = isDocumentApprovalOutcomeTask(task, entityLink)
  const isAnyCurrentDocumentApprovalTask = isAnyDocumentApprovalTask(task, entityLink)
  const documentApprovalOutcomeDecision = resolveDocumentApprovalDecision(task, entityLink)
  const visibleTaskForm = React.useMemo(() => filterFormFieldsForDocumentApproval(task, entityLink), [task, entityLink])

  // AI feature check
  const aiFeature = useFeature(Feature.EveryBox.AiEnabled.Key)
  const isAiFeatureEnabled = aiFeature === true || aiFeature === 'true' || aiFeature === undefined
  const { capabilities } = useAiCapabilities(accessToken)
  const isAiAvailable = isAiFeatureEnabled && capabilities?.aiEnabled

  // AI Assistant hook for comment editing
  const {
    suggestedReply,
    isLoading: isAiLoading,
    error: aiError,
    lastAction,
    getSuggestedReply,
    improve,
    changeTone,
    expand,
    shorten,
    applyCustom,
    saveCommunication,
    clearSuggestion
  } = useAiAssistant(task.id, task.source, accessToken)

  // Handle AI suggestion applied to comment
  const handleAiResultApplied = useCallback(
    (result: string) => {
      setComment(result)
      setAiUsedForComment(true)
      clearSuggestion()
    },
    [clearSuggestion]
  )

  // AI toolbar handlers
  const handleAiSuggest = useCallback(async () => {
    const result = await getSuggestedReply(task.sourceMetadata?.creatorUserId)
    if (result) {
      handleAiResultApplied(result)
      toast.success(t('ai-assistant-applied'))
    }
  }, [getSuggestedReply, task.sourceMetadata?.creatorUserId, handleAiResultApplied, t])

  const handleAiImprove = useCallback(
    async (text: string) => {
      const result = await improve(text)
      if (result) {
        handleAiResultApplied(result)
        toast.success(t('ai-assistant-applied'))
      }
    },
    [improve, handleAiResultApplied, t]
  )

  const handleAiTone = useCallback(
    async (text: string, tone: 'formal' | 'casual' | 'friendly' | 'professional' | 'concise') => {
      const result = await changeTone(text, tone)
      if (result) {
        handleAiResultApplied(result)
        toast.success(t('ai-assistant-applied'))
      }
    },
    [changeTone, handleAiResultApplied, t]
  )

  const handleAiExpand = useCallback(
    async (text: string) => {
      const result = await expand(text)
      if (result) {
        handleAiResultApplied(result)
        toast.success(t('ai-assistant-applied'))
      }
    },
    [expand, handleAiResultApplied, t]
  )

  const handleAiShorten = useCallback(
    async (text: string) => {
      const result = await shorten(text)
      if (result) {
        handleAiResultApplied(result)
        toast.success(t('ai-assistant-applied'))
      }
    },
    [shorten, handleAiResultApplied, t]
  )

  const handleAiCustom = useCallback(
    async (instruction: string, text?: string) => {
      const result = await applyCustom(instruction, text)
      if (result) {
        handleAiResultApplied(result)
        toast.success(t('ai-assistant-applied'))
      }
    },
    [applyCustom, handleAiResultApplied, t]
  )

  // Format date with Today/Yesterday support
  const formatDateTime = (date: string | Date): string => {
    const d = dayjs(date)
    const baseLocale = locale?.split('-')[0]?.toLowerCase() || 'en'
    const time = d.locale(baseLocale).format('LT')

    if (d.isToday()) {
      return `${t('formatter-today')}, ${time}`
    }
    if (d.isYesterday()) {
      return `${t('formatter-yesterday')}, ${time}`
    }

    return d.locale(baseLocale).format('L LT')
  }

  // Derive isCompleted FIRST before using it
  const isCompleted = task.status === 'COMPLETED'

  // Determine task type (approval, acknowledge, or regular)
  const isApprovalTask = task.availableActions?.canReject === true
  const isAcknowledgeTask = task.name?.toLowerCase().includes('acknowledge')
  const requiresRejectionComment = Boolean(isCurrentDocumentApprovalTask && isApprovalTask)

  const canShowDocumentReview = Boolean(isAnyCurrentDocumentApprovalTask && documentApprovalRequestId)

  // Get completion details title based on task type
  const getCompletionDetailsTitle = () => {
    if (isApprovalTask) {
      return t('task-approval-details-title')
    }
    if (isAcknowledgeTask) {
      return t('task-acknowledge-details-title')
    }
    return t('task-completion-details-title')
  }

  // Reset state when task changes - clear everything immediately to prevent stale data
  React.useEffect(() => {
    if (task.id !== currentTaskId) {
      const links = (task.links as Array<{ type?: string; metadata?: Record<string, unknown> }>) || []
      const entityLinkForReset = links.find(link => link.type?.startsWith('entity:'))
      const openCommentByDefault =
        isDocumentApprovalTaskRecord(task, entityLinkForReset) && task.availableActions?.canReject === true

      setFormValues({})
      setFormInitialized(false)
      setShowComment(openCommentByDefault)
      setComment('')
      setFieldErrors({})
      setCurrentTaskId(task.id)
    }
  }, [task.id, currentTaskId])

  // Check if form fields have values directly (cFlow sends values in form definition)
  const formHasDirectValues = React.useMemo(() => {
    return visibleTaskForm.some((field: any) => field.value !== undefined)
  }, [visibleTaskForm])

  // Helper: Get field initial value based on priority
  const getFieldInitialValue = React.useCallback(
    (field: any, fieldName: string): any => {
      // Priority 1: Use flowStepData if available (for completed tasks)
      if (isCompleted && flowStepData?.[fieldName] !== undefined) {
        return flowStepData[fieldName]
      }
      // Priority 2: Use task.inputs if available
      if (
        task.inputs &&
        typeof fieldName === 'string' &&
        Object.prototype.hasOwnProperty.call(task.inputs, fieldName)
      ) {
        return (task.inputs as Record<string, any>)[fieldName]
      }
      // Priority 3: Use field.value if available
      if (field.value !== undefined) {
        return field.value
      }
      // Priority 4: Use field default value
      if (field.defaultValue !== undefined) {
        return field.defaultValue
      }
      return undefined
    },
    [isCompleted, flowStepData, task.inputs]
  )

  // Helper: Check if we should wait for data before initializing
  const shouldWaitForData = React.useCallback((): boolean => {
    if (task.id !== currentTaskId) return true
    if (isCompleted && !formHasDirectValues) {
      return isLoadingFlowData || flowStepData === null
    }
    return false
  }, [task.id, currentTaskId, isCompleted, formHasDirectValues, isLoadingFlowData, flowStepData])

  // Initialize formValues from task.inputs, field.value, or flowStepData (for completed tasks)
  React.useEffect(() => {
    if (shouldWaitForData()) return
    if (formInitialized || !Array.isArray(task.form)) return

    const initialValues: Record<string, any> = {}
    visibleTaskForm.forEach((field: any) => {
      const fieldName = field.name || field.id
      const value = getFieldInitialValue(field, fieldName)
      if (value !== undefined) {
        initialValues[fieldName] = value
      }
    })

    setFormValues(initialValues)
    setFormInitialized(true)
  }, [
    task.id,
    task.form,
    task.inputs,
    flowStepData,
    isCompleted,
    currentTaskId,
    formInitialized,
    isLoadingFlowData,
    formHasDirectValues,
    shouldWaitForData,
    getFieldInitialValue,
    visibleTaskForm
  ])

  const isBlinkTask = task.source === 'cflow' && task.tags?.app === 'quick-task'
  // Check both task.tags and sourceMetadata.tags for glossary request detection
  const isGlossaryRequestTask =
    task.source === 'cflow' &&
    (task.tags?.app === 'glossary-entry-request' || task.sourceMetadata?.tags?.app === 'glossary-entry-request')

  // Debug logging gated behind dev mode only
  if (
    process.env.NODE_ENV === 'development' &&
    task.source === 'cflow' &&
    task.title?.includes('Glossary Term Request')
  ) {
    console.log('[Glossary Request Detection]', { title: task.title, isGlossaryRequestTask })
  }

  const taskTitle = task.title || task.name || task.referenceTaskName || t('task-details-untitled')

  // Fetch employee data for creator if userId is available
  const creatorUserId = task.sourceMetadata?.creatorUserId
  const { employeeData: creatorEmployeeData, isLoading: isLoadingCreator } = useEmployeeAvatar(
    accessToken,
    creatorUserId
  )

  // Use employee data for creator name if available, otherwise fallback to sourceMetadata
  const creatorName = React.useMemo(() => {
    if (creatorEmployeeData?.displayName) return creatorEmployeeData.displayName
    if (creatorEmployeeData?.firstName && creatorEmployeeData?.lastName) {
      return `${creatorEmployeeData.firstName} ${creatorEmployeeData.lastName}`
    }
    return task.sourceMetadata?.creatorName || task.sourceMetadata?.flowInitiatedByName || t('task-details-unknown')
  }, [creatorEmployeeData, task.sourceMetadata, t])

  // Meeting-invite: fetch current participants from chat-service when opening task (includes latest status)
  const meetingIdForFetch = task.tags?.app === 'meeting-invite' ? task.tags?.meetingId : undefined
  const { participants: apiMeetingParticipants, isLoading: meetingParticipantsLoading } = useMeetingParticipants(
    meetingIdForFetch,
    accessToken
  )
  // Avatar batch: use API participant userIds when available, else fall back to tag-based list
  const meetingParticipantUserIds = React.useMemo(() => {
    if (apiMeetingParticipants.length > 0) return apiMeetingParticipants.map(p => p.userId)
    if (task.tags?.app !== 'meeting-invite' || !task.tags?.participants) return []
    try {
      const raw = JSON.parse(task.tags.participants)
      if (!Array.isArray(raw) || raw.length === 0) return []
      if (typeof raw[0] === 'string') return []
      const list = raw as Array<{ userId?: string }>
      return list.map(p => p.userId).filter((id): id is string => !!id)
    } catch {
      return []
    }
  }, [apiMeetingParticipants, task.tags?.app, task.tags?.participants])
  const { employeeMap: meetingParticipantEmployeeMap } = useEmployeeAvatarsBatch(accessToken, meetingParticipantUserIds)
  // Resolve display list: API participants (with status) or fallback to tags; organizer first
  const sortOrganizerFirst = <T extends { isOrganizer?: boolean }>(list: T[]): T[] =>
    [...list].sort((a, b) => (a.isOrganizer ? 0 : 1) - (b.isOrganizer ? 0 : 1))

  const meetingParticipantsDisplayList = React.useMemo(() => {
    if (apiMeetingParticipants.length > 0) {
      const list = apiMeetingParticipants.map(p => ({
        userId: p.userId,
        displayName: p.displayName,
        status: p.status,
        isOrganizer: p.isOrganizer
      }))
      return sortOrganizerFirst(list)
    }
    if (task.tags?.app !== 'meeting-invite' || !task.tags?.participants) return null
    try {
      const raw = JSON.parse(task.tags.participants)
      if (!Array.isArray(raw) || raw.length === 0) return null
      const isLegacyNames = typeof raw[0] === 'string'
      const list = isLegacyNames
        ? (raw as string[]).map((name, i) => ({
            userId: `legacy-${i}`,
            displayName: name,
            status: undefined,
            isOrganizer: false
          }))
        : (raw as Array<{ userId: string; displayName: string }>).map(p => ({
            ...p,
            status: undefined,
            isOrganizer: task.tags?.organizer === p.userId
          }))
      return sortOrganizerFirst(list)
    } catch {
      return null
    }
  }, [apiMeetingParticipants, task.tags?.app, task.tags?.participants, task.tags?.organizer])

  // Helper: Process number type field value
  // For required fields with invalid input, preserve the raw value so validation can catch it.
  // For optional fields, return undefined to allow empty submission.
  const processNumberValue = (field: any, value: any): any => {
    if (value === '' || value === null) {
      return field.required ? null : undefined
    }
    const numValue = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
    if (!Number.isNaN(numValue)) {
      return numValue
    }
    // Preserve invalid input for required fields so validation can detect and reject it
    return field.required ? value : undefined
  }

  // Helper: Check if field is number type
  const isNumberType = (field: any): boolean => {
    return field.type === 'NUMBER' || field.type === 'number'
  }

  // Helper: Get default value if required
  const getDefaultValue = (field: any): any => {
    return field.defaultValue
  }

  // Helper: Process form field value based on type
  const processFieldValue = (field: any, value: any): any => {
    // Return early if no value provided
    if (value === undefined || value === null) {
      return getDefaultValue(field)
    }

    // Process number fields
    if (isNumberType(field)) {
      return processNumberValue(field, value)
    }

    // FILE fields: strip non-serialisable properties (originFileObj).
    // Actual upload happens in handleCompleteTask before the API call.
    const fieldType = (field.type || '').toUpperCase()
    if (fieldType === 'FILE' && Array.isArray(value)) {
      return value.map((item: any) => {
        if (item && typeof item === 'object' && 'originFileObj' in item) {
          const cleaned = { ...item }
          delete cleaned.originFileObj
          return cleaned
        }
        return item
      })
    }

    return value
  }

  // Helper: Validate form data before submission
  const validateFormData = (): { isValid: boolean; errors: string[]; fieldErrors: Record<string, string> } => {
    const errors: string[] = []
    const fieldErrorsMap: Record<string, string> = {}

    visibleTaskForm.forEach((field: any) => {
      const fieldName = field.name || field.id
      const fieldLabel = field.label || fieldName
      const value = formValues[fieldName]

      // Check required fields
      if (field.required) {
        if (value === null || value === undefined || value === '') {
          const errorMsg = t('validation-field-required', { field: fieldLabel })
          errors.push(errorMsg)
          fieldErrorsMap[fieldName] = errorMsg
          return
        }

        // For number fields, check if the value is a valid number
        if (isNumberType(field)) {
          const numValue = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
          if (Number.isNaN(numValue)) {
            const errorMsg = t('validation-field-number-invalid', { field: fieldLabel })
            errors.push(errorMsg)
            fieldErrorsMap[fieldName] = errorMsg
          }
        }
      }
    })

    return { isValid: errors.length === 0, errors, fieldErrors: fieldErrorsMap }
  }

  // Helper: Process all form data
  const processFormData = (): Record<string, any> => {
    const processedFormData: Record<string, any> = {}

    if (visibleTaskForm.length > 0) {
      visibleTaskForm.forEach((field: any) => {
        const fieldName = field.name || field.id
        const processedValue = processFieldValue(field, formValues[fieldName])
        if (processedValue !== undefined) {
          processedFormData[fieldName] = processedValue
        }
      })
    } else {
      Object.assign(processedFormData, formValues)
    }

    return processedFormData
  }

  // Helper: Complete task action
  const handleCompleteTask = async () => {
    // Validate form data before submission
    const validation = validateFormData()
    if (!validation.isValid) {
      // Set field errors to show visual feedback
      setFieldErrors(validation.fieldErrors)

      // Show error message with list of missing fields
      const errorMessage = validation.errors.join('\n')
      toast.error(errorMessage)
      return
    }

    // Clear any previous field errors
    setFieldErrors({})

    let processedFormData = processFormData()
    if (isCurrentDocumentApprovalTask) {
      processedFormData = {
        ...processedFormData,
        decision: 'approved'
      }
    }

    // Upload any local File objects in FILE-type fields before completing the task.
    // This replaces raw {uid, name, status} entries with server-side references
    // containing fileId and downloadPath so downstream workflow steps can access them.
    if (visibleTaskForm.length > 0) {
      const fileFields = visibleTaskForm.filter((f: any) => (f.type || '').toUpperCase() === 'FILE')
      if (fileFields.length > 0) {
        try {
          processedFormData = await uploadFilesForTaskCompletion(
            processedFormData,
            fileFields,
            formValues,
            accessToken,
            task.id
          )
        } catch (uploadErr) {
          console.error('[UniversalCflowTaskDetails] File upload failed:', uploadErr)
          toast.error(uploadErr instanceof Error ? uploadErr.message : 'File upload failed')
          return
        }
      }
    }

    const completeRequestBody = {
      userId: userId,
      formData: processedFormData,
      ...(showComment && comment?.trim() ? { comment: comment.trim() } : {})
    }

    await syncDocumentApprovalDecision('approved', {
      comments: comment?.trim() ? comment.trim() : undefined
    })

    const base = getCflowEndpoint()
    const response = await fetch(`${base}/api/tasks/${task.id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(completeRequestBody)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || 'Failed to complete task')
    }

    toast.success(t('task-dialog-completed-success'))

    // Always store task completion for AI learning (fire and forget)
    // Records even without a comment so insights track all task activity
    saveCommunication({
      messageType: 'completion',
      content: showComment && comment?.trim() ? comment.trim() : `Task completed: ${task.title || task.id}`,
      recipientId: task.sourceMetadata?.creatorUserId,
      aiAssisted: aiUsedForComment,
      aiAction: aiUsedForComment ? lastAction || undefined : undefined
    })

    // Call onTaskCompleted for instant UI feedback (removes from local state)
    // Don't call onTaskUpdated - it triggers a slow full refetch that's not needed
    if (onTaskCompleted && task.id) {
      onTaskCompleted(task.id)
    }
    onClose()
  }

  // Helper: Reject task action
  const handleRejectTask = async (data?: any) => {
    const mergedComment = (comment || data?.comment || '').trim()

    if (requiresRejectionComment && !mergedComment) {
      toast.error(t('task-details-rejection-comment-missing'))
      setShowComment(true)
      return
    }

    const rejectRequestBody = {
      userId: userId,
      rejectionComment: mergedComment,
      comment: mergedComment
    }

    await syncDocumentApprovalDecision('rejected', { comments: mergedComment })

    const base = getCflowEndpoint()
    const response = await fetch(`${base}/api/tasks/${task.id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(rejectRequestBody)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || 'Failed to reject task')
    }

    toast.success(t('task-details-task-rejected'))

    // Always store task rejection for AI learning (fire and forget)
    // Records even without a comment so insights track all task activity
    const rejectionContent = comment || data?.comment || ''
    saveCommunication({
      messageType: 'rejection',
      content: rejectionContent.trim() || `Task rejected: ${task.title || task.id}`,
      recipientId: task.sourceMetadata?.creatorUserId,
      aiAssisted: aiUsedForComment,
      aiAction: aiUsedForComment ? lastAction || undefined : undefined
    })

    // Call onTaskCompleted for instant UI feedback (removes from local state)
    // Don't call onTaskUpdated - it triggers a slow full refetch that's not needed
    if (onTaskCompleted && task.id) {
      onTaskCompleted(task.id)
    }
    onClose()
  }

  // Helper: Claim task action
  const handleClaimTask = async () => {
    const base = getCflowEndpoint()
    const response = await fetch(`${base}/api/tasks/${task.id}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ userId })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || 'Failed to claim task')
    }

    toast.success(t('task-details-task-claimed'))

    onTaskUpdated()
    onClose()
  }

  // Helper: Unclaim task action
  const handleUnclaimTask = async () => {
    const base = getCflowEndpoint()
    const response = await fetch(`${base}/api/tasks/${task.id}/unclaim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ userId })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || 'Failed to unclaim task')
    }

    toast.success(t('task-details-task-unclaimed'))

    onTaskUpdated()
    onClose()
  }

  // Unified handler for all task actions
  const handleTaskAction = async (action: string, data?: any) => {
    if (!task.id || !userId) {
      toast.error(t('task-details-action-error'))
      return
    }

    setIsCompleting(true)
    try {
      const actionHandlers: Record<string, () => Promise<void>> = {
        claim: handleClaimTask,
        complete: handleCompleteTask,
        reject: () => handleRejectTask(data),
        reassign: async () => {
          toast.info(t('task-details-reassign-coming'))
        },
        unclaim: handleUnclaimTask
      }
      const handler = actionHandlers[action]
      if (!handler) {
        toast.warning(t('task-details-unknown-action', { action }))
      } else {
        await handler()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('task-details-action-failed', { action })
      toast.error(errorMessage)
    } finally {
      setIsCompleting(false)
    }
  }

  // Separate entity reference link from document links
  const documentLinks = allLinks.filter(isDocumentTypeLink)
  // Expand each document link into individual file entries (supports single-object and multi-file array formats)
  const resolvedDocFiles = documentLinks.flatMap(link => parseDocumentLinkFiles(link.url, link.name))
  // All other links (internal:*, external:*, or any other type) - generic fallback
  const otherLinks = allLinks.filter(link => !link.type?.startsWith('entity:') && !isDocumentTypeLink(link))
  // For meeting-invite: section titled "Meeting Links", but show all links (Join Meeting + any others)
  const linksSectionTitle =
    task.tags?.app === 'meeting-invite'
      ? t('task-details-meeting-links', { defaultValue: 'Meeting Links' })
      : t('task-details-related-links', { defaultValue: 'Related Links' })
  const displayLinks = otherLinks

  // Extract entity reference data from the entity link
  const entityType = entityLink?.metadata?.entityType || entityLink?.type?.split(':')[1]
  const entityId = entityLink?.metadata?.entityId
  const entityName = entityLink?.name
  const entityDisplayUrl = entityLink?.url

  // Resolve the best display name for a document under review.
  // 1. Prefer the explicit documentTitle on the link metadata (new tasks).
  // 2. Fall back to entityLink.name, unless it is the legacy hardcoded "Open document".
  // 3. Otherwise surface no name (card uses a generic fallback copy).
  const documentTitleMetadata =
    typeof entityLink?.metadata?.documentTitle === 'string' ? (entityLink.metadata.documentTitle as string).trim() : ''
  const linkNameTrimmed = typeof entityName === 'string' ? entityName.trim() : ''
  const isLegacyGenericLinkName = linkNameTrimmed.toLowerCase() === 'open document'
  const resolvedDocumentName = documentTitleMetadata || (isLegacyGenericLinkName ? '' : linkNameTrimmed)

  // Document version under review: prefer link metadata, then task tags.
  const parseVersionNumber = (raw: unknown): number | null => {
    if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 1) {
      return raw
    }
    if (typeof raw === 'string' && raw.trim()) {
      const parsed = Number(raw.trim())
      if (Number.isInteger(parsed) && parsed >= 1) {
        return parsed
      }
    }
    return null
  }
  const reviewVersionNumber =
    parseVersionNumber(entityLink?.metadata?.versionAtRequest) ??
    parseVersionNumber(task.tags?.version) ??
    parseVersionNumber(task.sourceMetadata?.tags?.version) ??
    parseVersionNumber(task.workflowMeta?.tags?.version)
  const reviewVersionLabel = reviewVersionNumber ? `v${reviewVersionNumber}` : null

  const outcomeLabelKey =
    documentApprovalOutcomeDecision === 'rejected'
      ? 'document-approval-outcome-review-card-label-rejected'
      : 'document-approval-outcome-review-card-label-approved'
  const outcomeDescriptionKey =
    documentApprovalOutcomeDecision === 'rejected'
      ? 'document-approval-outcome-review-card-description-rejected'
      : 'document-approval-outcome-review-card-description-approved'
  const outcomeSnapshotBadgeKey =
    documentApprovalOutcomeDecision === 'rejected'
      ? 'document-approval-outcome-review-card-snapshot-badge-rejected'
      : 'document-approval-outcome-review-card-snapshot-badge-approved'

  const reviewCardLabel = isCurrentDocumentApprovalOutcomeTask
    ? t(outcomeLabelKey)
    : t('document-approval-review-card-label')
  const reviewCardDescription = isCurrentDocumentApprovalOutcomeTask
    ? t(outcomeDescriptionKey)
    : t('document-approval-review-card-description')
  const reviewCardSnapshotBadge = isCurrentDocumentApprovalOutcomeTask
    ? t(outcomeSnapshotBadgeKey)
    : t('document-approval-review-card-snapshot-badge')
  const reviewCardOpenHereLabel = isCurrentDocumentApprovalOutcomeTask
    ? t('document-approval-outcome-review-open-here')
    : t('document-approval-review-open-here')
  const reviewDialogDescription = isCurrentDocumentApprovalOutcomeTask
    ? t('document-approval-outcome-review-dialog-description')
    : t('document-approval-review-dialog-description')

  const documentReviewPrompt = canShowDocumentReview ? (
    <Card variant="surface" className="gba:border-primary/30 gba:bg-muted/30" data-testid="task-document-review-card">
      <CardContent className="gba:flex gba:flex-col gba:gap-4 gba:pt-4">
        <div className="gba:flex gba:items-start gba:gap-3">
          <div className="gba:flex gba:h-9 gba:w-9 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-md gba:bg-primary/10">
            <FileText className="gba:h-4 gba:w-4 gba:text-primary" />
          </div>
          <div className="gba:min-w-0 gba:flex-1">
            <div className="gba:text-xs gba:text-muted-foreground gba:font-medium">{reviewCardLabel}</div>
            <div className="gba:mt-1 gba:flex gba:items-center gba:gap-2 gba:min-w-0 gba:flex-wrap">
              <span
                className="gba:truncate gba:text-sm gba:font-semibold gba:text-foreground"
                data-testid="task-document-review-entity-name"
              >
                {resolvedDocumentName || t('document-approval-review-card-fallback-name')}
              </span>
              {reviewVersionLabel && (
                <Badge
                  variant="outline"
                  className="gba:shrink-0 gba:text-xs gba:font-mono"
                  data-testid="task-document-review-version"
                >
                  {reviewVersionLabel}
                </Badge>
              )}
              <Badge variant="outline" className="gba:shrink-0 gba:text-xs">
                {reviewCardSnapshotBadge}
              </Badge>
            </div>
            <p className="gba:mt-2 gba:text-xs gba:text-muted-foreground">{reviewCardDescription}</p>
          </div>
        </div>
        <div className="gba:flex gba:flex-col gba:gap-2 gba:pl-12 sm:gba:flex-row sm:gba:items-center sm:gba:gap-2">
          <Button size="sm" onClick={() => setIsReviewDialogOpen(true)} data-testid="task-document-review-open">
            <Eye className="gba:mr-2 gba:h-4 gba:w-4" />
            {reviewCardOpenHereLabel}
          </Button>
          {entityDisplayUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateTo(entityDisplayUrl)}
              title={t('document-approval-review-open-external-tooltip')}
              data-testid="task-document-review-open-external"
            >
              <ExternalLink className="gba:mr-2 gba:h-4 gba:w-4" />
              {t('document-approval-review-open-external')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  ) : null

  const documentReviewDialog =
    canShowDocumentReview && documentApprovalRequestId ? (
      <DocumentApprovalReviewDialog
        open={isReviewDialogOpen}
        onOpenChange={setIsReviewDialogOpen}
        source={{ kind: 'approvalRequest', approvalRequestId: documentApprovalRequestId }}
        accessToken={accessToken}
        bannerMode="metadataOnly"
        title={resolvedDocumentName || undefined}
        description={reviewDialogDescription}
        testId="task-document-review-dialog"
      />
    ) : null

  const syncDocumentApprovalDecision = useCallback(
    async (decision: 'approved' | 'rejected', options?: { comments?: string }) => {
      if (!isCurrentDocumentApprovalTask || !documentApprovalRequestId) {
        return
      }

      const trimmed = options?.comments?.trim()
      officeClient.setAccessToken(accessToken)
      await officeClient.documents.respondToApproval(documentApprovalRequestId, {
        decision,
        ...(trimmed ? { comments: trimmed } : {})
      })
    },
    [accessToken, documentApprovalRequestId, isCurrentDocumentApprovalTask]
  )

  // For Glossary Request tasks, load the static task form
  // Also check workflowMeta and other possible locations for tags
  const hasGlossaryTag =
    task.tags?.app === 'glossary-entry-request' ||
    task.sourceMetadata?.tags?.app === 'glossary-entry-request' ||
    task.workflowMeta?.tags?.app === 'glossary-entry-request' ||
    sourceMetadataRecord.app === 'glossary-entry-request'

  if (isGlossaryRequestTask || (task.source === 'cflow' && hasGlossaryTag)) {
    // Extract term and contextDescription from task tags, sourceMetadata tags, workflowMeta, or initial parameters
    const allTags = {
      ...task.tags,
      ...task.sourceMetadata?.tags,
      ...task.workflowMeta?.tags,
      ...asRecord(sourceMetadataRecord.tags)
    }
    const term = allTags?.term || task.sourceMetadata?.initialParameters?.term || sourceMetadataRecord.term || ''
    const contextDescription =
      allTags?.context || task.sourceMetadata?.initialParameters?.context || sourceMetadataRecord.context || ''

    // Get userInfo from task if available (minimal shape for GlossaryEntryTaskForm; form uses additionalData only)
    const initiatedByName = task.sourceMetadata?.flowInitiatedByName || ''
    const nameParts = initiatedByName.trim().split(/\s+/)
    const givenName = nameParts[0] ?? ''
    const familyName = nameParts.slice(1).join(' ') ?? ''
    const userInfo: UserInfoProps | undefined = userId
      ? {
          id: userId,
          userName: initiatedByName,
          givenName,
          familyName,
          nickName: initiatedByName,
          employeeDetails: {
            employeeId: userId,
            firstName: givenName,
            lastName: familyName,
            supervisor: {
              id: '',
              firstName: '',
              lastName: '',
              userId: ''
            },
            organizationalUnit: {
              id: '',
              name: ''
            }
          }
        }
      : undefined

    return (
      <GlossaryEntryTaskForm
        accessToken={accessToken}
        userInfo={userInfo}
        additionalData={{
          psi_taskPayload: {
            term,
            context: contextDescription,
            requesterUserId: task.sourceMetadata?.flowInitiatedBy
          },
          psi_processMetadata: task.sourceMetadata,
          psi_taskStatus: task.status,
          psi_availableActions: task.availableActions,
          psi_taskId: task.id,
          taskId: task.id
        }}
      />
    )
  }

  const learningQuizTags = {
    ...task.tags,
    ...task.sourceMetadata?.tags,
    ...task.workflowMeta?.tags,
    ...asRecord(sourceMetadataRecord.tags)
  }
  const isLearningQuizTask =
    task.source === 'cflow' &&
    (learningQuizTags?.app === 'learning-quiz' || sourceMetadataRecord.app === 'learning-quiz')

  if (isLearningQuizTask) {
    const sourceLink = allLinks.find(link => link.type?.startsWith('document:')) ?? allLinks.find(link => link.url)
    return (
      <LearningQuizTaskForm
        accessToken={accessToken}
        sourceLink={sourceLink}
        additionalData={{
          psi_taskPayload: {
            courseId: learningQuizTags?.courseId,
            courseVersionId: learningQuizTags?.courseVersionId,
            assignmentId: learningQuizTags?.assignmentId
          },
          psi_processMetadata: task.sourceMetadata,
          psi_taskStatus: task.status,
          psi_availableActions: task.availableActions,
          psi_taskId: task.id,
          taskId: task.id
        }}
      />
    )
  }

  // For Blink tasks, use the simple view from every-box
  if (isBlinkTask) {
    return (
      <>
        <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0" data-testid="universal-cflow-task-details">
          {/* Task Header */}
          <TaskDetailHeader
            title={taskTitle}
            creatorName={creatorName}
            showEmployeeInfo={!!creatorUserId}
            employeeData={
              creatorEmployeeData
                ? {
                    displayName: creatorEmployeeData.displayName,
                    firstName: creatorEmployeeData.firstName,
                    lastName: creatorEmployeeData.lastName,
                    avatarUrl: formatAvatarUrl(creatorEmployeeData.pictureThumbnail),
                    position: creatorEmployeeData.position
                  }
                : undefined
            }
            isLoadingEmployee={isLoadingCreator}
            onClose={onClose}
          />

          {/* Scrollable Content - Simple Blink Task View */}
          <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-6 gba:min-h-0 gba:px-6">
            {/* Due Date & Starting Date - hidden for meeting-invite (Blink view) */}
            {(task.dueDate || task.scheduledAt) && task.tags?.app !== 'meeting-invite' && (
              <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-4 gba:pb-4 gba:border-b">
                {task.scheduledAt && (
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Calendar className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                    <span className="gba:text-sm gba:font-medium gba:text-foreground">
                      {t('task-start-date-label')}:
                    </span>
                    <span className="gba:text-sm gba:text-muted-foreground">{formatDateTime(task.scheduledAt)}</span>
                  </div>
                )}
                <TaskDueDateInfo dueDate={task.dueDate} t={t} formatDateTime={formatDateTime} />
              </div>
            )}

            {/* Meeting invite: meeting name, date, time, Please respond - Blink view */}
            <MeetingInviteBody tags={task.tags} t={t} />

            {/* AI Summary & Suggestions */}
            <TaskAiSection
              taskId={task.id}
              source={task.source}
              accessToken={accessToken}
              urgencyScore={task.ai?.urgencyScore}
              currentUserPriority={task.userState?.userPriority}
              onPriorityApplied={() => onTaskUpdated()}
            />

            {/* Completion Details - Only show for completed tasks */}
            {isCompleted && (
              <Card className="gba:border-success/50 gba:bg-success/5">
                <CardHeader>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <CheckCircle className="gba:h-5 gba:w-5 gba:text-success" />
                    <CardTitle className="gba:text-base">{getCompletionDetailsTitle()}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="gba:space-y-4">
                  {/* Completed At */}
                  {task.completedAt && (
                    <div className="gba:flex gba:items-start gba:gap-3">
                      <div className="gba:text-sm gba:text-muted-foreground gba:w-32 gba:flex-shrink-0">
                        {t('task-completion-completed-at')}:
                      </div>
                      <div className="gba:text-sm gba:font-medium">{formatDateTime(task.completedAt)}</div>
                    </div>
                  )}

                  {/* Outcome */}
                  <div className="gba:flex gba:items-start gba:gap-3">
                    <div className="gba:text-sm gba:text-muted-foreground gba:w-32 gba:flex-shrink-0">
                      {t('task-completion-outcome')}:
                    </div>
                    <div>
                      <Badge variant="secondary" className="gba:bg-success/10 gba:text-success gba:border-success/20">
                        {t('task-completion-outcome-completed')}
                      </Badge>
                    </div>
                  </div>

                  {/* Comment (if available) */}
                  {task.sourceMetadata?.completionComment && (
                    <div className="gba:flex gba:items-start gba:gap-3">
                      <div className="gba:text-sm gba:text-muted-foreground gba:w-32 gba:flex-shrink-0">
                        {t('task-completion-comment')}:
                      </div>
                      <div className="gba:text-sm gba:italic gba:text-muted-foreground">
                        "{task.sourceMetadata.completionComment}"
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Task instruction message - above links, dark and prominent */}
            {(task.message || task.description) && (
              <div className="gba:space-y-3">
                <div className="gba:text-base gba:leading-relaxed gba:font-medium gba:text-foreground">
                  <MarkdownRenderer
                    content={preserveNewlines(task.message || task.description || '')}
                    accessToken={accessToken}
                  />
                </div>
                {/* Blue hint explaining what to do */}
                {!isCompleted && (otherLinks.length > 0 || documentLinks.length > 0) && (
                  <div className="gba:flex gba:items-start gba:gap-3 gba:rounded-lg gba:border gba:border-primary/30 gba:bg-info-secondary gba:p-4">
                    <Info className="gba:h-5 gba:w-5 gba:text-primary gba:flex-shrink-0 gba:mt-0.5" />
                    <p className="gba:text-sm gba:leading-relaxed gba:text-info-secondary-foreground">
                      {t('task-details-blink-instruction-hint', {
                        defaultValue:
                          'Open the link below to access your assigned copy, complete it, and return here to submit.'
                      })}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Entity Reference (if linked to an entity). Hidden on document-approval tasks
                (both approver-side APPROVAL and requester-side INFORMATION outcome) because
                documentReviewPrompt already names the document and provides both in-task
                and Documents-app actions. */}
            {entityType && entityId && entityName && !isAnyCurrentDocumentApprovalTask && (
              <Card variant="surface" className="gba:border-primary/20 gba:bg-muted/20">
                <CardContent className="gba:pt-4">
                  <div className="gba:text-xs gba:text-muted-foreground gba:mb-2 gba:font-medium">
                    {t('task-details-related-to')}
                  </div>
                  <a
                    href={entityDisplayUrl || '#'}
                    onClick={e => {
                      e.preventDefault()
                      if (entityDisplayUrl) {
                        navigateTo(entityDisplayUrl)
                      }
                    }}
                    className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:p-2 gba:-mx-2 gba:rounded-md hover:gba:bg-accent gba:transition-colors gba:no-underline"
                    data-testid="task-entity-reference-link"
                  >
                    <LinkIcon className="gba:h-4 gba:w-4 gba:text-primary" />
                    <Badge variant="outline" className="gba:text-xs">
                      {entityType}
                    </Badge>
                    <span className="gba:font-medium gba:text-sm gba:text-primary hover:gba:underline">
                      {entityName}
                    </span>
                    <ExternalLink className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:ml-auto" />
                  </a>
                </CardContent>
              </Card>
            )}

            {documentReviewPrompt}

            {/* Document Attachments (if any) */}
            {resolvedDocFiles.length > 0 && (
              <Card variant="surface" className="gba:border-primary/20 gba:bg-muted/30">
                <CardContent className="gba:pt-4">
                  <div className="gba:text-xs gba:text-primary gba:mb-3 gba:font-semibold">
                    {t('task-details-attachments', { count: resolvedDocFiles.length })}
                  </div>
                  <div className="gba:space-y-2">
                    {resolvedDocFiles.map(file => (
                      <a
                        href={file.fallbackHref}
                        key={file.key}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gba:flex gba:items-center gba:gap-3 gba:p-2 gba:-mx-2 gba:rounded-md gba:hover:bg-accent gba:transition-colors gba:no-underline gba:group"
                        onClick={async event => {
                          if (file.downloadPath.startsWith('http')) return
                          event.preventDefault()
                          await handleDocumentClick(
                            {
                              id: file.key,
                              name: file.displayName,
                              mimeType: file.mimeType,
                              fileInfo: {
                                path: file.downloadPath,
                                ...(file.mimeType ? { fileMetadata: { mimeType: file.mimeType } } : {})
                              }
                            },
                            accessToken
                          )
                        }}
                        data-testid={`task-document-link-${file.displayName}`}
                      >
                        <FileText className="gba:h-4 gba:w-4 gba:text-primary gba:shrink-0" />
                        <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate gba:flex-1 group-hover:gba:underline">
                          {file.displayName}
                        </span>
                        <Download className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:shrink-0" />
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Other Links / Meeting Links (meeting-invite: only external:meeting) */}
            <RelatedLinksSection links={displayLinks} title={linksSectionTitle} />

            {/* Meeting participants - separate block for meeting-invite (Blink); uses API when open, with status */}
            <MeetingParticipantsSection
              isMeetingInvite={task.tags?.app === 'meeting-invite'}
              loading={meetingParticipantsLoading}
              meetingId={meetingIdForFetch}
              participants={meetingParticipantsDisplayList ?? undefined}
              participantsExpanded={participantsExpanded}
              setParticipantsExpanded={setParticipantsExpanded}
              employeeMap={meetingParticipantEmployeeMap}
              t={t}
            />

            {/* Brief description - skip redundant "Complete Meeting Invitation: ..." for meeting-invite */}
            {(task.message || task.description) && renderTaskMessageContent(task, accessToken)}

            {/* Info Alert for Blink tasks - only show when not completed */}
            {!isCompleted && (
              <Alert>
                <Info className="gba:h-4 gba:w-4" />
                <AlertDescription className="gba:text-sm">{t('task-details-blink-info')}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Footer with Complete button for active Blink tasks */}
          <TaskDetailFooter task={task} onTaskAction={handleTaskAction} isLoading={isCompleting} />
        </div>
        {documentReviewDialog}
      </>
    )
  }

  // For non-Blink cFlow tasks, use the full form view
  return (
    <>
      <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0" data-testid="universal-cflow-task-details">
        {/* Task Header - Using shared TaskDetailHeader component */}
        <TaskDetailHeader
          title={taskTitle}
          creatorName={creatorName}
          showEmployeeInfo={!!creatorUserId}
          employeeData={
            creatorEmployeeData
              ? {
                  displayName: creatorEmployeeData.displayName,
                  firstName: creatorEmployeeData.firstName,
                  lastName: creatorEmployeeData.lastName,
                  avatarUrl: formatAvatarUrl(creatorEmployeeData.pictureThumbnail),
                  position: creatorEmployeeData.position
                }
              : undefined
          }
          isLoadingEmployee={isLoadingCreator}
          onClose={onClose}
        />

        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-6 gba:min-h-0 gba:px-6">
          {/* Due Date & Starting Date Section - hidden for meeting-invite */}
          {(task.dueDate || task.scheduledAt) && task.tags?.app !== 'meeting-invite' && (
            <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-4 gba:pb-4 gba:border-b">
              {task.scheduledAt && (
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Calendar className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                  <span className="gba:text-sm gba:font-medium gba:text-foreground">{t('task-start-date-label')}:</span>
                  <span className="gba:text-sm gba:text-muted-foreground">{formatDateTime(task.scheduledAt)}</span>
                </div>
              )}

              <TaskDueDateInfo dueDate={task.dueDate} t={t} formatDateTime={formatDateTime} />
            </div>
          )}

          {/* Meeting invite: meeting name, date, time, Please respond */}
          <MeetingInviteBody tags={task.tags} t={t} />

          {/* AI Summary & Suggestions */}
          <TaskAiSection
            taskId={task.id}
            source={task.source}
            accessToken={accessToken}
            urgencyScore={task.ai?.urgencyScore}
            currentUserPriority={task.userState?.userPriority}
            onPriorityApplied={() => onTaskUpdated()}
          />
          {/* Completion Details - Only show for completed tasks */}
          {isCompleted && (
            <Card className="gba:border-success/50 gba:bg-success/5">
              <CardHeader>
                <div className="gba:flex gba:items-center gba:gap-2">
                  {task.sourceMetadata?.outcome === 'REJECTED' ? (
                    <XCircle className="gba:h-5 gba:w-5 gba:text-destructive" />
                  ) : (
                    <CheckCircle className="gba:h-5 gba:w-5 gba:text-success" />
                  )}
                  <CardTitle className="gba:text-base">{getCompletionDetailsTitle()}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="gba:space-y-4">
                {/* Completed At */}
                {task.completedAt && (
                  <div className="gba:flex gba:items-start gba:gap-3">
                    <div className="gba:text-sm gba:text-muted-foreground gba:w-32 gba:flex-shrink-0">
                      {t('task-completion-completed-at')}:
                    </div>
                    <div className="gba:text-sm gba:font-medium">{formatDateTime(task.completedAt)}</div>
                  </div>
                )}

                {/* Outcome - Show based on actual outcome */}
                <div className="gba:flex gba:items-start gba:gap-3">
                  <div className="gba:text-sm gba:text-muted-foreground gba:w-32 gba:flex-shrink-0">
                    {t('task-completion-outcome')}:
                  </div>
                  <div>
                    {(() => {
                      const successBadgeClass = 'gba:bg-success/10 gba:text-success gba:border-success/20'
                      const destructiveBadgeClass =
                        'gba:bg-destructive/10 gba:text-destructive gba:border-destructive/20'

                      if (task.sourceMetadata?.outcome === 'REJECTED') {
                        return (
                          <Badge variant="secondary" className={destructiveBadgeClass}>
                            {t('task-completion-outcome-rejected')}
                          </Badge>
                        )
                      }

                      if (isApprovalTask) {
                        return (
                          <Badge variant="secondary" className={successBadgeClass}>
                            {t('task-completion-outcome-approved')}
                          </Badge>
                        )
                      }

                      if (isAcknowledgeTask) {
                        return (
                          <Badge variant="secondary" className={successBadgeClass}>
                            {t('task-completion-outcome-acknowledged')}
                          </Badge>
                        )
                      }

                      return (
                        <Badge variant="secondary" className={successBadgeClass}>
                          {t('task-completion-outcome-completed')}
                        </Badge>
                      )
                    })()}
                  </div>
                </div>

                {/* Comment (if available) */}
                {task.sourceMetadata?.completionComment && (
                  <div className="gba:flex gba:items-start gba:gap-3">
                    <div className="gba:text-sm gba:text-muted-foreground gba:w-32 gba:flex-shrink-0">
                      {t('task-completion-comment')}:
                    </div>
                    <div className="gba:text-sm gba:italic gba:text-muted-foreground">
                      "{task.sourceMetadata.completionComment}"
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Entity Reference (if linked to an entity) - Same for all cFlow tasks.
              Hidden on document-approval tasks (APPROVAL + INFORMATION outcome) because
              documentReviewPrompt shows the document name and both in-task and Documents-app
              actions. */}
          {entityType && entityId && entityName && !isAnyCurrentDocumentApprovalTask && (
            <div className="gba:border gba:rounded-lg gba:p-4 gba:bg-muted/30">
              <div className="gba:text-xs gba:text-muted-foreground gba:mb-2 gba:font-medium">
                {t('task-details-related-to')}
              </div>
              <a
                href={entityDisplayUrl || '#'}
                onClick={e => {
                  e.preventDefault()
                  if (entityDisplayUrl) {
                    navigateTo(entityDisplayUrl)
                  }
                }}
                className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:p-2 gba:-mx-2 gba:rounded-md hover:gba:bg-accent gba:transition-colors gba:no-underline"
                data-testid="task-entity-reference-link"
              >
                <LinkIcon className="gba:h-4 gba:w-4 gba:text-primary" />
                <Badge variant="outline" className="gba:text-xs">
                  {entityType}
                </Badge>
                <span className="gba:font-medium gba:text-sm gba:text-primary hover:gba:underline">{entityName}</span>
                <ExternalLink className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:ml-auto" />
              </a>
            </div>
          )}

          {documentReviewPrompt}

          {/* Document Attachments (if any) - Same for all cFlow tasks */}
          {resolvedDocFiles.length > 0 && (
            <div className="gba:border gba:rounded-lg gba:p-4 gba:bg-muted/30">
              <div className="gba:text-xs gba:text-muted-foreground gba:mb-3 gba:font-medium">
                {t('task-details-attachments', { count: resolvedDocFiles.length })}
              </div>
              <div className="gba:space-y-2">
                {resolvedDocFiles.map(file => (
                  <a
                    data-testid={`task-document-link-${file.displayName}`}
                    href={file.fallbackHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gba:flex gba:items-center gba:gap-3 gba:p-2 gba:-mx-2 gba:rounded-md gba:hover:bg-accent gba:transition-colors gba:no-underline gba:group"
                    key={file.key}
                    onClick={async event => {
                      if (file.downloadPath.startsWith('http')) return
                      event.preventDefault()
                      await handleDocumentClick(
                        {
                          id: file.key,
                          name: file.displayName,
                          mimeType: file.mimeType,
                          fileInfo: {
                            path: file.downloadPath,
                            ...(file.mimeType ? { fileMetadata: { mimeType: file.mimeType } } : {})
                          }
                        },
                        accessToken
                      )
                    }}
                  >
                    <FileText className="gba:w-4 gba:h-4 gba:shrink-0 gba:text-primary" />
                    <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate gba:flex-1 group-hover:gba:underline">
                      {file.displayName}
                    </span>
                    <Download className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* For meeting-invite: Form first, then Related Links. Otherwise: Related Links then Form. */}
          {task.tags?.app === 'meeting-invite' && visibleTaskForm.length > 0 && (
            <TaskFormCard
              visibleTaskForm={visibleTaskForm}
              fieldErrors={fieldErrors}
              setFieldErrors={setFieldErrors}
              formValues={formValues}
              setFormValues={setFormValues}
              formInitialized={formInitialized}
              isCompleted={isCompleted}
              t={t}
            />
          )}

          {/* Other Links / Meeting Links (meeting-invite: only external:meeting) */}
          <RelatedLinksSection links={displayLinks} title={linksSectionTitle} />

          {/* Form Section - for non-meeting-invite (or when meeting-invite has no form); no "Form" title */}
          {task.tags?.app !== 'meeting-invite' && visibleTaskForm.length > 0 && (
            <TaskFormCard
              visibleTaskForm={visibleTaskForm}
              fieldErrors={fieldErrors}
              setFieldErrors={setFieldErrors}
              formValues={formValues}
              setFormValues={setFormValues}
              formInitialized={formInitialized}
              isCompleted={isCompleted}
              t={t}
            />
          )}

          {/* Meeting participants - after Form; uses API when open, with latest status */}
          <MeetingParticipantsSection
            isMeetingInvite={task.tags?.app === 'meeting-invite'}
            loading={meetingParticipantsLoading}
            meetingId={meetingIdForFetch}
            participants={meetingParticipantsDisplayList ?? undefined}
            participantsExpanded={participantsExpanded}
            setParticipantsExpanded={setParticipantsExpanded}
            employeeMap={meetingParticipantEmployeeMap}
            t={t}
          />

          {/* Description - scheduled task markdown; meeting-invite: only location/description (skip redundant "Complete Meeting Invitation: ...") */}
          {(task.message || task.description) && renderTaskMessageContent(task, accessToken)}

          {/* Comment Section - Only for active tasks with complete/reject actions */}
          {!isCompleted && (task.availableActions?.canComplete || task.availableActions?.canReject) && (
            <div className="gba:space-y-3">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Switch
                  id="show-comment"
                  checked={showComment}
                  onCheckedChange={setShowComment}
                  data-testid="comment-toggle"
                />
                <Label
                  htmlFor="show-comment"
                  className="gba:text-sm gba:font-medium gba:cursor-pointer gba:flex gba:items-center gba:gap-2"
                >
                  <MessageSquare className="gba:h-4 gba:w-4" />
                  {t('task-details-add-comment')}{' '}
                  {requiresRejectionComment ? (
                    <span className="gba:text-muted-foreground">({t('task-details-rejection-comment-hint')})</span>
                  ) : (
                    !showComment && t('task-details-optional')
                  )}
                </Label>
              </div>

              {showComment && (
                <div className="gba:space-y-2">
                  {/* AI Error display */}
                  {aiError && (
                    <div className="gba:text-sm gba:text-destructive gba:bg-destructive/10 gba:px-3 gba:py-2 gba:rounded-md">
                      {aiError}
                    </div>
                  )}

                  <Textarea
                    id="comment"
                    placeholder={
                      requiresRejectionComment
                        ? t('task-details-comment-placeholder-reject')
                        : t('task-details-comment-placeholder')
                    }
                    value={comment}
                    onChange={e => {
                      setComment(e.target.value)
                      // Clear AI used flag when user manually edits after AI
                      if (aiUsedForComment && e.target.value !== suggestedReply) {
                        // User modified the AI suggestion - still counts as AI-assisted
                      }
                    }}
                    rows={4}
                    className="gba:w-full"
                    data-testid="task-comment-input"
                  />

                  {/* AI Toolbar */}
                  {isAiAvailable && (
                    <AiToolbar
                      currentText={comment}
                      isLoading={isAiLoading}
                      onSuggest={handleAiSuggest}
                      onImprove={handleAiImprove}
                      onTone={handleAiTone}
                      onExpand={handleAiExpand}
                      onShorten={handleAiShorten}
                      onCustom={handleAiCustom}
                      hasText={comment.trim().length > 0}
                      disabled={isCompleting}
                    />
                  )}

                  {/* AI assisted indicator */}
                  {aiUsedForComment && (
                    <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
                      <Sparkles className="gba:h-3 gba:w-3" />
                      <span>{t('ai-assistant-ai-assisted')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer with Actions - Auto-generated from task.availableActions */}
        <TaskDetailFooter task={task} onTaskAction={handleTaskAction} isLoading={isCompleting} />
      </div>
      {documentReviewDialog}
    </>
  )
}
