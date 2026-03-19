import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../_i18n'

interface AbsenceSetupDeleteDialogProps {
  open: boolean
  entityLabel: string
  name: string
  isDeleting: boolean
  blockedReason?: string
  errorMessage?: string
  onCancel: () => void
  onConfirm: () => Promise<void>
}

export function AbsenceSetupDeleteDialog({
  open,
  entityLabel,
  name,
  isDeleting,
  blockedReason,
  errorMessage,
  onCancel,
  onConfirm
}: AbsenceSetupDeleteDialogProps) {
  const { t } = useTranslation(translations)
  void blockedReason
  const messageToShow = errorMessage || ''

  return (
    <Dialog open={open} onOpenChange={nextOpen => !nextOpen && onCancel()}>
      <DialogContent data-testid="absence-setup-delete-dialog" className="gba:max-w-md gba:overflow-hidden gba:p-0">
        <DialogHeader className="gba:border-b gba:border-border gba:bg-muted/20 gba:px-6 gba:py-5">
          <DialogTitle>{t('delete-catalog-entry-title', { entity: entityLabel })}</DialogTitle>
          <DialogDescription>{t('delete-catalog-entry-description', { name, entity: entityLabel })}</DialogDescription>
        </DialogHeader>
        {messageToShow ? (
          <div className="gba:mx-6 gba:mt-4 gba:rounded-xl gba:border gba:border-red-200 gba:bg-red-50 gba:px-4 gba:py-3 gba:text-sm gba:text-red-700">
            {messageToShow}
          </div>
        ) : null}
        <div className="gba:flex gba:justify-end gba:gap-2 gba:px-6 gba:py-4">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isDeleting}>
            {t('cancel-button')}
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={onConfirm}
            disabled={isDeleting}
            data-testid="absence-setup-delete-confirm"
          >
            {isDeleting ? t('saving-button') : t('delete-button')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
