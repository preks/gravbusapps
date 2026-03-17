/**
 * CollectionSummaryDialog Component
 *
 * Displays AI-generated executive summary and per-recipient breakdown
 * for Excel Collection submissions, with option to add to sheet.
 * UI matches reference: AI icon in header, copy/discard/collapse actions.
 */

import React, { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from '@newwork/nw-design-system'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown'
import { FileText, Sparkles, Copy, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import type { ExcelCollectionSummaryResult } from '../../hooks/useExcelCollectionSummary'

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map(p => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  )
}

export interface CollectionSummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  summary: ExcelCollectionSummaryResult | null
  isSummarizing: boolean
  error: string | null
  onAddToSheet: () => void
  'data-testid'?: string
}

export const CollectionSummaryDialog: React.FC<CollectionSummaryDialogProps> = ({
  open,
  onOpenChange,
  summary,
  isSummarizing,
  error,
  onAddToSheet,
  'data-testid': testId = 'collection-summary-dialog'
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    if (!open || !summary) setIsCollapsed(false)
  }, [open, summary])

  const fullSummaryText = summary
    ? [summary.executiveSummary, ...summary.perRecipient.map(item => `${item.recipientName}:\n${item.summary}`)].join(
        '\n\n'
      )
    : ''

  const handleCopy = useCallback(async () => {
    if (!fullSummaryText) return
    try {
      await navigator.clipboard.writeText(fullSummaryText)
      toast.success('Summary copied to clipboard')
    } catch {
      toast.error('Failed to copy summary')
    }
  }, [fullSummaryText])

  const handleDiscard = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-2xl gba:max-h-[90vh] gba:flex gba:flex-col" data-testid={testId}>
        <DialogHeader className="gba:flex-row gba:items-center gba:justify-between gba:gap-4 gba:pr-2">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-primary gba:text-primary-foreground">
              <Sparkles className="gba:w-5 gba:h-5" />
            </div>
            <DialogTitle className="gba:text-lg gba:font-semibold gba:font-heading">AI Summary</DialogTitle>
          </div>
          {!isSummarizing && summary && (
            <div className="gba:flex gba:items-center gba:gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="gba:h-8 gba:w-8"
                      onClick={handleCopy}
                      data-testid={`${testId}-copy-button`}
                    >
                      <Copy className="gba:w-4 gba:h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy summary to clipboard</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="gba:h-8 gba:w-8 gba:text-destructive"
                      onClick={handleDiscard}
                      data-testid={`${testId}-discard-button`}
                    >
                      <Trash2 className="gba:w-4 gba:h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Discard and close</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="gba:h-8 gba:w-8"
                      onClick={() => setIsCollapsed(prev => !prev)}
                      data-testid={`${testId}-collapse-button`}
                    >
                      {isCollapsed ? (
                        <ChevronDown className="gba:w-4 gba:h-4" />
                      ) : (
                        <ChevronUp className="gba:w-4 gba:h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isCollapsed ? 'Expand' : 'Collapse'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </DialogHeader>

        <div className="gba:flex-1 gba:min-h-0 gba:flex gba:flex-col gba:gap-4">
          {isSummarizing && (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-12" data-testid={`${testId}-loading`}>
              <Spinner size="lg" />
            </div>
          )}

          {error && (
            <div
              className="gba:p-4 gba:rounded-md gba:bg-destructive-secondary gba:text-destructive-secondary-foreground"
              data-testid={`${testId}-error`}
            >
              {error}
            </div>
          )}

          {!isCollapsed && !isSummarizing && !error && summary && (
            <div className="gba:flex-1 gba:h-0 gba:min-h-0 gba:overflow-y-auto gba:pr-2">
              <div className="gba:space-y-4">
                <Card variant="outlined">
                  <CardHeader>
                    <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-base">
                      <FileText className="gba:w-4 gba:h-4" />
                      Executive Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="gba:pl-5 gba:border-l-4 gba:border-primary">
                    <div
                      className="gba:text-base gba:leading-relaxed gba:text-foreground gba:max-w-prose"
                      data-testid={`${testId}-executive-summary`}
                    >
                      {summary.executiveSummary ? (
                        <MarkdownWithChipsRenderer
                          content={summary.executiveSummary}
                          className="gba:text-base gba:leading-relaxed [&_p]:gba:mb-2 [&_p:last-child]:gba:mb-0 [&_ul]:gba:my-2 [&_ol]:gba:my-2"
                          data-testid={`${testId}-executive-summary-content`}
                        />
                      ) : (
                        <span className="gba:text-muted-foreground gba:italic">No summary available</span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardHeader>
                    <CardTitle className="gba:text-base">Per-Recipient Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="gba:space-y-4">
                      {summary.perRecipient.map((item, index) => (
                        <div
                          key={item.recipientName + index}
                          className="gba:flex gba:gap-3 gba:p-4 gba:rounded-md gba:bg-muted/50 gba:border gba:border-border/50"
                          data-testid={`${testId}-recipient-${index}`}
                        >
                          <Avatar className="gba:w-8 gba:h-8 gba:flex-shrink-0">
                            {item.avatar && <AvatarImage src={item.avatar} alt={item.recipientName} />}
                            <AvatarFallback className="gba:bg-muted gba:text-muted-foreground">
                              {getInitials(item.recipientName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="gba:min-w-0 gba:flex-1 gba:space-y-2">
                            <p className="gba:font-semibold gba:text-sm gba:text-foreground">{item.recipientName}</p>
                            <Separator className="gba:my-1" />
                            <div
                              className="gba:text-sm gba:leading-relaxed gba:text-muted-foreground gba:max-w-prose"
                              data-testid={`${testId}-recipient-summary-${index}`}
                            >
                              {item.summary ? (
                                <MarkdownWithChipsRenderer
                                  content={item.summary}
                                  className="gba:text-sm [&_p]:gba:mb-2 [&_p:last-child]:gba:mb-0 [&_p]:gba:text-muted-foreground [&_li]:gba:text-muted-foreground [&_strong]:gba:text-muted-foreground [&_ul]:gba:my-2 [&_ol]:gba:my-2"
                                  data-testid={`${testId}-recipient-summary-content-${index}`}
                                />
                              ) : (
                                <span className="gba:text-muted-foreground gba:italic">No summary available</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        {!isSummarizing && summary && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid={`${testId}-close-button`}>
              Close
            </Button>
            <Button
              onClick={() => {
                onAddToSheet()
                onOpenChange(false)
              }}
              data-testid={`${testId}-add-to-sheet-button`}
            >
              Add to Sheet
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
