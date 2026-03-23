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
import { Link, Trash2, ExternalLink } from 'lucide-react'
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
      <DialogContent className="gba:max-w-md" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Link className="gba:w-5 gba:h-5 gba:text-primary" />
            {isEditing ? t('link-edit') || 'Edit Link' : t('link-add') || 'Add Link'}
          </DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          {selectedText && (
            <div className="gba:space-y-1">
              <Label className="gba:text-sm gba:text-muted-foreground">
                {t('link-selected-text') || 'Selected text'}
              </Label>
              <div className="gba:p-2 gba:rounded gba:bg-muted gba:text-sm gba:truncate">{selectedText}</div>
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
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
              <ExternalLink className="gba:w-4 gba:h-4" />
              <span className="gba:truncate">{t('link-click-to-open') || 'Opens in new tab'}:</span>
              <span className="gba:truncate gba:text-primary">{previewUrl}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gba:flex gba:justify-between">
          <div>
            {isEditing && onRemove && (
              <Button variant="destructive" size="sm" onClick={handleRemove} data-testid={`${testId}-remove-btn`}>
                <Trash2 className="gba:w-4 gba:h-4 gba:mr-1" />
                {t('link-remove') || 'Remove Link'}
              </Button>
            )}
          </div>
          <div className="gba:flex gba:gap-2">
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
