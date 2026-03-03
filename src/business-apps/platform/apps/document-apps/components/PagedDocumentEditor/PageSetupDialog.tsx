/**
 * Page setup dialog (Google Docs-style): Pages tab (size, orientation, margins, page colour) and Pageless tab.
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import type { DocumentFormatting, PageSizeId } from '../../types'
import { resolvePageLayout, getDefaultPageLayout, PAGE_SIZE_LABELS } from '../../utils/pageLayoutUtils'
import translations from '../../_i18n'

const PAGE_SIZE_IDS: PageSizeId[] = ['A4', 'A3', 'A5', 'LETTER', 'LEGAL', 'TABLOID']

export interface PageSetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formatting: DocumentFormatting
  onApply: (formatting: DocumentFormatting) => void
  'data-testid'?: string
}

export function PageSetupDialog({
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
  const [pageless, setPageless] = useState(layout.pageless)

  useEffect(() => {
    if (open) {
      const l = resolvePageLayout(formatting)
      setPageSize(l.pageSize)
      setOrientation(l.orientation)
      setMargins(l.margins)
      setPageColor(l.pageColor ?? '#ffffff')
      setPageless(l.pageless)
    }
  }, [open, formatting])

  const handleOk = () => {
    const next: DocumentFormatting = {
      ...formatting,
      ...getDefaultPageLayout(),
      pageSize,
      orientation,
      margins: { ...margins },
      marginUnit: 'cm',
      pageColor,
      pageless
    }
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

        <Tabs defaultValue="pages" className="gba:w-full">
          <TabsList className="gba:w-full gba:grid gba:grid-cols-2">
            <TabsTrigger value="pages" data-testid="page-setup-tab-pages">
              {t('page-setup-tab-pages')}
            </TabsTrigger>
            <TabsTrigger value="pageless" data-testid="page-setup-tab-pageless">
              {t('page-setup-tab-pageless')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pages" className="gba:space-y-4 gba:pt-4">
            <div className="gba:space-y-2">
              <Label>{t('page-setup-orientation')}</Label>
              <div className="gba:flex gba:gap-4">
                <label className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
                  <input
                    type="radio"
                    name="orientation"
                    checked={orientation === 'portrait'}
                    onChange={() => setOrientation('portrait')}
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
                    onChange={() => setOrientation('landscape')}
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
                onValueChange={v => setPageSize(v as PageSizeId)}
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
                        {label} ({meta.widthCm} cm × {meta.heightCm} cm)
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
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
          </TabsContent>

          <TabsContent value="pageless" className="gba:space-y-4 gba:pt-4">
            <label className="gba:flex gba:items-start gba:gap-3 gba:cursor-pointer">
              <input
                type="checkbox"
                checked={pageless}
                onChange={e => setPageless(e.target.checked)}
                aria-label={t('page-setup-use-pageless')}
                data-testid="page-setup-use-pageless"
                className="gba:mt-1 gba:rounded"
              />
              <div>
                <span className="gba:font-medium">{t('page-setup-use-pageless')}</span>
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{t('page-setup-pageless-description')}</p>
              </div>
            </label>
          </TabsContent>
        </Tabs>

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
