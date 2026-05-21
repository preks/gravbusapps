import React from 'react'
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Textarea
} from '@newwork/nw-design-system'
import type { BulkLeadScoreCommandResult } from '../types/leadScoringTypes'

export interface LeadScoringBulkSectionProps {
  testId: string
  hideBulkLeadIdsInput: boolean
  hasPrefilledLeadIds: boolean
  bulkLeadIds: string
  onBulkLeadIdsChange: (value: string) => void
  bulkValidationError: string | null
  bulkError: string | null
  bulkLoading: boolean
  bulkResult: BulkLeadScoreCommandResult | null
  onSubmit: () => Promise<void>
  onReset: () => void
  labels: {
    title: string
    prefilledLeadCountMessage: string
    leadIds: string
    leadIdsPlaceholder: string
    leadIdsHint: string
    loading: string
    runBulk: string
    clear: string
    success: string
  }
}

export const LeadScoringBulkSection: React.FC<LeadScoringBulkSectionProps> = ({
  testId,
  hideBulkLeadIdsInput,
  hasPrefilledLeadIds,
  bulkLeadIds,
  onBulkLeadIdsChange,
  bulkValidationError,
  bulkError,
  bulkLoading,
  bulkResult,
  onSubmit,
  onReset,
  labels
}) => (
  <Card data-testid={`${testId}-bulk-form`}>
    <CardHeader>
      <CardTitle>{labels.title}</CardTitle>
    </CardHeader>
    <CardContent className="gba:space-y-4">
      {hideBulkLeadIdsInput || hasPrefilledLeadIds ? (
        <Alert data-testid={`${testId}-prefilled-leads`}>
          <AlertDescription>{labels.prefilledLeadCountMessage}</AlertDescription>
        </Alert>
      ) : (
        <div className="gba:space-y-2">
          <Label htmlFor={`${testId}-lead-ids`}>{labels.leadIds}</Label>
          <Textarea
            id={`${testId}-lead-ids`}
            value={bulkLeadIds}
            onChange={event => onBulkLeadIdsChange(event.target.value)}
            rows={6}
            placeholder={labels.leadIdsPlaceholder}
            data-testid={`${testId}-lead-ids-input`}
          />
          <p className="gba:text-sm gba:text-muted-foreground">{labels.leadIdsHint}</p>
        </div>
      )}

      {bulkValidationError || bulkError ? (
        <Alert variant="destructive" data-testid={`${testId}-bulk-error`}>
          <AlertDescription>{bulkValidationError || bulkError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="gba:flex gba:flex-wrap gba:gap-2">
        <Button
          onClick={() => {
            onSubmit().catch(() => {})
          }}
          disabled={bulkLoading}
          data-testid={`${testId}-bulk-submit`}
        >
          {bulkLoading ? labels.loading : labels.runBulk}
        </Button>
        <Button variant="outline" onClick={onReset} data-testid={`${testId}-bulk-reset`}>
          {labels.clear}
        </Button>
      </div>

      {bulkResult ? (
        <Alert data-testid={`${testId}-bulk-success`}>
          <AlertDescription>{labels.success}</AlertDescription>
        </Alert>
      ) : null}
    </CardContent>
  </Card>
)
