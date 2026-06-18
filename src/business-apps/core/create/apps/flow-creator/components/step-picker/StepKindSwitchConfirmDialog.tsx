import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../_i18n'
import type { StepKindSwitchConfirmLevel } from './stepKindSwitchImpact'

interface StepKindSwitchConfirmDialogProps {
  open: boolean
  level: StepKindSwitchConfirmLevel
  onConfirm: () => void
  onCancel: () => void
  'data-testid'?: string
}

export const StepKindSwitchConfirmDialog: React.FC<StepKindSwitchConfirmDialogProps> = ({
  open,
  level,
  onConfirm,
  onCancel,
  'data-testid': testId = 'flow-studio-step-kind-switch-confirm'
}) => {
  const { t } = useTranslation(translations)

  if (level === 'none') return null

  const titleKey =
    level === 'soft' ? 'step-kind-switch-confirm-soft-title' : 'step-kind-switch-confirm-destructive-title'
  const descriptionKey =
    level === 'soft' ? 'step-kind-switch-confirm-soft-desc' : 'step-kind-switch-confirm-destructive-desc'

  return (
    <AlertDialog open={open} onOpenChange={nextOpen => !nextOpen && onCancel()}>
      <AlertDialogContent data-testid={testId}>
        <AlertDialogHeader>
          <AlertDialogTitle data-testid={`${testId}-title`}>{t(titleKey)}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription data-testid={`${testId}-description`} className="gba:text-sm gba:text-muted-foreground">
          {t(descriptionKey)}
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} data-testid={`${testId}-cancel`}>
            {t('step-kind-switch-confirm-cancel')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} data-testid={`${testId}-confirm`}>
            {t('step-kind-switch-confirm-action')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
