/**
 * AiEditPreview Component
 *
 * Displays a preview of the AI-generated edit result.
 * Shows the HTML content in a safe sandboxed view with a change summary.
 */

import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import { Check, FileText, TextSelect } from 'lucide-react'

export interface AiEditPreviewProps {
  html: string
  mode: 'document' | 'selection'
  changeSummary?: string | null
  isApplied: boolean
  'data-testid'?: string
}

export const AiEditPreview: React.FC<AiEditPreviewProps> = ({
  html,
  mode,
  changeSummary,
  isApplied,
  'data-testid': testId = 'ai-edit-preview'
}) => {
  return (
    <div className="gba:space-y-3" data-testid={testId}>
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-xs gba:font-medium gba:text-foreground">{isApplied ? 'Applied' : 'Preview'}</span>
          <Badge
            variant={mode === 'selection' ? 'secondary' : 'outline'}
            className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:h-4"
          >
            {mode === 'selection' ? (
              <>
                <TextSelect className="gba:h-2.5 gba:w-2.5 gba:mr-0.5" />
                Selection
              </>
            ) : (
              <>
                <FileText className="gba:h-2.5 gba:w-2.5 gba:mr-0.5" />
                Full Document
              </>
            )}
          </Badge>
        </div>
        {isApplied && (
          <Badge variant="success" className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:h-4">
            <Check className="gba:h-2.5 gba:w-2.5 gba:mr-0.5" />
            Applied
          </Badge>
        )}
      </div>

      {/* Change summary */}
      {changeSummary && <p className="gba:text-xs gba:text-muted-foreground gba:italic">{changeSummary}</p>}

      {/* HTML preview */}
      <div
        className="gba:rounded-lg gba:border gba:border-border/50 gba:bg-card gba:p-3 gba:text-xs gba:max-h-[300px] gba:overflow-auto"
        data-testid="ai-edit-preview-content"
      >
        <div className="gba:prose gba:prose-xs gba:max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  )
}
