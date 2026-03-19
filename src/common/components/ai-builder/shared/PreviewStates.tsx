/**
 * Shared loading, error, and empty states for AI builder previews.
 */

import { Spinner, Alert, AlertDescription } from '@newwork/nw-design-system'

export interface PreviewLoadingProps {
  testId: string
}

export function PreviewLoading({ testId }: PreviewLoadingProps) {
  return (
    <div className="gba:flex gba:items-center gba:justify-center gba:py-12" data-testid={`${testId}-loading`}>
      <Spinner size="lg" />
    </div>
  )
}

export interface PreviewErrorProps {
  testId: string
  message: string
}

export function PreviewError({ testId, message }: PreviewErrorProps) {
  return (
    <Alert variant="destructive" data-testid={`${testId}-error`}>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

export interface PreviewEmptyProps {
  testId: string
  message: string
}

export function PreviewEmpty({ testId, message }: PreviewEmptyProps) {
  return (
    <div className="gba:text-muted-foreground gba:py-4" data-testid={`${testId}-empty`}>
      {message}
    </div>
  )
}
