import { useState, useCallback, useEffect } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import type { PageNumberNumeralStyle } from '../../types/document'
import translations from '../../_i18n'

const NUMERAL_STYLES: { value: PageNumberNumeralStyle; labelKey: string }[] = [
  { value: 'decimal', labelKey: 'page-numbers-format-style-decimal' },
  { value: 'lowerRoman', labelKey: 'page-numbers-format-style-lower-roman' },
  { value: 'upperRoman', labelKey: 'page-numbers-format-style-upper-roman' },
  { value: 'lowerAlpha', labelKey: 'page-numbers-format-style-lower-alpha' },
  { value: 'upperAlpha', labelKey: 'page-numbers-format-style-upper-alpha' }
]

export interface PageNumberFormatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialStyle: PageNumberNumeralStyle
  initialStartAt: number
  onConfirm: (style: PageNumberNumeralStyle, startAt: number) => void
  'data-testid'?: string
}

export function PageNumberFormatDialog({
  open,
  onOpenChange,
  initialStyle,
  initialStartAt,
  onConfirm,
  'data-testid': testId = 'page-number-format-dialog'
}: Readonly<PageNumberFormatDialogProps>) {
  const { t } = useTranslation(translations)
  const [style, setStyle] = useState<PageNumberNumeralStyle>(initialStyle)
  const [startAtStr, setStartAtStr] = useState(String(initialStartAt))

  useEffect(() => {
    if (open) {
      setStyle(initialStyle)
      setStartAtStr(String(initialStartAt))
    }
  }, [open, initialStyle, initialStartAt])

  const handleOk = useCallback(() => {
    const n = Math.max(1, Math.floor(Number.parseInt(startAtStr, 10) || 1))
    onConfirm(style, n)
    onOpenChange(false)
  }, [onConfirm, onOpenChange, startAtStr, style])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-md" data-testid={testId}>
        <DialogHeader>
          <DialogTitle>{t('page-numbers-format-title')}</DialogTitle>
        </DialogHeader>
        <div className="gba:flex gba:flex-col gba:gap-4 gba:py-2">
          <div className="gba:flex gba:flex-col gba:gap-2">
            <Label htmlFor={`${testId}-style`}>{t('page-numbers-format-numeral-style')}</Label>
            <Select value={style} onValueChange={v => setStyle(v as PageNumberNumeralStyle)}>
              <SelectTrigger id={`${testId}-style`} data-testid={`${testId}-style-trigger`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NUMERAL_STYLES.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} data-testid={`${testId}-style-${opt.value}`}>
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="gba:flex gba:flex-col gba:gap-2">
            <Label htmlFor={`${testId}-start`}>{t('page-numbers-format-start-at')}</Label>
            <Input
              id={`${testId}-start`}
              type="number"
              min={1}
              value={startAtStr}
              onChange={e => setStartAtStr(e.target.value)}
              data-testid={`${testId}-start-input`}
            />
          </div>
        </div>
        <DialogFooter className="gba:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid={`${testId}-cancel`}>
            {t('common-cancel')}
          </Button>
          <Button type="button" onClick={handleOk} data-testid={`${testId}-ok`}>
            {t('page-numbers-format-ok')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
