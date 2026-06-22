// Reusable confirmation modal for destructive workforce actions.
//
// Kept inside the enterprise-workforce folder (no design-system
// dependency beyond the existing primitives we already use) so the
// scope of this change stays tight. The modal is intentionally generic:
// pass in title / description / button label and the action callback,
// and the caller owns the "in flight" + "error" state.

import { Button, useTranslation } from '@newwork/nw-design-system'
import { SpinnerGapIcon, WarningIcon, XIcon } from '@phosphor-icons/react'
import React, { useCallback } from 'react'
import translations from '../../_i18n'

export type ConfirmActionTone = 'destructive' | 'primary'

export interface ConfirmActionModalProps {
  open: boolean
  title: string
  description: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  tone?: ConfirmActionTone
  isBusy?: boolean
  errorMessage?: string | null
  onCancel: () => void
  onConfirm: () => void | Promise<void>
  // Optional override for the test id prefix so multiple instances on
  // the same screen do not collide in tests.
  testIdPrefix?: string
}

const TONE_STYLES: Record<ConfirmActionTone, string> = {
  destructive:
    'gba:bg-destructive gba:text-destructive-foreground gba:hover:bg-destructive/90 gba:focus:ring-destructive',
  primary: 'gba:bg-primary gba:text-primary-foreground gba:hover:bg-primary/90 gba:focus:ring-primary'
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = 'destructive',
  isBusy = false,
  errorMessage = null,
  onCancel,
  onConfirm,
  testIdPrefix = 'workforce-confirm'
}) => {
  const { t } = useTranslation(translations)
  const resolvedCancelLabel = cancelLabel ?? t('action-cancel')
  const handleConfirm = useCallback(() => {
    if (isBusy) return
    void onConfirm()
  }, [isBusy, onConfirm])

  if (!open) return null

  return (
    <div
      className="gba:fixed gba:inset-0 gba:z-[70] gba:flex gba:items-center gba:justify-center gba:bg-background/70 gba:p-4 gba:backdrop-blur-sm"
      data-testid={`${testIdPrefix}-modal`}
      role="dialog"
      aria-modal="true"
    >
      <div className="gba:flex gba:w-full gba:max-w-md gba:flex-col gba:overflow-hidden gba:rounded-2xl gba:border gba:border-border gba:bg-background gba:shadow-2xl">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:border-b gba:border-border/60 gba:px-5 gba:py-4">
          <div className="gba:flex gba:items-start gba:gap-3">
            {tone === 'destructive' && (
              <div className="gba:mt-0.5 gba:flex gba:h-9 gba:w-9 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-xl gba:bg-destructive/10 gba:text-destructive">
                <WarningIcon className="gba:h-5 gba:w-5" weight="duotone" />
              </div>
            )}
            <div>
              <h2 className="gba:text-base gba:font-semibold gba:text-foreground">{title}</h2>
              <div className="gba:mt-1 gba:text-xs gba:text-muted-foreground">{description}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="gba:inline-flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-lg gba:text-muted-foreground gba:hover:bg-muted/60 gba:hover:text-foreground gba:disabled:opacity-50"
            aria-label={resolvedCancelLabel}
            data-testid={`${testIdPrefix}-close`}
          >
            <XIcon className="gba:h-4 gba:w-4" />
          </button>
        </div>

        {errorMessage && (
          <div
            className="gba:border-b gba:border-destructive/30 gba:bg-destructive/5 gba:px-5 gba:py-2 gba:text-xs gba:text-destructive"
            role="alert"
            data-testid={`${testIdPrefix}-error`}
          >
            {errorMessage}
          </div>
        )}

        <div className="gba:flex gba:items-center gba:justify-end gba:gap-2 gba:bg-muted/20 gba:px-5 gba:py-3">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isBusy} data-testid={`${testIdPrefix}-cancel`}>
            {resolvedCancelLabel}
          </Button>
          <button
            type="button"
            disabled={isBusy}
            onClick={handleConfirm}
            className={`gba:inline-flex gba:h-9 gba:items-center gba:justify-center gba:gap-1.5 gba:rounded-md gba:px-4 gba:text-sm gba:font-medium gba:shadow-sm gba:transition-colors gba:disabled:cursor-not-allowed gba:disabled:opacity-50 ${TONE_STYLES[tone]}`}
            data-testid={`${testIdPrefix}-confirm`}
          >
            {isBusy && <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />}
            {isBusy ? t('action-working') : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
