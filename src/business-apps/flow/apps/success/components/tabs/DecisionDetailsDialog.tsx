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
import { formatDateTime, formatMillisecondsDuration, formatStatusLabel } from '../../utils/formatters'

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
  const decisionTitle = entry?.decisionTitle || entry?.stepReference || t('value-not-available')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-3xl" data-testid={testId}>
        <DialogHeader>
          <DialogTitle>{decisionTitle}</DialogTitle>
          <DialogDescription>
            {entry?.flowName || entry?.flowId || t('value-not-available')}
            {entry?.createdAt ? ` · ${formatDateTime(entry.createdAt)}` : ''}
          </DialogDescription>
        </DialogHeader>

        {entry ? (
          <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:md:grid-cols-2">
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
              <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">{t('decisions-duration')}</span>
              <span className="gba:text-sm gba:text-foreground">{formatMillisecondsDuration(entry.durationMs)}</span>
            </div>
            <div className="gba:flex gba:flex-col gba:gap-1 gba:md:col-span-2">
              <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground">
                {t('decisions-escalation')}
              </span>
              <span className="gba:text-sm gba:text-foreground">
                {entry.escalated ? t('decisions-escalated') : t('decisions-direct')}
              </span>
              {entry.escalationReason ? (
                <span className="gba:text-sm gba:text-muted-foreground">{entry.escalationReason}</span>
              ) : null}
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
