import React from 'react'
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label
} from '@newwork/nw-design-system'
import type { LeadScoreCommandResult } from '../types/leadScoringTypes'

export interface LeadScoringSingleSectionProps {
  testId: string
  hideLeadIdInput: boolean
  singleLeadId: string
  onSingleLeadIdChange: (value: string) => void
  singleValidationError: string | null
  singleError: string | null
  singleLoading: boolean
  singleResult: LeadScoreCommandResult | null
  onSubmit: () => Promise<void>
  onReset: () => void
  labels: {
    title: string
    leadId: string
    leadIdPlaceholder: string
    loading: string
    runSingle: string
    clear: string
    success: string
  }
}

export const LeadScoringSingleSection: React.FC<LeadScoringSingleSectionProps> = ({
  testId,
  hideLeadIdInput,
  singleLeadId,
  onSingleLeadIdChange,
  singleValidationError,
  singleError,
  singleLoading,
  singleResult,
  onSubmit,
  onReset,
  labels
}) => (
  <Card data-testid={`${testId}-single-form`}>
    <CardHeader>
      <CardTitle>{labels.title}</CardTitle>
    </CardHeader>
    <CardContent className="gba:space-y-4">
      {hideLeadIdInput ? null : (
        <div className="gba:space-y-2">
          <Label htmlFor={`${testId}-lead-id`}>{labels.leadId}</Label>
          <Input
            id={`${testId}-lead-id`}
            value={singleLeadId}
            onChange={event => onSingleLeadIdChange(event.target.value)}
            placeholder={labels.leadIdPlaceholder}
            data-testid={`${testId}-lead-id-input`}
          />
        </div>
      )}

      {singleValidationError || singleError ? (
        <Alert variant="destructive" data-testid={`${testId}-single-error`}>
          <AlertDescription>{singleValidationError || singleError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="gba:flex gba:flex-wrap gba:gap-2">
        <Button
          onClick={() => {
            onSubmit().catch(() => {})
          }}
          disabled={singleLoading}
          data-testid={`${testId}-single-submit`}
        >
          {singleLoading ? labels.loading : labels.runSingle}
        </Button>
        <Button variant="outline" onClick={onReset} data-testid={`${testId}-single-reset`}>
          {labels.clear}
        </Button>
      </div>

      {singleResult ? (
        <Alert data-testid={`${testId}-single-success`}>
          <AlertDescription>{labels.success}</AlertDescription>
        </Alert>
      ) : null}
    </CardContent>
  </Card>
)
