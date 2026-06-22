// Reusable confirmation dialog built on the design system's AlertDialog.
// Replaces native window.confirm() so destructive actions (archive/activate)
// get a contained, on-brand modal with a busy state.

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
  Button,
  useTranslation
} from '@newwork/nw-design-system'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import translations from '../../_i18n'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  /** Styles the confirm button as destructive (red). */
  destructive?: boolean
  /** When true, disables actions and shows a spinner on the confirm button. */
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  busy = false,
  onConfirm,
  onCancel
}) => {
  const { t } = useTranslation(translations)
  const resolvedConfirmLabel = confirmLabel ?? t('agents-confirm-label')
  const resolvedCancelLabel = cancelLabel ?? t('agents-cancel-label')

  return (
    <AlertDialog
      open={open}
      onOpenChange={next => {
        if (!next && !busy) onCancel()
      }}
    >
      <AlertDialogContent data-testid="confirm-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={busy} onClick={onCancel} data-testid="confirm-dialog-cancel">
              {resolvedCancelLabel}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant={destructive ? 'destructive' : 'default'}
              disabled={busy}
              onClick={event => {
                // Keep the dialog mounted so we can show the busy state; the
                // caller closes it once the async action settles.
                event.preventDefault()
                onConfirm()
              }}
              data-testid="confirm-dialog-confirm"
            >
              {busy && <SpinnerGapIcon className="gba:mr-1.5 gba:h-3.5 gba:w-3.5 gba:animate-spin" />}
              {resolvedConfirmLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
