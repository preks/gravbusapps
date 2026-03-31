/**
 * Explicit confirm + AppAction for creating CRM activity drafts from AI suggestions.
 * Does not auto-run integrations; server output is treated as untrusted proposal.
 */

import React, { useState } from 'react'
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
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import translations from '../_i18n'
import type { EmailSummarizeSuggestion, EmailMessage } from '../types'
import { buildSuggestionActivityContextData, isSuggestionConfidentEnough } from '../utils/suggestionActivityContext'

function normalizeTarget(raw: string | undefined): string {
  return (raw || 'generic').trim().toLowerCase().replace(/-/g, '_')
}

function integrationKind(suggestion: EmailSummarizeSuggestion): 'crm' | 'stub' {
  const t = normalizeTarget(suggestion.integrationTarget)
  if (t === 'blink' || t === 'flow_engine' || t === 'calendar') return 'stub'
  return 'crm'
}

export interface EmailSuggestionCreateActionProps {
  suggestion: EmailSummarizeSuggestion
  message: EmailMessage
  accessToken: string
  noSubjectLabel: string
  threadId?: string
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
  variant,
  'data-testid': testId = 'email-suggestion-create'
}) => {
  const { t } = useTranslation(translations)
  const [dialogOpen, setDialogOpen] = useState(false)
  const kind = integrationKind(suggestion)
  const confident = isSuggestionConfidentEnough(suggestion)

  const contextData = buildSuggestionActivityContextData(suggestion, message, noSubjectLabel, threadId)

  const buttonVariant = variant === 'thread' ? 'outline' : 'secondary'
  const buttonClass =
    variant === 'thread'
      ? 'gba:border-decorative-foreground/30 gba:text-decorative-foreground gba:text-xs'
      : 'gba:text-xs'

  if (!confident) {
    return null
  }

  if (kind === 'stub') {
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
        {t('email-suggestion-create-cta-log-activity')}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="gba:max-w-md" data-testid={`${testId}-dialog`}>
          <DialogHeader>
            <DialogTitle>{t('email-suggestion-create-dialog-title')}</DialogTitle>
            <DialogDescription>{t('email-suggestion-create-dialog-description')}</DialogDescription>
          </DialogHeader>
          <div className="gba:space-y-2 gba:text-sm gba:text-muted-foreground">
            <p className="gba:font-medium gba:text-foreground">{suggestion.title}</p>
            {suggestion.details ? <p>{suggestion.details}</p> : null}
          </div>
          <DialogFooter className="gba:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-testid={`${testId}-cancel`}
            >
              {t('email-suggestion-create-cancel')}
            </Button>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
