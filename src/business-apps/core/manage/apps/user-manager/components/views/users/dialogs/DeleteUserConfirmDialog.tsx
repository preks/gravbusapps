import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useTranslation
} from '@newwork/nw-design-system'
import { WarningIcon } from '@phosphor-icons/react'
import translations from '../../../../_i18n'

export interface DeleteUserConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  error: string | null
  submitting: boolean
  onConfirm: () => void
}

export const DeleteUserConfirmDialog = ({
  open,
  onOpenChange,
  error,
  submitting,
  onConfirm
}: DeleteUserConfirmDialogProps) => {
  const { t } = useTranslation(translations)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="user-management-delete-dialog">
        <DialogHeader>
          <DialogTitle>{t('user-management-delete-title')}</DialogTitle>
        </DialogHeader>
        {error && (
          <Alert variant="destructive" data-testid="user-management-delete-error">
            <WarningIcon className="gba:h-4 gba:w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <p className="gba:text-sm gba:text-muted-foreground">{t('user-management-delete-confirm')}</p>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="user-management-delete-cancel"
          >
            {t('user-management-action-cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={submitting}
            onClick={onConfirm}
            data-testid="user-management-delete-confirm-button"
          >
            {t('user-management-delete-submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
