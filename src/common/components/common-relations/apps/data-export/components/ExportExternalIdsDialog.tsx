import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  useTranslation
} from '@newwork/nw-design-system'
import type { ExportFieldDefinition } from '../types/exportFieldTypes'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import translations from '../_i18n'

export interface ExportExternalIdsDialogProps<TEntity = unknown> {
  open: boolean
  onOpenChange: (open: boolean) => void
  externalIdFields: ExportFieldDefinition<TEntity>[]
  selectedExternalIdKeys: string[]
  onExternalIdToggle: (fieldKey: string, checked: boolean) => void
  onConfirm: () => void
  isExporting?: boolean
  prefixDataTestId?: string
}

export const ExportExternalIdsDialog = <TEntity,>({
  open,
  onOpenChange,
  externalIdFields,
  selectedExternalIdKeys,
  onExternalIdToggle,
  onConfirm,
  isExporting = false,
  prefixDataTestId = 'ExportExternalIdsDialog'
}: ExportExternalIdsDialogProps<TEntity>) => {
  const { t } = useTranslation(translations)
  const selectedSet = new Set(selectedExternalIdKeys)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-md" data-testid={formatDataTestId(prefixDataTestId, 'dialog')}>
        <DialogHeader>
          <DialogTitle>{t('external-ids-dialog-title')}</DialogTitle>
          <DialogDescription>{t('external-ids-dialog-description')}</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-3 gba:py-2">
          {externalIdFields.map(field => (
            <div key={field.key} className="gba:flex gba:items-center gba:gap-2">
              <Checkbox
                id={`export-external-id-${field.key}`}
                checked={selectedSet.has(field.key)}
                onCheckedChange={checked => onExternalIdToggle(field.key, checked === true)}
                data-testid={formatDataTestId(prefixDataTestId, `field-${field.key}`)}
              />
              <Label htmlFor={`export-external-id-${field.key}`} className="gba:cursor-pointer gba:text-sm">
                {field.label}
              </Label>
            </div>
          ))}
        </div>

        <DialogFooter className="gba:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
            data-testid={formatDataTestId(prefixDataTestId, 'cancel')}
          >
            {t('external-ids-dialog-cancel')}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isExporting}
            data-testid={formatDataTestId(prefixDataTestId, 'confirm')}
          >
            {isExporting ? t('exporting-label') : t('external-ids-dialog-confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
