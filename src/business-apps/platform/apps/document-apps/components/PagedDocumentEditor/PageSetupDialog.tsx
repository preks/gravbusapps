/**
 * Page setup dialog (Google Docs-style): size, orientation, margins, page colour.
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import type { DocumentFormatting, PageSizeId } from '../../types'
import {
  resolvePageLayout,
  getDefaultPageLayout,
  PAGE_SIZE_LABELS,
  clampCustomPageDimensionCm,
  omitCustomPageDimensions,
  MIN_CUSTOM_PAGE_CM,
  MAX_CUSTOM_PAGE_CM
} from '../../utils/pageLayoutUtils'
import translations from '../../_i18n'

const PAGE_SIZE_IDS: PageSizeId[] = ['A4', 'A3', 'A5', 'LETTER', 'LEGAL', 'TABLOID', 'CUSTOM']

/** Stored portrait width/height (cm) → width/height fields for the current orientation (Word-style). */
function toDisplayDimensions(
  portraitWidthCm: number,
  portraitHeightCm: number,
  orientation: 'portrait' | 'landscape'
): { width: number; height: number } {
  if (orientation === 'portrait') {
    return { width: portraitWidthCm, height: portraitHeightCm }
  }
  return { width: portraitHeightCm, height: portraitWidthCm }
}

/** Width/height field values (current orientation) → portrait dimensions for storage. */
function toPortraitStoredCm(
  displayWidthCm: number,
  displayHeightCm: number,
  orientation: 'portrait' | 'landscape'
): { portraitWidthCm: number; portraitHeightCm: number } {
  if (orientation === 'portrait') {
    return { portraitWidthCm: displayWidthCm, portraitHeightCm: displayHeightCm }
  }
  return { portraitWidthCm: displayHeightCm, portraitHeightCm: displayWidthCm }
}

export interface PageSetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formatting: DocumentFormatting
  onApply: (formatting: DocumentFormatting) => void
  'data-testid'?: string
}

export default function PageSetupDialog({
  open,
  onOpenChange,
  formatting,
  onApply,
  'data-testid': testId = 'page-setup-dialog'
}: Readonly<PageSetupDialogProps>) {
  const { t } = useTranslation(translations)
  const layout = resolvePageLayout(formatting)

  const [pageSize, setPageSize] = useState<PageSizeId>(layout.pageSize)
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(layout.orientation)
  const [margins, setMargins] = useState(layout.margins)
  const [pageColor, setPageColor] = useState(layout.pageColor ?? '#ffffff')
  const [customDisplay, setCustomDisplay] = useState(() =>
    toDisplayDimensions(
      layout.customPageWidthCm ?? PAGE_SIZE_LABELS.A4.widthCm,
      layout.customPageHeightCm ?? PAGE_SIZE_LABELS.A4.heightCm,
      layout.orientation
    )
  )

  useEffect(() => {
    if (open) {
      const l = resolvePageLayout(formatting)
      setPageSize(l.pageSize)
      setOrientation(l.orientation)
      setMargins(l.margins)
      setPageColor(l.pageColor ?? '#ffffff')
      const pw = l.customPageWidthCm ?? PAGE_SIZE_LABELS.A4.widthCm
      const ph = l.customPageHeightCm ?? PAGE_SIZE_LABELS.A4.heightCm
      setCustomDisplay(toDisplayDimensions(pw, ph, l.orientation))
    }
  }, [open, formatting])

  const handleOk = () => {
    const base: DocumentFormatting = {
      ...getDefaultPageLayout(),
      ...omitCustomPageDimensions(formatting),
      pageSize,
      orientation,
      margins: { ...margins },
      marginUnit: 'cm',
      pageColor,
      pageless: layout.pageless ?? false
    }
    const next: DocumentFormatting =
      pageSize === 'CUSTOM'
        ? (() => {
            const { portraitWidthCm, portraitHeightCm } = toPortraitStoredCm(
              customDisplay.width,
              customDisplay.height,
              orientation
            )
            return {
              ...base,
              customPageWidthCm: clampCustomPageDimensionCm(portraitWidthCm, PAGE_SIZE_LABELS.A4.widthCm),
              customPageHeightCm: clampCustomPageDimensionCm(portraitHeightCm, PAGE_SIZE_LABELS.A4.heightCm)
            }
          })()
        : base
    onApply(next)
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-lg" data-testid={testId}>
        <DialogHeader>
          <DialogTitle>{t('page-setup-title')}</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:pt-4">
          <div className="gba:space-y-2">
            <Label>{t('page-setup-orientation')}</Label>
            <div className="gba:flex gba:gap-4">
              <label className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
                <input
                  type="radio"
                  name="orientation"
                  checked={orientation === 'portrait'}
                  onChange={() => {
                    if (orientation === 'landscape' && pageSize === 'CUSTOM') {
                      setCustomDisplay(d => ({ width: d.height, height: d.width }))
                    }
                    setOrientation('portrait')
                  }}
                  data-testid="page-setup-orientation-portrait"
                  className="gba:rounded-full"
                />
                <span>{t('page-setup-portrait')}</span>
              </label>
              <label className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
                <input
                  type="radio"
                  name="orientation"
                  checked={orientation === 'landscape'}
                  onChange={() => {
                    if (orientation === 'portrait' && pageSize === 'CUSTOM') {
                      setCustomDisplay(d => ({ width: d.height, height: d.width }))
                    }
                    setOrientation('landscape')
                  }}
                  data-testid="page-setup-orientation-landscape"
                  className="gba:rounded-full"
                />
                <span>{t('page-setup-landscape')}</span>
              </label>
            </div>
          </div>

          <div className="gba:space-y-2">
            <Label>{t('page-setup-paper-size')}</Label>
            <Select
              value={pageSize}
              onValueChange={v => {
                const id = v as PageSizeId
                if (id === 'CUSTOM' && pageSize !== 'CUSTOM') {
                  const meta = PAGE_SIZE_LABELS[pageSize]
                  setCustomDisplay(toDisplayDimensions(meta.widthCm, meta.heightCm, orientation))
                }
                setPageSize(id)
              }}
              data-testid="page-setup-paper-size"
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_IDS.map(id => {
                  const meta = PAGE_SIZE_LABELS[id]
                  const label = t(meta.labelKey)
                  return (
                    <SelectItem key={id} value={id}>
                      {id === 'CUSTOM' ? (
                        label
                      ) : (
                        <>
                          {label} ({meta.widthCm} cm × {meta.heightCm} cm)
                        </>
                      )}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            {pageSize === 'CUSTOM' ? (
              <div className="gba:grid gba:grid-cols-2 gba:gap-3 gba:pt-1">
                <div className="gba:space-y-1">
                  <Label className="gba:text-muted-foreground gba:text-xs">{t('page-setup-custom-width-cm')}</Label>
                  <Input
                    type="number"
                    min={MIN_CUSTOM_PAGE_CM}
                    max={MAX_CUSTOM_PAGE_CM}
                    step={0.1}
                    value={customDisplay.width}
                    onChange={e => setCustomDisplay(d => ({ ...d, width: Number(e.target.value) || 0 }))}
                    data-testid="page-setup-custom-width-cm"
                  />
                </div>
                <div className="gba:space-y-1">
                  <Label className="gba:text-muted-foreground gba:text-xs">{t('page-setup-custom-height-cm')}</Label>
                  <Input
                    type="number"
                    min={MIN_CUSTOM_PAGE_CM}
                    max={MAX_CUSTOM_PAGE_CM}
                    step={0.1}
                    value={customDisplay.height}
                    onChange={e => setCustomDisplay(d => ({ ...d, height: Number(e.target.value) || 0 }))}
                    data-testid="page-setup-custom-height-cm"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="gba:space-y-2">
            <Label>{t('page-setup-page-colour')}</Label>
            <div className="gba:flex gba:items-center gba:gap-2">
              <input
                type="color"
                value={pageColor}
                onChange={e => setPageColor(e.target.value)}
                className="gba:h-10 gba:w-14 gba:cursor-pointer gba:rounded gba:border"
                data-testid="page-setup-page-colour"
              />
              <Input
                value={pageColor}
                onChange={e => setPageColor(e.target.value)}
                className="gba:flex-1 gba:font-mono gba:text-sm"
                maxLength={7}
              />
            </div>
          </div>

          <div className="gba:space-y-2">
            <Label>{t('page-setup-margins-cm')}</Label>
            <div className="gba:grid gba:grid-cols-2 gba:gap-3">
              <div className="gba:space-y-1">
                <Label className="gba:text-muted-foreground gba:text-xs">{t('page-setup-margin-top')}</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={margins.top}
                  onChange={e => setMargins(m => ({ ...m, top: Number(e.target.value) || 0 }))}
                  data-testid="page-setup-margin-top"
                />
              </div>
              <div className="gba:space-y-1">
                <Label className="gba:text-muted-foreground gba:text-xs">{t('page-setup-margin-bottom')}</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={margins.bottom}
                  onChange={e => setMargins(m => ({ ...m, bottom: Number(e.target.value) || 0 }))}
                  data-testid="page-setup-margin-bottom"
                />
              </div>
              <div className="gba:space-y-1">
                <Label className="gba:text-muted-foreground gba:text-xs">{t('page-setup-margin-left')}</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={margins.left}
                  onChange={e => setMargins(m => ({ ...m, left: Number(e.target.value) || 0 }))}
                  data-testid="page-setup-margin-left"
                />
              </div>
              <div className="gba:space-y-1">
                <Label className="gba:text-muted-foreground gba:text-xs">{t('page-setup-margin-right')}</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={margins.right}
                  onChange={e => setMargins(m => ({ ...m, right: Number(e.target.value) || 0 }))}
                  data-testid="page-setup-margin-right"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} data-testid="page-setup-cancel">
            {t('page-setup-cancel')}
          </Button>
          <Button onClick={handleOk} data-testid="page-setup-ok">
            {t('page-setup-ok')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
