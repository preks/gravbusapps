/**
 * Explicit confirm + AppAction for CRM, or QuickTaskFlowService for blink / flow_engine.
 * Does not auto-run integrations; server output is treated as untrusted proposal.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { toast } from 'sonner'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { QuickTaskFlowService } from '@/common/components/flow/flow-quick-task/services/QuickTaskFlowService'
import type { QuickTaskFormData } from '@/common/components/flow/flow-quick-task/types'
import type { EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'
import { getCflowEndpoint } from '@/business-apps/core/every/apps/every-api/utils/config'
import translations from '../_i18n'
import type { EmailAccount, EmailAddress, EmailMessage, EmailSummarizeSuggestion } from '../types'
import {
  buildSuggestionActivityContextData,
  buildSuggestionDescription,
  isSuggestionConfidentEnough
} from '../utils/suggestionActivityContext'
import {
  parseAssigneeUserIdsFromMetadata,
  resolveSuggestionIntegrationKind,
  type EmailSuggestionIntegrationKind
} from '../utils/emailSuggestionIntegrationKind'
import { useEmailSuggestionAssigneeResolution } from '../hooks/useEmailSuggestionAssigneeResolution'
import {
  assigneeIdFromEmployee,
  buildQuickTaskMessage,
  dueDateForQuickTask,
  entityFieldsFromSuggestionMetadata
} from '../utils/emailSuggestionQuickTaskHelpers'
import { stableEmailSuggestionKey } from '../utils/emailSummarizeSuggestionUtils'
import { EmailSuggestionQuickTaskAssigneePicker } from './EmailSuggestionQuickTaskAssigneePicker'
import { EmailCrmEntityPicker } from './EmailCrmEntityPicker'
import { buildActivityPayload } from './CrmEntityRow'
import type { CrmEntityMatch } from '../hooks/useEmailCrmSuggestions'

type TranslationFn = (key: string, vars?: Record<string, string | number>) => string

function normalizeSearchValue(value: string | undefined): string {
  return (value || '').trim().toLowerCase()
}

function recipientEmail(recipient: EmailAddress): string | undefined {
  const email = recipient.address.trim()
  return email.length > 0 ? email : undefined
}

function recipientMatchesHint(recipient: EmailAddress, hints: string[]): boolean {
  const email = normalizeSearchValue(recipient.address)
  const name = normalizeSearchValue(recipient.name)

  return hints.some(hint => {
    const normalizedHint = normalizeSearchValue(hint)
    if (!normalizedHint) return false
    if (email === normalizedHint) return true
    return name === normalizedHint || name.startsWith(`${normalizedHint} `)
  })
}

function firstRelevantRecipientEmail(message: EmailMessage, hints: string[]): string | undefined {
  const recipients = [...message.toAddresses, ...message.ccAddresses, ...message.bccAddresses].filter(recipientEmail)
  const matchingRecipient = recipients.find(recipient => recipientMatchesHint(recipient, hints))
  return recipientEmail(matchingRecipient || recipients[0])
}

function buttonPresentation(variant: EmailSuggestionCreateActionProps['variant']): {
  variant: 'outline' | 'secondary'
  className: string
} {
  if (variant === 'thread') {
    return {
      variant: 'outline',
      className: 'gba:border-decorative-foreground/30 gba:text-decorative-foreground gba:text-xs'
    }
  }

  return {
    variant: 'secondary',
    className: 'gba:text-xs'
  }
}

function openButtonLabel(kind: EmailSuggestionIntegrationKind, t: TranslationFn): string {
  if (kind === 'quickTask') return t('email-suggestion-create-cta-quick-task')
  return t('email-suggestion-create-cta-log-activity')
}

function dialogTitle(kind: EmailSuggestionIntegrationKind, t: TranslationFn): string {
  if (kind === 'quickTask') return t('email-suggestion-create-dialog-title-quick-task')
  return t('email-suggestion-create-dialog-title')
}

function dialogDescription(kind: EmailSuggestionIntegrationKind, t: TranslationFn): string {
  if (kind === 'quickTask') return t('email-suggestion-create-dialog-description-quick-task')
  return t('email-suggestion-create-dialog-description')
}

function assigneeResolutionHints(
  assigneeResolution: ReturnType<typeof useEmailSuggestionAssigneeResolution>
): string[] {
  return [assigneeResolution.parsed?.email, assigneeResolution.parsed?.name, assigneeResolution.parsed?.raw].filter(
    (hint): hint is string => Boolean(hint)
  )
}

function assigneeResolutionSearchTerm(
  assigneeResolution: ReturnType<typeof useEmailSuggestionAssigneeResolution>,
  message: EmailMessage
): string | undefined {
  if (assigneeResolution.status !== 'ambiguous' && assigneeResolution.status !== 'unmatched') return undefined
  return (
    firstRelevantRecipientEmail(message, assigneeResolutionHints(assigneeResolution)) ||
    assigneeResolution.parsed?.email
  )
}

function assigneePendingHint(assigneeResolution: ReturnType<typeof useEmailSuggestionAssigneeResolution>):
  | {
      status: 'resolving' | 'ambiguous' | 'unmatched'
      raw: string
    }
  | undefined {
  if (!assigneeResolution.parsed) return undefined
  if (assigneeResolution.status === 'loading') {
    return { status: 'resolving', raw: assigneeResolution.parsed.raw }
  }
  if (assigneeResolution.status === 'ambiguous' || assigneeResolution.status === 'unmatched') {
    return { status: assigneeResolution.status, raw: assigneeResolution.parsed.raw }
  }
  return undefined
}

function assigneeLabels(t: TranslationFn, assigneeResolution: ReturnType<typeof useEmailSuggestionAssigneeResolution>) {
  const raw = assigneeResolution.parsed?.raw || ''
  return {
    assigneeLabel: t('email-suggestion-create-assignee-label'),
    searchPlaceholder: t('email-suggestion-create-assignee-search-placeholder'),
    loading: t('email-suggestion-create-assignee-loading'),
    empty: t('email-suggestion-create-assignee-empty'),
    loadMore: t('email-suggestion-create-assignee-load-more'),
    removeAria: t('email-suggestion-create-assignee-remove'),
    assigneePendingResolving: t('email-suggestion-create-assignee-resolving', { raw }),
    assigneePendingUnmatched: t('email-suggestion-create-assignee-unmatched', { raw }),
    assigneePendingAmbiguous: t('email-suggestion-create-assignee-ambiguous', { raw })
  }
}

export interface EmailSuggestionCreateActionProps {
  suggestion: EmailSummarizeSuggestion
  message: EmailMessage
  accessToken: string
  noSubjectLabel: string
  threadId?: string
  /** Platform user id for execute-dynamic `initiatorId` (e.g. `BusinessAppContextProps.userInfo.id`) */
  initiatorUserId?: string
  /** Active email account, used by the optional CRM entity picker for counterparty matching */
  activeAccount?: EmailAccount | null
  /** Current user employee id, used to populate `ownerEmployee` on entity-bound activities */
  employeeId?: string
  variant: 'thread' | 'crm' | 'reader'
  'data-testid'?: string
}

export const EmailSuggestionCreateAction: React.FC<EmailSuggestionCreateActionProps> = ({
  suggestion,
  message,
  accessToken,
  noSubjectLabel,
  threadId,
  initiatorUserId,
  activeAccount,
  employeeId,
  variant,
  'data-testid': testId = 'email-suggestion-create'
}) => {
  const { t } = useTranslation(translations)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submittingQuickTask, setSubmittingQuickTask] = useState(false)
  const [selectedEmployees, setSelectedEmployees] = useState<EmployeeLiteOption[]>([])
  const [selectedEntity, setSelectedEntity] = useState<CrmEntityMatch | null>(null)

  const kind: EmailSuggestionIntegrationKind = resolveSuggestionIntegrationKind(suggestion.integrationTarget)
  const confident = isSuggestionConfidentEnough(suggestion)
  const suggestionKey = stableEmailSuggestionKey(suggestion)
  const metadataAssigneeUserIds = useMemo(
    () => parseAssigneeUserIdsFromMetadata(suggestion.metadata),
    [suggestion.metadata]
  )
  const metadataHasAssigneeUserIds = metadataAssigneeUserIds.length > 0

  const contextData = useMemo<Record<string, any>>(() => {
    if (kind !== 'quickTask' && selectedEntity) {
      return buildActivityPayload(
        selectedEntity,
        message,
        buildSuggestionDescription(suggestion, message),
        employeeId,
        threadId,
        noSubjectLabel
      )
    }
    return buildSuggestionActivityContextData(suggestion, message, noSubjectLabel, threadId) as Record<string, any>
  }, [kind, selectedEntity, suggestion, message, employeeId, threadId, noSubjectLabel])

  useEffect(() => {
    if (!dialogOpen) return
    setSelectedEntity(null)
  }, [dialogOpen, suggestionKey])

  const button = buttonPresentation(variant)

  useEffect(() => {
    if (!dialogOpen || kind !== 'quickTask') return
    if (metadataAssigneeUserIds.length === 0) {
      setSelectedEmployees([])
      return
    }

    const fromMeta: EmployeeLiteOption[] = metadataAssigneeUserIds.map(id => ({
      id,
      userId: id,
      displayName: metadataAssigneeUserIds.length === 1 && suggestion.assignee ? suggestion.assignee : id
    }))
    setSelectedEmployees(fromMeta)
  }, [dialogOpen, kind, suggestionKey, metadataAssigneeUserIds, suggestion.assignee])

  const assigneeResolution = useEmailSuggestionAssigneeResolution({
    accessToken,
    rawAssignee: suggestion.assignee,
    enabled: dialogOpen && kind === 'quickTask' && !metadataHasAssigneeUserIds,
    cacheKey: suggestionKey
  })

  useEffect(() => {
    if (assigneeResolution.status !== 'matched' || !assigneeResolution.employee) return
    if (selectedEmployees.length > 0) return
    setSelectedEmployees([assigneeResolution.employee])
  }, [assigneeResolution.status, assigneeResolution.employee, selectedEmployees.length])

  const handleQuickTaskConfirm = useCallback(async () => {
    if (!accessToken) {
      toast.error(t('email-suggestion-create-quick-task-error'))
      return
    }
    if (!initiatorUserId) {
      toast.error(t('email-suggestion-create-quick-task-missing-initiator'))
      return
    }
    if (selectedEmployees.length === 0) {
      toast.error(t('email-suggestion-create-quick-task-missing-assignee'))
      return
    }

    setSubmittingQuickTask(true)
    try {
      const formData: QuickTaskFormData = {
        title: suggestion.title || message.subject || noSubjectLabel,
        message: buildQuickTaskMessage(suggestion, message, noSubjectLabel),
        documents: [],
        assignedUserIds: selectedEmployees.map(assigneeIdFromEmployee),
        dueDate: dueDateForQuickTask(suggestion.dueAt),
        ...entityFieldsFromSuggestionMetadata(suggestion.metadata)
      }

      await QuickTaskFlowService.executeQuickTask({
        formData,
        uploadResults: [],
        accessToken,
        initiatorId: initiatorUserId,
        apiBaseUrl: getCflowEndpoint()
      })

      toast.success(t('email-suggestion-create-quick-task-success'))
      setDialogOpen(false)
    } catch {
      toast.error(t('email-suggestion-create-quick-task-error'))
    } finally {
      setSubmittingQuickTask(false)
    }
  }, [accessToken, initiatorUserId, message, noSubjectLabel, selectedEmployees, suggestion, t])

  if (!confident) {
    return null
  }

  if (kind === 'calendarStub') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="gba:inline-flex">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled
                className="gba:text-xs gba:pointer-events-none gba:opacity-60"
                data-testid={`${testId}-stub`}
              >
                {t('email-suggestion-create-cta-coming-soon')}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{t('email-suggestion-create-stub-hint')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (kind === 'quickTask' && !initiatorUserId) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="gba:inline-flex">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled
                className="gba:text-xs gba:pointer-events-none gba:opacity-60"
                data-testid={`${testId}-quick-task-no-initiator`}
              >
                {t('email-suggestion-create-cta-quick-task')}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{t('email-suggestion-create-quick-task-hint-no-initiator')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const openLabel = openButtonLabel(kind, t)
  const title = dialogTitle(kind, t)
  const description = dialogDescription(kind, t)
  const labels = assigneeLabels(t, assigneeResolution)
  const initialSearchTerm = assigneeResolutionSearchTerm(assigneeResolution, message)
  const pendingHint = assigneePendingHint(assigneeResolution)

  return (
    <>
      <Button
        type="button"
        variant={button.variant}
        size="sm"
        className={button.className}
        onClick={() => setDialogOpen(true)}
        data-testid={`${testId}-open`}
      >
        {openLabel}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="gba:max-w-md gba:max-h-[90vh] gba:overflow-y-auto" data-testid={`${testId}-dialog`}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="gba:space-y-2 gba:text-sm gba:text-muted-foreground">
            <p className="gba:font-medium gba:text-foreground">{suggestion.title}</p>
            {suggestion.details ? <p>{suggestion.details}</p> : null}
          </div>

          {kind === 'quickTask' ? (
            <EmailSuggestionQuickTaskAssigneePicker
              accessToken={accessToken}
              selectedEmployees={selectedEmployees}
              onSelectedEmployeesChange={setSelectedEmployees}
              testIdPrefix={testId}
              labels={labels}
              initialSearchTerm={initialSearchTerm}
              pendingHint={pendingHint}
            />
          ) : null}

          {kind === 'crm' ? (
            <EmailCrmEntityPicker
              message={message}
              accessToken={accessToken}
              activeAccount={activeAccount}
              employeeId={employeeId}
              selectedEntity={selectedEntity}
              onSelectEntity={setSelectedEntity}
              data-testid={`${testId}-entity-picker`}
            />
          ) : null}

          <DialogFooter className="gba:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-testid={`${testId}-cancel`}
            >
              {t('email-suggestion-create-cancel')}
            </Button>
            {kind === 'quickTask' ? (
              <Button
                type="button"
                disabled={submittingQuickTask || selectedEmployees.length === 0}
                onClick={() => void handleQuickTaskConfirm()}
                data-testid={`${testId}-confirm-quick-task`}
              >
                {submittingQuickTask
                  ? t('email-suggestion-create-quick-task-submitting')
                  : t('email-suggestion-create-confirm')}
              </Button>
            ) : (
              <AppAction
                contexts={[
                  {
                    context: FlowContextName.customerActivityCreate,
                    contextData
                  }
                ]}
                accessToken={accessToken}
                mode="trigger"
                autoExecute
                emptyState="enable"
                data-testid={`${testId}-app-action`}
              >
                <Button type="button" data-testid={`${testId}-confirm`}>
                  {t('email-suggestion-create-confirm')}
                </Button>
              </AppAction>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
