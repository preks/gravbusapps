/**
 * EnhancedErrorAlert Component
 * Displays detailed error information with suggestions and copy-to-clipboard
 */

import React, { useState } from 'react'
import {
  Alert,
  AlertDescription,
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@newwork/nw-design-system'
import { EnhancedError } from '../../types/error'
import {
  formatErrorForClipboard,
  formatErrorForDisplay,
  getSeverityColor,
  getCategoryIcon
} from '../../utils/errorHandler'
import { Copy, Check, ChevronDown, ChevronUp, AlertCircle, Info, Lightbulb, ExternalLink } from 'lucide-react'

interface EnhancedErrorAlertProps {
  error: EnhancedError
  onDismiss?: () => void
  showTechnicalDetails?: boolean
  showSuggestions?: boolean
}

export const EnhancedErrorAlert: React.FC<EnhancedErrorAlertProps> = ({
  error,
  onDismiss,
  showTechnicalDetails = true,
  showSuggestions = true
}) => {
  const [copied, setCopied] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const handleCopy = async () => {
    try {
      const errorText = formatErrorForClipboard(error)
      await navigator.clipboard.writeText(errorText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy error details', err)
    }
  }

  const categoryIcon = getCategoryIcon(error.category)
  const severityColor = getSeverityColor(error.severity)

  return (
    <Alert variant={severityColor as any} className="gba:border-l-4">
      <div className="gba:flex gba:items-start gba:gap-3">
        {/* Icon */}
        <div className="gba:text-2xl gba:flex-shrink-0">{categoryIcon}</div>

        {/* Content */}
        <div className="gba:flex-1 gba:space-y-3">
          {/* Header */}
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
            <div className="gba:space-y-1">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span className="gba:font-semibold">{formatErrorForDisplay(error)}</span>
                <Badge variant="outline" className="gba:text-xs">
                  {error.category}
                </Badge>
                <Badge variant={severityColor as any} className="gba:text-xs">
                  {error.severity}
                </Badge>
              </div>
              <AlertDescription className="gba:text-sm">{error.message}</AlertDescription>
            </div>

            {/* Actions */}
            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-shrink-0">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopy}
                data-testid="copy-error-button"
                className="gba:h-8"
              >
                {copied ? (
                  <>
                    <Check className="gba:h-3 gba:w-3 gba:mr-1" />
                    <span className="gba:text-xs">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="gba:h-3 gba:w-3 gba:mr-1" />
                    <span className="gba:text-xs">Copy Details</span>
                  </>
                )}
              </Button>
              {onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDismiss}
                  data-testid="dismiss-error-button"
                  className="gba:h-8"
                >
                  ✕
                </Button>
              )}
            </div>
          </div>

          {/* Suggestions */}
          {showSuggestions && error.suggestions.length > 0 && (
            <Card className="gba:bg-background/50">
              <CardHeader className="gba:p-3">
                <CardTitle className="gba:text-sm gba:flex gba:items-center gba:gap-2">
                  <Lightbulb className="gba:h-4 gba:w-4 gba:text-warning" />
                  Suggested Solutions
                </CardTitle>
              </CardHeader>
              <CardContent className="gba:p-3 gba:pt-0 gba:space-y-2">
                {error.suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="gba:flex gba:items-start gba:gap-2 gba:p-2 gba:rounded gba:bg-background gba:border"
                  >
                    <div className="gba:flex-shrink-0 gba:mt-0.5">
                      <div className="gba:h-5 gba:w-5 gba:rounded-full gba:bg-primary gba:text-primary-foreground gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-bold">
                        {index + 1}
                      </div>
                    </div>
                    <div className="gba:flex-1 gba:space-y-1">
                      <div className="gba:font-medium gba:text-sm">{suggestion.title}</div>
                      <div className="gba:text-xs gba:text-muted-foreground">{suggestion.description}</div>
                      {suggestion.action && (
                        <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:font-medium gba:text-primary gba:mt-1">
                          <Info className="gba:h-3 gba:w-3" />
                          <span>{suggestion.action}</span>
                          {suggestion.actionUrl && <ExternalLink className="gba:h-3 gba:w-3 gba:ml-1" />}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Technical Details (Collapsible) */}
          {showTechnicalDetails && error.technicalDetails && (
            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gba:w-full gba:justify-between gba:h-8 gba:text-xs"
                  data-testid="toggle-technical-details"
                >
                  <span className="gba:flex gba:items-center gba:gap-2">
                    <AlertCircle className="gba:h-3 gba:w-3" />
                    Technical Details
                  </span>
                  {detailsOpen ? (
                    <ChevronUp className="gba:h-3 gba:w-3" />
                  ) : (
                    <ChevronDown className="gba:h-3 gba:w-3" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="gba:mt-2 gba:p-3 gba:bg-muted gba:rounded gba:border gba:text-xs gba:font-mono gba:whitespace-pre-wrap gba:break-all">
                  {error.technicalDetails}
                </div>
                {error.context && (
                  <div className="gba:mt-2 gba:p-3 gba:bg-muted gba:rounded gba:border gba:text-xs">
                    <div className="gba:font-semibold gba:mb-1">Context:</div>
                    {Object.entries(error.context).map(([key, value]) => (
                      <div key={key} className="gba:flex gba:gap-2">
                        <span className="gba:text-muted-foreground">{key}:</span>
                        <span className="gba:font-mono">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Timestamp */}
          <div className="gba:text-xs gba:text-muted-foreground">{new Date(error.timestamp).toLocaleString()}</div>
        </div>
      </div>
    </Alert>
  )
}
