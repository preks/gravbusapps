import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button
} from '@newwork/nw-design-system'

interface ConfirmSkillActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  variant?: 'default' | 'destructive'
  isLoading?: boolean
  hideConfirm?: boolean
}

export default function ConfirmSkillActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'default',
  isLoading,
  hideConfirm = false
}: Readonly<ConfirmSkillActionDialogProps>) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{cancelLabel}</AlertDialogCancel>
          {!hideConfirm && (
            <Button
              type="button"
              onClick={() => void onConfirm()}
              disabled={isLoading}
              variant={variant}
              className={
                variant === 'destructive'
                  ? 'gba:bg-destructive gba:text-destructive-foreground gba:hover:bg-destructive/90'
                  : ''
              }
            >
              {isLoading ? 'Processing...' : confirmLabel}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
