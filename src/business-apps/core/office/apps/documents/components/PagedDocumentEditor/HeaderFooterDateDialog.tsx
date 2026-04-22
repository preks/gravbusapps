import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../_i18n'
import { DATE_FORMAT_OPTIONS } from './headerFooterSidebarPresets'

export interface HeaderFooterDateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInsert: (text: string) => void
  'data-testid'?: string
}

export function HeaderFooterDateDialog({
  open,
  onOpenChange,
  onInsert,
  'data-testid': testId = 'header-footer-sidebar-date-dialog'
}: Readonly<HeaderFooterDateDialogProps>) {
  const { t } = useTranslation(translations)
  const [selectedId, setSelectedId] = useState(DATE_FORMAT_OPTIONS[0].id)

  const handleInsert = useCallback(() => {
    const opt = DATE_FORMAT_OPTIONS.find(o => o.id === selectedId) ?? DATE_FORMAT_OPTIONS[0]
    onInsert(opt.format(new Date()))
    onOpenChange(false)
  }, [onInsert, onOpenChange, selectedId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-md" data-testid={testId}>
        <DialogHeader>
          <DialogTitle>{t('header-footer-sidebar-date-dialog-title')}</DialogTitle>
        </DialogHeader>
        <div className="gba:flex gba:flex-col gba:gap-2 gba:py-2">
          {DATE_FORMAT_OPTIONS.map(opt => (
            <label
              key={opt.id}
              className="gba:flex gba:cursor-pointer gba:items-center gba:gap-2 gba:rounded-md gba:border gba:border-border/50 gba:px-3 gba:py-2 gba:text-sm hover:gba:bg-muted/30"
            >
              <input
                type="radio"
                name="hf-date-format"
                checked={selectedId === opt.id}
                onChange={() => setSelectedId(opt.id)}
                className="gba:accent-primary"
                data-testid={`${testId}-format-${opt.id}`}
              />
              <span>{t(opt.labelKey)}</span>
              <span className="gba:ml-auto gba:text-xs gba:text-muted-foreground">{opt.format(new Date())}</span>
            </label>
          ))}
        </div>
        <DialogFooter className="gba:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid={`${testId}-cancel`}>
            {t('common-cancel')}
          </Button>
          <Button type="button" onClick={handleInsert} data-testid={`${testId}-insert`}>
            {t('header-footer-sidebar-date-insert')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
