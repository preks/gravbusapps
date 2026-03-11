import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../_i18n'
import type { DecisionLogEntry } from '../../hooks/useDecisionData'
import { getDecisionStepDisplayLabel } from '../../utils/decisionLabels'
import { formatDateTime, formatStatusLabel } from '../../utils/formatters'

interface DecisionDetailsDialogProps {
  entry: DecisionLogEntry | null
  actorName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  'data-testid'?: string
}

function formatJson(value: unknown): string {
  if (value == null) return '{}'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function getDecisionPathLabel(entry: DecisionLogEntry, t: (key: string) => string): string {
  if (entry.decisionMode === 'AI' && entry.escalated) return t('decisions-ai-escalated-to-user')
  if (entry.decisionMode === 'AI') return t('decisions-ai-direct')
  if (entry.decisionMode === 'USER') return t('decisions-user-direct')
  if (entry.decisionMode === 'LOGIC') return t('decisions-logic-direct')
  return formatStatusLabel(entry.decisionMode)
}

function getEscalationLabel(entry: DecisionLogEntry, t: (key: string) => string): string {
  if (!entry.escalated) return '-'
  return t('decisions-ai-escalated-to-user')
}

export const DecisionDetailsDialog: React.FC<DecisionDetailsDialogProps> = ({
  entry,
  actorName,
  open,
  onOpenChange,
  'data-testid': testId = 'decision-details-dialog'
}) => {
  const { t } = useTranslation(translations)
  const selectedBranchLabel = entry?.selectedBranchLabel || entry?.selectedBranch || t('value-not-available')
  const selectedBranchId = entry?.selectedBranch || ''
  const aiSuggestedBranch = entry?.aiSuggestedBranch || t('value-not-available')
  const decisionTitle = entry ? getDecisionStepDisplayLabel(entry, t('value-not-available')) : t('value-not-available')
  const decisionPath = entry ? getDecisionPathLabel(entry, t) : t('value-not-available')
  const escalationLabel = entry ? getEscalationLabel(entry, t) : t('value-not-available')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:flex gba:max-h-screen gba:max-w-3xl gba:flex-col gba:overflow-hidden"
        data-testid={testId}
      >
        <DialogHeader>
          <DialogTitle>{decisionTitle}</DialogTitle>
          <DialogDescription>
            {entry?.flowName || entry?.flowId || t('value-not-available')}
            {entry?.createdAt ? ` · ${formatDateTime(entry.createdAt)}` : ''}
          </DialogDescription>
        </DialogHeader>

        {entry ? (
          <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:overflow-y-auto gba:pr-1 gba:md:grid-cols-2">
            <div className="gba:flex gba:flex-col gba:gap-1">
              <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">
                {t('decisions-decided-by')}
              </span>
              <span className="gba:text-sm gba:text-foreground">
                {actorName || entry.decidedBy || t('value-not-available')}
              </span>
            </div>
            <div className="gba:flex gba:flex-col gba:gap-1">
              <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">{t('decisions-mode')}</span>
              <span className="gba:text-sm gba:text-foreground">{formatStatusLabel(entry.decisionMode)}</span>
            </div>
            <div className="gba:flex gba:flex-col gba:gap-1">
              <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">{t('decisions-path')}</span>
              <span className="gba:text-sm gba:text-foreground">{decisionPath}</span>
            </div>
            <div className="gba:flex gba:flex-col gba:gap-1">
              <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">
                {t('decisions-confidence')}
              </span>
              <span className="gba:text-sm gba:text-foreground">
                {entry.confidence == null ? t('value-not-available') : `${Math.round(entry.confidence * 100)}%`}
              </span>
            </div>
            <div className="gba:flex gba:flex-col gba:gap-1">
              <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">
                {t('decisions-selected-branch')}
              </span>
              <span className="gba:text-sm gba:text-foreground">{selectedBranchLabel}</span>
              {selectedBranchId && selectedBranchId !== selectedBranchLabel ? (
                <span className="gba:text-xs gba:text-muted-foreground">
                  {t('decisions-branch-id')}: {selectedBranchId}
                </span>
              ) : null}
            </div>
            <div className="gba:flex gba:flex-col gba:gap-1">
              <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">
                {t('decisions-ai-suggested-branch')}
              </span>
              <span className="gba:text-sm gba:text-foreground">{aiSuggestedBranch}</span>
            </div>
            <div className="gba:flex gba:flex-col gba:gap-1 gba:md:col-span-2">
              <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">
                {t('decisions-escalation')}
              </span>
              <span className="gba:text-sm gba:text-foreground">{escalationLabel}</span>
              {entry.escalationReason ? (
                <span className="gba:text-sm gba:text-muted-foreground">{entry.escalationReason}</span>
              ) : null}
            </div>
            <div className="gba:flex gba:flex-col gba:gap-1">
              <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">
                {t('decisions-branch-agreement-title')}
              </span>
              <span className="gba:text-sm gba:text-foreground">
                {entry.branchAgreement == null
                  ? t('value-not-available')
                  : entry.branchAgreement
                    ? t('decisions-branch-agreement-match')
                    : t('decisions-branch-agreement-mismatch')}
              </span>
            </div>
            <div className="gba:flex gba:flex-col gba:gap-1">
              <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">{t('decisions-duration')}</span>
              <span className="gba:text-sm gba:text-foreground">
                {entry.durationMs > 0 ? `${entry.durationMs}ms` : t('value-not-available')}
              </span>
            </div>
            <div className="gba:flex gba:flex-col gba:gap-1">
              <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">{t('decisions-prompt')}</span>
              <span className="gba:text-sm gba:text-foreground">
                {entry.promptName
                  ? `${entry.promptName}${typeof entry.promptVersion === 'number' ? ` v${entry.promptVersion}` : ''}`
                  : t('value-not-available')}
              </span>
            </div>
            <div className="gba:flex gba:flex-col gba:gap-1">
              <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">{t('decisions-policy')}</span>
              <span className="gba:text-sm gba:text-foreground">
                {entry.policyDocumentTitle
                  ? `${entry.policyDocumentTitle}${entry.policyDocumentVersion ? ` · ${entry.policyDocumentVersion}` : ''}`
                  : t('value-not-available')}
              </span>
            </div>
            <div className="gba:flex gba:flex-col gba:gap-1 gba:md:col-span-2">
              <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">
                {t('decisions-prompt-execution-id')}
              </span>
              <span className="gba:text-sm gba:text-foreground">
                {entry.promptExecutionId || t('value-not-available')}
              </span>
            </div>
            <div className="gba:flex gba:flex-col gba:gap-1 gba:md:col-span-2">
              <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">
                {t('decisions-instructions')}
              </span>
              <span className="gba:text-sm gba:whitespace-pre-wrap gba:text-foreground">
                {entry.decisionInstructions || t('decisions-no-instructions')}
              </span>
            </div>
            <div className="gba:flex gba:flex-col gba:gap-1 gba:md:col-span-2">
              <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">
                {t('decisions-human-review-instructions')}
              </span>
              <span className="gba:text-sm gba:whitespace-pre-wrap gba:text-foreground">
                {entry.humanReviewInstructions || t('decisions-no-human-review-instructions')}
              </span>
            </div>
            <div className="gba:flex gba:flex-col gba:gap-1 gba:md:col-span-2">
              <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">
                {t('decisions-reasoning')}
              </span>
              <span className="gba:text-sm gba:text-foreground">
                {entry.decisionReasoning || t('decisions-no-reasoning')}
              </span>
            </div>
            <div className="gba:flex gba:flex-col gba:gap-2 gba:md:col-span-2">
              <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">{t('decisions-input')}</span>
              <pre className="gba:max-h-56 gba:overflow-auto gba:rounded-lg gba:bg-muted gba:p-3 gba:text-xs gba:text-foreground">
                {formatJson(entry.decisionInput)}
              </pre>
            </div>
            <div className="gba:flex gba:flex-col gba:gap-2 gba:md:col-span-2">
              <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">{t('decisions-output')}</span>
              <pre className="gba:max-h-56 gba:overflow-auto gba:rounded-lg gba:bg-muted gba:p-3 gba:text-xs gba:text-foreground">
                {formatJson(entry.decisionOutput)}
              </pre>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
