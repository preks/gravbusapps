import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
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
import { PageNumberFormatDialog } from './PageNumberFormatDialog'

const ALIGN_OPTIONS: { value: PageNumberAlignment; labelKey: string }[] = [
  { value: 'left', labelKey: 'page-numbers-align-left' },
  { value: 'center', labelKey: 'page-numbers-align-center' },
  { value: 'right', labelKey: 'page-numbers-align-right' },
  { value: 'inside', labelKey: 'page-numbers-align-inside' },
  { value: 'outside', labelKey: 'page-numbers-align-outside' }
]
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
  'data-testid'?: string
}

export function PageNumbersDialog({
  open,
  onOpenChange,
  pages,
  onApply,
  'data-testid': testId = 'page-numbers-dialog'
}: Readonly<PageNumbersDialogProps>) {
  const { t } = useTranslation(translations)

  const [region, setRegion] = useState<'header' | 'footer'>('footer')
  const [alignment, setAlignment] = useState<PageNumberAlignment>('center')
  const [showOnFirst, setShowOnFirst] = useState(true)
  const [numeralStyle, setNumeralStyle] = useState<PageNumberNumeralStyle>('decimal')
  const [startAt, setStartAt] = useState(1)
  const [formatOpen, setFormatOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const p = normalizeStoredPagesFormatting(pages) ?? {}
    const r = inferRegion(p)
    setRegion(r)
    setAlignment(inferAlignment(p, r))
    setShowOnFirst(inferShowOnFirst(p, r))
    setNumeralStyle(p.pageNumberNumeralStyle ?? 'decimal')
    setStartAt(p.pageNumberStartAt ?? 1)
  }, [open, pages])

  const handleFormatConfirm = useCallback((style: PageNumberNumeralStyle, n: number) => {
    setNumeralStyle(style)
    setStartAt(n)
  }, [])

  const handleOk = useCallback(() => {
    onApply({
      position: region,
      alignment,
      showOnFirstPage: showOnFirst,
      numeralStyle,
      startAt
    })
    onOpenChange(false)
  }, [alignment, numeralStyle, onApply, onOpenChange, region, showOnFirst, startAt])

  const n1 = physicalPageToDisplayedPage(1, startAt)
  const n2 = physicalPageToDisplayedPage(2, startAt)
  const label1 = formatPageNumeral(n1, numeralStyle)
  const label2 = formatPageNumeral(n2, numeralStyle)

  /** Inside uses gutter inset in preview; outside = flush outer edge (differs from plain left/right). */
  const previewBandLayout = (oddMiniPage: boolean) => {
    const row = 'gba:flex gba:w-full'
    switch (alignment) {
      case 'left':
        return `${row} gba:justify-start`
      case 'right':
        return `${row} gba:justify-end`
      case 'center':
        return `${row} gba:justify-center`
      case 'outside':
        return oddMiniPage ? `${row} gba:justify-end` : `${row} gba:justify-start`
      case 'inside':
        return oddMiniPage ? `${row} gba:justify-start` : `${row} gba:justify-end`
      default:
        return `${row} gba:justify-center`
    }
  }

  const renderPreviewBand = (label: string, oddMiniPage: boolean) => {
    return <div className={`${bandClass} ${previewBandLayout(oddMiniPage)} gba:text-muted-foreground`}>{label}</div>
  }

  const bandClass =
    region === 'header'
      ? 'gba:border-b gba:border-border gba:pb-1'
      : 'gba:border-t gba:border-border gba:pt-1 gba:mt-auto'

  return (
    <>
      <PageNumberFormatDialog
        open={formatOpen}
        onOpenChange={setFormatOpen}
        initialStyle={numeralStyle}
        initialStartAt={startAt}
        onConfirm={handleFormatConfirm}
        data-testid={`${testId}-format`}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gba:max-w-lg" data-testid={testId}>
          <DialogHeader>
            <DialogTitle>{t('page-numbers-dialog-title')}</DialogTitle>
          </DialogHeader>
          <div className="gba:flex gba:flex-col gba:gap-4 gba:py-2">
            <p className="gba:text-sm gba:text-muted-foreground">{t('page-numbers-dialog-warning')}</p>

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

            <div className="gba:flex gba:flex-col gba:gap-2">
              <Label>{t('page-numbers-alignment')}</Label>
              <Select value={alignment} onValueChange={v => setAlignment(v as PageNumberAlignment)}>
                <SelectTrigger data-testid={`${testId}-alignment`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALIGN_OPTIONS.map(opt => (
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

            <div>
              <p className="gba:mb-2 gba:text-sm gba:font-medium">{t('page-numbers-preview')}</p>
              <div className="gba:flex gba:gap-3 gba:justify-center">
                <div
                  className="gba:flex gba:h-28 gba:w-24 gba:flex-col gba:rounded-md gba:border gba:border-border gba:bg-card gba:p-2 gba:text-xs gba:shadow-sm"
                  data-testid={`${testId}-preview-page-1`}
                >
                  <div
                    className={`gba:flex-1 gba:min-h-0 ${region === 'header' ? 'gba:flex gba:flex-col' : 'gba:flex gba:flex-col gba:justify-end'}`}
                  >
                    {region === 'header' && renderPreviewBand(label1, true)}
                    <div className="gba:flex-1 gba:border gba:border-dashed gba:border-border/40 gba:rounded-sm gba:bg-muted/20" />
                    {region === 'footer' && renderPreviewBand(label1, true)}
                  </div>
                </div>
                <div
                  className="gba:flex gba:h-28 gba:w-24 gba:flex-col gba:rounded-md gba:border gba:border-border gba:bg-card gba:p-2 gba:text-xs gba:shadow-sm"
                  data-testid={`${testId}-preview-page-2`}
                >
                  <div
                    className={`gba:flex-1 gba:min-h-0 ${region === 'header' ? 'gba:flex gba:flex-col' : 'gba:flex gba:flex-col gba:justify-end'}`}
                  >
                    {region === 'header' && renderPreviewBand(label2, false)}
                    <div className="gba:flex-1 gba:border gba:border-dashed gba:border-border/40 gba:rounded-sm gba:bg-muted/20" />
                    {region === 'footer' && renderPreviewBand(label2, false)}
                  </div>
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="gba:self-start"
              onClick={() => setFormatOpen(true)}
              data-testid={`${testId}-format-btn`}
            >
              {t('page-numbers-format-button')}
            </Button>
          </div>
          <DialogFooter className="gba:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid={`${testId}-cancel`}
            >
              {t('common-cancel')}
            </Button>
            <Button type="button" onClick={handleOk} data-testid={`${testId}-ok`}>
              {t('page-numbers-ok')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
