/**
 * SummaryPanel Component
 * Displays AI-generated summary in a collapsible panel at the bottom of handwriting notes
 */

import React, { useState } from 'react'
import { Button, Card, CardContent } from '@newwork/nw-design-system'
import { ChevronDown, ChevronUp, Sparkles, Copy, X, Check } from 'lucide-react'

export interface SummaryPanelProps {
  summary: string
  onDismiss: () => void
  'data-testid'?: string
}

export const SummaryPanel: React.FC<SummaryPanelProps> = ({
  summary,
  onDismiss,
  'data-testid': testId = 'summary-panel'
}) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy summary:', error)
    }
  }

  return (
    <div
      className="gba:absolute gba:bottom-4 gba:left-1/2 gba:-translate-x-1/2 gba:w-[calc(100%-2rem)] gba:max-w-2xl gba:z-10"
      data-testid={testId}
    >
      <Card className="gba:shadow-lg gba:border-primary/20 gba:bg-card/95 gba:backdrop-blur-sm">
        {/* Header - always visible */}
        <div
          className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:cursor-pointer gba:border-b gba:border-border/50"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:p-1.5 gba:rounded-md gba:bg-primary/10">
              <Sparkles className="gba:w-4 gba:h-4 gba:text-primary" />
            </div>
            <span className="gba:font-medium gba:text-foreground">AI Summary</span>
          </div>
          <div className="gba:flex gba:items-center gba:gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                handleCopy()
              }}
              className="gba:h-7 gba:w-7 gba:p-0"
              data-testid={`${testId}-copy`}
            >
              {copied ? (
                <Check className="gba:w-3.5 gba:h-3.5 gba:text-success" />
              ) : (
                <Copy className="gba:w-3.5 gba:h-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                onDismiss()
              }}
              className="gba:h-7 gba:w-7 gba:p-0"
              data-testid={`${testId}-dismiss`}
            >
              <X className="gba:w-3.5 gba:h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="gba:h-7 gba:w-7 gba:p-0">
              {isExpanded ? <ChevronDown className="gba:w-4 gba:h-4" /> : <ChevronUp className="gba:w-4 gba:h-4" />}
            </Button>
          </div>
        </div>

        {/* Content - collapsible */}
        {isExpanded && (
          <CardContent className="gba:p-4">
            <p
              className="gba:text-sm gba:text-foreground gba:leading-relaxed gba:whitespace-pre-wrap"
              style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
            >
              {summary}
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

export default SummaryPanel
