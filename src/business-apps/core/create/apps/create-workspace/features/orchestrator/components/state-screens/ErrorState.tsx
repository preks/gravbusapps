/**
 * ErrorState - Enhanced error display with recovery options
 * Helpful guidance and clear next steps
 */

import React from 'react'
import { AlertTriangle, RotateCcw, Edit, MessageCircle, CheckCircle2, Code, Info, XCircle } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  cn
} from '@newwork/nw-design-system'
import type { ComponentSpec } from '../../types'

export interface ErrorStateProps {
  error: string
  errorDetails?: any
  partialComponents?: ComponentSpec[]
  onRetry: () => void
  onModifyPlan?: () => void
  onContactSupport?: () => void
  className?: string
  'data-testid'?: string
}

const commonIssues = [
  {
    pattern: /timeout|timed out/i,
    title: 'Build Timeout',
    explanation: 'The build took longer than expected and was automatically stopped.',
    fixes: [
      'Try building with fewer components at once',
      'Check if external services are responding slowly',
      'Retry the build - sometimes this is a temporary issue'
    ]
  },
  {
    pattern: /unauthorized|403|401/i,
    title: 'Authorization Error',
    explanation: 'You may not have permission to create certain components.',
    fixes: [
      'Check your user permissions',
      'Contact your administrator to request access',
      'Try building a simpler version without restricted components'
    ]
  },
  {
    pattern: /network|connection/i,
    title: 'Network Error',
    explanation: 'There was a problem connecting to the build services.',
    fixes: [
      'Check your internet connection',
      'Retry the build - network issues are often temporary',
      'Contact support if the problem persists'
    ]
  }
]

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  errorDetails,
  partialComponents = [],
  onRetry,
  onModifyPlan,
  onContactSupport,
  className,
  'data-testid': testId = 'error-state'
}) => {
  // Try to match error to common issues
  const matchedIssue = commonIssues.find(issue => issue.pattern.test(error))

  const hasPartialSuccess = partialComponents.length > 0
  const completedCount = partialComponents.filter(c => c.status === 'completed').length
  const failedComponents = partialComponents.filter(c => c.status === 'error')
  const hasFailures = failedComponents.length > 0

  return (
    <div className={cn('gba:space-y-6 gba:animate-in gba:fade-in gba:duration-300', className)} data-testid={testId}>
      {/* Error card */}
      <Card className="gba:border-destructive/50">
        <CardHeader>
          <div className="gba:flex gba:items-start gba:gap-4">
            <div className="gba:p-3 gba:rounded-full gba:bg-destructive/10">
              <AlertTriangle className="gba:w-8 gba:h-8 gba:text-destructive" />
            </div>
            <div className="gba:flex-1">
              <CardTitle className="gba:text-xl gba:mb-2">
                {matchedIssue ? matchedIssue.title : 'Build Failed'}
              </CardTitle>
              <p className="gba:text-muted-foreground">{error}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="gba:space-y-4">
          {/* What happened */}
          {matchedIssue && (
            <div className="gba:p-4 gba:bg-muted gba:rounded-lg">
              <h4 className="gba:font-medium gba:text-foreground gba:mb-2 gba:flex gba:items-center gba:gap-2">
                <Info className="gba:w-4 gba:h-4" />
                What happened?
              </h4>
              <p className="gba:text-sm gba:text-muted-foreground">{matchedIssue.explanation}</p>
            </div>
          )}

          {/* Suggested fixes */}
          {matchedIssue && (
            <div className="gba:p-4 gba:bg-info-secondary gba:rounded-lg">
              <h4 className="gba:font-medium gba:text-foreground gba:mb-3 gba:flex gba:items-center gba:gap-2">
                <CheckCircle2 className="gba:w-4 gba:h-4 gba:text-info" />
                How to fix it:
              </h4>
              <ul className="gba:space-y-2">
                {matchedIssue.fixes.map((fix, i) => {
                  const fixKey = `fix-${fix.slice(0, 15).replace(/\s+/g, '-')}-${i}`
                  return (
                    <li key={fixKey} className="gba:flex gba:items-start gba:gap-2 gba:text-sm">
                      <CheckCircle2 className="gba:w-4 gba:h-4 gba:mt-0.5 gba:text-success gba:shrink-0" />
                      <span className="gba:text-foreground">{fix}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Technical details (collapsible) */}
          {errorDetails && (
            // @ts-expect-error - Accordion type definition missing children prop
            <Accordion type="single" collapsible={true}>
              <AccordionItem value="technical">
                <AccordionTrigger className="gba:text-sm hover:gba:no-underline">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Code className="gba:w-4 gba:h-4" />
                    Technical Details
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <pre className="gba:text-xs gba:bg-muted gba:p-3 gba:rounded gba:overflow-auto gba:max-h-[200px]">
                    {JSON.stringify(errorDetails, null, 2)}
                  </pre>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {/* Partial success alert */}
          {hasPartialSuccess && (
            <Alert variant="default" className="gba:border-info/50 gba:bg-info-secondary">
              <Info className="gba:h-4 gba:w-4 gba:text-info" />
              <AlertTitle>Partial Success</AlertTitle>
              <AlertDescription>
                {completedCount} component{completedCount === 1 ? ' was' : 's were'} created successfully before the
                error occurred. You can view {completedCount === 1 ? 'it' : 'them'} below.
              </AlertDescription>
            </Alert>
          )}

          {/* Recovery actions */}
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-3 gba:pt-4 gba:border-t gba:border-border">
            <Button onClick={onRetry} size="lg" className="gba:min-w-[140px]">
              <RotateCcw className="gba:w-4 gba:h-4 gba:mr-2" />
              Retry Build
            </Button>
            {onModifyPlan && (
              <Button variant="outline" onClick={onModifyPlan} size="lg">
                <Edit className="gba:w-4 gba:h-4 gba:mr-2" />
                Modify Plan
              </Button>
            )}
            {onContactSupport && (
              <Button variant="outline" onClick={onContactSupport} size="lg">
                <MessageCircle className="gba:w-4 gba:h-4 gba:mr-2" />
                Contact Support
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Show failed components */}
      {hasFailures && (
        <Card className="gba:border-destructive/50">
          <CardHeader>
            <CardTitle className="gba:text-lg gba:flex gba:items-center gba:gap-2 gba:text-destructive">
              <XCircle className="gba:w-5 gba:h-5" />
              Failed Components ({failedComponents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-3">
              {failedComponents.map(component => (
                <div
                  key={component.id}
                  className="gba:p-4 gba:bg-destructive/5 gba:border gba:border-destructive/20 gba:rounded-lg"
                >
                  <div className="gba:flex gba:items-start gba:justify-between gba:mb-2">
                    <div>
                      <div className="gba:font-medium gba:text-foreground gba:flex gba:items-center gba:gap-2">
                        <XCircle className="gba:w-4 gba:h-4 gba:text-destructive" />
                        {component.name}
                      </div>
                      <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">{component.type}</div>
                    </div>
                  </div>
                  {component.error_message && (
                    <div className="gba:mt-2 gba:p-3 gba:bg-background gba:rounded gba:border gba:border-border">
                      <p className="gba:text-xs gba:text-muted-foreground gba:font-mono">{component.error_message}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show partial results if any */}
      {hasPartialSuccess && (
        <Card>
          <CardHeader>
            <CardTitle className="gba:text-lg gba:flex gba:items-center gba:gap-2">
              <CheckCircle2 className="gba:w-5 gba:h-5 gba:text-success" />
              Completed Components ({completedCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-2">
              {partialComponents
                .filter(c => c.status === 'completed')
                .map(component => (
                  <div
                    key={component.id}
                    className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:bg-muted gba:rounded-lg"
                  >
                    <div>
                      <div className="gba:font-medium gba:text-foreground">{component.name}</div>
                      <div className="gba:text-sm gba:text-muted-foreground">{component.description}</div>
                    </div>
                    <CheckCircle2 className="gba:w-5 gba:h-5 gba:text-success" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ErrorState
