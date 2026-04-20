import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import {
  formatPageNumeral,
  physicalPageToDisplayedPage
} from '@/components/tiptap-extensions/tiptap-custom-pagination/utils'
import type { DocumentPagesFormatting, PageNumberAlignment, PageNumberNumeralStyle } from '../../types/document'
import { normalizeStoredPagesFormatting } from '../../utils/pageLayoutUtils'
import translations from '../../_i18n'
import type { ApplyPageNumberPlacementParams } from './applyPageNumberPlacement'
import { PageNumbersDialogPreview } from './PageNumbersDialogPreview'
import { PAGE_NUMERAL_STYLE_OPTIONS, PAGE_NUMBERS_ALIGN_OPTIONS } from './pageNumbersDialogConstants'

const textAlignPattern = /text-align:\s*(\w+)/

function readTextAlignment(value?: string): string | undefined {
  return textAlignPattern.exec(value ?? '')?.[1]
}

function inferRegion(p: DocumentPagesFormatting): 'header' | 'footer' {
  if (p.pageNumberRegion === 'header' || p.pageNumberRegion === 'footer') {
    return p.pageNumberRegion
  }
  const inFooter = [p.footer, p.footerOdd, p.footerEven].some(s => (s ?? '').includes('{page}'))
  const inHeader = [p.header, p.headerOdd, p.headerEven].some(s => (s ?? '').includes('{page}'))
  if (inFooter && !inHeader) return 'footer'
  if (inHeader && !inFooter) return 'header'
  return 'footer'
}

function inferAlignment(p: DocumentPagesFormatting, region: 'header' | 'footer'): PageNumberAlignment {
  if (p.pageNumberAlignment) return p.pageNumberAlignment
  if (p.differentOddEven) {
    const odd = region === 'header' ? p.headerOdd : p.footerOdd
    const even = region === 'header' ? p.headerEven : p.footerEven
    const o = readTextAlignment(odd)
    const e = readTextAlignment(even)
    if (o === 'right' && e === 'left') return 'outside'
    if (o === 'left' && e === 'right') return 'inside'
  }
  const main = region === 'header' ? p.header : p.footer
  const a = readTextAlignment(main)
  if (a === 'left') return 'left'
  if (a === 'right') return 'right'
  return 'center'
}

function inferShowOnFirst(p: DocumentPagesFormatting, region: 'header' | 'footer'): boolean {
  if (typeof p.pageNumberShowOnFirstPage === 'boolean') return p.pageNumberShowOnFirstPage
  if (!p.differentFirstPage) return true
  const first = region === 'header' ? p.headerFirstPage : p.footerFirstPage
  return Boolean((first ?? '').includes('{page}'))
}

export interface PageNumbersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pages: DocumentPagesFormatting | undefined
  onApply: (params: ApplyPageNumberPlacementParams) => void
  /**
   * When set (e.g. user opened the dialog while editing header or footer), placement is fixed to that band
   * and the header/footer position control is hidden.
   */
  lockedPosition?: 'header' | 'footer'
  'data-testid'?: string
}

type NumberingMode = 'continue' | 'custom'

export function PageNumbersDialog({
  open,
  onOpenChange,
  pages,
  onApply,
  lockedPosition,
  'data-testid': testId = 'page-numbers-dialog'
}: Readonly<PageNumbersDialogProps>) {
  const { t } = useTranslation(translations)

  const [region, setRegion] = useState<'header' | 'footer'>('footer')
  const [alignment, setAlignment] = useState<PageNumberAlignment>('center')
  const [showOnFirst, setShowOnFirst] = useState(true)
  const [numeralStyle, setNumeralStyle] = useState<PageNumberNumeralStyle>('decimal')
  const [numberingMode, setNumberingMode] = useState<NumberingMode>('continue')
  const [startAtInput, setStartAtInput] = useState('1')

  useEffect(() => {
    if (!open) return
    const p = normalizeStoredPagesFormatting(pages) ?? {}
    const r = lockedPosition ?? inferRegion(p)
    const start = Math.max(1, p.pageNumberStartAt ?? 1)
    setRegion(r)
    setAlignment(inferAlignment(p, r))
    setShowOnFirst(inferShowOnFirst(p, r))
    setNumeralStyle(p.pageNumberNumeralStyle ?? 'decimal')
    setStartAtInput(String(start))
    setNumberingMode(start > 1 ? 'custom' : 'continue')
  }, [open, pages, lockedPosition])

  const handleNumberingModeChange = useCallback((mode: NumberingMode) => {
    setNumberingMode(mode)
    if (mode === 'continue') {
      setStartAtInput('1')
    }
  }, [])

  const effectiveRegion = lockedPosition ?? region

  const handleOk = useCallback(() => {
    const n = numberingMode === 'continue' ? 1 : Math.max(1, Math.floor(Number.parseInt(startAtInput, 10) || 1))
    onApply({
      position: effectiveRegion,
      alignment,
      showOnFirstPage: showOnFirst,
      numeralStyle,
      startAt: n
    })
    onOpenChange(false)
  }, [alignment, effectiveRegion, numberingMode, numeralStyle, onApply, onOpenChange, showOnFirst, startAtInput])

  const effectiveStartAt =
    numberingMode === 'continue' ? 1 : Math.max(1, Math.floor(Number.parseInt(startAtInput, 10) || 1))
  const n1 = physicalPageToDisplayedPage(1, effectiveStartAt)
  const n2 = physicalPageToDisplayedPage(2, effectiveStartAt)
  const label1 = formatPageNumeral(n1, numeralStyle)
  const label2 = formatPageNumeral(n2, numeralStyle)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-lg" data-testid={testId}>
        <DialogHeader>
          <DialogTitle>{t('page-numbers-settings-dialog-title')}</DialogTitle>
        </DialogHeader>
        <div className="gba:flex gba:flex-col gba:gap-5 gba:py-2">
          <div className="gba:flex gba:flex-col gba:gap-2">
            <Label htmlFor={`${testId}-numeral`}>{t('page-numbers-number-format-label')}</Label>
            <Select value={numeralStyle} onValueChange={v => setNumeralStyle(v as PageNumberNumeralStyle)}>
              <SelectTrigger id={`${testId}-numeral`} data-testid={`${testId}-numeral-style`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_NUMERAL_STYLE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} data-testid={`${testId}-style-${opt.value}`}>
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="gba:flex gba:flex-col gba:gap-2">
            <p className="gba:text-sm gba:font-medium gba:text-foreground">
              {t('page-numbers-page-numbering-heading')}
            </p>
            <RadioGroup
              value={numberingMode}
              onValueChange={v => handleNumberingModeChange(v as NumberingMode)}
              className="gba:gap-3"
              data-testid={`${testId}-numbering-mode`}
            >
              <div className="gba:flex gba:flex-col gba:gap-1">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <RadioGroupItem
                    value="continue"
                    id={`${testId}-mode-continue`}
                    data-testid={`${testId}-mode-continue`}
                  />
                  <Label htmlFor={`${testId}-mode-continue`} className="gba:font-normal gba:cursor-pointer">
                    {t('page-numbers-continue-from-previous')}
                  </Label>
                </div>
                <p className="gba:mb-0 gba:ps-6 gba:text-xs gba:text-muted-foreground">
                  {t('page-numbers-sections-hint')}
                </p>
              </div>
              <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                <RadioGroupItem value="custom" id={`${testId}-mode-custom`} data-testid={`${testId}-mode-custom`} />
                <Label htmlFor={`${testId}-mode-custom`} className="gba:font-normal gba:cursor-pointer">
                  {t('page-numbers-start-at-label')}
                </Label>
                <Input
                  type="number"
                  min={1}
                  className="gba:h-9 gba:w-20"
                  disabled={numberingMode !== 'custom'}
                  value={startAtInput}
                  onChange={e => setStartAtInput(e.target.value)}
                  data-testid={`${testId}-start-at-input`}
                />
              </div>
            </RadioGroup>
          </div>

          <div className="gba:flex gba:flex-col gba:gap-2 gba:pt-1">
            {!lockedPosition && (
              <div className="gba:flex gba:flex-col gba:gap-2">
                <Label>{t('page-numbers-position')}</Label>
                <Select value={region} onValueChange={v => setRegion(v as 'header' | 'footer')}>
                  <SelectTrigger data-testid={`${testId}-position`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="header" data-testid={`${testId}-position-header`}>
                      {t('page-numbers-position-header')}
                    </SelectItem>
                    <SelectItem value="footer" data-testid={`${testId}-position-footer`}>
                      {t('page-numbers-position-footer')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="gba:flex gba:flex-col gba:gap-2">
              <Label>{t('page-numbers-alignment')}</Label>
              <Select value={alignment} onValueChange={v => setAlignment(v as PageNumberAlignment)}>
                <SelectTrigger data-testid={`${testId}-alignment`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_NUMBERS_ALIGN_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} data-testid={`${testId}-align-${opt.value}`}>
                      {t(opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(alignment === 'inside' || alignment === 'outside') && (
                <p className="gba:text-xs gba:text-muted-foreground">{t('page-numbers-align-facing-hint')}</p>
              )}
            </div>

            <div className="gba:flex gba:items-center gba:gap-2">
              <Checkbox
                id={`${testId}-first`}
                checked={showOnFirst}
                onCheckedChange={v => setShowOnFirst(v === true)}
                data-testid={`${testId}-show-first`}
              />
              <Label htmlFor={`${testId}-first`} className="gba:font-normal gba:cursor-pointer">
                {t('page-numbers-show-on-first')}
              </Label>
            </div>

            <PageNumbersDialogPreview
              testId={testId}
              region={effectiveRegion}
              alignment={alignment}
              labelPage1={label1}
              labelPage2={label2}
            />
          </div>
        </div>
        <DialogFooter className="gba:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid={`${testId}-cancel`}>
            {t('common-cancel')}
          </Button>
          <Button type="button" onClick={handleOk} data-testid={`${testId}-ok`}>
            {t('page-numbers-ok')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
