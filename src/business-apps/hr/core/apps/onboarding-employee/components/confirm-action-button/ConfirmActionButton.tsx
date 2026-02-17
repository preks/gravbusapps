import React, { useState } from 'react'
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
  Icon,
  toast
} from '@newwork/nw-design-system'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'

export interface ConfirmActionButtonProps {
  /** Phosphor icon for the trigger button (e.g. X). */
  triggerIcon: PhosphorIcon
  /** Dialog title. */
  title: string
  /** Dialog description. */
  description: string
  /** Label for the confirm button. */
  confirmLabel: string
  /** Label for the cancel button. */
  cancelLabel: string
  /** Called when user confirms. Dialog closes after resolve. */
  onConfirm: () => Promise<void>
  /** Confirm button variant. */
  confirmVariant?: 'default' | 'destructive'
  /** Aria-label for the trigger (icon-only). */
  ariaLabel?: string
  /** data-testid for the trigger. */
  'data-testid'?: string
}

export const ConfirmActionButton: React.FC<ConfirmActionButtonProps> = ({
  triggerIcon,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  confirmVariant = 'default',
  ariaLabel,
  'data-testid': dataTestId
}) => {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label={ariaLabel} data-testid={dataTestId}>
        <Icon icon={triggerIcon} />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isLoading}
              className={
                confirmVariant === 'destructive'
                  ? 'gba:bg-destructive gba:text-destructive-foreground gba:hover:bg-destructive/90'
                  : undefined
              }
            >
              {isLoading ? '…' : confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
