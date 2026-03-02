/**
 * TemplateBrowserButton Component
 *
 * Button for opening the template browser dialog.
 */

import React, { useState } from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { toast } from 'sonner'
import { LayoutTemplate } from 'lucide-react'
import type { SlideData } from './slideElements'
import { TemplateBrowserDialog } from './TemplateBrowserDialog'
import translations from '../_i18n'

export interface TemplateBrowserButtonProps {
  onApplyTemplate: (slides: SlideData[], themeId: string) => void
  disabled?: boolean
  'data-testid'?: string
}

export const TemplateBrowserButton: React.FC<TemplateBrowserButtonProps> = ({
  onApplyTemplate,
  disabled = false,
  'data-testid': testId = 'template-browser-button'
}) => {
  const { t } = useTranslation(translations)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleApplyTemplate = (slides: SlideData[], themeId: string) => {
    onApplyTemplate(slides, themeId)
    toast.success(t('template-applied-title') || 'Template Applied')
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)} disabled={disabled} data-testid={testId}>
        <LayoutTemplate className="gba:w-4 gba:h-4 gba:mr-2" />
        {t('template-browse-button') || 'Templates'}
      </Button>

      <TemplateBrowserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onApplyTemplate={handleApplyTemplate}
        data-testid={`${testId}-dialog`}
      />
    </>
  )
}

export default TemplateBrowserButton
