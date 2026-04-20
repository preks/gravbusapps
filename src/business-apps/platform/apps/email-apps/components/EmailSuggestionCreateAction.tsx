/**
 * Explicit confirm + AppAction for CRM, or QuickTaskFlowService for blink / flow_engine.
 * Does not auto-run integrations; server output is treated as untrusted proposal.
 */

import React, { useCallback, useEffect, useState } from 'react'
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
import type { EmailSummarizeSuggestion, EmailMessage } from '../types'
import { buildSuggestionActivityContextData, isSuggestionConfidentEnough } from '../utils/suggestionActivityContext'
import {
  parseAssigneeUserIdsFromMetadata,
  resolveSuggestionIntegrationKind,
  type EmailSuggestionIntegrationKind
} from '../utils/emailSuggestionIntegrationKind'
import {
  assigneeIdFromEmployee,
  buildQuickTaskMessage,
  dueDateForQuickTask,
  entityFieldsFromSuggestionMetadata
} from '../utils/emailSuggestionQuickTaskHelpers'
import { stableEmailSuggestionKey } from '../utils/emailSummarizeSuggestionUtils'
import { EmailSuggestionQuickTaskAssigneePicker } from './EmailSuggestionQuickTaskAssigneePicker'

export interface EmailSuggestionCreateActionProps {
  suggestion: EmailSummarizeSuggestion
  message: EmailMessage
  accessToken: string
  noSubjectLabel: string
  threadId?: string
  /** Platform user id for execute-dynamic `initiatorId` (e.g. `BusinessAppContextProps.userInfo.id`) */
  initiatorUserId?: string
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
  variant,
  'data-testid': testId = 'email-suggestion-create'
}) => {
  const { t } = useTranslation(translations)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submittingQuickTask, setSubmittingQuickTask] = useState(false)
  const [selectedEmployees, setSelectedEmployees] = useState<EmployeeLiteOption[]>([])

  const kind: EmailSuggestionIntegrationKind = resolveSuggestionIntegrationKind(suggestion.integrationTarget)
  const confident = isSuggestionConfidentEnough(suggestion)
  const contextData = buildSuggestionActivityContextData(suggestion, message, noSubjectLabel, threadId)
  const suggestionKey = stableEmailSuggestionKey(suggestion)

  const buttonVariant = variant === 'thread' ? 'outline' : 'secondary'
  const buttonClass =
    variant === 'thread'
      ? 'gba:border-decorative-foreground/30 gba:text-decorative-foreground gba:text-xs'
      : 'gba:text-xs'

  useEffect(() => {
    if (!dialogOpen || kind !== 'quickTask') return
    const ids = parseAssigneeUserIdsFromMetadata(suggestion.metadata)
    const fromMeta: EmployeeLiteOption[] = ids.map(id => ({
      id,
      userId: id,
      displayName: ids.length === 1 && suggestion.assignee ? suggestion.assignee : id
    }))
    setSelectedEmployees(fromMeta)
  }, [dialogOpen, kind, suggestionKey, suggestion.metadata, suggestion.assignee])

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

  const openLabel =
    kind === 'quickTask' ? t('email-suggestion-create-cta-quick-task') : t('email-suggestion-create-cta-log-activity')

  const dialogTitle =
    kind === 'quickTask'
      ? t('email-suggestion-create-dialog-title-quick-task')
      : t('email-suggestion-create-dialog-title')

  const dialogDescription =
    kind === 'quickTask'
      ? t('email-suggestion-create-dialog-description-quick-task')
      : t('email-suggestion-create-dialog-description')

  const assigneeLabels = {
    assigneeLabel: t('email-suggestion-create-assignee-label'),
    searchPlaceholder: t('email-suggestion-create-assignee-search-placeholder'),
    loading: t('email-suggestion-create-assignee-loading'),
    empty: t('email-suggestion-create-assignee-empty'),
    loadMore: t('email-suggestion-create-assignee-load-more'),
    removeAria: t('email-suggestion-create-assignee-remove')
  }

  return (
    <>
      <Button
        type="button"
        variant={buttonVariant}
        size="sm"
        className={buttonClass}
        onClick={() => setDialogOpen(true)}
        data-testid={`${testId}-open`}
      >
        {openLabel}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="gba:max-w-md gba:max-h-[90vh] gba:overflow-y-auto" data-testid={`${testId}-dialog`}>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
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
              labels={assigneeLabels}
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
                    contextData: contextData as Record<string, any>
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
