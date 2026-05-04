/**
 * LinkDialog Component - Dialog for adding/editing hyperlinks in text elements.
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  useTranslation
} from '@newwork/nw-design-system'
import { ArrowSquareOutIcon, LinkIcon, TrashIcon } from '@phosphor-icons/react'
import { isValidUrl, sanitizeLinkUrl } from '../utils/linkUtils'
import translations from '../_i18n'

export interface LinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedText: string
  initialUrl?: string
  onSave: (url: string) => void
  onRemove?: () => void
  'data-testid'?: string
}

export const LinkDialog: React.FC<LinkDialogProps> = ({
  open,
  onOpenChange,
  selectedText,
  initialUrl = '',
  onSave,
  onRemove,
  'data-testid': testId = 'link-dialog'
}) => {
  const { t } = useTranslation(translations)

  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isEditing = Boolean(initialUrl)

  useEffect(() => {
    if (open) {
      setUrl(initialUrl || '')
      setError(null)
    }
  }, [open, initialUrl])

  const validateUrl = useCallback(
    (value: string): boolean => {
      if (!value.trim()) {
        setError(t('link-url-required') || 'URL is required')
        return false
      }

      if (!isValidUrl(value)) {
        setError(t('link-url-invalid') || 'Invalid URL')
        return false
      }

      setError(null)
      return true
    },
    [t]
  )

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setUrl(value)
      if (error && value.trim()) {
        validateUrl(value)
      }
    },
    [error, validateUrl]
  )

  const handleSave = useCallback(() => {
    if (!validateUrl(url)) return

    const sanitized = sanitizeLinkUrl(url)
    if (sanitized) {
      onSave(sanitized)
      onOpenChange(false)
    } else {
      setError(t('link-url-invalid') || 'Invalid URL')
    }
  }, [url, validateUrl, onSave, onOpenChange, t])

  const handleRemove = useCallback(() => {
    onRemove?.()
    onOpenChange(false)
  }, [onRemove, onOpenChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSave()
      }
    },
    [handleSave]
  )

  const previewUrl = sanitizeLinkUrl(url)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-md gba:p-0 gba:gap-0 gba:overflow-hidden" data-testid={testId}>
        <DialogHeader className="gba:px-6 gba:pt-6 gba:pb-4">
          <DialogTitle className="gba:flex gba:items-center gba:gap-2 gba:text-xl gba:font-semibold gba:tracking-tight">
            <LinkIcon className="gba:h-5 gba:w-5 gba:text-primary" />
            {isEditing ? t('link-edit') || 'Edit Link' : t('link-add') || 'Add Link'}
          </DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-5 gba:px-6 gba:pb-6">
          {selectedText && (
            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                {t('link-selected-text') || 'Selected text'}
              </Label>
              <div
                className="gba:max-h-24 gba:overflow-auto gba:rounded-md gba:border gba:border-border gba:bg-muted/40 gba:px-3 gba:py-2.5 gba:text-sm gba:leading-5 gba:break-words"
                data-testid={`${testId}-selected-text`}
              >
                {selectedText}
              </div>
            </div>
          )}

          <div className="gba:space-y-2">
            <Label htmlFor="link-url" className="gba:text-sm gba:font-medium">
              {t('link-url-label') || 'URL'}
            </Label>
            <Input
              id="link-url"
              type="url"
              value={url}
              onChange={handleUrlChange}
              onKeyDown={handleKeyDown}
              placeholder={t('link-url-placeholder') || 'https://example.com'}
              autoFocus
              data-testid={`${testId}-url-input`}
            />
            {error && <p className="gba:text-sm gba:text-destructive">{error}</p>}
          </div>

          {previewUrl && (
            <div
              className="gba:flex gba:items-start gba:gap-2 gba:rounded-md gba:border gba:border-border gba:bg-muted/20 gba:px-3 gba:py-2.5 gba:text-sm"
              data-testid={`${testId}-preview`}
            >
              <ArrowSquareOutIcon className="gba:mt-0.5 gba:h-4 gba:w-4 gba:shrink-0 gba:text-muted-foreground" />
              <div className="gba:min-w-0 gba:flex-1">
                <p className="gba:text-xs gba:font-medium gba:uppercase gba:tracking-wide gba:text-muted-foreground">
                  {t('link-click-to-open') || 'Click to open'}
                </p>
                <p className="gba:mt-1 gba:break-all gba:text-primary">{previewUrl}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:border-t gba:bg-muted/30 gba:px-6 gba:py-4">
          <div className="gba:flex gba:flex-1">
            {isEditing && onRemove && (
              <Button variant="destructive" size="sm" onClick={handleRemove} data-testid={`${testId}-remove-btn`}>
                <TrashIcon className="gba:mr-1 gba:h-4 gba:w-4" />
                {t('link-remove') || 'Remove Link'}
              </Button>
            )}
          </div>
          <div className="gba:flex gba:flex-wrap gba:justify-end gba:gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid={`${testId}-cancel-btn`}>
              {t('link-cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleSave} disabled={!url.trim()} data-testid={`${testId}-save-btn`}>
              {isEditing ? t('link-update') || 'Update' : t('link-add-btn') || 'Add Link'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default LinkDialog
