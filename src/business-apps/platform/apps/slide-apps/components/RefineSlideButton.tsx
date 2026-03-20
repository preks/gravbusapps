/**
 * RefineSlideButton Component
 *
 * Toolbar button for triggering AI slide refinement.
 */

import React, { useState } from 'react'
import { AiButton, useTranslation } from '@newwork/nw-design-system'
import { Sparkles } from 'lucide-react'
import type { SlideData } from './slideElements'
import type { SlideTheme } from './slideThemes'
import { RefineSlideDialog } from './RefineSlideDialog'
import translations from '../_i18n'

export interface RefineSlideButtonProps {
  currentSlide: SlideData
  onRefine: (refinedSlide: SlideData) => void
  accessToken: string
  theme?: SlideTheme
  disabled?: boolean
  'data-testid'?: string
}

export const RefineSlideButton: React.FC<RefineSlideButtonProps> = ({
  currentSlide,
  onRefine,
  accessToken,
  theme,
  disabled = false,
  'data-testid': testId = 'refine-slide-button'
}) => {
  const { t } = useTranslation(translations)
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <AiButton
        size="sm"
        onClick={() => setDialogOpen(true)}
        disabled={disabled}
        showIcon
        icon={<Sparkles className="gba:w-4 gba:h-4" />}
        iconPosition="before"
        data-testid={testId}
      >
        {t('refine-button-label') || 'Refine'}
      </AiButton>

      <RefineSlideDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentSlide={currentSlide}
        onRefine={onRefine}
        accessToken={accessToken}
        theme={theme}
        data-testid={`${testId}-dialog`}
      />
    </>
  )
}

export default RefineSlideButton
