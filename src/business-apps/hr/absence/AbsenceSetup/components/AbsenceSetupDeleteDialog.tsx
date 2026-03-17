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
  onCancel: () => void
  onConfirm: () => Promise<void>
}

export function AbsenceSetupDeleteDialog({
  open,
  entityLabel,
  name,
  isDeleting,
  onCancel,
  onConfirm
}: AbsenceSetupDeleteDialogProps) {
  const { t } = useTranslation(translations)

  return (
    <Dialog open={open} onOpenChange={nextOpen => !nextOpen && onCancel()}>
      <DialogContent data-testid="absence-setup-delete-dialog" className="gba:max-w-md gba:overflow-hidden gba:p-0">
        <DialogHeader className="gba:border-b gba:border-border gba:bg-muted/20 gba:px-6 gba:py-5">
          <DialogTitle>{t('delete-catalog-entry-title', { entity: entityLabel })}</DialogTitle>
          <DialogDescription>{t('delete-catalog-entry-description', { name, entity: entityLabel })}</DialogDescription>
        </DialogHeader>
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
