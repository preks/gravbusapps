/**
 * LinkEditor Component
 *
 * A component for editing markdown links in spreadsheet cells.
 * Allows editing both the link title and URL.
 */

import React, { useState, useEffect, useRef } from 'react'
import { Input, Label, Button, useTranslation } from '@newwork/nw-design-system'
import { ExternalLink } from 'lucide-react'
import { parseMarkdownLink, urlToMarkdown, isValidUrl } from '../utils/linkUtils'
import translations from '../_i18n'

export interface LinkEditorProps {
  /** The current markdown link value (e.g., "[title](url)") */
  value: string
  /** Callback when the link is saved */
  onSave: (value: string) => void
  /** Callback when editing is cancelled */
  onCancel: () => void
  /** Optional access token for future use */
  accessToken?: string
  /** Test ID for testing */
  'data-testid'?: string
}

export const LinkEditor: React.FC<LinkEditorProps> = ({
  value,
  onSave,
  onCancel,
  'data-testid': testId = 'link-editor'
}) => {
  const { t } = useTranslation(translations)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)

  // Parse the initial value
  useEffect(() => {
    const parsed = parseMarkdownLink(value)
    if (parsed) {
      setTitle(parsed.title)
      setUrl(parsed.url)
    } else if (isValidUrl(value)) {
      // If it's just a URL, use it as both title and URL
      setTitle(value)
      setUrl(value)
    } else {
      // If it's not a link, treat it as a new URL
      setTitle('')
      setUrl(value)
    }
  }, [value])

  // Focus title input on mount
  useEffect(() => {
    if (titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [])

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl)
    // Validate URL
    if (newUrl && !isValidUrl(newUrl)) {
      setUrlError(t('link-editor-invalid-url'))
    } else {
      setUrlError('')
    }
  }

  const handleSave = () => {
    const trimmedUrl = url.trim()
    const trimmedTitle = title.trim()

    // Validate URL
    if (!trimmedUrl) {
      setUrlError(t('link-editor-url-required'))
      urlInputRef.current?.focus()
      return
    }

    if (!isValidUrl(trimmedUrl)) {
      setUrlError(t('link-editor-invalid-url'))
      urlInputRef.current?.focus()
      return
    }

    // If title is empty, use URL as title
    const finalTitle = trimmedTitle || trimmedUrl
    const markdownLink = urlToMarkdown(trimmedUrl, finalTitle)
    onSave(markdownLink)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Stop all keyboard events from bubbling to parent (cell editor)
    e.stopPropagation()

    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Enter') {
      // Regular Enter - just prevent default, don't save (user is typing)
      e.preventDefault()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    } else if (e.key === 'Tab' && e.target === titleInputRef.current && !e.shiftKey) {
      // Allow tab to move to URL field
      e.preventDefault()
      urlInputRef.current?.focus()
    } else if (e.key === 'Tab' && e.target === urlInputRef.current && e.shiftKey) {
      // Shift+Tab from URL field moves back to title
      e.preventDefault()
      titleInputRef.current?.focus()
    }
  }

  return (
    <div
      className="gba:absolute gba:top-full gba:left-0 gba:z-50 gba:mt-1 gba:bg-card gba:border gba:border-border gba:rounded-md gba:shadow-lg gba:p-3 gba:min-w-[400px]"
      data-testid={testId}
      data-link-editor="true"
      onClick={e => e.stopPropagation()}
      onKeyDown={e => e.stopPropagation()}
      onKeyUp={e => e.stopPropagation()}
      onKeyPress={e => e.stopPropagation()}
    >
      <div className="gba:space-y-3">
        <div>
          <Label htmlFor="link-title" className="gba:text-xs gba:font-medium">
            {t('link-editor-title-label')}
          </Label>
          <Input
            ref={titleInputRef}
            id="link-title"
            value={title}
            onChange={e => {
              setTitle(e.target.value)
              e.stopPropagation()
            }}
            onKeyDown={handleKeyDown}
            onKeyUp={e => e.stopPropagation()}
            onKeyPress={e => e.stopPropagation()}
            onFocus={e => e.stopPropagation()}
            onBlur={e => e.stopPropagation()}
            placeholder={t('link-editor-title-placeholder')}
            className="gba:mt-1 gba:h-8 gba:text-sm"
            data-testid={`${testId}-title-input`}
            data-link-editor-input="true"
          />
        </div>

        <div>
          <Label htmlFor="link-url" className="gba:text-xs gba:font-medium">
            {t('link-editor-url-label')} <span className="gba:text-destructive">*</span>
          </Label>
          <div className="gba:relative gba:mt-1">
            <Input
              ref={urlInputRef}
              id="link-url"
              value={url}
              onChange={e => {
                handleUrlChange(e.target.value)
                e.stopPropagation()
              }}
              onKeyDown={handleKeyDown}
              onKeyUp={e => e.stopPropagation()}
              onKeyPress={e => e.stopPropagation()}
              onFocus={e => e.stopPropagation()}
              onBlur={e => e.stopPropagation()}
              placeholder={t('link-editor-url-placeholder')}
              className={`gba:h-8 gba:text-sm gba:pr-8 ${urlError ? 'gba:border-destructive' : ''}`}
              data-testid={`${testId}-url-input`}
              data-link-editor-input="true"
            />
            {url && isValidUrl(url) && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="gba:absolute gba:right-2 gba:top-1/2 gba:-translate-y-1/2 gba:text-muted-foreground hover:gba:text-primary"
                onClick={e => e.stopPropagation()}
                title={t('link-editor-open-new-tab')}
                data-testid={`${testId}-preview-link`}
              >
                <ExternalLink className="gba:w-4 gba:h-4" />
              </a>
            )}
          </div>
          {urlError && (
            <p className="gba:text-xs gba:text-destructive gba:mt-1" data-testid={`${testId}-url-error`}>
              {urlError}
            </p>
          )}
        </div>

        <div className="gba:flex gba:items-center gba:justify-end gba:gap-2 gba:pt-2 gba:border-t gba:border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="gba:h-7 gba:text-xs"
            data-testid={`${testId}-cancel-button`}
          >
            {t('checkpoint-cancel')}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            className="gba:h-7 gba:text-xs"
            disabled={!url.trim() || !!urlError}
            data-testid={`${testId}-save-button`}
          >
            {t('link-editor-save')}
          </Button>
        </div>
      </div>
    </div>
  )
}
