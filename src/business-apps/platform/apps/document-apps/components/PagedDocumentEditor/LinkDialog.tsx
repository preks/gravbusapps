/**
 * Link dialog for insert/edit hyperlinks (Google Docs / Word style).
 * URL, optional display text, open in new tab; Apply, Remove link, Cancel.
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Checkbox,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../_i18n'
import { isAllowedHref, normalizeLinkHref } from '../../utils/linkUtils'

export type LinkDialogMode = 'insert' | 'edit'

export interface LinkDialogInitialValues {
  href: string
  displayText?: string
  openInNewTab?: boolean
}

export interface LinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: LinkDialogMode
  initialValues?: LinkDialogInitialValues
  onApply: (values: { href: string; displayText?: string; openInNewTab: boolean }) => void
  onRemoveLink?: () => void
  'data-testid'?: string
}

export function LinkDialog({
  open,
  onOpenChange,
  mode,
  initialValues,
  onApply,
  onRemoveLink,
  'data-testid': testId = 'link-dialog'
}: LinkDialogProps) {
  const { t } = useTranslation(translations)
  const [url, setUrl] = useState(initialValues?.href ?? '')
  const [displayText, setDisplayText] = useState(initialValues?.displayText ?? '')
  const [openInNewTab, setOpenInNewTab] = useState(initialValues?.openInNewTab ?? false)
  const [urlError, setUrlError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setUrl(initialValues?.href ?? '')
      setDisplayText(initialValues?.displayText ?? '')
      setOpenInNewTab(initialValues?.openInNewTab ?? false)
      setUrlError(null)
    }
  }, [open, initialValues?.href, initialValues?.displayText, initialValues?.openInNewTab])

  const handleApply = () => {
    const normalized = normalizeLinkHref(url.trim())
    if (!normalized) {
      setUrlError(t('link-dialog-invalid-url'))
      return
    }
    if (!isAllowedHref(normalized)) {
      setUrlError(t('link-dialog-invalid-url'))
      return
    }
    setUrlError(null)
    onApply({
      href: normalized,
      displayText: displayText.trim() || undefined,
      openInNewTab
    })
    onOpenChange(false)
  }

  const handleRemove = () => {
    onRemoveLink?.()
    onOpenChange(false)
  }

  const handleCancel = () => {
    setUrlError(null)
    onOpenChange(false)
  }

  const titleKey = mode === 'edit' ? 'link-dialog-title-edit' : 'link-dialog-title-insert'
  const canApply = url.trim().length > 0
  const showRemove = mode === 'edit' && onRemoveLink != null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-md" data-testid={testId}>
        <DialogHeader>
          <DialogTitle data-testid="link-dialog-title">{t(titleKey)}</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:pt-2">
          <div className="gba:space-y-2">
            <Label htmlFor="link-dialog-url">{t('link-dialog-url-label')}</Label>
            <Input
              id="link-dialog-url"
              value={url}
              onChange={e => {
                setUrl(e.target.value)
                setUrlError(null)
              }}
              placeholder={t('link-dialog-url-placeholder')}
              data-testid="link-dialog-url"
              className="gba:w-full"
            />
            {urlError && (
              <p className="gba:text-sm gba:text-destructive" data-testid="link-dialog-url-error" role="alert">
                {urlError}
              </p>
            )}
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="link-dialog-text">{t('link-dialog-text-label')}</Label>
            <Input
              id="link-dialog-text"
              value={displayText}
              onChange={e => setDisplayText(e.target.value)}
              placeholder={t('link-dialog-text-placeholder')}
              data-testid="link-dialog-text"
              className="gba:w-full"
            />
          </div>

          <div className="gba:flex gba:items-center gba:gap-2">
            <Checkbox
              id="link-dialog-new-tab"
              checked={openInNewTab}
              onCheckedChange={checked => setOpenInNewTab(checked === true)}
              data-testid="link-dialog-open-new-tab"
            />
            <Label htmlFor="link-dialog-new-tab" className="gba:cursor-pointer gba:font-normal">
              {t('link-dialog-open-new-tab')}
            </Label>
          </div>
        </div>

        <DialogFooter className="gba:gap-2 gba:pt-4">
          {showRemove && (
            <Button variant="destructive" onClick={handleRemove} data-testid="link-dialog-remove-link">
              {t('link-dialog-remove-link')}
            </Button>
          )}
          <div className="gba:flex-1" />
          <Button variant="outline" onClick={handleCancel} data-testid="link-dialog-cancel">
            {t('link-dialog-cancel')}
          </Button>
          <Button onClick={handleApply} disabled={!canApply} data-testid="link-dialog-apply">
            {t('link-dialog-apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
