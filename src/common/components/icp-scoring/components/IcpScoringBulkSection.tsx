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
import type { BulkIcpScoreCommandResult } from '../types/icpScoringTypes'

export interface IcpScoringBulkSectionProps {
  testId: string
  hideBulkEntityIdsInput: boolean
  hasPrefilledEntityIds: boolean
  bulkEntityIds: string
  onBulkEntityIdsChange: (value: string) => void
  bulkValidationError: string | null
  bulkError: string | null
  bulkLoading: boolean
  bulkResult: BulkIcpScoreCommandResult | null
  onSubmit: () => Promise<void>
  onReset: () => void
  labels: {
    title: string
    prefilledEntityCountMessage: string
    entityIds: string
    entityIdsPlaceholder: string
    entityIdsHint: string
    loading: string
    runBulk: string
    clear: string
    success: string
  }
}

export const IcpScoringBulkSection: React.FC<IcpScoringBulkSectionProps> = ({
  testId,
  hideBulkEntityIdsInput,
  hasPrefilledEntityIds,
  bulkEntityIds,
  onBulkEntityIdsChange,
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
      {hideBulkEntityIdsInput || hasPrefilledEntityIds ? (
        <Alert data-testid={`${testId}-prefilled-entities`}>
          <AlertDescription>{labels.prefilledEntityCountMessage}</AlertDescription>
        </Alert>
      ) : (
        <div className="gba:space-y-2">
          <Label htmlFor={`${testId}-entity-ids`}>{labels.entityIds}</Label>
          <Textarea
            id={`${testId}-entity-ids`}
            value={bulkEntityIds}
            onChange={event => onBulkEntityIdsChange(event.target.value)}
            rows={6}
            placeholder={labels.entityIdsPlaceholder}
            data-testid={`${testId}-entity-ids-input`}
          />
          <p className="gba:text-sm gba:text-muted-foreground">{labels.entityIdsHint}</p>
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
