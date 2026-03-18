/**
 * SaveTemplateButton Component
 *
 * Button for saving current slides as a template.
 */

import React, { useState } from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { toast } from 'sonner'
import { LayoutTemplate } from 'lucide-react'
import type { SlideData } from './slideElements'
import { SaveTemplateDialog } from './SaveTemplateDialog'
import translations from '../_i18n'

export interface SaveTemplateButtonProps {
  slides: SlideData[]
  themeId: string
  disabled?: boolean
  'data-testid'?: string
}

export const SaveTemplateButton: React.FC<SaveTemplateButtonProps> = ({
  slides,
  themeId,
  disabled = false,
  'data-testid': testId = 'save-template-button'
}) => {
  const { t } = useTranslation(translations)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleSaved = () => {
    toast.success(t('template-saved-title') || 'Template Saved')
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setDialogOpen(true)}
        disabled={disabled || slides.length === 0}
        data-testid={testId}
      >
        <LayoutTemplate className="gba:w-4 gba:h-4 gba:mr-2" />
        {t('template-save-button') || 'Save as Template'}
      </Button>

      <SaveTemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        slides={slides}
        themeId={themeId}
        onSaved={handleSaved}
        data-testid={`${testId}-dialog`}
      />
    </>
  )
}

export default SaveTemplateButton
