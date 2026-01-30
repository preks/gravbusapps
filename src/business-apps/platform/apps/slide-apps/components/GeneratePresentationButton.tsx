/**
 * GeneratePresentationButton Component
 *
 * Self-contained toolbar button for AI slide generation.
 * Manages its own dialog state, minimizing changes to SlideEditor.tsx.
 */

import React, { useState, useCallback } from 'react'
import { AiButton, Spinner } from '@newwork/nw-design-system'
import { Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { GeneratePresentationDialog } from './GeneratePresentationDialog'
import type { SlideData } from './slideElements'

export interface GeneratePresentationButtonProps {
  /** Callback when slides are generated */
  onGenerate: (slides: SlideData[], title: string) => void
  /** Access token for API calls */
  accessToken: string
  /** Whether the button is disabled */
  disabled?: boolean
  /** Whether the button is processing */
  isProcessing?: boolean
  /** data-testid for testing */
  'data-testid'?: string
}

export const GeneratePresentationButton: React.FC<GeneratePresentationButtonProps> = ({
  onGenerate,
  accessToken,
  disabled = false,
  isProcessing = false,
  'data-testid': testId = 'generate-presentation-button'
}) => {
  const [showDialog, setShowDialog] = useState(false)

  const handleGenerate = useCallback(
    (slides: SlideData[], title: string) => {
      onGenerate(slides, title)
      toast.success('Presentation generated!', {
        description: `Created ${slides.length} slides`
      })
    },
    [onGenerate]
  )

  return (
    <>
      <AiButton
        size="sm"
        disabled={disabled || isProcessing}
        onClick={() => setShowDialog(true)}
        showIcon
        icon={isProcessing ? <Spinner className="gba:w-4 gba:h-4" /> : <Wand2 className="gba:w-4 gba:h-4" />}
        iconPosition="before"
        data-testid={testId}
      >
        Generate
      </AiButton>

      <GeneratePresentationDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onGenerate={handleGenerate}
        accessToken={accessToken}
        data-testid={`${testId}-dialog`}
      />
    </>
  )
}

export default GeneratePresentationButton
