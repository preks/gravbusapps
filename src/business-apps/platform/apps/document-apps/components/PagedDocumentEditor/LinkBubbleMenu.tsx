/**
 * Bubble menu content when selection is on a link: Edit, Remove link, Open link, Open in new tab.
 */

import React, { useCallback } from 'react'
import { Editor } from '@tiptap/react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { Pencil, Unlink, ExternalLink, SquareArrowOutUpRight } from 'lucide-react'
import translations from '../../_i18n'
import { isAllowedHref } from '../../utils/linkUtils'

export interface LinkBubbleMenuProps {
  editor: Editor
  onEdit: () => void
  'data-testid'?: string
}

export function LinkBubbleMenu({ editor, onEdit, 'data-testid': testId = 'link-bubble-menu' }: LinkBubbleMenuProps) {
  const { t } = useTranslation(translations)

  const href = editor.getAttributes('link').href as string | undefined

  const handleRemoveLink = useCallback(() => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
  }, [editor])

  const handleOpenLink = useCallback(() => {
    if (!href || !isAllowedHref(href)) return
    window.location.href = href
  }, [href])

  const handleOpenInNewTab = useCallback(() => {
    if (!href || !isAllowedHref(href)) return
    window.open(href, '_blank', 'noopener,noreferrer')
  }, [href])

  return (
    <div
      className="gba:flex gba:items-center gba:gap-0.5 gba:rounded-md gba:border gba:bg-popover gba:px-1 gba:py-0.5 gba:shadow-md"
      data-testid={testId}
    >
      <Button variant="ghost" size="sm" onClick={onEdit} className="gba:h-8 gba:gap-1" data-testid="link-bubble-edit">
        <Pencil className="gba:h-4 gba:w-4" />
        {t('link-bubble-edit')}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRemoveLink}
        className="gba:h-8 gba:gap-1"
        data-testid="link-bubble-remove-link"
      >
        <Unlink className="gba:h-4 gba:w-4" />
        {t('link-bubble-remove-link')}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpenLink}
        disabled={!href || !isAllowedHref(href)}
        className="gba:h-8 gba:gap-1"
        data-testid="link-bubble-open-link"
      >
        <ExternalLink className="gba:h-4 gba:w-4" />
        {t('link-bubble-open-link')}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpenInNewTab}
        disabled={!href || !isAllowedHref(href)}
        className="gba:h-8 gba:gap-1"
        data-testid="link-bubble-open-new-tab"
      >
        <SquareArrowOutUpRight className="gba:h-4 gba:w-4" />
        {t('link-bubble-open-new-tab')}
      </Button>
    </div>
  )
}
