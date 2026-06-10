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
  Button
} from '@newwork/nw-design-system'
import { SpinnerGapIcon } from '@phosphor-icons/react'

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
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel
}) => {
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
              {cancelLabel}
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
              {confirmLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
